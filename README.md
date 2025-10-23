# AI DocSort

Intelligent document sorting system with automatic catalog detection using OCR and Machine Learning.

## 🎯 Features

- **Automatic Document Classification** - Upload documents without selecting a category
- **OCR Text Extraction** - Extracts text from PDFs and images (Russian + English)
- **ML-Powered Detection** - Uses Hugging Face Transformers for document type recognition
- **LLM Information Extraction** - Uses Ollama to extract structured data from documents
- **Auto-Catalog Assignment** - Automatically organizes documents into correct catalogs
- **Real-time Processing** - Watch documents being processed with live status updates
- **Interactive Document Details** - Click documents to view extracted information in a modal
- **Background Workers** - Async processing with BullMQ job queue

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + Vite + TanStack Router
│   (Port 5173)   │  Drag & drop uploads, real-time status
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
┌────────▼────────┐                   ┌───────▼────────┐
│   Backend       │                   │  ML Service    │
│   (Port 3000)   │◄──────────────────│  (Port 8000)   │
│                 │   Classify text   │                │
│  Node.js/tRPC   │                   │  FastAPI       │
│  + BullMQ       │                   │  + Transformers│
└────┬────┬───┬───┘                   └────────────────┘
     │    │   │
     │    │   └────────┐
     │    │            │
┌────▼────▼───┐ ┌──────▼──────┐ ┌──────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ PostgreSQL  │ │   Redis     │ │    MinIO     │ │     Ollama       │ │     ChromaDB    │
│ (Port 5432) │ │ (Port 6379) │ │ (Port 9000)  │ │   (Port 11434)   │ │   (Port 8001)   │
│             │ │             │ │              │ │                  │ │                 │
│  Documents  │ │ Job Queue   │ │   Storage    │ │ Data Extraction  │ │       RAG       │
└─────────────┘ └─────────────┘ └──────────────┘ └──────────────────┘ └─────────────────┘
```

## 📁 Project Structure

```
ai_docsort/
├── apps/
│   ├── frontend/              # React frontend with Vite
│   │   ├── src/
│   │   │   ├── pages/         # Upload & Processing pages
│   │   │   ├── lib/           # tRPC client
│   │   │   └── components/
│   │   └── package.json
│   │
│   ├── backend/               # Node.js backend
│   │   ├── src/
│   │   │   ├── services/      # OCR, ML client, catalog mapper
│   │   │   ├── db/            # Prisma client
│   │   │   └── schemas/       # Zod schemas
│   │   ├── prisma/            # Database schema
│   │   └── package.json
│   │
│   └── ml-service/            # Python ML service
│       ├── classifier.py      # Zero-shot classification
│       ├── main.py            # FastAPI app
│       ├── rag-extractor.py   # ChromaDB extractor
│       ├── vector-store.py    # ChromaDB store
│       └── requirements.txt
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.10+ ([Download](https://www.python.org/))
- **pnpm** (`npm install -g pnpm`)
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/))

### Installation

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/kaysaru/ai_docsort.git
cd ai_docsort

# Install Node.js dependencies for all workspaces
pnpm install
```

#### 2. Setup Infrastructure with Docker

**Start all infrastructure services (PostgreSQL, Redis, MinIO, Ollama, ChromeDB):**

```bash
# Start services in the background
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs (optional)
docker-compose logs -f
```

**Services will be available at:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001` (minioadmin / minioadmin)
- ChromaDB: `localhost:8001`
- **Ollama**: `localhost:11434` (automatically pulls qwen2.5:3b model on first run)

**Ollama Model Auto-Setup:**

The docker-compose includes an `ollama-init` service that automatically:
1. Waits for Ollama to be healthy
2. Checks if the qwen2.5:3b model exists
3. Downloads it if not present (~2GB, takes 2-5 minutes on first run)
4. Exits after model is ready

You can check the model download progress with:
```bash
# View Ollama init logs
docker-compose logs -f ollama-init

# Check if model is ready
docker exec -it ai_docsort_ollama ollama list
```

**Stop services when done:**
```bash
docker-compose down

# To remove volumes (WARNING: deletes all data including downloaded models)
docker-compose down -v
```

#### 3. Configure Environment Variables

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
PORT=3000
MINIO_HOST="localhost"
MINIO_PORT=9000
REDIS_PORT=6379
REDIS_HOST="localhost"
ML_SERVICE_URL="http://localhost:8000"
```

**Frontend** (`apps/frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

#### 4. Setup Database

```bash
cd apps/backend

# Push schema to database
npx prisma db push

# Seed with test catalogs
npx tsx prisma/seed.ts
```

#### 5. Setup ML Service

```bash
cd apps/ml-service

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# OR
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

**Optional: Pre-download ML Model (Recommended)**

The ML model is ~1.6GB and can take time to download on first run. Pre-download it:

```bash
# Make sure virtual environment is activated
source .venv/bin/activate

# Download model (will be cached)
python -c "from transformers import pipeline; pipeline('zero-shot-classification', model='facebook/bart-large-mnli')"
```

This downloads the model once and caches it in `~/.cache/huggingface/`. All future runs will use the cached version.

<details>
<summary><b>Alternative: Use Smaller/Faster Model</b></summary>

If download is too slow, you can use a smaller model by editing `apps/ml-service/classifier.py`:

```python
# Change this line (in classifier.py):
def __init__(self, model_name: str = "facebook/bart-large-mnli"):

# To use a smaller model:
def __init__(self, model_name: str = "facebook/bart-base"):
```

**Model sizes:**
- `facebook/bart-large-mnli`: ~1.6GB (best accuracy)
- `facebook/bart-base`: ~500MB (good accuracy, faster)
- `typeform/distilbert-base-uncased-mnli`: ~250MB (decent accuracy, fastest)
</details>

## 🎬 Running the Application

### Step 0: Start Infrastructure (Docker)

**First, make sure Docker containers are running:**

```bash
# Start all infrastructure services
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

You should see all five services (postgres, redis, minio, ollama, chromadb) with status "Up (healthy)".

### Then start the application services in 3 terminals:

### Terminal 1: ML Service

```bash
cd apps/ml-service
source .venv/bin/activate
python main.py
```

**Note:** First run will download the ML model (~1.6GB), takes 2-3 minutes.

✅ Ready when you see: `INFO:     Application startup complete.`

### Terminal 2: Backend

```bash
cd apps/backend
pnpm dev
```

✅ Ready when you see: `Listening on port 3000`

### Terminal 3: Frontend

```bash
cd apps/frontend
pnpm dev
```

✅ Ready when you see: `Local: http://localhost:5173/`

**That's it! All services are now running. 🚀**

## 🧪 Testing the Application

1. **Open the app**: http://localhost:5173

2. **Upload a document**:
   - Navigate to "Load" page
   - Drag & drop a PDF document
   - Click "Upload & Process"

3. **Watch processing**:
   - You'll be redirected to "Processing" page
   - Status updates automatically every 3 seconds
   - Watch as: `pending → processing → completed`

4. **View results**:
   - Document type detected (passport, driver_license, etc.)
   - Confidence score
   - Auto-assigned catalog

5. **View extracted information**:
   - **Click on any completed document** to open a modal
   - View all extracted structured data:
     - For **Passports**: Full Name, Date of Birth, Sex, Passport Number, etc.
     - For **Driver Licenses**: License Number, Categories (A,B,C), Expiry Date, etc.
     - For **Certificates**: Certificate Type, Issuing Organization, etc.
   - See confidence score and classification details
   - All fields are automatically extracted by Ollama LLM!

## 🎨 Extracted Information Examples

### Passport
```json
{
  "fullName": "IVANOV IVAN IVANOVICH",
  "dateOfBirth": "01.01.1990",
  "sex": "M",
  "passportNumber": "1234 567890",
  "issueDate": "01.01.2020",
  "issuedBy": "MVD Russia",
  "citizenship": "Russian Federation"
}
```

### Driver License
```json
{
  "fullName": "IVANOV IVAN",
  "licenseNumber": "12 34 567890",
  "dateOfBirth": "01.01.1990",
  "categories": ["B", "C"],
  "issueDate": "01.01.2020",
  "expiryDate": "01.01.2030"
}
```

### Birth Certificate
```json
{
  "childName": "IVANOV IVAN IVANOVICH",
  "dateOfBirth": "01.01.1990",
  "placeOfBirth": "Moscow",
  "fatherName": "IVANOV PETR SERGEEVICH",
  "motherName": "IVANOVA MARIA ALEXANDROVNA",
  "certificateNumber": "XII-МЮ №123456"
}
```

## 📊 Supported Document Types

The ML service can detect:
- **Passport** → Auto-assigned to "Passports" catalog
- **Driver License** → Auto-assigned to "Licenses" catalog
- **ID Card** → Auto-assigned to "Personal" catalog
- **Birth Certificate** → Auto-assigned to "Personal" catalog
- **Diploma** → Auto-assigned to "Personal" catalog
- **Certificate** → Auto-assigned to "Business" catalog

## 🔧 Development

### Adding New Document Types

1. Edit `apps/ml-service/classifier.py`:
```python
self.document_types = [
    "passport",
    "driver license",
    # Add your new type
    "medical record",
]
```

2. Update catalog mapping in `apps/backend/src/services/catalogMapper.ts`:
```typescript
const mapping: Record<string, string> = {
    'medical_record': 'medical',
    // ...
};
```

3. Add catalog in database or seed file.

### Project Commands

```bash
# Backend
cd apps/backend
pnpm dev          # Development with auto-reload
pnpm build        # Build for production
pnpm tsc          # Type check

# Frontend
cd apps/frontend
pnpm dev          # Development with auto-reload
pnpm build        # Build for production

# ML Service
cd apps/ml-service
source .venv/bin/activate
python main.py    # Run service
```

## 📚 API Documentation

### Backend tRPC API
- Endpoint: http://localhost:3000/trpc

---

**Happy Document Sorting! 📄🤖**
