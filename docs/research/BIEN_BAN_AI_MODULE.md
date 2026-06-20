# Biên bản bàn giao AI Module — Mapping sang codebase

Tóm tắt [BienBan_BanGiao_AI_Module.pdf](../../../research/BienBan_BanGiao_AI_Module.pdf) và ánh xạ sang repo NutriCan.

---

## 1. Tài sản bàn giao

| Tài sản | Vị trí local | Dùng trong code |
|---------|--------------|-----------------|
| Model ResNet50 `.h5` | `research/best_resnet50_model.h5` | FastAPI `MODEL_PATH` |
| Dataset 10 class | `research/Vietnamese_Food_Dataset/` | `eval_resnet50.py`, RBL seed |
| Paper Bohlol 2025 | `research/Improved food recognition...pdf` | Related Work |
| API contract §4 | `research/ai-service/main.py` | Spring `ResNetFoodRecognitionClient` |

**Lưu ý số liệu:** Dataset thực tế ~**8.705 ảnh** (không phải ~300/class như biên bản ghi). Chi tiết per-class trong `eval_resnet50.py` / báo cáo offline.

---

## 2. Kiến trúc triển khai

```
Mobile/Web → Spring Boot :8080 → FastAPI :8000 → best_resnet50_model.h5
                                    ↓
                          { food_code, confidence, macros }
                                    ↓
                    ResNetFoodCodeMapping → food_items (526 VTN + 10 ResNet)
                                    ↓
                              RBL snapshots + PT label
```

| Thành phần | File |
|-----------|------|
| FastAPI service | `research/ai-service/main.py` |
| Spring client | `ResNetFoodRecognitionClient.java` |
| Meal recognition | `MealRecognitionServiceImpl.java` |
| food_code → VTN | `ResNetFoodCodeMapping.java` |
| Seed 10 món ResNet | `ResNetFoodCatalogInitializer.java` |
| Config | `ai.resnet.base-url`, `ai.resnet.confidence-threshold=0.25` |

---

## 3. Mười class (thứ tự alphabet — bắt buộc)

```
banh_chung, banh_khot, banh_mi, banh_trang_nuong, banh_xeo,
bun_dau_mam_tom, ca_kho_to, com_tam, goi_cuon, pho
```

`modelVersion` = **`resnet50-vtn-10class`**  
`promptVersion` = hash danh sách class (thay prompt VLM).

---

## 4. API contract

**POST** `/api/v1/analyze-food` — multipart `file`

Response:
```json
{
  "success": true,
  "data": {
    "food_name": "Phở",
    "food_code": "pho",
    "confidence": 32.5,
    "macros": { "calories": 400, "protein": 20, "carbs": 55, "fat": 12 }
  }
}
```

- Input: RGB, resize **224×224**, `resnet50.preprocess_input`
- Confidence: **0–100** (Spring chia 100 → `aiConfidenceScore`)

---

## 5. Ánh xạ nghiên cứu A1.0 / A1.1

| Khái niệm | Biên bản / NutriCan |
|-----------|---------------------|
| **A1.0** | CNN class + `MACRO_DATABASE` giả lập (FastAPI) |
| **A1.1** | `food_code` → `food_items` (VTN + 10 ResNet dishes) |
| Ground truth | PT review (RBL) |

---

## 6. Scripts research

| Script | Mục đích |
|--------|----------|
| `eval_resnet50.py` | Offline Top-1, confusion matrix (RQ1) |
| `resnet50_calibration.py` | Accuracy theo confidence bucket (RQ2) |
| `resnet50_smoke_test.py` | G0 end-to-end |
| `prepare_resnet_rbl_seed.py` | 30 ảnh + 3 negative → `research/seed/resnet10/` |
| `seed_resnet_rbl.py` | Upload + PT label qua API |
| `generate_resnet_rbl_export.py` | Synthetic CSV khi chưa có export thật |
| `rbl_analyze.py` | MAE A1.0 vs A1.1, ΔA |

---

## 7. Limitations (bắt buộc ghi trong báo cáo)

- Chỉ **10 món** Việt — không generalize toàn bộ ẩm thực
- Macro MVP = bảng giả lập biên bản §3 — chưa dùng đầy đủ VTN_FCT_2007
- Confidence thấp (25–40%) do data/class imbalance
- Không estimate **portion** từ ảnh (default 100g)
- Input 224×224 (paper Bohlol dùng 340×640)

---

## 8. Chạy nhanh

```powershell
# Terminal 1 — AI service (Python 3.10–3.12)
$env:MODEL_PATH = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
.\research\scripts\start_ai_service.ps1

# Terminal 2 — Smoke test
python research/scripts/resnet50_smoke_test.py

# Offline eval
python research/scripts/eval_resnet50.py
```

---

*Version 1.0 | 2026-06-17*
