"""
Document Classifier using Zero-Shot Classification
Uses facebook/bart-large-mnli for document type detection
"""
from transformers import pipeline
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentClassifier:
    def __init__(self, model_name: str = "facebook/bart-large-mnli"):
        """
        Initialize the document classifier with a zero-shot classification model
        
        Args:
            model_name: Hugging Face model name for zero-shot classification
        """
        logger.info(f"Loading model: {model_name}")
        self.classifier = pipeline(
            "zero-shot-classification",
            model=model_name,
            device=-1  # Use CPU (-1), change to 0 for GPU
        )
        
        # Define document types to classify
        self.document_types = [
            "passport",
            "driver license",
            "identification card",
            "birth certificate",
            "diploma",
            "certificate",
            "unknown document"
        ]
        
        # Mapping from model output to our document type codes
        self.type_mapping = {
            "passport": "passport",
            "driver license": "driver_license",
            "identification card": "id_card",
            "birth certificate": "birth_certificate",
            "diploma": "diploma",
            "certificate": "certificate",
            "unknown document": "unknown"
        }
        
        logger.info("Model loaded successfully")
    
    def classify(self, text: str) -> Dict[str, any]:
        """
        Classify document text into document types
        
        Args:
            text: OCR extracted text from document
            
        Returns:
            Dict with document_type, confidence, and all_scores
        """
        if not text or len(text.strip()) < 10:
            return {
                "document_type": "unknown",
                "confidence": 0.0,
                "all_scores": {}
            }
        
        # Truncate text if too long (model has token limits)
        max_chars = 1000
        text_to_classify = text[:max_chars] if len(text) > max_chars else text
        
        logger.info(f"Classifying text (length: {len(text_to_classify)})")
        
        # Perform zero-shot classification
        result = self.classifier(
            text_to_classify,
            candidate_labels=self.document_types,
            multi_label=False
        )
        
        # Get the top prediction
        top_label = result['labels'][0]
        top_score = result['scores'][0]
        
        # Map to our document type codes
        document_type = self.type_mapping.get(top_label, "unknown")
        
        # Create scores dict with all predictions
        all_scores = {
            self.type_mapping.get(label, label): float(score)
            for label, score in zip(result['labels'], result['scores'])
        }
        
        logger.info(f"Classification result: {document_type} (confidence: {top_score:.2f})")
        
        return {
            "document_type": document_type,
            "confidence": float(top_score),
            "all_scores": all_scores
        }


# Global classifier instance (loaded once on startup)
_classifier = None


def get_classifier() -> DocumentClassifier:
    """Get or create the global classifier instance"""
    global _classifier
    if _classifier is None:
        _classifier = DocumentClassifier()
    return _classifier
