# Document Classification ML Service

FastAPI-based ML service for document type classification using Hugging Face Transformers.

## Features

- **Zero-shot classification** using `facebook/bart-large-mnli`
- No training data required
- Supports multiple document types
- REST API for easy integration
- Docker support

## Document Types Supported

- Passport
- Driver License
- ID Card
- Birth Certificate
- Diploma
- Certificate
- Unknown (fallback)

## Setup

### Option 1: Local Development (with Virtual Environment)

1. **Create and activate virtual environment:**

```bash
cd apps/ml-service

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Run the service:**

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or simply:
python main.py
```

The service will be available at `http://localhost:8000`

### Option 2: Docker

```bash
# Build image
docker build -t ml-service .

# Run container
docker run -p 8000:8000 ml-service
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### POST /classify

Classify document text.

**Request:**
```json
{
  "text": "Passport of the Russian Federation. Family name: IVANOV..."
}
```

**Response:**
```json
{
  "document_type": "passport",
  "confidence": 0.89,
  "all_scores": {
    "passport": 0.89,
    "driver_license": 0.05,
    "id_card": 0.03,
    "birth_certificate": 0.01,
    "diploma": 0.01,
    "certificate": 0.01,
    "unknown": 0.00
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Testing

### Using curl:

```bash
# Health check
curl http://localhost:8000/health

# Classification
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"Passport of the Russian Federation"}'
```

### Using Python:

```python
import requests

response = requests.post(
    "http://localhost:8000/classify",
    json={"text": "Passport of the Russian Federation"}
)

print(response.json())
```

## Model Information

- **Model:** facebook/bart-large-mnli
- **Type:** Zero-shot classification
- **Size:** ~1.6GB
- **First run:** Downloads model automatically (may take a few minutes)
- **Subsequent runs:** Uses cached model

## Performance

- **CPU:** ~2-5 seconds per classification
- **GPU:** ~0.5-1 second per classification

To use GPU, change `device=-1` to `device=0` in `classifier.py` and install CUDA-enabled PyTorch.

## Environment Variables

Create `.env` file (optional):

```env
MODEL_NAME=facebook/bart-large-mnli
DEVICE=cpu  # or 'cuda' for GPU
```

## Integration with Node.js Backend

The Node.js backend calls this service from `apps/backend/src/services/ml.ts`:

```typescript
const response = await fetch('http://localhost:8000/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: ocrText })
});
```

## Troubleshooting

### Model Download Issues

If model download fails, try:
```bash
export HF_HOME=/path/to/cache
python -c "from transformers import pipeline; pipeline('zero-shot-classification', model='facebook/bart-large-mnli')"
```

### Memory Issues

The model requires ~2GB RAM. If running out of memory:
- Use a smaller model like `facebook/bart-base` (change in `classifier.py`)
- Increase Docker memory limits
- Use GPU if available

### Port Already in Use

Change port in command:
```bash
uvicorn main:app --port 8001
```

## Development

### Adding New Document Types

Edit `classifier.py`:

```python
self.document_types = [
    "passport",
    "driver license",
    # Add new types here
    "medical record",
    "invoice"
]
```

### Using a Different Model

Change model in `classifier.py`:

```python
def __init__(self, model_name: str = "your-model-name"):
```

## Production Deployment

- Use Gunicorn with Uvicorn workers
- Set up proper CORS origins
- Add authentication if needed
- Use GPU for better performance
- Cache frequently classified texts
- Monitor with logging/metrics

## License

MIT
