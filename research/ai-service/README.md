# Nutrican ResNet50 AI Service

FastAPI microservice — nhận diện 10 món Việt từ ảnh (theo Biên bản bàn giao).

## Yêu cầu

| Phần mềm | Ghi chú |
|----------|---------|
| **Python 3.10 – 3.12** | Python 3.14 **chưa** có TensorFlow |
| TensorFlow 2.x | `pip install -r requirements.txt` |
| File model | `best_resnet50_model.h5` (~96 MB) — không nằm trong git |

## Phase 2 — Fine-tune (com_tam / pho focus)

Dataset: `research/Vietnamese_Food_Dataset/` (10 class folders: `pho/`, `com_tam/`, …)

```cmd
cd research
run-train-phase2.bat           :: Full train (3+12 epochs, ~30-90 min)
run-train-phase2.bat --quick  :: Smoke test (2+3 epochs)
```

Output: `research/best_resnet50_model_phase2.h5` + `research/output/resnet50_phase2_report.json`

Script tu dong uu tien phase2 > phase1 khi chay service.

## LLaVA (Ollama local)

Backend gọi `http://localhost:11434` — chạy trên máy dev:

```cmd
ollama pull llava
ollama serve
```

Cấu hình: `ai.ollama.meal-analysis.model=llava` trong `application.properties`.


## Chay nhanh (click chay — khong can cua so Terminal)

Dat o `research/`, click chay file `.bat`:

| File | Tac vu |
|------|--------|
| `run-ai.bat` | Menu chinh — chon tac vu (1-5) |
| `run-setup.bat` | Cai dat venv + dependencies (lan dau) |
| `run-ai-service.bat` | Chay AI service (FastAPI localhost:8000) |
| `run-train-phase2.bat` | Train ResNet50 Phase 2 |

Hoac mo PowerShell / CMD, cd vao `research` roi goi truc tiep:

```powershell
research\run-ai.bat
```

## Chay tu dong (CMD / PowerShell)

**Cách 1 — menu (khuyến nghị):**

```powershell
cd <path-to-nutrican-repo>
research\run-ai.bat
```

**Cách 2 — chạy trực tiếp:**

```powershell
cd <path-to-nutrican-repo>
research\run-ai-service.bat
research\run-train-phase2.bat
research\run-train-phase2.bat --quick        # smoke test (2+3 epochs)
research\run-train-phase2.bat "D:\path\to\dataset"   # dataset tùy chọn
```

## Cài đặt (lần đầu)

```powershell
cd <path-to-nutrican-repo>
research\run-setup.bat
```

Hoặc thủ công:

```powershell
cd <path-to-nutrican-repo>\research\ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

> May chi co Python 3.14 se **loi TensorFlow**. Cai 3.12: `py install 3.12`.

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
