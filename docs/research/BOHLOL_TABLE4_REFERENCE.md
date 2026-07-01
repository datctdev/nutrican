# Bohlol et al. 2025 — Table 4 Reference

Trích dẫn literature baseline cho hướng **Improve** NutriCan PT. Nguồn: PDF tại `project_team/research/Improved food recognition using a refined ResNet50 architecture with improved fully connected layers.pdf`.

**Liên quan:** [RESULTS_TEMPLATE.md](./RESULTS_TEMPLATE.md), [KE_HOACH.md](./KE_HOACH.md)

---

## Trích dẫn

Bohlol, P., et al. (2025). *Improved food recognition using a refined ResNet50 architecture with improved fully connected layers.* Dataset: 16 lớp thực phẩm Iran; input 340×640; optimizer Adam, lr=10⁻⁴, batch size 4.

---

## Table 4 — Performance of ResNet-50S (p.10)

> *The performance of ResNet-50S with different sizes of trainable parameters.*

| Architecture | Epochs | Accuracy | Precision | Recall | F1-Score | MAE (test) | MSE (test) | RMSE (test) | Classes / Optimizer |
|--------------|--------|----------|-----------|--------|----------|------------|------------|-------------|---------------------|
| ResNet-50S — Fine tuning 10 layer | 5 | 61% | 60% | 60% | 61% | 0.30 | 0.62 | 0.70 | 16 — Adam |
| ResNet-50S — Fine tuning 20 layer | 5 | 75% | 76% | 75.5% | 76% | 0.25 | 0.75 | 0.80 | 16 — Adam |
| ResNet-50S — Fine tuning 30 layer | 5 | 85% | 85% | 86% | 84% | 0.10 | 0.88 | 0.85 | 16 — Adam |
| ResNet-50S — Fine tuning 40 layer | 5 | 92% | 93% | 93% | 92.5% | 0.05 | 0.90 | 0.89 | 16 — Adam |
| **ResNet-50S** (specific FC, full model) | 5 | **97.25%** | 96.3% | 97% | **97%** | **0.03375** | 0.991 | **0.95** | 16 — Adam |

---

## Table 0b — Narrative baseline (không có trong Table 4)

Từ §5 Conclusion (p.15):

> *The initial model achieved an accuracy of **70%**. After optimizing the hyperparameters and adjusting the fully connected layer, the accuracy improved significantly to **97.25%**.*

| Config | Accuracy | F1 | MAE | RMSE | Ghi chú |
|--------|----------|-----|-----|------|---------|
| ResNet50 **without** specific dense layer | **~70%** | — | — | — | Narrative only; không có hàng Table 4 đầy đủ |
| ResNet-50S (specific FC) | 97.25% | 97% | 0.03375 | 0.95 | **Upper bound** literature |

**Quan trọng:** Hàng Table 4 “Fine tuning 10 layer” (Acc 61%, MAE 0.30) **không** tương đương narrative “70% không FC”. Không gộp số khi trích dẫn.

---

## Đơn vị MAE — không nhầm với NutriCan kcal

| Nguồn | MAE trong bảng trên | Đơn vị |
|-------|---------------------|--------|
| Bohlol Table 4 | 0.03 – 0.30 | Lỗi phân loại / test error (0–1 scale), **không phải kcal** |
| NutriCan RBL | `delta_ai_cal`, `delta_db_cal` | **kcal** — `\|predicted_cal − pt_cal\|` |

Khi so sánh với thầy: dùng Bohlol cho **classification** (Acc, F1); dùng RBL cho **nutrition MAE (kcal)**.

---

## Ánh xạ sang NutriCan Improve

| Vai trò trong báo cáo | Bohlol reference | NutriCan tương ứng |
|------------------------|------------------|-------------------|
| **A1.0 literature (CV baseline)** | ResNet50 no specific FC ~70% Acc | Phase1 model / before Bohlol FC head |
| **Upper bound (CV)** | ResNet-50S 97.25% / F1 97% | Phase2 target (không claim beat — domain khác) |
| **A1.0 (nutrition)** | — | CNN → macro cố định (`a1_0_fixed_macros.json`) |
| **A1.1 (nutrition)** | — | CNN → NutriHome DB × portion (`nutrihome_resnet10.json`) |
| **ΔA (GAP)** | — | `MAE(A1.0 kcal) − MAE(A1.1 kcal)` trên RBL |

Paper 1 (Jelodar & Sun 2021) vẫn dùng làm **mốc độ lớn** cho MAE kcal (Tcalorie 394.5 vs Tupc 279.4) — dataset Recipe1M, không so số tuyệt đối.

---

*Version 1.0 | 2026-06-27*
