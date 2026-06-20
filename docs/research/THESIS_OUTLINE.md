# Thesis Outline — NutriCan (ResNet50 + RBL)

Theo [KE_HOACH.md](./KE_HOACH.md). Điền Results sau G4.

---

## 1. Introduction

- Vấn đề ước dinh dưỡng từ ảnh món ăn Việt Nam
- Gap: macro trực tiếp từ CNN vs grounding qua Food DB (526 VTN)
- Đóng góp: ResNet50 10-class + pipeline RBL + đánh giá A1.0 vs A1.1

---

## 2. Related Work

- [LITERATURE_MAP.md](./LITERATURE_MAP.md)
- **Bohlol et al. 2025:** ResNet50 refined FC, transfer learning, food recognition
- **Jelodar & Sun 2021:** decomposition > direct calorie estimation
- NutriCan: CNN nhận diện + hybrid CV→DB, không train từ đầu trong thesis scope

---

## 3. Method

### 3.1 ResNet50 classifier (offline + online)

- Model: `best_resnet50_model.h5`, 10 class Việt (alphabetical)
- Input 224×224, `resnet50.preprocess_input`
- Dataset: Vietnamese_Food_Dataset (~8.705 ảnh)
- Metrics: Top-1, confusion matrix, per-class F1

### 3.2 FastAPI microservice

- `POST /api/v1/analyze-food` → `{ food_code, confidence, macros }`
- `MACRO_DATABASE` giả lập (A1.0)
- Deploy: `research/ai-service/`, env `MODEL_PATH`

### 3.3 Spring Boot integration

- `ResNetFoodRecognitionClient` → `MealRecognitionServiceImpl`
- `food_code` → `ResNetFoodCodeMapping` → `food_items`
- `modelVersion=resnet50-vtn-10class`, confidence threshold **0.25**

### 3.4 RBL pipeline

- Snapshots R0, PT review, export CSV
- [RBL_METHODOLOGY.md](../RBL_METHODOLOGY.md)

---

## 4. Experiments

| Thí nghiệm | Dữ liệu | Script |
|-----------|---------|--------|
| RQ1 Classification | Vietnamese_Food_Dataset 80/20 | `eval_resnet50.py` |
| RQ2 Calibration | Val split | `resnet50_calibration.py` |
| RQ3/RQ4 Macro + ΔA | RBL CSV ≥30 PT | `rbl_analyze.py` |

Protocol: [DATA_COLLECTION_SOP.md](./DATA_COLLECTION_SOP.md), [PT_LABELING_SOP.md](./PT_LABELING_SOP.md)

---

## 5. Results

_Điền sau G4 — [RESULTS_TEMPLATE.md](./RESULTS_TEMPLATE.md)_

Offline placeholder: `research/output/resnet50_eval.md`  
RBL placeholder: `research/output/resnet_rbl_results.md`

---

## 6. Limitations

- 10 món, macro giả lập, confidence thấp, không estimate portion
- [LIMITATIONS.md](./LIMITATIONS.md), [BIEN_BAN_AI_MODULE.md §7](./BIEN_BAN_AI_MODULE.md)

---

## 7. Conclusion & Future Work

- Tóm tắt Top-1 + ΔA
- Hướng: mở rộng class, VTN_FCT macros, portion estimation, fine-tune

---

*Template v2.0 (ResNet50) | 2026-06-17*
