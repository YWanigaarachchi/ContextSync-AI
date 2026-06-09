"""
Analytics router — dashboard data, usage stats, and activity feeds.
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, User, Document, Conversation, Message, AnalyticsEvent
from app.models.schemas import (
    AnalyticsDashboard,
    AnalyticsOverview,
    DailyUsage,
    TopDocument,
    RecentActivity,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the full analytics dashboard data."""

    # === Overview Stats ===
    # Total documents
    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    total_docs = doc_count.scalar() or 0

    # Total queries
    query_count = await db.execute(
        select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.user_id == current_user.id,
            AnalyticsEvent.event_type == "query",
        )
    )
    total_queries = query_count.scalar() or 0

    # Total conversations
    conv_count = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == current_user.id)
    )
    total_conversations = conv_count.scalar() or 0

    # Total users (admin view)
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar() or 0

    # Average response time
    avg_time = await db.execute(
        select(func.avg(Message.response_time_ms)).where(
            Message.response_time_ms.isnot(None),
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == current_user.id)
            ),
        )
    )
    avg_response_time = avg_time.scalar()
    avg_response_time = round(avg_response_time, 2) if avg_response_time else None

    overview = AnalyticsOverview(
        total_documents=total_docs,
        total_queries=total_queries,
        total_users=total_users,
        total_conversations=total_conversations,
        avg_response_time_ms=avg_response_time,
    )

    # === Daily Usage (last 30 days) ===
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    events_result = await db.execute(
        select(AnalyticsEvent)
        .where(
            AnalyticsEvent.user_id == current_user.id,
            AnalyticsEvent.created_at >= thirty_days_ago,
            AnalyticsEvent.event_type.in_(["query", "upload"]),
        )
        .order_by(AnalyticsEvent.created_at)
    )
    events = events_result.scalars().all()

    # Group by date
    daily_map = {}
    for event in events:
        date_str = event.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_map:
            daily_map[date_str] = {"query_count": 0, "upload_count": 0}
        if event.event_type == "query":
            daily_map[date_str]["query_count"] += 1
        elif event.event_type == "upload":
            daily_map[date_str]["upload_count"] += 1

    daily_usage = [
        DailyUsage(date=date, query_count=data["query_count"], upload_count=data["upload_count"])
        for date, data in sorted(daily_map.items())
    ]

    # === Top Referenced Documents ===
    # Count document references in message sources
    msg_result = await db.execute(
        select(Message.sources_json)
        .where(
            Message.sources_json.isnot(None),
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == current_user.id)
            ),
        )
    )
    source_rows = msg_result.scalars().all()

    doc_ref_counts = {}
    for sources_json in source_rows:
        try:
            sources = json.loads(sources_json)
            for source in sources:
                name = source.get("document_name", "Unknown")
                doc_ref_counts[name] = doc_ref_counts.get(name, 0) + 1
        except (json.JSONDecodeError, TypeError):
            pass

    top_documents = [
        TopDocument(document_name=name, reference_count=count)
        for name, count in sorted(doc_ref_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    # === Recent Activity ===
    recent_events = await db.execute(
        select(AnalyticsEvent)
        .where(AnalyticsEvent.user_id == current_user.id)
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(20)
    )
    recent = recent_events.scalars().all()

    recent_activity = []
    for event in recent:
        description = event.event_type
        if event.metadata_json:
            try:
                meta = json.loads(event.metadata_json)
                if event.event_type == "upload":
                    description = f"Uploaded {meta.get('filename', meta.get('url', 'document'))}"
                elif event.event_type == "query":
                    description = f"Asked a question (conversation #{meta.get('conversation_id', '?')})"
                elif event.event_type == "login":
                    description = "Logged in"
                elif event.event_type == "register":
                    description = "Created account"
            except (json.JSONDecodeError, TypeError):
                pass

        recent_activity.append(RecentActivity(
            event_type=event.event_type,
            description=description,
            timestamp=event.created_at,
        ))

    return AnalyticsDashboard(
        overview=overview,
        daily_usage=daily_usage,
        top_documents=top_documents,
        recent_activity=recent_activity,
    )
