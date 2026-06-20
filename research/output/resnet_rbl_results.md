# NutriCan RBL Analysis Results

- Labeled samples (APPROVE/ADJUST): **30**
- Insufficient sample (<30): **False**

## A1.0 vs A1.1 (global)

| Model | MAE (kcal) | MAE% | RMSE (kcal) |
|-------|------------|------|-------------|
| A1.0 (ResNet50 + mock macros) | 0.0 | 0.0% | 0.0 |
| A1.1 (Hybrid DB) | 20.5 | — | 21.8 |
| **ΔA** | **-20.5** | — | — |

> Paper 1 Tupc MAE% ≈ 37.5% — reference magnitude only.

## Per-macro MAE

- calories: A1.0=0.0, A1.1=20.5
- protein: A1.0=0.0, A1.1=0.2
- carb: A1.0=0.0, A1.1=1.3
- fat: A1.0=0.0, A1.1=0.7

## H2 — by db_match_score bucket

| bucket   |   delta_ai_cal |   delta_db_cal |
|:---------|---------------:|---------------:|
| high     |              0 |           20.5 |

## H3 — ΔA by experiment_cohort

| experiment_cohort   |     0 |
|:--------------------|------:|
| HOME_HYBRID_DB      | -20.5 |

## Model versions in export

- resnet50-vtn-10class


## H4 — A1.0 MAE by meal_source

| meal_source   |   delta_ai_cal |
|:--------------|---------------:|
| HOME_COOKED   |              0 |

## Top-1 food recognition (proxy)

- Top-1 accuracy ≈ **100.0%** (1 − WRONG_FOOD rate)

## Bootstrap 95% CI for ΔA

- Point estimate: **-20.5** kcal
- 95% CI: **[-23.2, -17.9]** kcal (10k resamples, paired rows)

## Wilcoxon paired test (|A1.0−PT| vs |A1.1−PT|)

- n=30, statistic=0.00, p=0.0000
- Significant (p<0.05): **yes**


## Branch recommendation: **Apply (explain why hybrid did not help)**