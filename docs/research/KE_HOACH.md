# Kế Hoạch Research (20%) — NutriCan PT (ResNet50)

> **Một câu tóm tắt:** Dùng **ResNet50** (10 món Việt, transfer learning theo Bohlol 2025) làm tầng nhận diện + macro giả lập (`A1.0`), so sánh với **grounding Food DB** qua `food_code` (`A1.1`), đánh giá bằng nhãn PT trên pipeline RBL.

**Biên bản:** [BIEN_BAN_AI_MODULE.md](./BIEN_BAN_AI_MODULE.md)

---

## 1. Định vị nghiên cứu

- **Level:** Improve (2.2) + Apply (offline classification metrics).
- **Tên đề xuất:** *"Nhận diện món ăn Việt bằng ResNet50 và cải thiện ước lượng dinh dưỡng qua grounding Food-DB: đánh giá bằng nhãn chuyên gia (PT)."*
- **Claim chính:** `ΔA = MAE(A1.0) − MAE(A1.1) > 0` khi map `food_code` → VTN `food_items`.

### Related Work (2 nhánh)

1. **Food recognition:** Bohlol et al. 2025 — ResNet50 refined FC, transfer learning, augmentation (97.25% / 16 lớp).
2. **Calorie estimation:** Jelodar & Sun 2021 — decomposition > direct (framing RQ3/RQ4).

---

## 2. Ánh xạ A1.0 / A1.1 / ΔA

| Khái niệm | NutriCan (ResNet50) | Field CSV |
|-----------|---------------------|-----------|
| `A1.0` | CNN class + `MACRO_DATABASE` (FastAPI) | `ai_cal/pro/carb/fat` |
| `A1.1` | `food_code` → Food DB → scale portion | `db_cal/pro/carb/fat` |
| Ground truth | PT APPROVE/ADJUST | `pt_cal/pro/carb/fat` |
| `ΔA` | Giảm sai số nhờ grounding | `mean(delta_ai_cal) − mean(delta_db_cal)` |

---

## 3. Câu hỏi nghiên cứu

| RQ | Câu hỏi | Metric |
|----|---------|--------|
| **RQ1** | ResNet50 nhận diện đúng bao nhiêu % trên 10 món Việt? | Top-1, per-class F1, confusion matrix |
| **RQ2** | Confidence (25–40%) có phản ánh khả năng phân loại? | Calibration buckets |
| **RQ3** | Macro giả lập (`A1.0`) sai bao nhiêu so với nhãn PT? | MAE cal/P/C/F |
| **RQ4** | Grounding `food_code` → `food_items` có giảm sai số? | ΔA |

---

## 4. Giả thuyết

| H | Phát biểu | Kỳ vọng |
|---|-----------|---------|
| **H1** | `A1.1` MAE < `A1.0` MAE | ΔA > 0 |
| **H2** | ΔA lớn khi `db_match_score` cao | Bucket high < low |
| **H3** | Top-1 cao trên ảnh trong 10 class, thấp trên negative | WRONG_FOOD rate |
| **H4** | Confidence bucket cao → accuracy cao hơn | RQ2 calibration |

---

## 5. Dataset

### Offline (RQ1/RQ2)
- **Vietnamese_Food_Dataset** — ~8.705 ảnh, 10 class, split 80/20 stratified (seed=42).
- Script: `eval_resnet50.py`, `resnet50_calibration.py`.

### RBL (RQ3/RQ4)
- ≥ **30 mẫu PT label** (`insufficientSample = false`).
- Cohort ResNet: 10 class (≥20, conf ≥0.25) + negative ngoài class (≥5).
- Seed: `research/seed/resnet10/` + `prepare_resnet_rbl_seed.py`.

---

## 6. Metrics

- **Classification:** Top-1, Top-3, per-class precision/recall/F1, confusion matrix.
- **Regression macro:** MAE, RMSE, MAE% cho cal/P/C/F.
- **ΔA**, bootstrap 95% CI, Wilcoxon paired (n≥5).
- **Recognition proxy:** `1 − WRONG_FOOD rate` trên tập PT label.

---

## 7. Quy trình thí nghiệm

1. **G0:** `resnet50_smoke_test.py` — FastAPI + Spring end-to-end.
2. **Offline eval:** `eval_resnet50.py` trên full dataset.
3. **Thu RBL:** Upload seed → PT label → export CSV.
4. **Phân tích:** `rbl_analyze.py` trên `rbl_export.csv`.
5. **Calibration:** `resnet50_calibration.py`.

---

## 8. Limitations

Xem [BIEN_BAN_AI_MODULE.md §7](./BIEN_BAN_AI_MODULE.md#7-limitations-bắt-buộc-ghi-trong-báo-cáo).

---

## 9. Deliverables

- [x] FastAPI `research/ai-service/`
- [x] Spring `ResNetFoodRecognitionClient`
- [x] Offline eval scripts
- [x] RBL seed ≥30 ảnh + manifest PT
- [ ] Kết quả offline trên máy Python 3.10–3.12 (TF)
- [ ] Export RBL thật sau PT label live

---

*Version 2.0 (ResNet50) | 2026-06-17*
