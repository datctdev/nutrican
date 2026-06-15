# Results Template — A1.0 vs A1.1



Điền sau khi chạy `python research/scripts/rbl_analyze.py rbl_export.csv`.



---



## Table 1 — Global comparison (Paper 1 Table IV style)



| Model | Role | MAE (kcal) | MAE% | RMSE (kcal) | Paper 1 ref |

|-------|------|------------|------|-------------|-------------|

| **A1.0** | VLM direct | _fill_ | _fill_ | _fill_ | Tcalorie 394.5 / 49.9% |

| **A1.1** | Hybrid CV→DB | _fill_ | _fill_ | _fill_ | Tupc 279.4 / 37.5% |

| **ΔA** | A1.0 − A1.1 | _fill_ | — | — | ≈115 kcal |



> Khác dataset/miền — chỉ so **độ lớn**, không claim beat Paper 1.



---



## Table 2 — By experiment_cohort (H3)



| Cohort | n | MAE A1.0 | MAE A1.1 | ΔA |

|--------|---|----------|----------|-----|

| HOME_HYBRID_DB | | | | |

| RESTAURANT_AI_ONLY | | | | |

| RESTAURANT_HYBRID_DB | | | | |

| HOTPOT_HYBRID | | | | |

| COMPOSITE_BUFFET | | | | |



---



## Table 3 — By meal_source (H4)



| Source | n | MAE A1.0 |

|--------|---|----------|

| HOME_COOKED (S1) | | |

| RESTAURANT (S2) | | |



---



## Table 4 — db_match_score buckets (H2)



| Bucket | n | MAE A1.0 | MAE A1.1 |

|--------|---|----------|----------|

| none (0) | | | |

| low (1–8) | | | |

| mid (9–14) | | | |

| high (15+) | | | |



---



## Branch decision



| Condition | Action |

|-----------|--------|

| ΔA > 0 và p < 0.05 (Wilcoxon) | **Improve** — viết Results theo bảng trên |

| ΔA ≤ 0 hoặc không significant | **Apply** — báo MAE A1.0 trên món Việt + giải thích (DB ~60 món, match/scaling) |



---



## Narrative prompts



1. RQ1: VLM (A1.0) sai bao nhiêu so với PT? → MAE%, so sánh mốc Paper 1

2. RQ3: Hybrid (A1.1) có giảm sai số? → ΔA, Wilcoxon

3. RQ2: Restaurant khó hơn home? → Table 3

4. Top-1 food: `1 − P(WRONG_FOOD)`



---



*Filled 2026-06-14 — **G2/G3 seed xong (n=30, pt_labeled).** Chạy export + analyze để điền số:*

```powershell
$env:RESEARCH_API_BASE='http://localhost:8082/api/v1'
# Admin export → research/output/rbl_export.csv
python research/scripts/rbl_analyze.py research/output/rbl_export.csv
python research/scripts/fill_results_template.py research/output/rbl_export.csv
```


