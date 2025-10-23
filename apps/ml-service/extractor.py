"""
Document Information Extractor using Ollama LLM
Extracts structured information from OCR text based on document type
"""
import json
import logging
from typing import Dict, Optional
from ollama import Client
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentExtractor:
    def __init__(self, ollama_host: str = None):
        """
        Initialize the document extractor with Ollama client
        
        Args:
            ollama_host: Ollama API host (default: http://localhost:11434)
        """
        host = ollama_host or os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        logger.info(f"Connecting to Ollama at {host}")
        self.client = Client(host=host)
        self.model = os.getenv('OLLAMA_MODEL', 'qwen2.5:3b')
        
        # Document type schemas
        self.schemas = {
            'passport': {
                'fullName': 'Full name (Family name, First name, Patronymic)',
                'dateOfBirth': 'Date of birth in format DD.MM.YYYY',
                'sex': 'Sex/Gender (M or F)',
                'passportNumber': 'Passport number',
                'issueDate': 'Issue date in format DD.MM.YYYY',
                'issuedBy': 'Issuing authority',
                'citizenship': 'Citizenship/Nationality'
            },
            'driver_license': {
                'fullName': 'Full name',
                'licenseNumber': 'License number',
                'dateOfBirth': 'Date of birth in format DD.MM.YYYY',
                'categories': 'List of driving categories (e.g., ["A", "B", "C"])',
                'issueDate': 'Issue date in format DD.MM.YYYY',
                'expiryDate': 'Expiry date in format DD.MM.YYYY'
            },
            'id_card': {
                'fullName': 'Full name',
                'idNumber': 'ID card number',
                'dateOfBirth': 'Date of birth in format DD.MM.YYYY',
                'sex': 'Sex/Gender (M or F)',
                'issueDate': 'Issue date in format DD.MM.YYYY',
                'expiryDate': 'Expiry date in format DD.MM.YYYY',
                'citizenship': 'Citizenship/Nationality'
            },
            'birth_certificate': {
                'childName': 'Child\'s full name',
                'dateOfBirth': 'Date of birth in format DD.MM.YYYY',
                'placeOfBirth': 'Place of birth (city/region)',
                'fatherName': 'Father\'s full name',
                'motherName': 'Mother\'s full name',
                'certificateNumber': 'Certificate number',
                'issueDate': 'Issue date in format DD.MM.YYYY'
            },
            'diploma': {
                'graduateName': 'Graduate\'s full name',
                'degree': 'Degree/Qualification obtained',
                'institution': 'Educational institution name',
                'specialization': 'Field of study/Specialization',
                'graduationDate': 'Graduation date (year or DD.MM.YYYY)',
                'diplomaNumber': 'Diploma/Certificate number'
            },
            'certificate': {
                'holderName': 'Certificate holder\'s name',
                'certificateType': 'Type of certificate',
                'issueDate': 'Issue date in format DD.MM.YYYY',
                'expiryDate': 'Expiry date in format DD.MM.YYYY',
                'issuingOrganization': 'Issuing organization',
                'certificateNumber': 'Certificate number'
            }
        }
    
    def get_schema_prompt(self, document_type: str) -> str:
        """Generate schema description for prompt"""
        schema = self.schemas.get(document_type, {})
        if not schema:
            return "Extract any relevant information"
        
        fields = []
        for field, description in schema.items():
            fields.append(f'  "{field}": {description}')
        
        return "{\n" + ",\n".join(fields) + "\n}"
    
    def extract(self, document_type: str, ocr_text: str) -> Dict:
        """
        Extract structured information from OCR text
        
        Args:
            document_type: Type of document (passport, driver_license, etc.)
            ocr_text: OCR extracted text
            
        Returns:
            Dict with extracted fields
        """
        if not ocr_text or len(ocr_text.strip()) < 10:
            logger.warning("OCR text too short for extraction")
            return {}
        
        # Get schema for this document type
        schema_prompt = self.get_schema_prompt(document_type)
        
        # Construct prompt
        prompt = f"""You are an AI assistant that extracts structured information from documents.

Document Type: {document_type.replace('_', ' ').title()}

OCR Text (may contain errors):
{ocr_text[:2000]}  

Task: Extract the following information and return ONLY valid JSON:
{schema_prompt}

Rules:
1. If a field is not found in the text, use null
2. For dates, try to use DD.MM.YYYY format
3. For names, use UPPERCASE if that's how they appear
4. For categories (driver license), return as array of strings
5. Clean up OCR errors where possible
6. Return ONLY the JSON object, no other text

JSON Output:"""

        try:
            logger.info(f"Extracting {document_type} information using {self.model}")
            
            # Call Ollama
            response = self.client.chat(
                model=self.model,
                messages=[{
                    'role': 'user',
                    'content': prompt
                }],
                format='json',  # Force JSON output
                options={
                    'temperature': 0,  # Deterministic
                    'num_predict': 500,  # Max tokens
                }
            )
            
            # Parse response
            content = response['message']['content']
            extracted_data = json.loads(content)
            
            logger.info(f"Successfully extracted {len(extracted_data)} fields")
            return extracted_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from LLM response: {e}")
            logger.error(f"Response was: {content[:200]}")
            return {}
        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            return {}


# Global extractor instance
_extractor: Optional[DocumentExtractor] = None


def get_extractor() -> DocumentExtractor:
    """Get or create the global extractor instance"""
    global _extractor
    if _extractor is None:
        _extractor = DocumentExtractor()
    return _extractor
