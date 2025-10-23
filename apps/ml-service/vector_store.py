"""
Vector Store for Document Embeddings using ChromaDB
Stores and retrieves similar documents for RAG-based extraction
"""
import json
import logging
from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings
from ollama import Client
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, chromadb_host: str = None, ollama_host: str = None):
        """
        Initialize vector store with ChromaDB and Ollama clients
        
        Args:
            chromadb_host: ChromaDB host (default: chromadb:8000 for Docker, localhost:8001 for local)
            ollama_host: Ollama API host (default: http://ollama:11434 for Docker)
        """
        # Use different defaults for Docker vs local development
        default_chroma = os.getenv('CHROMADB_HOST', 'localhost:8001')
        default_ollama = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        
        chroma_host = chromadb_host or default_chroma
        ollama_url = ollama_host or default_ollama
        
        logger.info(f"Connecting to ChromaDB at {chroma_host}")
        logger.info(f"Connecting to Ollama at {ollama_url}")
        
        # Parse ChromaDB host
        chroma_host_clean = chroma_host.replace('http://', '').replace('https://', '')
        host_parts = chroma_host_clean.split(':')
        chroma_hostname = host_parts[0]
        chroma_port = int(host_parts[1]) if len(host_parts) > 1 else 8000
        
        # Initialize ChromaDB client
        try:
            # Create settings without chroma_api_impl (it's deprecated in newer versions)
            settings = Settings(
                anonymized_telemetry=True
            )
            
            self.chroma_client = chromadb.HttpClient(
                host=chroma_hostname,
                port=chroma_port,
                settings=settings
            )
            logger.info(f"Connected to ChromaDB at {chroma_hostname}:{chroma_port}")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            logger.error(f"Trying without custom settings...")
            try:
                # Fallback: try without settings
                self.chroma_client = chromadb.HttpClient(
                    host=chroma_hostname,
                    port=chroma_port
                )
                logger.info(f"Connected to ChromaDB (without custom settings)")
            except Exception as e2:
                logger.error(f"Failed even without settings: {e2}")
                raise
        
        # Initialize Ollama client for embeddings
        self.ollama_client = Client(host=ollama_url)
        self.embedding_model = os.getenv('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text')
        
        # Get or create collection for documents
        # Use get_or_create_collection to avoid version compatibility issues
        try:
            self.collection = self.chroma_client.get_or_create_collection(
                name="documents",
                metadata={"description": "Document OCR texts and extracted data"}
            )
            doc_count = self.collection.count()
            logger.info(f"Collection 'documents' ready with {doc_count} documents")
        except Exception as e:
            logger.error(f"Failed to initialize collection: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            raise
    
    def _get_embedding(self, text: str) -> List[float]:
        """
        Get embedding for text using Ollama
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding
        """
        try:
            # Use first 1000 characters for embedding (to avoid token limits)
            text_to_embed = text[:1000]
            
            response = self.ollama_client.embeddings(
                model=self.embedding_model,
                prompt=text_to_embed
            )
            
            return response['embedding']
        except Exception as e:
            logger.error(f"Failed to get embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 768  # Default embedding dimension
    
    def add_document(
        self,
        document_id: str,
        document_type: str,
        ocr_text: str,
        extracted_data: Dict
    ) -> bool:
        """
        Add a successfully processed document to the vector store
        
        Args:
            document_id: Unique identifier for the document
            document_type: Type of document (passport, driver_license, etc.)
            ocr_text: Original OCR text
            extracted_data: Successfully extracted structured data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Generate embedding
            embedding = self._get_embedding(ocr_text)
            
            # Prepare metadata
            metadata = {
                'document_type': document_type,
                'extracted_data': json.dumps(extracted_data, ensure_ascii=False),
                'ocr_length': len(ocr_text)
            }
            
            # Store in ChromaDB
            self.collection.add(
                ids=[document_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[ocr_text[:500]]  # Store first 500 chars as preview
            )
            
            logger.info(f"Added document {document_id} ({document_type}) to vector store")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document to vector store: {e}")
            return False
    
    def find_similar(
        self,
        ocr_text: str,
        document_type: str,
        n_results: int = 3
    ) -> List[Dict]:
        """
        Find similar documents of the same type
        
        Args:
            ocr_text: OCR text of the query document
            document_type: Type of document to search for
            n_results: Number of similar documents to return
            
        Returns:
            List of similar documents with their extracted data
        """
        try:
            # Generate embedding for query
            query_embedding = self._get_embedding(ocr_text)
            
            # Search in collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where={'document_type': document_type}
            )
            
            # Format results
            similar_docs = []
            if results and results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    doc = {
                        'id': results['ids'][0][i],
                        'ocr_preview': results['documents'][0][i],
                        'extracted_data': json.loads(results['metadatas'][0][i]['extracted_data']),
                        'distance': results['distances'][0][i] if 'distances' in results else None
                    }
                    similar_docs.append(doc)
                
                logger.info(f"Found {len(similar_docs)} similar {document_type} documents")
            else:
                logger.info(f"No similar {document_type} documents found in vector store")
            
            return similar_docs
            
        except Exception as e:
            logger.error(f"Failed to find similar documents: {e}")
            return []
    
    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the document collection
        
        Returns:
            Dict with collection statistics
        """
        try:
            total_count = self.collection.count()
            
            # Get all metadatas to count by type
            all_docs = self.collection.get()
            type_counts = {}
            
            if all_docs and all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    doc_type = metadata.get('document_type', 'unknown')
                    type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
            
            return {
                'total_documents': total_count,
                'by_type': type_counts
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {'total_documents': 0, 'by_type': {}}


# Global vector store instance
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Get or create the global vector store instance"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
