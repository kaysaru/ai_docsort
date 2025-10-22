import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

/**
 * Runs OCR on a file to extract text
 * Supports images (jpg, png, etc.) and PDFs
 */
export async function runOCR(filePath: string): Promise<string> {
    try {
        const ext = path.extname(filePath).toLowerCase();
        
        // Handle PDF files
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            // Use dynamic require for CommonJS module
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(dataBuffer);
            return pdfData.text;
        }
        
        // Handle image files with Tesseract
        if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(ext)) {
            const result = await Tesseract.recognize(
                filePath,
                'rus+eng', // Russian and English languages
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );
            return result.data.text;
        }
        
        throw new Error(`Unsupported file format: ${ext}`);
    } catch (error) {
        console.error('OCR error:', error);
        throw error;
    }
}
