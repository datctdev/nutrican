# Paper 1 — Jelodar & Sun (2021)

**Title:** Calorie Aware Automatic Meal Kit Generation from an Image  
**Authors:** Ahmad Babaeian Jelodar, Yu Sun (University of South Florida)  
**Source:** [arXiv:2112.09839](https://arxiv.org/abs/2112.09839)  
**Local PDF:** [papers/2112.09839v1.pdf](./papers/2112.09839v1.pdf)

---

## Tóm tắt

Paper đề xuất pipeline 2 giai đoạn từ **một ảnh nấu ăn**:
1. **Stage 1:** Dự đoán danh sách nguyên liệu (ingredient generation) — transformer decoder + user correction
2. **Stage 2:** Ước **portion + unit** từng nguyên liệu → calorie từng phần → **tổng calorie** (Tupc model)

Ứng dụng trực tiếp: **tự động sinh nội dung meal kit** (nguyên liệu + khẩu phần).

**Dataset:** Recipe1M (parsed, 42k train+val, 7.5k test) — món Tây, không phải món Việt.

---

## Pipeline Paper 1 vs NutriCan

| Paper 1 | NutriCan (Improve 2.2) |
|---------|------------------------|
| ResNet-50 + transformer ingredient gen | VLM `llava` (Ollama) nhận `foodName` + macros |
| Portion + unit per ingredient | VLM `portionSize` (grams) |
| Nutrition table per ingredient | **Food DB** (`food_items`) |
| **Tupc** — decomposition + table | **A1.1** — Hybrid CV→DB |
| **Tcalorie** — direct total calorie | **A1.0** — VLM direct macros |
| Ground truth: Recipe1M parsed | Ground truth: **PT review** (RBL) |

**Claim Improve:** Paper 1 chứng minh decomposition + table **<** direct estimation → NutriCan kiểm tra `ΔA = MAE(A1.0) − MAE(A1.1) > 0` trên món Việt.

---

## Table IV — Calorie Estimation (mốc chính)

| Model | Mô tả | MAE (kcal) | MAE% |
|-------|--------|------------|------|
| **Tupc** | Transformer + portion + unit + per-ingredient calorie | **279.4** | **37.5%** |
| Tcalories | Per-ingredient calories only | 283.5 | 38.1% |
| NNupc | NN + portion/unit | 306.7 | 39.7% |
| NNcalories | NN per ingredient | 310.0 | 40.9% |
| **Tcalorie** | Direct total (no decomposition) | **394.5** | **49.9%** |
| CNN | Direct CNN | 380.0 | 49.8% |
| Pimean | Prior ingredient mean | 323.3 | 44.7% |
| Pdish | Prior dish name | 407.0 | 52.3% |

**ΔA (Paper 1):** Tcalorie − Tupc ≈ **115 kcal** (49.9% − 37.5% MAE%)

> NutriCan **không so trực tiếp** số tuyệt đối — khác dataset, khác miền ẩm thực. Chỉ dùng **mốc độ lớn**.

---

## Ánh xạ A1.0 / A1.1

| Khái niệm | Paper 1 | NutriCan field |
|-----------|---------|----------------|
| A1.0 direct | Tcalorie / CNN | `ai_predicted_macros` |
| A1.1 grounding | Tupc | `db_matched_macros` |
| Ground truth | Recipe1M label | `pt_adjusted_macros` |
| ΔA | 115 kcal ref | `mean(delta_ai_cal) − mean(delta_db_cal)` |

---

## Hạn chế (Discussion §VI)

- Dataset tự cắt từ Recipe1M → **khó so baseline trực tiếp** với paper khác
- Ingredient generation SOTA vẫn yếu → cần user correction
- Portion estimation phụ thuộc unit (6 loại: pound, ounce, cup, count, tblsp, tsp)
- NutriCan **không** train Tupc/PRENet — chỉ áp dụng **ý tưởng** decomposition qua Food DB

---

## References quan trọng (từ paper)

| Ref | Paper | Liên hệ |
|-----|-------|---------|
| [1] | Salvador et al. Inverse Cooking (CVPR 2019) | Ingredient gen baseline |
| [7] | Marin et al. Recipe1M+ (PAMI 2019) | Dataset |
| [5][6] | Food image CNN classification | Dish classification nhánh A |
| [30] | Myers et al. Im2Calories (ICCV 2015) | Calorie from image + segmentation |

Chi tiết điền trong [LITERATURE_MAP.md](./LITERATURE_MAP.md).

---

*Document Version: 1.0.0 | Last Updated: 2026-06-12*
