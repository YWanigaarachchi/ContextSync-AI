"""
Chat router — send messages, manage conversations, stream RAG responses.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, User, Conversation, Message, AnalyticsEvent
from app.models.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationResponse,
    ConversationCreateRequest,
    ConversationListResponse,
    ConversationDetailResponse,
    SourceCitation,
)
from app.services.auth_service import get_current_user
from app.services.rag_service import generate_response, generate_response_stream, generate_conversation_title

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("")
async def send_message(
    data: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and get a streaming RAG response.
    Returns an SSE stream with sources and token-by-token generated text.
    """
    # Get or create conversation
    conversation_id = data.conversation_id
    is_new_conversation = False

    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            user_id=current_user.id,
            title="New Conversation",
        )
        db.add(conversation)
        await db.flush()
        await db.refresh(conversation)
        conversation_id = conversation.id
        is_new_conversation = True

    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.message,
    )
    db.add(user_message)

    # Log analytics
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type="query",
        metadata_json=json.dumps({"conversation_id": conversation_id, "query_length": len(data.message)}),
    )
    db.add(event)
    await db.flush()

    # Get conversation history
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in messages]

    # We need to commit before streaming so the user message is saved
    await db.commit()

    # Stream RAG response
    async def event_stream():
        full_response = ""
        sources = []
        response_time_ms = 0

        async for chunk in generate_response_stream(
            query=data.message,
            user_id=current_user.id,
            conversation_history=history[:-1],  # Exclude current message
        ):
            yield chunk

            # Parse chunk to capture full response for saving
            try:
                line = chunk.strip()
                if line.startswith("data: "):
                    parsed = json.loads(line[6:])
                    if parsed["type"] == "sources":
                        sources = parsed["data"]
                    elif parsed["type"] == "done":
                        full_response = parsed["data"]["full_response"]
                        response_time_ms = parsed["data"]["response_time_ms"]
            except (json.JSONDecodeError, KeyError):
                pass

        # Save assistant message to DB after streaming completes
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession as AS
        from app.core.config import settings
        from app.core.database import Message as Msg, Conversation as Conv

        eng = create_async_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
        sf = async_sessionmaker(eng, class_=AS, expire_on_commit=False)
        async with sf() as sess:
            try:
                assistant_msg = Msg(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    sources_json=json.dumps(sources),
                    response_time_ms=response_time_ms,
                )
                sess.add(assistant_msg)

                # Auto-generate title for new conversations
                if is_new_conversation:
                    title = await generate_conversation_title(data.message)
                    result = await sess.execute(select(Conv).where(Conv.id == conversation_id))
                    conv = result.scalar_one()
                    conv.title = title

                await sess.commit()
            finally:
                await eng.dispose()

        # Yield conversation metadata
        meta = json.dumps({
            "type": "meta",
            "data": {"conversation_id": conversation_id, "is_new": is_new_conversation},
        })
        yield f"data: {meta}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations for the current user."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    conv_list = []
    for conv in conversations:
        # Count messages
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        msg_count = msg_count_result.scalar()

        conv_list.append(ConversationResponse(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=msg_count,
        ))

    return ConversationListResponse(
        conversations=conv_list,
        total=len(conv_list),
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    msg_list = []
    for msg in messages:
        sources = []
        if msg.sources_json:
            try:
                raw_sources = json.loads(msg.sources_json)
                sources = [SourceCitation(
                    document_name=s.get("document_name", "Unknown"),
                    chunk_text=s.get("text", ""),
                    page_number=s.get("page_number"),
                    relevance_score=s.get("relevance_score", 0),
                    chunk_index=s.get("chunk_index", 0),
                ) for s in raw_sources]
            except (json.JSONDecodeError, TypeError):
                pass

        msg_list.append(ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            sources=sources,
            response_time_ms=msg.response_time_ms,
            created_at=msg.created_at,
        ))

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        messages=msg_list,
        created_at=conversation.created_at,
    )


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    data: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new empty conversation."""
    conversation = Conversation(
        user_id=current_user.id,
        title=data.title or "New Conversation",
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    return {"detail": "Conversation deleted successfully"}
