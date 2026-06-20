# Literature Map — NutriCan Research (Improve 2.2)

Khung Related Work theo Paper 1 (Jelodar & Sun, arXiv 2112.09839). Nguồn gốc: [PAPER1_JELODAR_SUN.md](./PAPER1_JELODAR_SUN.md).

---

## A. Dish Classification (ResNet50 — 10 món Việt)

| Paper | Năm/Venue | Đóng góp chính | Liên hệ NutriCan |
|-------|-----------|----------------|------------------|
| **Bohlol et al.** | 2025 | ResNet50 refined FC, transfer learning, 97.25% / 16 class | Kiến trúc + justification module AI |
| Jelodar & Sun (2021) — **Paper 1** | arXiv 2112.09839 | 2-stage pipeline meal kit + calorie | Baseline Improve (macro) |
| Ng et al. [5] | IWAMDM 2019 | CNN food image recognition | CNN baseline lineage |

**NutriCan:** `best_resnet50_model.h5`, Vietnamese_Food_Dataset (10 class, ~8.705 ảnh), FastAPI `:8000`.

---

## B. Ingredient Recognition (NutriCan **không** làm hướng này)

| Paper | Năm/Venue | Đóng góp chính | Liên hệ NutriCan |
|-------|-----------|----------------|------------------|
| Salvador et al. [1] — Inverse Cooking | CVPR 2019 | Sinh ingredient list + recipe từ ảnh | **Out of scope** — NutriCan dùng VLM+Food DB thay vì sinh ingredient list |
| Chen et al. [9] | ACM MM 2017 | Cross-modal recipe retrieval | Retrieval vs generation |

---

## C. Portion Estimation

| Paper | Năm/Venue | Đóng góp chính | Liên hệ NutriCan |
|-------|-----------|----------------|------------------|
| Myers et al. [30] — Im2Calories | ICCV 2015 | Segmentation + volume → calorie | NutriCan không dùng segmentation |
| Paper 1 Table III | 2021 | 6 unit types (cup, tsp, …) MAE portion | NutriCan: rule `portion/serving_size_g` |
| Wu & Yang [10] | ICPR 2009 | Fast food video calorie | Video vs single image |

**NutriCan:** ResNet default `portionSize=100g` — CNN không estimate portion ([BIEN_BAN_AI_MODULE.md](./BIEN_BAN_AI_MODULE.md)).

---

## D. Calorie Estimation (cốt lõi — A1.0 vs A1.1)

| Paper | Năm/Venue | MAE / MAE% | Liên hệ NutriCan |
|-------|-----------|------------|------------------|
| Jelodar & Sun — **Tupc** | 2021 Table IV | **279.4 / 37.5%** | Mốc **A1.1** |
| Jelodar & Sun — **Tcalorie** | 2021 | 394.5 / 49.9% | Mốc **A1.0** |
| CNN baseline | 2021 | 380 / 49.8% | Direct estimation |
| Marin et al. [7] — Recipe1M+ | PAMI 2019 | Dataset 1M recipes | Mốc dataset, không dùng trực tiếp |
| Thames et al. — Nutrition5k | CVPR 2021 | Ảnh + macro chuẩn | Benchmark dataset |

> **Đạo đức:** Recipe1M chỉ là mốc độ lớn — NutriCan dataset = món Việt + nhãn PT.

---

## Draft Related Work (200–400 từ)

Jelodar & Sun (2021) chứng minh trên Recipe1M rằng ước calorie qua **tách nguyên liệu + portion + bảng dinh dưỡng** (Tupc, MAE 279.4 kcal) vượt **ước trực tiếp** tổng calorie (Tcalorie, 394.5 kcal). NutriCan áp dụng cùng nguyên lý Improve trên món Việt: **A1.0** là VLM `llava` (Ollama) ước macro thẳng từ ảnh; **A1.1** là hybrid grounding tên món vào Food DB nội bộ và scale theo khẩu phần. Khác Paper 1, NutriCan không train transformer ingredient generator mà dùng VLM zero-shot + catalog ~60 món, và ground truth là nhãn PT (RBL) thay vì label Recipe1M parsed.

---

*Updated: 2026-06-12 — synced with Paper 1 PDF*
