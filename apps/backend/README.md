# AI DocSort Backend

Backend server for document processing with OCR and ML-based document classification.

## Features

- **File Upload**: Files are uploaded to MinIO object storage via presigned URLs
- **OCR Processing**: Extracts text from documents using Tesseract.js (supports images and PDFs)
- **ML Classification**: Automatically classifies documents into types:
  - Passport (паспорт)
  - Driver License (водительское удостоверение)
  - ID Card (удостоверение личности)
  - Birth Certificate (свидетельство о рождении)
  - Diploma (диплом)
  - Certificate (сертификат)
- **Background Processing**: Uses BullMQ job queue with Redis for asynchronous processing
- **Status Tracking**: Track document processing status in real-time

## Architecture

```
1. Client uploads file to MinIO (presigned URL)
2. Client calls startUploadDocument with file metadata
3. Backend creates Document record in PostgreSQL
4. Job queued in Redis/BullMQ
5. Worker processes file:
   - Downloads from MinIO
   - Runs OCR (Tesseract.js)
   - Runs ML classification (pattern matching)
   - Updates Document record with results
6. Client polls getDocumentStatus or listDocuments
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- MinIO

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
PORT=3000
MINIO_HOST="localhost"
MINIO_PORT=9000
REDIS_PORT=6379
REDIS_HOST="localhost"
```

### Installation

```bash
# Install dependencies
pnpm install

# Setup database
npx prisma db push

# Seed test data
npx tsx prisma/seed.ts

# Start development server
pnpm dev
```

## API Endpoints (tRPC)

### `getUploadUrl`
Gets a presigned URL for uploading a file to MinIO.

**Input:**
```typescript
{
  filename: string;
  catalogCode: string;
}
```

**Output:**
```typescript
{
  url: string;        // Presigned MinIO upload URL
  objectName: string; // Object name in MinIO
}
```

### `startUploadDocument`
Starts document processing after file upload.

**Input:**
```typescript
{
  catalogCode: string;
  objectName: string;
  idn?: string;        // Optional identifier
}
```

**Output:**
```typescript
{
  documentId: number;
  jobId: string;
  status: string;
}
```

### `getDocumentStatus`
Check processing status of a document.

**Input:**
```typescript
{
  documentId: number;
}
```

**Output:**
```typescript
{
  id: number;
  filename: string;
  status: string;           // 'pending' | 'processing' | 'completed' | 'failed'
  documentType: string;     // Classification result
  confidence: number;       // 0.0 - 1.0
  error?: string;
  createdAt: Date;
  catalog: Catalog;
}
```

### `getDocument`
Get full document details including OCR text.

**Input:**
```typescript
{
  documentId: number;
}
```

**Output:**
```typescript
{
  id: number;
  filename: string;
  objectName: string;
  filePath: string;
  catalogId: number;
  catalog: Catalog;
  idn?: string;
  ocrText?: string;          // Extracted text
  documentType?: string;
  confidence?: number;
  status: string;
  jobId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `listDocuments`
List documents with optional filters.

**Input:**
```typescript
{
  catalogId?: number;
  status?: string;
  limit?: number;  // default: 50
}
```

## Document Processing

### Supported File Formats

**Images:**
- JPG/JPEG
- PNG
- BMP
- TIFF
- WebP

**Documents:**
- PDF

### OCR Languages

Currently configured for Russian and English (`rus+eng`). You can modify the language setting in `services/ocr.ts`.

### Document Classification

The ML service uses pattern matching with keywords and regular expressions to classify documents. It calculates a confidence score based on:
- Keyword matches (10 points each)
- Regex pattern matches (15 points each)
- Base confidence for document type

You can extend the classification by adding more patterns to `documentPatterns` in `services/ml.ts`.

## Database Schema

### Catalog
- Hierarchical catalog structure for organizing documents
- Each document belongs to one catalog

### Document
- Stores file metadata and processing results
- Tracks processing status
- Contains OCR text and ML classification results

## Testing

### Example Flow

```typescript
// 1. Get upload URL
const { url, objectName } = await trpc.getUploadUrl.mutate({
  filename: 'passport.jpg',
  catalogCode: 'passports'
});

// 2. Upload file to MinIO
await fetch(url, {
  method: 'PUT',
  body: fileBlob
});

// 3. Start processing
const { documentId } = await trpc.startUploadDocument.mutate({
  catalogCode: 'passports',
  objectName,
  idn: '123456789'
});

// 4. Check status
const status = await trpc.getDocumentStatus.query({
  documentId
});

// 5. Get full results
if (status.status === 'completed') {
  const doc = await trpc.getDocument.query({ documentId });
  console.log('OCR Text:', doc.ocrText);
  console.log('Document Type:', doc.documentType);
  console.log('Confidence:', doc.confidence);
}
```

## Monitoring

The worker logs processing progress:
- Download progress
- OCR progress
- Classification results
- Completion/failure status

Check the console output when running the server to monitor document processing.

## Production Considerations

1. **Error Handling**: Add retry logic for failed jobs
2. **File Storage**: Consider cleaning up temp files after processing
3. **Scaling**: Run multiple worker processes for parallel processing
4. **Security**: Add authentication/authorization
5. **ML Enhancement**: Replace pattern matching with actual ML models (TensorFlow.js, ONNX Runtime)
6. **Rate Limiting**: Add rate limiting for API endpoints
7. **File Size Limits**: Add file size validation
8. **Virus Scanning**: Add antivirus scanning before processing
