"""
RAG pipeline service — retrieves context from Qdrant and generates answers using Gemini.
Supports streaming responses with source citations.
"""

import json
import time
from typing import AsyncGenerator, Optional

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
# pyrefly: ignore [missing-import]
from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.core.config import settings
from app.services.embedding_service import embed_query
from app.services.document_service import get_collection_name, qdrant_client

# Initialize Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# System prompt that forces citation behavior
SYSTEM_PROMPT = """You are ContextSync-AI, an intelligent assistant that answers questions based on the provided context documents. 

RULES:
1. Answer ONLY based on the provided context. If the context doesn't contain relevant information, say "I don't have enough information in the uploaded documents to answer this question."
2. When referencing information, cite the source document name and page number like this: [Source: document_name, Page: X]
3. Be comprehensive but concise in your answers.
4. Use markdown formatting for better readability (headers, lists, bold, code blocks when appropriate).
5. If multiple documents provide different information on the same topic, mention all relevant sources.
6. Never make up information that isn't in the context."""


async def retrieve_context(
    query: str,
    user_id: int,
    top_k: Optional[int] = None,
) -> list[dict]:
    """
    Retrieve the most relevant document chunks for a query from Qdrant.
    
    Returns a list of dicts with: text, document_name, page_number, relevance_score, chunk_index
    """
    k = top_k or settings.TOP_K
    query_embedding = await embed_query(query)
    collection_name = get_collection_name()

    try:
        results = qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=k,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=str(user_id))
                    )
                ]
            )
        )
    except Exception:
        # Collection might not exist yet
        return []

    if not results:
        return []

    context_chunks = []
    for hit in results:
        payload = hit.payload or {}
        context_chunks.append({
            "text": payload.get("text", ""),
            "document_name": payload.get("document_name", "Unknown"),
            "page_number": payload.get("page_number", 1),
            "chunk_index": payload.get("chunk_index", 0),
            "relevance_score": round(hit.score, 4),
            "doc_type": payload.get("doc_type", "unknown"),
        })

    return context_chunks


def build_rag_prompt(query: str, context_chunks: list[dict], conversation_history: list[dict] = None) -> list[dict]:
    """
    Build the prompt messages for the Gemini API, including context and conversation history.
    """
    # Build context string
    context_parts = []
    for i, chunk in enumerate(context_chunks):
        context_parts.append(
            f"--- Source {i + 1}: {chunk['document_name']} (Page {chunk['page_number']}) ---\n"
            f"{chunk['text']}\n"
        )
    context_string = "\n".join(context_parts)

    # Build conversation history
    history_messages = []
    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            history_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

    # Build the final user message with context
    user_message = f"""Based on the following context documents, answer the user's question.

CONTEXT DOCUMENTS:
{context_string}

USER QUESTION: {query}

Remember to cite your sources using [Source: document_name, Page: X] format."""

    return {
        "system": SYSTEM_PROMPT,
        "history": history_messages,
        "user_message": user_message,
    }


async def generate_response(
    query: str,
    user_id: int,
    conversation_history: list[dict] = None,
) -> dict:
    """
    Full RAG pipeline: retrieve → build prompt → generate.
    Returns the response with sources.
    """
    start_time = time.time()

    # Step 1: Retrieve relevant context
    context_chunks = await retrieve_context(query, user_id)

    # Step 2: Build the prompt
    prompt_data = build_rag_prompt(query, context_chunks, conversation_history)

    # Step 3: Build Gemini message contents
    contents = []
    for hist_msg in prompt_data["history"]:
        role = "user" if hist_msg["role"] == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=hist_msg["content"])],
        ))
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt_data["user_message"])],
    ))

    # Step 4: Generate with Gemini
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=prompt_data["system"],
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
        content_text = response.text
    except Exception as e:
        content_text = f"**API Error**: Failed to get response from AI. Please check your Gemini API key in `backend/.env`. (Details: {str(e)})"

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "content": content_text,
        "sources": context_chunks,
        "response_time_ms": elapsed_ms,
    }


async def generate_response_stream(
    query: str,
    user_id: int,
    conversation_history: list[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming RAG pipeline — yields SSE-formatted chunks for real-time UI updates.
    First yields sources, then streams the generated text token-by-token.
    """
    start_time = time.time()

    # Step 1: Retrieve context
    context_chunks = await retrieve_context(query, user_id)

    # Yield sources first
    sources_data = json.dumps({
        "type": "sources",
        "data": context_chunks,
    })
    yield f"data: {sources_data}\n\n"

    # Step 2: Build prompt
    prompt_data = build_rag_prompt(query, context_chunks, conversation_history)

    # Step 3: Build contents
    contents = []
    for hist_msg in prompt_data["history"]:
        role = "user" if hist_msg["role"] == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=hist_msg["content"])],
        ))
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt_data["user_message"])],
    ))

    # Step 4: Stream from Gemini
    full_response = ""
    try:
        response_stream = client.models.generate_content_stream(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=prompt_data["system"],
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        for chunk in response_stream:
            if chunk.text:
                full_response += chunk.text
                token_data = json.dumps({
                    "type": "token",
                    "data": chunk.text,
                })
                yield f"data: {token_data}\n\n"
    except Exception as e:
        error_msg = f"\n\n**API Error**: Failed to get response from AI. Please check your Gemini API key in `backend/.env`. (Details: {str(e)})"
        full_response += error_msg
        token_data = json.dumps({
            "type": "token",
            "data": error_msg,
        })
        yield f"data: {token_data}\n\n"

    # Yield completion signal
    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    done_data = json.dumps({
        "type": "done",
        "data": {
            "full_response": full_response,
            "response_time_ms": elapsed_ms,
        },
    })
    yield f"data: {done_data}\n\n"


async def generate_conversation_title(first_message: str) -> str:
    """Generate a short conversation title from the first user message."""
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=f"Generate a very short title (max 6 words) for a conversation that starts with this message. Return ONLY the title, nothing else:\n\n{first_message}",
            config=types.GenerateContentConfig(
                temperature=0.5,
                max_output_tokens=20,
            ),
        )
        return response.text.strip().strip('"').strip("'")
    except Exception:
        return first_message[:50] + ("..." if len(first_message) > 50 else "")
