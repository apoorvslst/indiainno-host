"""
ChromaDB vector store initialization and SOP document ingestion.
Documents are split into chunks, embedded with sentence-transformers,
and persisted to disk so the store survives server restarts.
"""
from __future__ import annotations
import os
from pathlib import Path
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import FakeEmbeddings

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
SOPS_DIR = Path(__file__).parent / "sops"
COLLECTION_NAME = "infrastructure_sops"

_embedding_fn = None
_vector_store: Chroma | None = None


def _get_embeddings() -> FakeEmbeddings:
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = FakeEmbeddings(size=384)
    return _embedding_fn


def get_vector_store() -> Chroma:
    """Return (or lazily create) the singleton Chroma vector store."""
    global _vector_store
    if _vector_store is None:
        _vector_store = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=_get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _vector_store


def ingest_sops(force: bool = False) -> int:
    """
    Load all .txt SOP files from the sops/ directory into ChromaDB.
    Returns the number of chunks ingested.
    Skips if already populated unless force=True.
    """
    store = get_vector_store()

    # Check if already populated
    if not force:
        existing = store._collection.count()
        if existing > 0:
            print(f"[VectorStore] Already contains {existing} chunks — skipping ingest.")
            return existing

    print(f"[VectorStore] Ingesting SOPs from {SOPS_DIR} …")
    loader = DirectoryLoader(
        str(SOPS_DIR),
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
    )
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = splitter.split_documents(raw_docs)

    # Add source metadata
    for chunk in chunks:
        src = Path(chunk.metadata.get("source", "unknown")).stem
        chunk.metadata["document_name"] = src

    store.add_documents(chunks)
    print(f"[VectorStore] Ingested {len(chunks)} chunks from {len(raw_docs)} documents.")
    return len(chunks)


def retrieve_relevant_sops(query: str, k: int = 5) -> list[dict]:
    """
    Retrieve top-k SOP chunks relevant to the query.
    Returns list of dicts with 'content', 'document', 'score'.
    """
    store = get_vector_store()
    results = store.similarity_search_with_score(query, k=k)
    return [
        {
            "content": doc.page_content,
            "document": doc.metadata.get("document_name", "SOP"),
            "score": float(score),
        }
        for doc, score in results
    ]
