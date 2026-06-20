# Nutrican ResNet50 AI Service

FastAPI microservice for 10-class Vietnamese food recognition (BienBan_BanGiao_AI_Module).

## Setup

```bash
cd research/ai-service
pip install -r requirements.txt
```

Set model path (default points to team research folder):

```powershell
$env:MODEL_PATH = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
```

## Run

```bash
python main.py
```

Server: `http://0.0.0.0:8000`

- `GET /health`
- `POST /api/v1/analyze-food` — multipart field `file`

## 10 classes (alphabetical)

`banh_chung`, `banh_khot`, `banh_mi`, `banh_trang_nuong`, `banh_xeo`, `bun_dau_mam_tom`, `ca_kho_to`, `com_tam`, `goi_cuon`, `pho`
