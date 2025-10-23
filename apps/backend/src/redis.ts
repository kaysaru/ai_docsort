// src/redis.ts
import { RedisOptions } from "ioredis";
import { Queue, Worker } from "bullmq";
import { runOCR } from "./services/ocr";
import { runML } from "./services/ml";
import { prisma } from "./db/db";
import { minioClient } from "./minio";
import { mapDocumentTypeToCatalog } from "./services/catalogMapper";
import fs from "fs";
import path from "path";
import os from "os";

const connection: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

export const fileQueue = new Queue("file-processing", { connection });

const bucket = 'files';

// Worker for processing uploaded files
export const fileWorker = new Worker(
  "file-processing",
  async (job) => {
    const { documentId, objectName } = job.data;
    
    console.log(`Processing job ${job.id} for document ${documentId}`);

    try {
      // Update status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'processing' }
      });

      // Create temporary file path
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `doc_${documentId}_${Date.now()}_${path.basename(objectName)}`);

      console.log(`Downloading file from MinIO: ${objectName} to ${tempFilePath}`);
      
      // Download file from MinIO
      await minioClient.fGetObject(bucket, objectName, tempFilePath);

      console.log('Running OCR...');
      // Run OCR
      const ocrText = await runOCR(tempFilePath);
      
      console.log(`OCR completed. Extracted ${ocrText.length} characters`);
      console.log('Running ML classification...');
      
      // Run ML classification
      const mlResult = await runML(ocrText);
      
      console.log(`ML classification: ${mlResult.documentType} (${(mlResult.confidence * 100).toFixed(1)}% confidence)`);

      // Extract structured information using LLM
      console.log('Extracting structured information...');
      let extractedData = null;
      
      try {
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const extractResponse = await fetch(`${mlServiceUrl}/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type: mlResult.documentType,
            text: ocrText
          })
        });

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          extractedData = extractResult.extracted_data;
          console.log(`Extracted ${Object.keys(extractedData).length} fields`);
        } else {
          console.warn('Extraction failed, continuing without structured data');
        }
      } catch (extractError) {
        console.error('Extraction error:', extractError);
        console.warn('Continuing without structured data');
      }

      // Map document type to catalog
      const catalogCode = mapDocumentTypeToCatalog(mlResult.documentType);
      console.log(`Auto-assigning to catalog: ${catalogCode}`);
      
      // Find the target catalog
      const targetCatalog = await prisma.catalog.findFirst({
        where: { code: catalogCode }
      });

      if (!targetCatalog) {
        throw new Error(`Catalog with code ${catalogCode} not found`);
      }

      // Update document with results and assign to detected catalog
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          ocrText,
          documentType: mlResult.documentType,
          confidence: mlResult.confidence,
          extractedData: extractedData, // Store extracted structured data
          filePath: tempFilePath,
          catalogId: targetCatalog.id // Auto-assign catalog
        }
      });
      
      console.log(`Document assigned to catalog: ${targetCatalog.name}`);

      // Clean up temp file (optional - you may want to keep it)
      // fs.unlinkSync(tempFilePath);

      console.log(`Job ${job.id} completed successfully`);
      
      return {
        success: true,
        documentType: mlResult.documentType,
        confidence: mlResult.confidence,
        textLength: ocrText.length
      };
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Update document with error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  },
  { connection }
);

fileWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

fileWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with error: ${err.message}`);
});
