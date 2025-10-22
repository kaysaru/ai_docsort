/**
 * Document type patterns for classification
 */
interface DocumentPattern {
    type: string;
    keywords: string[];
    patterns: RegExp[];
    confidence: number;
}

const documentPatterns: DocumentPattern[] = [
    {
        type: 'passport',
        keywords: ['паспорт', 'passport', 'удостоверение личности', 'фамилия', 'имя', 'отчество', 'дата рождения'],
        patterns: [
            /паспорт/i,
            /passport/i,
            /личность/i,
            /[а-я]{2}\s*№\s*\d{7}/i, // Russian passport pattern
        ],
        confidence: 0.8
    },
    {
        type: 'driver_license',
        keywords: ['водительское удостоверение', 'driver', 'license', 'категория', 'category', 'водитель'],
        patterns: [
            /водительск/i,
            /driver.*license/i,
            /категор[ия]/i,
            /водитель/i,
        ],
        confidence: 0.8
    },
    {
        type: 'id_card',
        keywords: ['удостоверение', 'id card', 'identification', 'личность'],
        patterns: [
            /удостоверение/i,
            /id\s*card/i,
            /identification/i,
        ],
        confidence: 0.7
    },
    {
        type: 'birth_certificate',
        keywords: ['свидетельство о рождении', 'birth certificate', 'рождение', 'birth'],
        patterns: [
            /свидетельство.*рождени/i,
            /birth.*certificate/i,
        ],
        confidence: 0.8
    },
    {
        type: 'diploma',
        keywords: ['диплом', 'diploma', 'образование', 'университет', 'university', 'институт'],
        patterns: [
            /диплом/i,
            /diploma/i,
            /университет/i,
            /university/i,
        ],
        confidence: 0.7
    },
    {
        type: 'certificate',
        keywords: ['сертификат', 'certificate', 'свидетельство'],
        patterns: [
            /сертификат/i,
            /certificate/i,
            /свидетельство/i,
        ],
        confidence: 0.6
    }
];

/**
 * Classification result
 */
interface ClassificationResult {
    documentType: string;
    confidence: number;
}

/**
 * Analyzes OCR text and classifies the document type using pattern matching
 * @param ocrText - Text extracted from the document via OCR
 * @returns Classification result with document type and confidence score
 */
export function runML(ocrText: string): ClassificationResult {
    if (!ocrText || ocrText.trim().length === 0) {
        return {
            documentType: 'unknown',
            confidence: 0
        };
    }

    const text = ocrText.toLowerCase();
    const scores: { type: string; score: number; baseConfidence: number }[] = [];

    // Calculate score for each document type
    for (const pattern of documentPatterns) {
        let score = 0;
        
        // Check keywords
        const keywordMatches = pattern.keywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
        ).length;
        score += keywordMatches * 10;
        
        // Check regex patterns
        const patternMatches = pattern.patterns.filter(regex => 
            regex.test(text)
        ).length;
        score += patternMatches * 15;
        
        if (score > 0) {
            scores.push({
                type: pattern.type,
                score,
                baseConfidence: pattern.confidence
            });
        }
    }

    // Sort by score and get the best match
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
        return {
            documentType: 'unknown',
            confidence: 0
        };
    }

    const bestMatch = scores[0];
    
    // Calculate final confidence (normalize score and combine with base confidence)
    const normalizedScore = Math.min(bestMatch.score / 50, 1); // Normalize to 0-1
    const finalConfidence = (normalizedScore * 0.7 + bestMatch.baseConfidence * 0.3);

    return {
        documentType: bestMatch.type,
        confidence: Math.min(finalConfidence, 0.95) // Cap at 95%
    };
}
