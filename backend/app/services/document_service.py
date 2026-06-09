"""
Document ingestion service — parses, chunks, embeds, and stores documents in Qdrant.
Supports PDF, DOCX, TXT, Web URLs, and code files.
"""

import os
import uuid
import httpx
from pathlib import Path
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.services.embedding_service import embed_document_chunks

# Initialize Qdrant local persistent client
qdrant_client = QdrantClient(path=settings.QDRANT_PERSIST_DIR)

# Code file extensions
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".sql", ".sh", ".bash", ".yaml", ".yml",
    ".json", ".xml", ".md", ".toml", ".ini", ".cfg",
}


def get_collection_name():
    """Get or create the Qdrant collection."""
    if not qdrant_client.collection_exists(settings.QDRANT_COLLECTION_NAME):
        qdrant_client.create_collection(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            vectors_config=VectorParams(size=settings.EMBEDDING_DIMENSIONS, distance=Distance.COSINE),
        )
    return settings.QDRANT_COLLECTION_NAME


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """Create a recursive text splitter with configured chunk size and overlap."""
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


# ==========================================
# Document Parsers
# ==========================================

def parse_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF with page tracking."""
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append({
                "text": text.strip(),
                "page_number": i + 1,
            })
    return pages


def parse_docx(file_path: str) -> list[dict]:
    """Extract paragraphs from DOCX."""
    doc = DocxDocument(file_path)
    full_text = "\n\n".join(para.text for para in doc.paragraphs if para.text.strip())
    return [{"text": full_text, "page_number": 1}] if full_text else []


def parse_txt(file_path: str) -> list[dict]:
    """Read plain text file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    return [{"text": text, "page_number": 1}] if text.strip() else []


def parse_code(file_path: str) -> list[dict]:
    """Parse code files with language detection."""
    ext = Path(file_path).suffix
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    if text.strip():
        return [{"text": f"```{ext.lstrip('.')}\n{text}\n```", "page_number": 1}]
    return []


async def parse_url(url: str) -> list[dict]:
    """Crawl and extract text from a web URL."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url, headers={
            "User-Agent": "ContextSync-AI/1.0 (Document Ingestion Bot)"
        })
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header"]):
        element.decompose()

    text = soup.get_text(separator="\n", strip=True)
    # Clean up excessive whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    clean_text = "\n".join(lines)

    return [{"text": clean_text, "page_number": 1}] if clean_text else []


# ==========================================
# Core Ingestion Pipeline
# ==========================================

def detect_doc_type(filename: str) -> str:
    """Detect document type from file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in (".docx", ".doc"):
        return "docx"
    elif ext == ".txt":
        return "txt"
    elif ext in CODE_EXTENSIONS:
        return "code"
    else:
        return "txt"  # fallback


async def ingest_file(
    file_path: str,
    original_filename: str,
    doc_type: str,
    user_id: int,
    document_id: int,
) -> int:
    """
    Full ingestion pipeline for a file:
    1. Parse the document
    2. Split into chunks
    3. Generate embeddings
    4. Store in Qdrant with metadata
    
    Returns the number of chunks created.
    """
    # Step 1: Parse
    if doc_type == "pdf":
        pages = parse_pdf(file_path)
    elif doc_type == "docx":
        pages = parse_docx(file_path)
    elif doc_type == "code":
        pages = parse_code(file_path)
    else:
        pages = parse_txt(file_path)

    if not pages:
        raise ValueError("No text content could be extracted from the document.")

    # Step 2: Split into chunks
    splitter = get_text_splitter()
    chunks = []
    chunk_metadata = []

    for page_data in pages:
        page_chunks = splitter.split_text(page_data["text"])
        for i, chunk in enumerate(page_chunks):
            chunks.append(chunk)
            chunk_metadata.append({
                "document_id": str(document_id),
                "user_id": str(user_id),
                "document_name": original_filename,
                "page_number": page_data.get("page_number", 1),
                "chunk_index": len(chunks) - 1,
                "doc_type": doc_type,
            })

    if not chunks:
        raise ValueError("Document produced no chunks after splitting.")

    # Step 3: Generate embeddings
    embeddings = await embed_document_chunks(chunks)

    # Step 4: Store in Qdrant
    collection_name = get_collection_name()
    
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=emb,
            payload={"text": text, **meta}
        )
        for emb, text, meta in zip(embeddings, chunks, chunk_metadata)
    ]

    qdrant_client.upsert(
        collection_name=collection_name,
        points=points,
    )

    return len(chunks)


async def ingest_url(
    url: str,
    user_id: int,
    document_id: int,
    title: Optional[str] = None,
) -> int:
    """
    Ingest content from a web URL.
    Returns the number of chunks created.
    """
    pages = await parse_url(url)
    if not pages:
        raise ValueError("No content could be extracted from the URL.")

    doc_name = title or url
    splitter = get_text_splitter()
    chunks = []
    chunk_metadata = []

    for page_data in pages:
        page_chunks = splitter.split_text(page_data["text"])
        for chunk in page_chunks:
            chunks.append(chunk)
            chunk_metadata.append({
                "document_id": str(document_id),
                "user_id": str(user_id),
                "document_name": doc_name,
                "page_number": 1,
                "chunk_index": len(chunks) - 1,
                "doc_type": "url",
                "source_url": url,
            })

    if not chunks:
        raise ValueError("URL content produced no chunks after splitting.")

    embeddings = await embed_document_chunks(chunks)
    collection_name = get_collection_name()
    
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=emb,
            payload={"text": text, **meta}
        )
        for emb, text, meta in zip(embeddings, chunks, chunk_metadata)
    ]

    qdrant_client.upsert(
        collection_name=collection_name,
        points=points,
    )

    return len(chunks)


def delete_document_chunks(document_id: int) -> None:
    """Delete all chunks belonging to a document from Qdrant."""
    collection_name = get_collection_name()
    qdrant_client.delete(
        collection_name=collection_name,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=str(document_id))
                )
            ]
        )
    )


def get_collection_stats() -> dict:
    """Get statistics about the Qdrant collection."""
    try:
        collection_name = get_collection_name()
        info = qdrant_client.get_collection(collection_name)
        return {
            "total_chunks": info.points_count,
            "collection_name": settings.QDRANT_COLLECTION_NAME,
        }
    except Exception:
        return {
            "total_chunks": 0,
            "collection_name": settings.QDRANT_COLLECTION_NAME,
        }
