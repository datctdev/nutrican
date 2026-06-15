# NutriCan RBL Analysis Results

- Labeled samples (APPROVE/ADJUST): **3**
- Insufficient sample (<30): **True**

## A1.0 vs A1.1 (global)

| Model | MAE (kcal) | MAE% | RMSE (kcal) |
|-------|------------|------|-------------|
| A1.0 (VLM) | 66.7 | 12.3% | 67.8 |
| A1.1 (Hybrid DB) | 0.0 | — | 0.0 |
| **ΔA** | **66.7** | — | — |

> Paper 1 Tupc MAE% ≈ 37.5% — reference magnitude only.

## Per-macro MAE

- calories: A1.0=66.7, A1.1=0.0
- protein: A1.0=2.0, A1.1=0.0
- carb: A1.0=9.0, A1.1=0.0
- fat: A1.0=2.0, A1.1=0.0

## H2 — by db_match_score bucket

| bucket   |   delta_ai_cal |   delta_db_cal |
|:---------|---------------:|---------------:|
| none     |             70 |            nan |
| high     |             65 |              0 |

## H3 — ΔA by experiment_cohort

| experiment_cohort   |   0 |
|:--------------------|----:|
| HOME_HYBRID_DB      |  65 |
| RESTAURANT_AI_ONLY  | nan |

## H4 — A1.0 MAE by meal_source

| meal_source   |   delta_ai_cal |
|:--------------|---------------:|
| HOME_COOKED   |             65 |
| RESTAURANT    |             70 |

## Top-1 food recognition (proxy)

- Top-1 accuracy ≈ **100.0%** (1 − WRONG_FOOD rate)

## Bootstrap 95% CI for ΔA

- Point estimate: **65.0** kcal
- 95% CI: **[50.0, 80.0]** kcal (10k resamples, paired rows)

## Wilcoxon paired test

- Skipped (need n≥5, have n=2)


## Branch recommendation: **Improve (ΔA > 0)**