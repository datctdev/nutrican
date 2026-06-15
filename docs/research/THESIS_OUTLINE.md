# Thesis Outline — NutriCan Improve (2.2)

Theo KE_HOACH §10. Điền nội dung khi hoàn thành từng giai đoạn.

---

## 1. Introduction

- Vấn đề ước dinh dưỡng từ ảnh món ăn Việt Nam
- Gap: VLM ước trực tiếp vs grounding qua Food DB
- Đóng góp: pipeline RBL + đánh giá A1.0 vs A1.1 bằng nhãn PT

---

## 2. Related Work

- Nhánh A–D theo [LITERATURE_MAP.md](./LITERATURE_MAP.md)
- Paper 1 (Jelodar & Sun): decomposition > direct
- Paper 2: food recognition baseline
- NutriCan positioning: VLM + hybrid CV→DB, không train model

---

## 3. Method

### 3.1 A1.0 — VLM direct
- Model: **`llava`** via Ollama (G0 verified 2026-06-14)
- Output: `ai_predicted_macros`

### 3.2 A1.1 — Hybrid CV→DB
- VLM `foodName` → Food DB match → scale portion
- HOTPOT/COMPOSITE: sum `diet_log_items`

### 3.3 RBL pipeline
- Snapshots R0, PT review, export CSV
- Chi tiết: [RBL_METHODOLOGY.md](../RBL_METHODOLOGY.md)

---

## 4. Experiments

- Dataset: RBL CSV, ≥30 labeled CV
- Cohorts: HOME, RESTAURANT, HOTPOT, COMPOSITE
- Metrics: MAE, RMSE, MAE%, ΔA
- Protocol: [DATA_COLLECTION_SOP.md](./DATA_COLLECTION_SOP.md), [PT_LABELING_SOP.md](./PT_LABELING_SOP.md)

---

## 5. Results

_Điền sau G4 — dùng [RESULTS_TEMPLATE.md](./RESULTS_TEMPLATE.md)_

---

## 6. Limitations

_Xem [LIMITATIONS.md](./LIMITATIONS.md)_

---

## 7. Conclusion & Future Work

- Tóm tắt ΔA và ý nghĩa
- Hướng EXE2: mở rộng Food DB, fine-tune VLM, multi-PT consensus

---

*Template v1.0*
