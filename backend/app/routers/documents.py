"""
Document management router — upload, list, and delete documents.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, User, Document, AnalyticsEvent
from app.models.schemas import DocumentResponse, DocumentListResponse, DocumentURLRequest
from app.services.auth_service import get_current_user
from app.services.document_service import (
    ingest_file,
    ingest_url,
    delete_document_chunks,
    detect_doc_type,
)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".txt",
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".sql", ".sh", ".bash", ".yaml", ".yml",
    ".json", ".xml", ".md", ".toml", ".ini", ".cfg",
}


async def process_file_background(
    file_path: str,
    original_filename: str,
    doc_type: str,
    user_id: int,
    document_id: int,
    db_url: str,
):
    """Background task to process and ingest a document."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.core.database import Document

    engine = create_async_engine(db_url, connect_args={"check_same_thread": False})
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        try:
            chunk_count = await ingest_file(
                file_path, original_filename, doc_type, user_id, document_id
            )
            # Update document status
            result = await session.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one()
            doc.chunk_count = chunk_count
            doc.status = "ready"
            await session.commit()
        except Exception as e:
            result = await session.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one()
            doc.status = "error"
            doc.error_message = str(e)[:500]
            await session.commit()
        finally:
            await engine.dispose()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a document file (PDF, DOCX, TXT, or code files)."""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Validate file size
    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Save file to disk
    settings.ensure_directories()
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Detect document type
    doc_type = detect_doc_type(file.filename)

    # Create database record
    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        doc_type=doc_type,
        file_size=file_size,
        status="processing",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    # Log analytics event
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type="upload",
        metadata_json=f'{{"filename": "{file.filename}", "doc_type": "{doc_type}"}}',
    )
    db.add(event)

    # Process in background
    background_tasks.add_task(
        process_file_background,
        file_path,
        file.filename,
        doc_type,
        current_user.id,
        document.id,
        settings.DATABASE_URL,
    )

    return DocumentResponse.model_validate(document)


@router.post("/url", response_model=DocumentResponse)
async def ingest_from_url(
    data: DocumentURLRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ingest content from a web URL."""
    doc_title = data.title or data.url

    # Create database record
    document = Document(
        user_id=current_user.id,
        filename=data.url,
        original_filename=doc_title,
        doc_type="url",
        file_size=0,
        status="processing",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    # Log analytics
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type="upload",
        metadata_json=f'{{"url": "{data.url}", "doc_type": "url"}}',
    )
    db.add(event)

    # Process URL in background
    async def process_url_bg():
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession as AS
        from app.core.database import Document as Doc
        
        eng = create_async_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
        sf = async_sessionmaker(eng, class_=AS, expire_on_commit=False)
        async with sf() as sess:
            try:
                chunk_count = await ingest_url(data.url, current_user.id, document.id, doc_title)
                result = await sess.execute(select(Doc).where(Doc.id == document.id))
                doc = result.scalar_one()
                doc.chunk_count = chunk_count
                doc.status = "ready"
                await sess.commit()
            except Exception as e:
                result = await sess.execute(select(Doc).where(Doc.id == document.id))
                doc = result.scalar_one()
                doc.status = "error"
                doc.error_message = str(e)[:500]
                await sess.commit()
            finally:
                await eng.dispose()

    background_tasks.add_task(process_url_bg)

    return DocumentResponse.model_validate(document)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in documents],
        total=len(documents),
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its chunks from ChromaDB."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Delete chunks from ChromaDB
    try:
        delete_document_chunks(document_id)
    except Exception:
        pass  # ChromaDB cleanup is best-effort

    # Delete file from disk
    file_path = os.path.join(settings.UPLOAD_DIR, document.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete from database
    await db.delete(document)

    return {"detail": "Document deleted successfully"}


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return DocumentResponse.model_validate(document)
