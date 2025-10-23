#!/bin/bash
# Script to automatically pull Ollama model on startup

echo "Waiting for Ollama to be ready..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done

echo "Ollama is ready!"

# Check if model already exists
if ollama list | grep -q "qwen2.5:3b"; then
  echo "Model qwen2.5:3b already exists, skipping download."
else
  echo "Pulling qwen2.5:3b model (this may take a few minutes)..."
  ollama pull qwen2.5:3b
  echo "Model downloaded successfully!"
fi
