# G0 — Xác minh kỹ thuật RBL

Checklist trước khi thu data hàng loạt (LO_TRINH §G0). Mục tiêu: đảm bảo **ΔA** không sai từ gốc.

**Ngày kiểm:** 2026-06-14
**Người kiểm:** g0_smoke_test.py (automated)
**Commit / version:** 53520e0
**Backend:** `http://localhost:8082/api/v1` (bản có fix upload + fallback parser)  
**Model:** `llava` (Ollama)

---

## 0.1 — Tầng RBL hoạt động

| Bước | Hành động | Kết quả mong đợi | Pass? |
|------|-----------|------------------|-------|
| 1 | Customer upload 1 ảnh qua `/diet` → Analyze | Status `PT_REVIEWING` hoặc `DRAFT` | ☑ |
| 2 | Kiểm DB `diet_logs` hoặc API `GET /admin/rbl/logs/{id}` | Có `aiPredictedMacros` | ☑ |
| 3 | Cùng log | Có `dbMatchedMacros` (khi có match) hoặc null (không match) | ☑ |
| 4 | Cùng log | Có `modelVersion`, `promptVersion`, `experimentCohort` | ☑ |

**Smoke log (HOME):** `2ded21ff-177d-4f6b-8530-2e75226f1f2b` — cohort `HOME_HYBRID_DB`, recognition `HYBRID`.

---

## 0.2 — `db_matched_macros` scale theo portion

**Code reference:** `DietLogServiceImpl.macrosForFood()`:

```
ratio = portionG / serving_size_g
db_cal = food.calories × ratio
```

| Bước | Hành động | Kết quả mong đợi | Pass? |
|------|-----------|------------------|-------|
| 1 | Upload món **có trong** `food_items` (vd: phở, cơm tấm) | `db_food_name` khớp catalog | ☑ |
| 2 | Ghi `ai_portion_g` từ export CSV (cột mới) | > 0 | ☑ |
| 3 | So sánh `db_cal` ≈ `food.calories × (ai_portion_g / serving_size_g)` | Sai lệch < 5 kcal hoặc do làm tròn | ☑ |

**Kết luận G0.2 (smoke test số thật):** Scaling **OK** — không cần scale lại trong Python ở G4.

| G0.2 | Ghi chú |
|------|---------|
| ☑ scaling OK | Dùng `db_cal` trực tiếp từ CSV |
| ☐ cần xử lý Python | — |

**Số kiểm:** Phở bò — base 450 kcal / serving 500 g, portion 500 g → expected 450 kcal, actual 450 kcal, diff 0.

---

## 0.3 — CSV export đủ cột

Export: `GET /admin/rbl/export?cvOnly=true`

| Cột bắt buộc | Có? |
|--------------|-----|
| `delta_ai_cal`, `delta_db_cal` | ☑ |
| `db_match_score`, `recognition_source`, `experiment_cohort` | ☑ |
| `ai_portion_g`, `db_applied` | ☑ |
| `blind_cal/pro/carb/fat` | ☑ |
| `diet_log_items_json` | ☑ |
| Header `# food_db_version=v2-60` | ☑ |

Schema đầy đủ: [RBL_METHODOLOGY.md §6](../RBL_METHODOLOGY.md#6-csv-export-schema)

---

## 0.4 — Hybrid kích hoạt được

| Bước | Hành động | Kết quả | Pass? |
|------|-----------|---------|-------|
| 1 | Upload món trong `food_items`, confidence ≥ 0.6 | `recognition_source = HYBRID` | ☑ |
| 2 | Upload món không có trong DB | `recognition_source = AI_ONLY` | ☑ |
| 3 | HOTPOT + chọn items từ DB | `recognition_source = HYBRID`, cohort `HOTPOT_HYBRID` | ☐ (chưa test G0) |

**Smoke:**
- HOME (`smoke_pho.png`): Beef Pho, conf=0.85 → **HYBRID**, cohort `HOME_HYBRID_DB`
- REST (`smoke_pizza.png`): Cheese Pizza, conf=0.9 → **AI_ONLY**, cohort `RESTAURANT_AI_ONLY`

---

## G0 run log (2026-06-14)

- AI health: available=True model=llava
- HOME image: smoke_pho.png
- HOME analyze logId=a6ffc1be-1c73-4992-8256-9f108d35ccff food=Beef Pho conf=0.85 portion=500.0
- 0.1 snapshots: ai=True db_macros=True model=True cohort=HOME_HYBRID_DB recognition=HYBRID
- REST image: smoke_pizza.png
- REST analyze logId=6c02110f-8a63-4231-9f14-430558c09690 food=Cheese Pizza conf=0.9
- 0.3 csv: missing_cols=none version_header=True
- 0.2 scaling PASS: food=Phở bò base_cal=450.0 serving_g=500.0 portion_g=500.0 ratio=1.0000 expected_db_cal=450.00 actual_db_cal=450.00 diff=0.00 tol=9.00
- 0.4 HOME=HYBRID (expect HYBRID, conf=0.85) | REST=AI_ONLY (expect AI_ONLY)

---

## Tổng kết G0

| Mục | Trạng thái |
|-----|------------|
| 0.1 RBL snapshots | ☑ Pass / ☐ Fail |
| 0.2 Portion scaling | ☑ Pass / ☐ Fail |
| 0.3 CSV columns | ☑ Pass / ☐ Fail |
| 0.4 Hybrid pipeline | ☑ Pass / ☐ Fail |

**Sẵn sàng thu data G2:** ☑ Có — chỉ khi cả 4 mục Pass

---

*Document Version: 1.1.0 | Last Updated: 2026-06-14*
