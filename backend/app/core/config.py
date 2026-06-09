"""
Centralized application configuration using Pydantic Settings.
Loads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # === App Settings ===
    APP_NAME: str = "ContextSync-AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # === API Settings ===
    API_PREFIX: str = "/api"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # === Google Gemini API ===
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768

    # === Qdrant ===
    QDRANT_PERSIST_DIR: str = str(Path(__file__).parent.parent.parent / "data" / "qdrant")
    QDRANT_COLLECTION_NAME: str = "contextsync_documents"

    # === File Storage ===
    UPLOAD_DIR: str = str(Path(__file__).parent.parent.parent / "data" / "uploads")
    MAX_FILE_SIZE_MB: int = 50

    # === Database ===
    DATABASE_URL: str = f"sqlite+aiosqlite:///{Path(__file__).parent.parent.parent / 'data' / 'contextsync.db'}"

    # === JWT Authentication ===
    JWT_SECRET: str = "contextsync-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # === RAG Pipeline ===
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K: int = 5
    MAX_CONTEXT_LENGTH: int = 8000

    # === Rate Limiting ===
    RATE_LIMIT: str = "30/minute"

    model_config = {
        "env_file": str(Path(__file__).parent.parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        os.makedirs(self.QDRANT_PERSIST_DIR, exist_ok=True)
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(Path(self.DATABASE_URL.replace("sqlite+aiosqlite:///", "")).parent, exist_ok=True)


# Singleton instance
settings = Settings()
