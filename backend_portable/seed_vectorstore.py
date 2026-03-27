"""
One-time script to seed the ChromaDB vector store with SOP documents.
Run: python seed_vectorstore.py [--force]
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from vector_store import ingest_sops

if __name__ == "__main__":
    force = "--force" in sys.argv
    n = ingest_sops(force=force)
    print(f"Done. {n} chunks in vector store.")
