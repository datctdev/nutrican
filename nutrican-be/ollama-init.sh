#!/bin/sh
set -e

OLLAMA_HOST="http://ollama:11434"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-vl:7b}"

echo "Checking Ollama for model: ${OLLAMA_MODEL}"

# Check if model already exists using ollama list
if ollama list | grep -q "^${OLLAMA_MODEL}"; then
  echo "Model '${OLLAMA_MODEL}' already exists - skip pull"
else
  echo "Model not found - pulling..."
  ollama pull ${OLLAMA_MODEL}
fi

echo "Done!"
