# G0 — Xác minh kỹ thuật RBL (ResNet50 AI Module)

Checklist trước khi thu data hàng loạt. Mục tiêu: đảm bảo pipeline **ResNet50 → FastAPI → Spring Boot → RBL** hoạt động đúng trước khi PT label cohort ≥30 mẫu.

**Script:** `research/scripts/resnet50_smoke_test.py` (thay `g0_smoke_test.py` llava/Ollama)  
**Model kỳ vọng:** `resnet50-vtn-10class`  
**FastAPI:** `http://localhost:8000`  
**Spring Boot:** `http://localhost:8080/api/v1`

> **Yêu cầu môi trường:** Python **3.10–3.12** + TensorFlow để load `best_resnet50_model.h5`. Python 3.14 chưa có wheel TF.

---

## 0.0 — Khởi động dịch vụ

| Bước | Lệnh | Pass? |
|------|------|-------|
| 1 | `research/scripts/start_ai_service.ps1` (env `MODEL_PATH`) | ☐ |
| 2 | Spring Boot + postgres + minio | ☐ |
| 3 | `python research/scripts/resnet50_smoke_test.py` | ☐ |

---

## 0.1 — Tầng RBL hoạt động

| Bước | Hành động | Kết quả mong đợi | Pass? |
|------|-----------|------------------|-------|
| 1 | `GET /health` FastAPI | `model_loaded: true` | ☐ |
| 2 | Customer upload ảnh qua `/diet` → Analyze | Status `PT_REVIEWING` hoặc `DRAFT` | ☐ |
| 3 | Kiểm DB hoặc `GET /admin/rbl/logs/{id}` | Có `aiPredictedMacros` | ☐ |
| 4 | Cùng log | Có `dbMatchedMacros` khi `food_code` map được Food DB | ☐ |
| 5 | Cùng log | `modelVersion=resnet50-vtn-10class` | ☐ |

---

## 0.2 — `db_matched_macros` scale theo portion

ResNet50 mặc định `portionSize=100g` (CNN không estimate portion — limitation).

```
ratio = portionG / serving_size_g
db_cal = food.calories × ratio
```

| Bước | Hành động | Kết quả mong đợi | Pass? |
|------|-----------|------------------|-------|
| 1 | Upload ảnh **pho** / **com_tam** (trong 10 class) | `recognition_source=HYBRID` | ☐ |
| 2 | `ai_portion_g` từ export | = 100 (default) | ☐ |
| 3 | So `db_cal` ≈ macro DB × ratio | Sai lệch do làm tròn OK | ☐ |

---

## 0.3 — CSV export đủ cột

Export: `GET /admin/rbl/export?cvOnly=true`

| Cột bắt buộc | Có? |
|--------------|-----|
| `delta_ai_cal`, `delta_db_cal` | ☐ |
| `model_version` (= resnet50-vtn-10class) | ☐ |
| `recognition_source`, `experiment_cohort` | ☐ |
| `ai_portion_g`, `db_applied` | ☐ |

---

## 0.4 — Hybrid + fallback

| Bước | Hành động | Kết quả | Pass? |
|------|-----------|---------|-------|
| 1 | Ảnh trong 10 class, confidence ≥ 0.25 | `HYBRID`, cohort `HOME_HYBRID_DB` | ☐ |
| 2 | Ảnh ngoài 10 class (pizza, burger) | `fallback=true`, `AI_ONLY` hoặc `DRAFT` | ☐ |
| 3 | Confidence < 0.25 | Status `DRAFT`, SOS `LOW_CONFIDENCE` | ☐ |

**Confidence threshold:** 0.25 (theo Biên bản §3 — MVP 25–40%).

---

## 0.5 — Offline eval (RQ1)

```bash
python research/scripts/eval_resnet50.py
```

Output: `research/output/resnet50_eval.json` + `.md` (Top-1, confusion matrix, per-class F1).

---

## Tổng kết G0

| Mục | Trạng thái |
|-----|------------|
| 0.1 RBL snapshots | ☐ |
| 0.2 Portion scaling | ☐ |
| 0.3 CSV columns | ☐ |
| 0.4 Hybrid / fallback | ☐ |
| 0.5 Offline eval | ☐ |

**Sẵn sàng thu data G2:** chỉ khi cả 5 mục Pass

---

*Document Version: 2.0.0 (ResNet50) | Last Updated: 2026-06-17*
