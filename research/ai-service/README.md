# Nutrican ResNet50 AI Service

FastAPI wrapper around TensorFlow ResNet50 + Bohlol FC head.

## Default (production)

- **Model:** `research/best_resnet50_unified.h5`
- **Profile:** `resnet_unified` (199 classes)
- **Port:** 8000

```bat
research\run-ai-service.bat
```

Health: `GET http://localhost:8000/health` → `"num_classes": 199`

## Environment

| Variable | Default |
|----------|---------|
| `RESNET_CLASS_PROFILE` | `resnet_unified` |
| `MODEL_PATH` | `research/best_resnet50_unified.h5` |
| `MODEL_VERSION` | from manifest |
| `AI_RESNET_PORT` | `8000` |

## API

`POST /api/v1/analyze-food` — multipart image → top-3 predictions + portion_ratio.

## Setup

```bat
research\run-setup.bat
```

Python 3.10–3.12, TensorFlow in `ai-service/.venv`.
