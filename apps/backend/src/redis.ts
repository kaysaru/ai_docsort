// src/redis.ts
import { RedisOptions } from "ioredis";
import { Queue, Worker } from "bullmq";
import { runOCR } from "./services/ocr";
import { runML } from "./services/ml";
import { prisma } from "./db/db";
import { minioClient } from "./minio";
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
      const mlResult = runML(ocrText);
      
      console.log(`ML classification: ${mlResult.documentType} (${(mlResult.confidence * 100).toFixed(1)}% confidence)`);

      // Update document with results
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          ocrText,
          documentType: mlResult.documentType,
          confidence: mlResult.confidence,
          filePath: tempFilePath
        }
      });

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
