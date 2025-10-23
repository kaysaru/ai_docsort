/**
 * Classification result from ML service
 */
interface ClassificationResult {
    documentType: string;
    confidence: number;
}

/**
 * Extraction result from ML service
 */
interface ExtractionResult {
    extracted_data: Record<string, any>;
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

/**
 * Extracts structured information from document using RAG-enhanced ML service
 * @param documentType - Type of document (passport, driver_license, etc.)
 * @param ocrText - Text extracted from the document via OCR
 * @returns Extracted structured data
 */
export async function extractWithRAG(
    documentType: string,
    ocrText: string
): Promise<Record<string, any>> {
    if (!ocrText || ocrText.trim().length === 0) {
        return {};
    }

    try {
        console.log(`Calling ML service for RAG extraction (${documentType})...`);
        
        const response = await fetch(`${ML_SERVICE_URL}/extract-with-rag`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document_type: documentType,
                text: ocrText
            })
        });

        if (!response.ok) {
            throw new Error(`ML service returned ${response.status}: ${response.statusText}`);
        }

        const result: ExtractionResult = await response.json();
        
        console.log(`RAG extraction completed: ${Object.keys(result.extracted_data || {}).length} fields extracted`);
        
        return result.extracted_data || {};
        
    } catch (error) {
        console.error('RAG extraction error:', error);
        console.warn('Falling back to empty extraction');
        return {};
    }
}

/**
 * Get statistics about the vector store
 * @returns Statistics including total documents and breakdown by type
 */
export async function getVectorStoreStats(): Promise<{
    total_documents: number;
    by_type: Record<string, number>;
}> {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/stats`);
        
        if (!response.ok) {
            throw new Error(`ML service returned ${response.status}`);
        }
        
        const stats = await response.json();
        console.log(`Vector store stats: ${stats.total_documents} documents`);
        
        return stats;
    } catch (error) {
        console.error('Failed to get vector store stats:', error);
        return { total_documents: 0, by_type: {} };
    }
}
