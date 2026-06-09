"""
Embedding service — generates vector embeddings using Google Gemini API.
Handles both document and query embeddings with proper task types.
"""

from google import genai
from app.core.config import settings

# Initialize Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)


async def embed_texts(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """
    Generate embeddings for a list of texts using Gemini.
    
    Args:
        texts: List of text strings to embed.
        task_type: Either 'RETRIEVAL_DOCUMENT' for documents or 'RETRIEVAL_QUERY' for queries.
    
    Returns:
        List of embedding vectors.
    """
    if not texts:
        return []

    # Process in batches of 100 (Gemini limit)
    all_embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        result = client.models.embed_content(
            model=f"models/{settings.EMBEDDING_MODEL}",
            contents=batch,
            config={
                "task_type": task_type,
                "output_dimensionality": settings.EMBEDDING_DIMENSIONS,
            },
        )
        all_embeddings.extend([emb.values for emb in result.embeddings])

    return all_embeddings


async def embed_query(query: str) -> list[float]:
    """
    Generate embedding for a single search query.
    Uses RETRIEVAL_QUERY task type for optimal query-document matching.
    """
    result = client.models.embed_content(
        model=f"models/{settings.EMBEDDING_MODEL}",
        contents=[query],
        config={
            "task_type": "RETRIEVAL_QUERY",
            "output_dimensionality": settings.EMBEDDING_DIMENSIONS,
        },
    )
    return result.embeddings[0].values


async def embed_document_chunks(chunks: list[str]) -> list[list[float]]:
    """
    Generate embeddings for document chunks.
    Uses RETRIEVAL_DOCUMENT task type for optimal indexing.
    """
    return await embed_texts(chunks, task_type="RETRIEVAL_DOCUMENT")
