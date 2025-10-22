# AI DocSort

Intelligent document sorting system with automatic catalog detection using OCR and Machine Learning.

## 🎯 Features

- **Automatic Document Classification** - Upload documents without selecting a category
- **OCR Text Extraction** - Extracts text from PDFs and images (Russian + English)
- **ML-Powered Detection** - Uses Hugging Face Transformers for document type recognition
- **Auto-Catalog Assignment** - Automatically organizes documents into correct catalogs
- **Real-time Processing** - Watch documents being processed with live status updates
- **Background Workers** - Async processing with BullMQ job queue

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + Vite + TanStack Router
│   (Port 5174)   │  Drag & drop uploads, real-time status
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
     │    │   └──────────┐
     │    │              │
┌────▼────▼───┐   ┌──────▼──────┐   ┌──────────┐
│ PostgreSQL  │   │   Redis     │   │  MinIO   │
│ (Port 5432) │   │ (Port 6379) │   │ (Port    │
│             │   │             │   │  9000)   │
│  Documents  │   │ Job Queue   │   │ Storage  │
└─────────────┘   └─────────────┘   └──────────┘
```

## 📁 Project Structure

```
ai_docsort/
├── apps/
│   ├── frontend/          # React frontend with Vite
│   │   ├── src/
│   │   │   ├── pages/     # Upload & Processing pages
│   │   │   ├── lib/       # tRPC client
│   │   │   └── components/
│   │   └── package.json
│   │
│   ├── backend/           # Node.js backend
│   │   ├── src/
│   │   │   ├── services/  # OCR, ML client, catalog mapper
│   │   │   ├── db/        # Prisma client
│   │   │   └── schemas/   # Zod schemas
│   │   ├── prisma/        # Database schema
│   │   └── package.json
│   │
│   └── ml-service/        # Python ML service
│       ├── classifier.py  # Zero-shot classification
│       ├── main.py        # FastAPI app
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

**Start all infrastructure services (PostgreSQL, Redis, MinIO):**

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

**Stop services when done:**
```bash
docker-compose down

# To remove volumes (WARNING: deletes all data)
docker-compose down -v
```

<details>
<summary><b>Alternative: Manual Installation (without Docker)</b></summary>

**PostgreSQL:**
```bash
# Create database
psql -U postgres
CREATE DATABASE mydb;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
\q
```

**Redis:**
```bash
# Start Redis (macOS with Homebrew)
brew services start redis

# Or run directly
redis-server
```

**MinIO:**
```bash
# Download and run MinIO (macOS)
brew install minio
mkdir -p ~/minio-data
minio server ~/minio-data --console-address :9001
```
</details>

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

## 🎬 Running the Application

### Step 0: Start Infrastructure (Docker)

**First, make sure Docker containers are running:**

```bash
# Start all infrastructure services
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

You should see all three services (postgres, redis, minio) with status "Up (healthy)".

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

✅ Ready when you see: `Local: http://localhost:5174/`

**That's it! All services are now running. 🚀**

## 🧪 Testing the Application

1. **Open the app**: http://localhost:5174

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

## 🐛 Troubleshooting

### ML Service Issues

**Problem:** `ModuleNotFoundError: No module named 'transformers'`
```bash
cd apps/ml-service
source .venv/bin/activate
pip install -r requirements.txt
```

**Problem:** Model download fails
```bash
# Set cache directory
export HF_HOME=/path/to/cache
python -c "from transformers import pipeline; pipeline('zero-shot-classification', model='facebook/bart-large-mnli')"
```

### Backend Issues

**Problem:** Database connection failed
- Check PostgreSQL is running: `psql -U postgres -l`
- Verify DATABASE_URL in `.env`
- Run migrations: `npx prisma db push`

**Problem:** MinIO connection failed
- Check MinIO is running: visit http://localhost:9000
- Verify MINIO_HOST and MINIO_PORT in `.env`

**Problem:** Redis connection failed
- Check Redis is running: `redis-cli ping` (should return `PONG`)
- Verify REDIS_HOST and REDIS_PORT in `.env`

### Frontend Issues

**Problem:** API requests fail
- Check backend is running on port 3000
- Verify VITE_API_URL in `.env`
- Check CORS settings in backend

### General Issues

**Problem:** Port already in use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill  # Backend
lsof -ti:8000 | xargs kill  # ML Service
lsof -ti:5174 | xargs kill  # Frontend
```

## 📚 API Documentation

### Backend tRPC API
- Endpoint: http://localhost:3000/trpc

### ML Service API
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔐 Security Notes

**For Production:**
- Change default passwords in `.env`
- Set up proper CORS origins
- Use environment variables for all secrets
- Enable authentication
- Use HTTPS
- Secure MinIO with proper credentials

## 📄 License

MIT

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `apps/*/README.md`

---

**Happy Document Sorting! 📄🤖**
