"""
FastAPI ML Service for Document Classification
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import logging

from classifier import get_classifier
from extractor import get_extractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Document Classification ML Service",
    description="ML service for classifying documents using transformers",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassificationRequest(BaseModel):
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Passport of the Russian Federation. Family name: IVANOV..."
            }
        }


class ClassificationResponse(BaseModel):
    document_type: str
    confidence: float
    all_scores: Dict[str, float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_type": "passport",
                "confidence": 0.89,
                "all_scores": {
                    "passport": 0.89,
                    "driver_license": 0.05,
                    "id_card": 0.03
                }
            }
        }


@app.on_event("startup")
async def startup_event():
    """Load the ML model on startup"""
    logger.info("Starting ML service...")
    logger.info("Loading classifier model (this may take a minute)...")
    get_classifier()  # Pre-load the model
    logger.info("ML service ready!")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Document Classification ML Service",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/classify", response_model=ClassificationResponse)
async def classify_document(request: ClassificationRequest):
    """
    Classify a document based on OCR extracted text
    
    Args:
        request: Classification request with text
        
    Returns:
        Classification result with document type and confidence
    """
    try:
        if not request.text or len(request.text.strip()) < 5:
            raise HTTPException(
                status_code=400,
                detail="Text too short for classification"
            )
        
        logger.info(f"Received classification request (text length: {len(request.text)})")
        
        classifier = get_classifier()
        result = classifier.classify(request.text)
        
        return ClassificationResponse(**result)
        
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(e)}"
        )


class ExtractionRequest(BaseModel):
    document_type: str
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_type": "passport",
                "text": "ПАСПОРТ ГРАЖДАНИНА РФ\nФамилия ИВАНОВ\nИмя ИВАН..."
            }
        }


class ExtractionResponse(BaseModel):
    extracted_data: Dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "extracted_data": {
                    "fullName": "ИВАНОВ ИВАН ИВАНОВИЧ",
                    "dateOfBirth": "01.01.1990",
                    "sex": "M",
                    "passportNumber": "1234 567890"
                }
            }
        }


@app.post("/extract", response_model=ExtractionResponse)
async def extract_document_info(request: ExtractionRequest):
    """
    Extract structured information from OCR text based on document type
    
    Args:
        request: Extraction request with document type and text
        
    Returns:
        Extracted structured information
    """
    try:
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Text too short for extraction"
            )
        
        if not request.document_type:
            raise HTTPException(
                status_code=400,
                detail="Document type is required"
            )
        
        logger.info(f"Received extraction request for {request.document_type} (text length: {len(request.text)})")
        
        extractor = get_extractor()
        extracted_data = extractor.extract(request.document_type, request.text)
        
        return ExtractionResponse(extracted_data=extracted_data)
        
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
