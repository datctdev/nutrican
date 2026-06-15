# Research seed dataset (dev-only)

Thư mục này phục vụ **pipeline nội bộ** — không phải data chính thức thesis trừ khi ghi rõ nguồn và limitation.

**Cập nhật:** 2026-06-14 — **15 ảnh thật** từ user; G0 pass với `smoke_pho.png` + `smoke_pizza.png`.

---

## Cấu trúc

```
research/seed/
  test/smoke_pho.png       # Ảnh phở bò THẬT cho G0 (HYBRID) — copy từ home_01
  test/smoke_pizza.png     # Ảnh pizza THẬT cho G0.4 AI_ONLY — copy từ rest_06
  images/                  # 15 ảnh thật (gitignored)
  manifest.csv             # 15 dòng metadata + PT ground truth
  README.md
```

---

## 15 ảnh hiện có

| File | Món |
|------|-----|
| `home_01.png` | Phở bò |
| `home_02.png` | Cơm tấm |
| `home_03.png` | Bún bò Huế |
| `home_05.png` | Bánh mì |
| `home_06.png` | Hủ tiếu Nam Vang |
| `home_08.png` | Mì Quảng |
| `home_pho_ga.png` | Phở gà |
| `home_banh_xeo.png` | Bánh xèo |
| `rest_06.png` | Pizza |
| `rest_07.png` | Burger |
| `rest_08.png` | Phở (quán) |
| `hotpot_01.png` | Lẩu gà |
| `mix_01.png` | Bánh khọt |
| `mix_02.png` | Xôi xéo |
| `mix_04.png` | Xôi ngũ sắc |

**Còn thiếu so với target 30:** ~4 RESTAURANT, ~3 HOTPOT, ~4 COMPOSITE.

---

## Chuẩn bị thêm ảnh

1. Copy ảnh vào `images/` (JPEG/PNG, <500KB, tên khớp cột `filename` trong manifest)
2. Cập nhật `manifest.csv`: macros PT (`pt_cal`, `pt_pro`, `pt_carb`, `pt_fat`), `meal_source`, `meal_complexity`, `cohort_target`
3. Phân bổ tối thiểu (xem [DATA_COLLECTION_SOP.md](../../docs/research/DATA_COLLECTION_SOP.md))

---

## Chạy seed script

```powershell
# Backend + Ollama phải chạy (dùng bản :8082 có fix llava)
$env:RESEARCH_API_BASE='http://localhost:8082/api/v1'
$env:RESEARCH_CUSTOMER_EMAIL='research.customer@nutrican.dev'
$env:RESEARCH_CUSTOMER_PASSWORD='Research123!'
$env:RESEARCH_PT_EMAIL='research.pt@nutrican.dev'
$env:RESEARCH_PT_PASSWORD='Research123!'

pip install -r research/scripts/requirements.txt
python research/scripts/seed_research_dataset.py
```

**PT account:** Script cố gắng đăng ký customer + gán PT; nếu PT chưa được admin verify, chỉ upload/analyze — label thủ công qua `/pt/reviews`.

**Thời gian:** ~30–60 giây/ảnh với llava.

---

## G0 smoke test

```powershell
$env:RESEARCH_API_BASE='http://localhost:8082/api/v1'
python research/scripts/g0_smoke_test.py
```

Kết quả mới nhất: **Pass 4/4** — xem [G0_VERIFICATION.md](../../docs/research/G0_VERIFICATION.md).

---

## Manifest columns

| Column | Mô tả |
|--------|--------|
| `filename` | Tên file trong `images/` |
| `meal_source` | `HOME_COOKED` / `RESTAURANT` |
| `meal_complexity` | `SIMPLE` / `HOTPOT` / `COMPOSITE` |
| `restaurant_name` | Bắt buộc nếu RESTAURANT |
| `hotpot_broth_id`, `hotpot_item_ids` | UUID từ `/foods/hotpot/*` (optional) |
| `composite_item_ids` | UUID buffet items, comma-separated |
| `pt_cal`, `pt_pro`, `pt_carb`, `pt_fat` | Ground truth cho auto PT label |
| `cohort_target` | Ghi chú S1/S2/HOTPOT/COMPOSITE |
| `blind_estimate` | `true` ~30% — PT blind trước review |
| `notes` | Mô tả món |

---

## Ethics

- Không commit ảnh cá nhân vào git (`research/seed/images/*` gitignored)
- Seed dev gắn tag trong manifest — phân biệt với export thesis (`cvOnly=true`)

---

*README v1.1 — 2026-06-14*
