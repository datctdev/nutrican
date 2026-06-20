# Nutrican ResNet50 AI Service

FastAPI microservice — nhận diện 10 món Việt từ ảnh (theo Biên bản bàn giao).

## Yêu cầu

| Phần mềm | Ghi chú |
|----------|---------|
| **Python 3.10 – 3.12** | Python 3.14 **chưa** có TensorFlow |
| TensorFlow 2.x | `pip install -r requirements.txt` |
| File model | `best_resnet50_model.h5` (~96 MB) — không nằm trong git |

Model mặc định: `d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5`

## Cài đặt (lần đầu)

```powershell
cd research\ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Máy chỉ có Python 3.14 sẽ **lỗi TensorFlow**. Cài 3.12: `py install 3.12` rồi dùng `py -3.12` như trên.

## Chạy service

**Cách 1 — file .cmd (khuyến nghị, không bị chặn PowerShell):**

```powershell
cd d:\FPT\SU26\SBA\project_team\nutrican
research\scripts\start_ai_service.cmd
```

**Cách 2 — script PowerShell** (nếu bị lỗi `running scripts is disabled`):

```powershell
cd d:\FPT\SU26\SBA\project_team\nutrican
$env:MODEL_PATH = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
powershell -ExecutionPolicy Bypass -File .\research\scripts\start_ai_service.ps1
```

**Cách 3 — thủ công (luôn chạy được):**

```powershell
cd research\ai-service
$env:MODEL_PATH = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
.\.venv\Scripts\python.exe main.py
```

Server: **http://localhost:8000**

## Kiểm tra

```powershell
curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}
```

## API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Model đã load chưa |
| POST | `/api/v1/analyze-food` | Multipart field `file` → `{ food_code, confidence, macros }` |

Spring Boot gọi endpoint này khi user **Analyze** trên `/diet`.

## 10 classes (alphabetical)

`banh_chung`, `banh_khot`, `banh_mi`, `banh_trang_nuong`, `banh_xeo`, `bun_dau_mam_tom`, `ca_kho_to`, `com_tam`, `goi_cuon`, `pho`
