"""
FastAPI ML Service for Document Classification
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import logging

from classifier import get_classifier

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
