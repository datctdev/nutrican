# Results Template — Improve NutriCan (Bohlol + RBL)

Điền sau khi chạy offline eval và `python research/scripts/rbl_analyze.py rbl_export.csv`.

> **Trạng thái:** Table 0 = literature. Table 1 = VTN-10 RBL cohort (n=30, research export). Phụ lục 199-class: `research/output/rbl/rbl_results_unified199.md`.

**Tham chiếu:** [BOHLOL_TABLE4_REFERENCE.md](./BOHLOL_TABLE4_REFERENCE.md)

---

## Table 0 — Literature baseline (Bohlol et al. 2025, Table 4, p.10)

Dataset: 16 lớp thực phẩm Iran. MAE/MSE/RMSE = **lỗi phân loại (0–1)**, không phải kcal.

| Architecture | Epochs | Accuracy | Precision | Recall | F1 | MAE (test) | RMSE (test) | Vai trò |
|--------------|--------|----------|-----------|--------|-----|------------|-------------|---------|
| ResNet-50S — FT 10 layer | 5 | 61% | 60% | 60% | 61% | 0.30 | 0.70 | Fine-tune depth ablation |
| ResNet-50S — FT 20 layer | 5 | 75% | 76% | 75.5% | 76% | 0.25 | 0.80 | Fine-tune depth ablation |
| ResNet-50S — FT 30 layer | 5 | 85% | 85% | 86% | 84% | 0.10 | 0.85 | Fine-tune depth ablation |
| ResNet-50S — FT 40 layer | 5 | 92% | 93% | 93% | 92.5% | 0.05 | 0.89 | Fine-tune depth ablation |
| **ResNet-50S** (specific FC) | 5 | **97.25%** | 96.3% | 97% | **97%** | **0.03375** | **0.95** | **Upper bound** |

### Table 0b — Narrative baseline (§5 Conclusion)

| Config | Accuracy | F1 / MAE / RMSE |
|--------|----------|-----------------|
| ResNet50 **without** specific dense layer | **~70%** | Không báo trong Table 4 |
| ResNet-50S (after FC + hyperparameter tuning) | 97.25% | F1 97%, MAE 0.03375 |

---

## Table 1 — NutriCan nutrition MAE (RBL VTN-10, kcal)

| Model | Role | MAE (kcal) | MAE% | RMSE (kcal) | F1 (food) |
|-------|------|------------|------|-------------|-----------|
| **A1.0** | ResNet + macro cố định | 57.5 | 14.8% | 71.8 | _offline_ |
| **A1.1** | ResNet + NutriHome grounding | 43.2 | — | 54.5 | _offline_ |
| **ΔA** | GAP (A1.0 − A1.1) | 14.2 | — | — | — |

> Nguồn: `research/output/rbl/rbl_export_vtn10.csv` (30 mẫu seed). Wilcoxon p=0.23 — cần PT live để xác nhận p&lt;0.05.

> Paper 1 (Jelodar & Sun): Tcalorie 394.5 kcal / 49.9% — chỉ tham chiếu **độ lớn**, không claim beat.

---

## Table 1b — NutriCan vs Bohlol (classification only)

| Config | Bohlol ref | NutriCan offline (`eval_resnet50.py`, VTN-10 val) |
|--------|------------|--------------------------------------------------|
| ResNet no FC / phase1 | ~70% Acc (narrative) | **68.01%** Top-1 |
| ResNet-50S / unified 199-class | 97.25% Acc (16-class Iran) | **43.71%** Top-1 (199-way, domain khác) |
| ΔAcc vs phase1 | — | −24.30% (199-class harder) |

> So sánh xu hướng Improve FC head, không claim beat Bohlol tuyệt đối (dataset/domain khác).

---

## Table 2 — By experiment_cohort (H3)

| Cohort | n | MAE A1.0 | MAE A1.1 | ΔA |
|--------|---|----------|----------|-----|
| HOME_HYBRID_DB | 30 | 57.5 | 43.2 | 14.2 |
| RESTAURANT_AI_ONLY | 0 | | | |
| RESTAURANT_HYBRID_DB | 0 | | | |
| HOTPOT_HYBRID | 0 | | | |
| COMPOSITE_BUFFET | 0 | | | |

---

## Table 3 — By meal_source (H4)

| Source | n | MAE A1.0 |
|--------|---|----------|
| HOME_COOKED (S1) | 30 | 57.5 |
| RESTAURANT (S2) | 0 | |

---

## Table 4 — db_match_score buckets (H2)

| Bucket | n | MAE A1.0 | MAE A1.1 |
|--------|---|----------|----------|
| none (0) | 0 | | |
| low (1–8) | 0 | | |
| mid (9–14) | 0 | | |
| high (15+) | 30 | 57.5 | 43.2 |

---

## Branch decision

**VTN-10 (n=30 seed):** ΔA = +14.2 kcal, Wilcoxon p=0.23 → **Improve (tentative)** — cần PT live để p&lt;0.05.

**Phụ lục 199-class (n=199 synthetic):** ΔA = +42.6 kcal, Wilcoxon p&lt;0.001 → xem `research/output/rbl/rbl_results_unified199.md`.

| Condition | Action |
|-----------|--------|
| ΔA > 0 và Wilcoxon p < 0.05 | **Improve** — pipeline CV→DB grounding giảm sai số kcal |
| ΔA ≤ 0 hoặc không significant | **Apply** — báo MAE A1.0 trên món Việt + giải thích (DB coverage, portion) |

---

## Narrative prompts

1. RQ1: ResNet phase2 Acc/F1 so với Bohlol ~70% baseline và 97.25% upper bound?
2. RQ3: A1.0 (macro cố định) sai bao nhiêu so với PT? → MAE kcal
3. RQ4: A1.1 (NutriHome grounding) có giảm sai số? → ΔA, Wilcoxon
4. Top-1 food: `1 − P(WRONG_FOOD)` trên tập PT label

---

## Bảng nộp thầy (tóm tắt)

| Model | Baseline ref | MAE (kcal) | F1 | ΔA |
|-------|--------------|------------|-----|-----|
| A1.0 (ResNet + macro cố định) | Bohlol no FC ~70% Acc | _fill_ | _fill_ | — |
| A1.1 (ResNet + NutriHome) | ResNet-50S 97.25% (upper bound CV) | _fill_ | _fill_ | — |
| **ΔA (GAP)** | — | _fill_ | — | A1.0 − A1.1 |

---

*Template v2.0 (Bohlol Improve) | 2026-06-27*
