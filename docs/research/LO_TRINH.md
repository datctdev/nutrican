# Lộ Trình Thực Hiện Research (20%) — NutriCan PT
## Improve (2.2), neo trên Paper 1 — Calorie Aware Meal Kit (Recipe1M)

> File này là **lộ trình hành động theo giai đoạn**, bổ sung cho `KE_HOACH_RESEARCH_IMPROVE_NUTRICAN.md` (đã có RQ/Hypothesis/script phân tích). Mục tiêu: biết **làm gì trước, làm gì sau, khi nào xong**.

**Trạng thái (2026-06-14):**

| Giai đoạn | Trạng thái | Ghi chú |
|-----------|------------|---------|
| **G0** | ✅ Hoàn thành | Pass 4/4 — llava, scaling, HYBRID/AI_ONLY |
| **G1** | 🔄 Đang làm | Paper 1 docs + literature map |
| **G2** | ✅ Hoàn thành | **30/30** upload + snapshot R0 |
| **G3** | ✅ Hoàn thành (dev seed) | **30/30** PT auto-label |
| **G4** | ⏳ Sẵn sàng | Export CSV + `rbl_analyze.py` |

---

## Tổng quan 6 giai đoạn

```
G0: Xác minh kỹ thuật ──┐
                        ├──► G2: Thu dữ liệu ──► G3: PT label ──► G4: Phân tích ──► G5: Viết báo cáo
G1: Literature review ──┘         (song song với G1)
```

G0 và G1 chạy **song song ngay từ đầu** — G0 không phụ thuộc data, G1 không phụ thuộc code.

---

## GIAI ĐOẠN 0 — Xác minh kỹ thuật (làm TRƯỚC, ~1–2 ngày)

Mục tiêu: đảm bảo số liệu ΔA sau này **không bị sai từ gốc**.

| # | Việc | Cách kiểm | Tiêu chí đạt |
|---|------|----------|--------------|
| 0.1 | Tầng RBL hoạt động thật | Upload 1 ảnh → kiểm DB có `ai_predicted_macros`, `db_matched_macros` | Cả 2 field có giá trị |
| 0.2 | **`db_matched_macros` đã scale theo portion chưa** (RBL_METHODOLOGY §4.4) | Đọc code `FoodCatalogServiceImpl`/`DietLogServiceImpl`, hoặc so `db_cal` trong CSV với `food_items.macros * (portion/serving_size_g)` | Nếu **chưa scale** → ghi nhận, sẽ scale lại trong Python ở G4 |
| 0.3 | CSV export đủ cột | `/admin/rbl/export` → kiểm có `delta_ai_cal`, `delta_db_cal`, `db_match_score`, `recognition_source`, `experiment_cohort` | Đủ cột theo RBL_METHODOLOGY §6.1 |
| 0.4 | Hybrid kích hoạt được | Upload món **có trong `food_items`**, confidence ≥ 0.6 → `recognition_source = HYBRID` | Có ít nhất 1 row HYBRID để test pipeline |

**Output G0:** ~~1 ghi chú ngắn "scaling OK / cần xử lý thêm trong Python"~~ → **Scaling OK** (smoke 2026-06-14: Phở bò 450 kcal @ 500 g, diff=0). Chi tiết: [G0_VERIFICATION.md](./G0_VERIFICATION.md).

---

## GIAI ĐOẠN 1 — Literature Review (song song G0–G2, ~1 tuần)

Dựa trực tiếp vào **Paper 1 (Jelodar & Sun, 2021)** — bài này tự thân đã làm sẵn một bản related-work theo 4 nhánh (Section II), dùng làm khung:

| Nhánh (theo Paper 1 §II) | Vai trò trong NutriCan | Việc cần làm |
|---|---|---|
| **A. Dish Classification** | Tương ứng bước VLM nhận diện `foodName` | Đọc refs [5],[6],[15]–[17]; verify năm/venue, ghi 2–3 câu mỗi paper |
| **B. Ingredient Recognition** | Không áp dụng trực tiếp (NutriCan không sinh ingredient list) — dùng để giải thích **vì sao không làm hướng này** | Đọc ref [1] (Inverse Cooking) — baseline gốc của Paper 1, đáng trích |
| **C. Portion Estimation** | Tương ứng bước scale macro theo `portionSize` (RBL §4.4) | Đọc refs [29]–[33]; so sánh cách tiếp cận của Paper 1 (transformer, không segmentation) vs NutriCan (rule-based scaling) |
| **D. Calorie Estimation** | **Cốt lõi** — đây là baseline trực tiếp cho `A1.0` vs `A1.1` | Đọc refs [34],[35],[40] + Bảng IV của Paper 1 chính |

**Cách làm cụ thể từng paper trong refs:**
1. Lên Google Scholar / Papers with Code, tìm bằng tên + năm trong refs Paper 1.
2. Verify: năm xuất bản, venue (ICCV/CVPR/IEEE TMM/...), có đúng nội dung như Paper 1 mô tả không.
3. Ghi vào bảng literature map (xem mẫu §1.1 dưới).

### 1.1 Mẫu bảng literature map (điền khi đọc)

| Paper | Năm/Venue | Đóng góp chính | Liên hệ NutriCan |
|---|---|---|---|
| Jelodar & Sun (2021) — Paper 1 | arXiv 2021 | Tách ingredient+portion → giảm MAE calo (Tupc 279.4 vs CNN 380) | **Baseline trực tiếp cho A1.0 vs A1.1** |
| Salvador et al. — Inverse Cooking [1] | CVPR 2019 | Sinh ingredient + recipe auto-regressive | Giải thích NutriCan không sinh ingredient list (out of scope) |
| Myers et al. — Im2Calories [30] | ICCV 2015 | Ước calo từ ảnh + segmentation | Đối chiếu hướng segmentation (NutriCan không dùng) |
| Thames et al. — Nutrition5k | CVPR 2021 | Dataset ảnh+macro chuẩn | Mốc dataset, không dùng trực tiếp |
| *(điền tiếp...)* | | | |

> **Lưu ý:** mục tiêu là **4–8 paper thật, verify được**, không cần nhiều hơn. Mỗi nhánh ≥1 paper là đủ cho phần Related Work.

**Output G1:** bảng literature map hoàn chỉnh + 1 đoạn văn Related Work (200–400 từ) nối các nhánh lại theo logic "Paper 1 chọn decomposition vì lý do X → NutriCan áp dụng decomposition dạng Y (hybrid CV→DB) vì lý do Z".

---

## GIAI ĐOẠN 2 — Thu thập dữ liệu (~2–3 tuần, song song G1)

### 2.1 Mục tiêu số lượng

| Cohort | Mục tiêu tối thiểu | Ghi chú |
|---|---|---|
| `HOME_HYBRID_DB` (S1) | ≥8 | Cần món **có trong `food_items`** để có DB match |
| `RESTAURANT_*` (S2) | ≥8 | Trộn cả AI_ONLY và HYBRID |
| `HOTPOT_HYBRID` | ≥4 | Test H3 |
| `COMPOSITE_BUFFET` | ≥4 | Test H3 |
| **Tổng** | **≥30** | Sàn để `insufficientSample=false` |

### 2.2 Quy trình mỗi lần thu

1. Customer upload ảnh, **chọn đúng** `mealSource` + `mealComplexity` (sai field này → cohort gán sai, hỏng toàn bộ phân tích §H3/H4).
2. Hệ thống tự đóng băng `ai_predicted_macros`, `db_matched_macros`, `db_match_score`, `experiment_cohort` (R0).
3. Nếu `DRAFT` (confidence < 0.6) → vẫn giữ, dùng `submit-for-review` để vào hàng PT review (không loại bỏ — đa dạng confidence tốt cho H2/RQ4).

### 2.3 Theo dõi tiến độ

- Dùng `GET /admin/rbl/export/preview` định kỳ để xem số lượng + phân bố cohort hiện tại.
- Nếu một cohort thiếu nhiều → **chủ động** chụp thêm món thuộc cohort đó (ví dụ thiếu HOTPOT → chụp thêm bữa lẩu).

**Output G2:** ≥30 log đã có snapshot R0, phân bố cohort gần đạt mục tiêu §2.1.

> **Tiến độ hiện tại:** **30/30** ảnh trong `research/seed/images/` + `manifest.csv`. Cohort: 12 HOME_HYBRID, 8 RESTAURANT, 4 COMPOSITE, 1 HOTPOT, 5 mix. Batch seed đang chạy (~30–60 s/ảnh). **Thiếu 3 ảnh HOTPOT** nếu muốn đạt SOP ≥4.

---

## GIAI ĐOẠN 3 — PT Labeling (~1 tuần, sau khi G2 đủ ~50%)

Có thể **bắt đầu label song song** khi đã có một lô log đầu, không cần chờ đủ 30.

| Bước | Việc | Lưu ý |
|---|---|---|
| 3.1 | PT vào `/pt/reviews`, xem từng log | Cột AI / DB / Shown — kiểm tra cả 3 hiển thị đúng |
| 3.2 | (Tuỳ chọn) Bật **blind mode** cho ~30% log | Phục vụ RQ6 (`pt_blind_macros`) — không bắt buộc nhưng cộng điểm |
| 3.3 | APPROVE / ADJUST_MACROS / REJECT + `correctionReason` | REJECT vẫn lưu nhưng **loại khỏi MAE** (RBL §3) — không lạm dụng REJECT |
| 3.4 | Ghi nhận **ai là người label** (tên/vai trò/kinh nghiệm) | Bắt buộc cho mục Reproducibility/Ethics |

**Output G3:** mọi log trong G2 có `pt_action` ∈ {APPROVE, ADJUST_MACROS, REJECT} và `pt_adjusted_macros` (nếu không REJECT).

---

## GIAI ĐOẠN 4 — Phân tích (~3–5 ngày, sau khi G3 xong)

### 4.1 Export

```
GET /admin/rbl/export?cvOnly=true&includeRejected=false
```
→ `rbl_export.csv`. Kiểm `food_db_version`, số dòng, `insufficientSample`.

### 4.2 Chạy script phân tích

Dùng script Python trong `KE_HOACH_RESEARCH_IMPROVE_NUTRICAN.md` §8. Nếu G0.2 phát hiện `db_cal` **chưa scale**, thêm bước scale trước khi tính `delta_db_cal`:

```python
# Chỉ chạy nếu G0.2 xác nhận db_matched_macros CHƯA scale theo portion
df["db_cal_scaled"] = df["db_cal"] * (df["ai_portion_g"] / df["db_serving_size_g"])
df["delta_db_cal"] = (df["db_cal_scaled"] - df["pt_cal"]).abs()
```
*(tên cột `ai_portion_g`/`db_serving_size_g` cần xác nhận có trong CSV hay phải lấy thêm từ `food_items` — nếu CSV không có, có thể cần bổ sung export hoặc tra DB trực tiếp)*

### 4.3 Bảng kết quả cần có (đối chiếu Paper 1 Table IV)

| Model | MAE | MAE% | *(Paper 1 tham chiếu)* |
|---|---|---|---|
| `A1.0` (VLM-only) | ? | ? | Tcalorie 394.5 / 49.9%, CNN 380 / 49.8% |
| `A1.1` (Hybrid CV→DB) | ? | ? | Tupc 279.4 / 37.5% |
| **ΔA** | ? | — | ≈115 kcal (Paper 1) |

Kèm: RMSE per-macro, MAE theo `experiment_cohort` (H3), theo `meal_source` (H4), theo `db_match_score` bucket (H2), Top-1 accuracy nhận diện món (`1 − %WRONG_FOOD`).

**Output G4:** 1 file kết quả (CSV/markdown bảng) + các số liệu trên.

---

## GIAI ĐOẠN 5 — Viết báo cáo (~1 tuần, có thể bắt đầu sớm với phần Intro/Method)

| Phần | Có thể viết từ giai đoạn nào | Nội dung |
|---|---|---|
| Introduction | Ngay từ đầu | Vấn đề ước dinh dưỡng món Việt từ ảnh |
| Related Work | Sau G1 | Bảng literature map → văn |
| Method | Sau G0 | A1.0/A1.1 mapping, RBL pipeline |
| Experiments | Sau G2 | Dataset, cohort, protocol |
| **Results** | Sau G4 | Bảng §4.3 + so sánh Paper 1 + giải thích |
| Limitations | Sau G4 | Mẫu nhỏ, Food DB ~60 món, ground truth = PT |
| Conclusion | Cuối | Tóm tắt ΔA, hướng EXE2 |

---

## Bảng tổng hợp mốc thời gian (gợi ý ~5 tuần)

| Tuần | G0 | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|---|
| 1 | xong | bắt đầu | bắt đầu | | | Intro/Method bắt đầu |
| 2 | | tiếp | tiếp | bắt đầu (lô đầu) | | |
| 3 | | hoàn thành | tiếp tới ≥30 | tiếp | | Related Work |
| 4 | | | hoàn thành | hoàn thành | chạy script | Experiments |
| 5 | | | | | hoàn thiện | Results, Limitations, Conclusion |

---

## Quyết định rẽ nhánh (sau G4)

```
ΔA > 0 và Wilcoxon p < 0.05 (xem script §8 file KE_HOACH chính)
   → Giữ Improve, viết Results theo §4.3
ΔA ≤ 0 hoặc không có ý nghĩa thống kê
   → Hạ xuống Apply: báo cáo MAE A1.0 trên món Việt + giải thích vì sao
     hybrid chưa cải thiện (DB ~60 món, normalize/scaling — xem G0.2)
   → Cùng dữ liệu, không phí công
```
