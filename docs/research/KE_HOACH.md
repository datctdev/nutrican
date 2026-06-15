# Kế Hoạch Research (20%) — NutriCan PT
## Improve (2.2), neo trên Paper 1 (Calorie-Aware Meal Kit, Recipe1M)

> **Một câu tóm tắt:** Lấy phát hiện của Paper 1 — *ước calo bằng cách tách nguyên liệu/khẩu phần rồi tra bảng dinh dưỡng thì chính xác hơn ước trực tiếp* — làm "vai người khổng lồ", rồi chứng minh tầng **Hybrid CV→DB** của NutriCan (`A1.1`) giảm sai số so với **VLM ước trực tiếp** (`A1.0`).

---

## 1. Định vị nghiên cứu

- **Level:** Improve (2.2). Không train model → không tái hiện Tupc/PRENet, chỉ dùng *phát hiện + con số* của paper làm mốc.
- **Tên đề xuất:** *"Cải thiện ước lượng dinh dưỡng từ ảnh món ăn Việt: nối tầng grounding Food-DB vào Vision-Language Model, đánh giá bằng nhãn chuyên gia (PT)."*
- **Claim chính:** `ΔA = MAE(A1.0) − MAE(A1.1) > 0`, mạnh nhất ở món nhiều thành phần (HOTPOT/COMPOSITE).

### Vì sao Paper 1 hợp làm baseline
Bảng IV của Paper 1 đã tự chứng minh: mô hình tách-nguyên-liệu (Tupc, MAE **279.4 kcal / 37.5%**) thắng ước trực tiếp (Tcalorie **394.5 / 49.9%**, CNN **380 / 49.8%**) — tức `ΔA ≈ 115 kcal`. NutriCan lặp lại đúng logic này nhưng bằng **VLM + Food DB** trên **món Việt**, nhãn **PT** thay vì Recipe1M.

---

## 2. Ánh xạ A1.0 / A1.1 / ΔA

| Khái niệm | NutriCan | Field trong DB/CSV |
|-----------|----------|--------------------|
| `A1.0` baseline (ước trực tiếp) | VLM **llava** (Ollama) ước macro thẳng từ ảnh | `ai_predicted_macros` → `ai_cal/pro/carb/fat` |
| `A1.1` cải tiến (grounding) | VLM nhận tên món → match Food DB → macro DB scale theo portion; món nhiều phần cộng từ `diet_log_items` | `db_matched_macros` → `db_cal/pro/carb/fat` |
| Ground truth | Nhãn PT (APPROVE/ADJUST) | `pt_adjusted_macros` → `pt_cal/pro/carb/fat` |
| `ΔA` = GAP | Mức giảm sai số nhờ grounding | `mean(delta_ai_cal) − mean(delta_db_cal)` |

> Tương ứng Paper 1: `A1.0` ≈ Tcalorie/CNN (direct), `A1.1` ≈ Tupc (per-item decomposition + nutrition table).

---

## 3. Câu hỏi nghiên cứu (khoá 3 câu chính)

| RQ | Câu hỏi | Metric |
|----|---------|--------|
| **RQ1** | VLM ước trực tiếp sai bao nhiêu so với nhãn PT? (mô tả `A1.0`) | `MAE_cal`, `MAE%` |
| **RQ3** | Hybrid CV→DB (`A1.1`) có giảm sai số so với `A1.0` không? (trọng tâm Improve) | `ΔA`, MAE/RMSE |
| **RQ2** | Món ngoài hàng khó hơn món tự nấu? (S1 vs S2) | MAE theo `meal_source` |
| (phụ) RQ5 | Món nhiều phần (HOTPOT/COMPOSITE) `ΔA` lớn hơn? | MAE theo `experiment_cohort` |

---

## 4. Giả thuyết

| H | Phát biểu | Kỳ vọng |
|---|-----------|---------|
| **H1** | `A1.1` MAE < `A1.0` MAE (toàn cục) | `ΔA > 0` |
| **H2** | `ΔA` lớn nhất khi `db_match_score` cao | MAE bucket high < low |
| **H3** | Món nhiều phần (cohort COMPOSITE/HOTPOT) hưởng lợi nhiều nhất từ grounding | `ΔA` cohort đó cao nhất |
| **H4** | Món ngoài hàng MAE cao hơn món nhà | MAE(RESTAURANT) > MAE(HOME) |

---

## 5. Dataset

- **Dataset chạy thật = RBL CSV của chính bạn** (KHÔNG dùng Recipe1M — nó cần training + là món Tây).
- **Yêu cầu:** ≥ **30 mẫu CV đã PT label** (`insufficientSample = false`).
- **Chia nhóm (S1/S2):** S1 = `HOME_COOKED`, S2 = `RESTAURANT`.
- **Cân đối cohort khi thu:** HOME / RESTAURANT / HOTPOT / COMPOSITE (mỗi nhóm càng đều càng tốt).
- **Recipe1M (Paper 1):** chỉ dùng làm **mốc tham chiếu độ lớn** (MAE% 37.5), ghi rõ "khác dataset, khác miền, không so trực tiếp".

---

## 6. Metrics

Tính toàn bộ trong Python từ CSV export (không cần sửa backend):

- **Hồi quy macro (chính):** `MAE` và `RMSE` cho cal / protein / carb / fat.
- **`MAE%`** = `MAE_cal / mean(pt_cal) × 100` → để đối chiếu mốc 37.5% của Paper 1.
- **`ΔA`** = `mean(delta_ai_cal) − mean(delta_db_cal)`.
- **Nhận diện món (phụ, từ Paper 2):** Top-1 accuracy = `1 − tỷ lệ pt_correction_reason == WRONG_FOOD` trên tập đã label.

---

## 7. Quy trình thí nghiệm

1. **Thu thập:** Customer upload ảnh, chọn đúng `mealSource` + `mealComplexity`. Hệ thống tự đóng băng `ai_predicted_macros` + `db_matched_macros` (R0).
2. **Cân nhóm:** đảm bảo đủ mẫu mỗi cohort, ưu tiên thêm COMPOSITE/HOTPOT để test H3.
3. **PT label:** PT vào `/pt/reviews`, APPROVE/ADJUST/REJECT + `correctionReason`. (Tùy chọn bật blind mode.)
4. **Export:** Admin tải `/admin/rbl/export?cvOnly=true&includeRejected=false` → `rbl_export.csv`.
5. **Phân tích:** chạy script Python (§8) → bảng MAE/RMSE/ΔA + theo cohort + theo meal_source.
6. **Đối chiếu:** đặt `MAE%` cạnh mốc Paper 1.

---

## 8. Script phân tích (mẫu)

```python
import pandas as pd, numpy as np

df = pd.read_csv("rbl_export.csv", comment="#")
lab = df[df["pt_action"].isin(["APPROVE", "ADJUST_MACROS"])]   # bỏ REJECT

def mae(a, b): return (lab[a] - lab[b]).abs().mean()
def rmse(a, b): return np.sqrt(((lab[a] - lab[b])**2).mean())

# A1.0 vs A1.1 (toàn cục) — RQ1, RQ3, H1
mae_ai  = lab["delta_ai_cal"].mean()        # A1.0
mae_db  = lab["delta_db_cal"].mean()        # A1.1
print("A1.0 MAE:", mae_ai, " A1.1 MAE:", mae_db, " ΔA:", mae_ai - mae_db)
print("MAE%:", mae_ai / lab["pt_cal"].mean() * 100, "  (Paper1 Tupc = 37.5%)")
print("RMSE A1.0:", rmse("ai_cal","pt_cal"), " RMSE A1.1:", rmse("db_cal","pt_cal"))

# per-macro MAE
for m in ["cal","pro","carb","fat"]:
    print(m, "MAE ai/db:", mae(f"ai_{m}",f"pt_{m}"), mae(f"db_{m}",f"pt_{m}"))

# H2 — theo db_match_score bucket
lab["bucket"] = pd.cut(lab["db_match_score"], [0,8,14,100], labels=["low","mid","high"])
print(lab.groupby("bucket")[["delta_ai_cal","delta_db_cal"]].mean())

# H3 — theo cohort ; H4 — theo meal_source
print(lab.groupby("experiment_cohort").apply(lambda g:(g.delta_ai_cal-g.delta_db_cal).mean()))
print(lab.groupby("meal_source")["delta_ai_cal"].mean())

# Top-1 nhận diện món (Paper 2)
print("Top-1 acc:", 1 - (lab["pt_correction_reason"]=="WRONG_FOOD").mean())
```

---

## 9. Vai trò 2 paper trong báo cáo

- **Paper 1** = baseline + động cơ chính. Trích: (a) phát hiện decomposition>direct, (b) con số mốc MAE 37.5%, (c) hạn chế "dataset tự cắt nên khó so trực tiếp" → biện minh việc bạn dùng dataset riêng.
- **Paper 2** = neo cho phần nhận diện món + nguồn dataset tham chiếu (Food2K/Food-101) + metric Top-1.
- **Mở rộng literature review:** khai thác mục References của 2 paper (Im2Calories, Nutrition5k, Inverse Cooking, ISIA Food-500…) — toàn paper thật, citable. Mỗi nhánh review phải dẫn được nguồn (đúng yêu cầu thầy).

---

## 10. Cấu trúc báo cáo (thesis outline)

1. Introduction — vấn đề ước dinh dưỡng từ ảnh món Việt
2. Related Work — neo Paper 1 (calorie estimation) + Paper 2 (food recognition) + references
3. Method — VLM `A1.0`, Hybrid CV→DB `A1.1`, RBL snapshot pipeline
4. Experiments — dataset, cohort, metric, protocol
5. Results — bảng `A1.0` vs `A1.1`, `ΔA`, theo cohort/meal_source, đối chiếu mốc Paper 1
6. Limitations — (§12)
7. Conclusion & Future Work

---

## 11. Mốc công việc (thứ tự)

| # | Việc | Output | Trạng thái |
|---|------|--------|------------|
| 0 | G0 verification (llava, scaling, HYBRID) | [G0_VERIFICATION.md](./G0_VERIFICATION.md) | ✅ 2026-06-14 |
| 1 | Literature review từ 2 paper + references | bảng nhánh + citation thật | 🔄 |
| 2 | Thu ≥30 mẫu CV cân cohort | data trong DB | ✅ 30/30 seed |
| 3 | PT label xong | `pt_adjusted_macros` đầy đủ | ✅ auto-label dev |
| 4 | Export CSV + chạy script §8 | bảng MAE/RMSE/ΔA | ⏳ |
| 5 | Viết Results + đối chiếu Paper 1 | mục 5 báo cáo | ⏳ |
| 6 | Ghi limitations + reproducibility | mục 6 + checklist | ⏳ |

---

## 12. Rủi ro & dự phòng

| Rủi ro | Xử lý |
|--------|-------|
| `ΔA ≤ 0` hoặc không ý nghĩa (Food DB ~60 món, mẫu ít) | Hạ xuống **Apply**: báo cáo benchmark VLM trên món Việt + **giải thích vì sao** hybrid chưa cải thiện (DB nhỏ, normalize mismatch, portion scaling). Cùng data, không phí. |
| Mẫu < 30 | Ghi `insufficientSample`, coi là kết quả sơ bộ, nêu rõ giới hạn |
| So trực tiếp với Paper 1 | KHÔNG — chỉ dùng làm mốc độ lớn (khác dataset/miền) |

---

## 13. Reproducibility (bắt buộc ghi — đạo đức)

- [ ] `model_version`, `prompt_version`, `food_db_version`
- [ ] khoảng thời gian thu, n mẫu, filter export (`cvOnly`, `includeRejected`)
- [ ] privacy: chỉ `customer_id_hash`, không tên/email
- [ ] commit hash của code
