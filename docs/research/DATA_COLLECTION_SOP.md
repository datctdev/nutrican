# Data Collection SOP — G2

Quy trình thu ≥30 mẫu CV cân cohort (LO_TRINH §2).

**Cập nhật:** 2026-06-14 — **30/30** ảnh user; G0 pass; seed batch đang chạy.

---

## Mục tiêu số lượng

| Cohort | Target min | Manifest (30 ảnh) | Ghi chú |
|--------|------------|-------------------|---------|
| `HOME_HYBRID_DB` (S1) | ≥8 | **12** ✅ | Món **có trong** `food_items` |
| `RESTAURANT_*` (S2) | ≥8 | **8** ✅ | Trộn AI_ONLY + HYBRID |
| `HOTPOT_HYBRID` | ≥4 | **1** ⚠️ | Chỉ lẩu gà — cần thêm 3 nếu strict |
| `COMPOSITE_BUFFET` | ≥4 | **4** ✅ | Korean BBQ ×4 |
| `HOME_AI_ONLY` (mix) | — | **5** | Xôi xéo, bánh khọt, chả… (ngoài DB) |
| **Tổng labeled CV** | **≥30** | **30** | seed đang upload |

---

## 30 ảnh seed (2026-06-14)

| File | Món | Cohort |
|------|-----|--------|
| `home_01.png` | Phở bò | HOME_HYBRID_DB |
| `home_02.png` | Cơm tấm | HOME_HYBRID_DB |
| `home_03.png` | Bún bò Huế | HOME_HYBRID_DB |
| `home_04.png` | Bánh mì | HOME_HYBRID_DB |
| `home_05.png` | Hủ tiếu Nam Vang | HOME_HYBRID_DB |
| `home_06.png` | Mì Quảng | HOME_HYBRID_DB |
| `home_07.png` | Phở gà | HOME_HYBRID_DB |
| `home_08.png` | Bánh xèo | HOME_HYBRID_DB |
| `home_09.png` | Bún chả | HOME_HYBRID_DB |
| `home_10.png` | Bún thịt nướng | HOME_HYBRID_DB |
| `home_11.png` | Bánh cuốn | HOME_HYBRID_DB |
| `home_12.png` | Cơm gà chiên | HOME_HYBRID_DB |
| `rest_01.png` | Pizza | RESTAURANT_AI_ONLY |
| `rest_02.png` | Burger | RESTAURANT_AI_ONLY |
| `rest_03.png` | Phở (quán) | RESTAURANT_HYBRID |
| `rest_04.png` | Gà nướng | RESTAURANT_AI_ONLY |
| `rest_05.png` | Thịt heo quay | RESTAURANT_AI_ONLY |
| `rest_06.png` | Thịt kho trứng | RESTAURANT_AI_ONLY |
| `rest_07.png` | Cá nướng cuốn | RESTAURANT_AI_ONLY |
| `rest_08.png` | Xôi ngũ sắc | RESTAURANT_AI_ONLY |
| `buffet_01.png` | Korean BBQ 1 | COMPOSITE_BUFFET |
| `buffet_02.png` | Korean BBQ 2 | COMPOSITE_BUFFET |
| `buffet_03.png` | Korean BBQ 3 | COMPOSITE_BUFFET |
| `buffet_04.png` | Korean BBQ 4 | COMPOSITE_BUFFET |
| `hotpot_01.png` | Lẩu gà | HOTPOT_HYBRID |
| `mix_01.png` | Xôi xéo | HOME_AI_ONLY |
| `mix_02.png` | Bánh khọt | HOME_AI_ONLY |
| `mix_03.png` | Chả lụa | HOME_AI_ONLY |
| `mix_04.png` | Chả trứng | HOME_AI_ONLY |
| `mix_05.png` | Bánh khọt (variant) | HOME_AI_ONLY |

Setup: `python research/scripts/setup_seed_30.py`  
Upload: `python research/scripts/seed_research_dataset.py`

---

## Mỗi lần thu (Customer — `/diet`)

1. Chụp ảnh rõ, <500KB
2. Chọn đúng **Meal source**: Tự nấu vs Ăn ngoài
3. Chọn **Complexity**: SIMPLE / Lẩu / Buffet
4. Nếu lẩu/buffet: chọn items từ Food DB
5. Submit — kiểm status `PT_REVIEWING` hoặc `DRAFT` → `submit-for-review`

---

## Batch upload (dev)

```powershell
$env:RESEARCH_API_BASE='http://localhost:8082/api/v1'
python research/scripts/seed_research_dataset.py
```

Thời gian: ~30–60 giây/ảnh (llava). 30 ảnh ≈ 15–30 phút.

---

## Checklist trước G3

- [x] G0 verification pass — 2026-06-14
- [ ] ≥30 log có snapshot R0 — **seed đang chạy**
- [x] Cohort distribution đạt target (trừ HOTPOT thiếu 3)
- [ ] Mix confidence (cả DRAFT sau submit)

---

*SOP v1.2 — 2026-06-14*
