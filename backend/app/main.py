"""
ContextSync-AI — FastAPI Application Entry Point
Intelligent Retrieval-Augmented Generation system.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.models.schemas import HealthResponse
from app.routers import auth, documents, chat, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize database and directories on startup."""
    # Startup
    settings.ensure_directories()
    await init_db()
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} started successfully!")
    print(f"📁 ChromaDB: {settings.CHROMA_PERSIST_DIR}")
    print(f"📁 Uploads: {settings.UPLOAD_DIR}")
    yield
    # Shutdown
    print(f"👋 {settings.APP_NAME} shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="An intelligent RAG system that connects LLMs to your knowledge base.",
    lifespan=lifespan,
)

# CORS Middleware — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(analytics.router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
