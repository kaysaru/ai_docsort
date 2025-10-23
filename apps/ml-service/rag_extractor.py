"""
RAG-Enhanced Document Extractor
Uses similar document examples to improve extraction accuracy
"""
import json
import logging
from typing import Dict, List
from extractor import DocumentExtractor
from vector_store import get_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGExtractor(DocumentExtractor):
    """
    Enhanced document extractor that uses RAG (Retrieval-Augmented Generation)
    to improve extraction accuracy by learning from similar documents
    """
    
    def __init__(self, ollama_host: str = None):
        """
        Initialize RAG extractor
        
        Args:
            ollama_host: Ollama API host
        """
        super().__init__(ollama_host)
        self.vector_store = get_vector_store()
        logger.info("RAG Extractor initialized with vector store")
    
    def _format_examples(self, similar_docs: List[Dict]) -> str:
        """
        Format similar documents as few-shot examples for the prompt
        
        Args:
            similar_docs: List of similar documents with extracted data
            
        Returns:
            Formatted string with examples
        """
        if not similar_docs:
            return ""
        
        examples = []
        for i, doc in enumerate(similar_docs, 1):
            ocr_preview = doc.get('ocr_preview', '')[:300]  # First 300 chars
            extracted = doc.get('extracted_data', {})
            
            example = f"""Example {i}:
OCR Text (preview):
{ocr_preview}

Extracted Data:
{json.dumps(extracted, indent=2, ensure_ascii=False)}
"""
            examples.append(example)
        
        return "\n---\n".join(examples)
    
    def extract_with_rag(
        self,
        document_type: str,
        ocr_text: str,
        save_result: bool = True
    ) -> Dict:
        """
        Extract information using RAG - enhanced with similar document examples
        
        Args:
            document_type: Type of document (passport, driver_license, etc.)
            ocr_text: OCR extracted text
            save_result: Whether to save successful extraction to vector store
            
        Returns:
            Dict with extracted fields
        """
        if not ocr_text or len(ocr_text.strip()) < 10:
            logger.warning("OCR text too short for extraction")
            return {}
        
        # Find similar documents
        similar_docs = self.vector_store.find_similar(
            ocr_text=ocr_text,
            document_type=document_type,
            n_results=3
        )
        
        # If no similar documents found, fall back to regular extraction
        if not similar_docs:
            logger.info(f"No similar documents found, using standard extraction")
            return self.extract(document_type, ocr_text)
        
        # Build enhanced prompt with examples
        schema_prompt = self.get_schema_prompt(document_type)
        examples_text = self._format_examples(similar_docs)
        
        prompt = f"""You are an AI assistant that extracts structured information from documents.

Document Type: {document_type.replace('_', ' ').title()}

Here are {len(similar_docs)} similar documents that were successfully processed:

{examples_text}

---

Now, extract information from this NEW document (it may have OCR errors - use the examples above to help correct them):

OCR Text:
{ocr_text[:2000]}

Task: Extract the following fields and return ONLY valid JSON:
{schema_prompt}

Important Rules:
1. Look at the examples above to understand the correct format and field patterns
2. Use the examples to help correct any OCR errors in the new document
3. If a field is not found, use null
4. For dates, use DD.MM.YYYY format (as shown in examples)
5. For names, maintain UPPERCASE format if that's how they appear
6. For categories (driver license), return as array of strings
7. Clean up obvious OCR errors based on the patterns you see in examples
8. Return ONLY the JSON object, no other text

JSON Output:"""

        try:
            logger.info(f"Extracting {document_type} with RAG ({len(similar_docs)} examples)")
            
            # Call Ollama with enhanced prompt
            response = self.client.chat(
                model=self.model,
                messages=[{
                    'role': 'user',
                    'content': prompt
                }],
                format='json',
                options={
                    'temperature': 0,  # Deterministic
                    'num_predict': 500,
                }
            )
            
            # Parse response
            content = response['message']['content']
            extracted_data = json.loads(content)
            
            logger.info(f"Successfully extracted {len(extracted_data)} fields using RAG")
            
            # Save to vector store if successful and requested
            if save_result and extracted_data:
                # Generate a simple document ID (in production, use actual doc ID)
                doc_id = f"{document_type}_{hash(ocr_text[:100])}"
                self.vector_store.add_document(
                    document_id=doc_id,
                    document_type=document_type,
                    ocr_text=ocr_text,
                    extracted_data=extracted_data
                )
            
            return extracted_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from LLM response: {e}")
            logger.error(f"Response was: {content[:200]}")
            # Fall back to standard extraction
            return self.extract(document_type, ocr_text)
        except Exception as e:
            logger.error(f"RAG extraction failed: {str(e)}")
            # Fall back to standard extraction
            return self.extract(document_type, ocr_text)
    
    def get_stats(self) -> Dict:
        """
        Get statistics about the vector store
        
        Returns:
            Dict with statistics
        """
        return self.vector_store.get_collection_stats()


# Global RAG extractor instance
_rag_extractor = None


def get_rag_extractor() -> RAGExtractor:
    """Get or create the global RAG extractor instance"""
    global _rag_extractor
    if _rag_extractor is None:
        _rag_extractor = RAGExtractor()
    return _rag_extractor
