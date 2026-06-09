"""
Pydantic schemas for request/response validation across all API endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


# ==========================================
# Auth Schemas
# ==========================================

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==========================================
# Document Schemas
# ==========================================

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    doc_type: str
    file_size: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentURLRequest(BaseModel):
    url: str = Field(description="Web URL to ingest")
    title: Optional[str] = Field(default=None, description="Optional title for the document")


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


# ==========================================
# Chat Schemas
# ==========================================

class SourceCitation(BaseModel):
    document_name: str
    chunk_text: str
    page_number: Optional[int] = None
    relevance_score: float
    chunk_index: int


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    conversation_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: list[SourceCitation] = []
    response_time_ms: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int


class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    messages: list[ChatMessageResponse]
    created_at: datetime


# ==========================================
# Analytics Schemas
# ==========================================

class AnalyticsOverview(BaseModel):
    total_documents: int
    total_queries: int
    total_users: int
    total_conversations: int
    avg_response_time_ms: Optional[float] = None


class DailyUsage(BaseModel):
    date: str
    query_count: int
    upload_count: int


class TopDocument(BaseModel):
    document_name: str
    reference_count: int


class RecentActivity(BaseModel):
    event_type: str
    description: str
    timestamp: datetime
    user_email: Optional[str] = None


class AnalyticsDashboard(BaseModel):
    overview: AnalyticsOverview
    daily_usage: list[DailyUsage]
    top_documents: list[TopDocument]
    recent_activity: list[RecentActivity]


# ==========================================
# Common Schemas
# ==========================================

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str


class ErrorResponse(BaseModel):
    detail: str
