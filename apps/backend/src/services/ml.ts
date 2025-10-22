/**
 * Classification result from ML service
 */
interface ClassificationResult {
    documentType: string;
    confidence: number;
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Classifies document using FastAPI ML service with transformers
 * @param ocrText - Text extracted from the document via OCR
 * @returns Classification result with document type and confidence score
 */
export async function runML(ocrText: string): Promise<ClassificationResult> {
    if (!ocrText || ocrText.trim().length === 0) {
        return {
            documentType: 'unknown',
            confidence: 0
        };
    }

    try {
        console.log('Calling ML service for classification...');
        
        const response = await fetch(`${ML_SERVICE_URL}/classify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: ocrText })
        });

        if (!response.ok) {
            throw new Error(`ML service returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        console.log(`ML classification: ${result.document_type} (${(result.confidence * 100).toFixed(1)}%)`);
        
        return {
            documentType: result.document_type,
            confidence: result.confidence
        };
        
    } catch (error) {
        console.error('ML service error:', error);
        console.warn('Falling back to unknown classification');
        
        // Fallback to unknown if ML service is unavailable
        return {
            documentType: 'unknown',
            confidence: 0
        };
    }
}
