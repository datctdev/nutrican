# NutriCan Research — Tổng hợp hiện trạng

> Cập nhật: **2026-06-29** · Folder `research/` trong repo `nutrican`  
> Mục tiêu: pipeline **ResNet50 199-class unified** + NutriHome macro + RBL (A1.0 vs A1.1) phục vụ luận văn / demo NutriCan PT.

---

## 1. Research đang làm gì?

| Hạng mục | Mô tả ngắn |
|----------|------------|
| **Nhận diện món (CV)** | ResNet50 fine-tune trên **199 class** (10 món VN core + ~90 món VN + 101 Food-101) |
| **Macro / kcal** | NutriHome PDF → JSON → scale theo gram (A1.1); macro cố định serving (A1.0) |
| **LLaVA (Ollama)** | Vision-language **bổ trợ** sửa nhầm lẫn VN; **không** fine-tune 199 class |
| **RBL** | So sánh sai số kcal A1.0 (AI thuần) vs A1.1 (AI + DB NutriHome × khẩu phần) |
| **Production** | FastAPI `:8000` → Spring Boot `analyze-meal` → FE modal xác nhận |

---

## 2. Model đang deploy

| Thuộc tính | Giá trị |
|------------|---------|
| File | `research/best_resnet50_unified.h5` |
| Profile | `resnet_unified` |
| Số class | **199** |
| Manifest | `research/data/class_manifests/resnet_unified.json` |
| Backend config | `ai.resnet.class-profile=resnet_unified` |
| AI service | `research/ai-service/main.py` — port **8000** |

### Class layout (199)

| Nguồn | Index (xấp xỉ) | Ví dụ |
|-------|----------------|-------|
| VTN-10 | 0–9 | `com_tam`, `pho`, `banh_xeo`, … |
| 100 món VN | 10–108 | `banh_bao`, `bun_bo_hue`, … |
| Food-101 | từ `apple_pie` … | `beef_tartare`, `pulled_pork_sandwich`, … |

VTN-10 **nằm trong** unified — không cần model 10-class riêng khi chạy production.

### Accuracy (tham chiếu offline)

| Profile | Top-1 (offline eval) | Ghi chú |
|---------|-------------------|---------|
| VTN-10 only | **~68%** | `eval_resnet50.py --profile resnet10` |
| Unified 199 | **~44%** (literature trong `docs/research/RESULTS_TEMPLATE.md`) | 199-way, 3 domain gộp 1 head |
| Train log cuối (finetune ep.5) | val_acc **~57.9%** | `output/logs/train_progress_resnet_unified.log` |

> **Đang chạy:** `eval_resnet50.py --profile resnet_unified --tag unified199` trên ~**26k** ảnh val (20% của 130k pool) — kết quả sẽ ghi vào `output/eval/resnet50_eval_unified199.json` khi xong.

---

## 3. Cấu trúc folder

```
research/
├── README.md                    # Quick start
├── TONG_HOP_HIEN_TAI.md         # File này
├── run-ai.bat                   # Menu chính [1–6]
├── run-setup.bat                # venv + pip
├── run-ai-service.bat           # FastAPI :8000
├── run-train-unified-overnight.bat
├── best_resnet50_unified.h5     # Model deploy (gitignore — local)
│
├── ai-service/                  # FastAPI inference
│   ├── main.py                  # POST /api/v1/analyze-food
│   ├── portion_estimator.py     # Ước gram từ diện tích ảnh
│   ├── class_manifest.py        # Load resnet_unified.json
│   └── .venv/                   # Python 3.10–3.12 + TF
│
├── data/                        # JSON sync với Java BE
│   ├── class_manifests/         # resnet_unified.json, resnet10.json, …
│   ├── nutrihome_*.json         # Macro NutriHome PDF
│   ├── nutrihome_food101.json   # 101 class Food-101 macros
│   ├── nutrihome_unified_vn.json# 90 món VN unified
│   └── a1_0_fixed_macros.json   # A1.0 fixed serving / 199 class
│
├── scripts/                     # Train, eval, RBL, map data
├── seed/resnet10/               # Ảnh cohort RBL VTN-10 (30+3)
└── output/                      # Artifacts (gitignore)
    ├── checkpoints/             # best.weights.h5, finetune_epoch_*.h5
    ├── logs/                    # train_progress_resnet_unified.log
    ├── eval/                    # resnet50_eval_*.json (sau eval)
    ├── rbl/                     # CSV export + phân tích ΔA
    └── reports/
```

### Dataset ảnh (ngoài git — `project_team/research/`)

| Key | Đường dẫn | Ảnh (ước lượng) |
|-----|-----------|-----------------|
| `VTN_10` | `Vietnamese_Food_Dataset/Vietnamese_Food_Dataset/` | ~10 class |
| `DISHES_100` | `100 dishes/images/` | ~100 món VN |
| `FOOD101` | `food-101/food-101/images/` | 101 class |
| **Unified pool** | Gộp 3 nguồn qua `dataset_collect.py` | **~130.405** ảnh |

Định nghĩa path: `scripts/repo_paths.py`.

---

## 4. Pipeline runtime (app)

```
User upload ảnh (FE)
    → POST /api/v1/diet/logs/analyze (Spring Boot, JWT)
        → MinIO lưu ảnh
        → ResNet FastAPI :8000/analyze-food
            · top-3 + confidence + portion_ratio
        → LLaVA (Ollama) — optional, sửa VN / Food-101 confusion
        → MealAnalysisFusion.java
            · reliability score (gate ≥90%)
            · gram = ResNet area × LLaVA blend
            · kcal = NutriHome DB × portion (A1.1)
        → Modal FE: user chọn đúng món trong 199 + chỉnh gram
        → confirm-recognition → LOGGED
```

**A1.0 vs A1.1 (research):**

| Biến thể | Macro nguồn | Dùng cho |
|----------|-------------|----------|
| **A1.0** | `a1_0_fixed_macros.json` — serving cố định, không scale portion | RBL baseline |
| **A1.1** | NutriHome × gram (fusion) | UI hiển thị + `dbMatchedMacros` |

---

## 5. Scripts theo nhóm

### 5.1 Train & export

| Script | Việc làm |
|--------|----------|
| `train_resnet50_phase2.py` | Train unified (Bohlol FC head + fine-tune), output checkpoint |
| `export_resnet_unified.py` | `best.weights.h5` → `best_resnet50_unified.h5` deploy |
| `run_train_unified_overnight.ps1` | Wrapper train qua đêm |

### 5.2 Eval & smoke test

| Script | Việc làm |
|--------|----------|
| `eval_resnet50.py` | Top-1 / Top-3 offline trên val split |
| `smoke_unified_199.py` | Health + sample N class qua API :8000 |
| `resnet50_smoke_test.py` | Smoke BE ↔ AI |
| `fill_table1b_from_eval.py` | Điền Table 1b vào `RESULTS_TEMPLATE.md` |

### 5.3 NutriHome & catalog data

| Script | Việc làm |
|--------|----------|
| `extract_nutrihome_pdf.py` | PDF NutriHome → JSON 333 món |
| `map_nutrihome_food101.py` | Food-101 × `nutrition.csv` |
| `map_nutrihome_unified_vn.py` | 90 món VN + 9 manual macro |
| `build_a1_0_fixed_macros.py` | 199 class → `a1_0_fixed_macros.json` |
| `build_class_manifests.py` | Regenerate manifest → sync Java |

### 5.4 RBL (Research Baseline Labeling)

| Script | Việc làm |
|--------|----------|
| `seed_resnet_rbl.py` / `prepare_resnet_rbl_seed.py` | Chuẩn bị cohort ảnh |
| `generate_rbl_research_cohort.py` | Export synthetic VTN-10 (n=30) |
| `generate_rbl_unified199.py` | Export synthetic 199-class |
| `rbl_analyze.py` | Wilcoxon ΔA, MAE A1.0 vs A1.1 |
| `fill_results_template.py` | Điền `docs/research/RESULTS_TEMPLATE.md` |

### 5.5 Khác

| Script | Việc làm |
|--------|----------|
| `resnet50_calibration.py` | Calibration confidence buckets |
| `dataset_collect.py` | Gom ảnh multi-source theo manifest |
| `research_api.py` | Helper API research |
| `start_ai_service.ps1` | Khởi động AI service (PowerShell) |

---

## 6. Output đã có (`research/output/`)

| Path | Nội dung |
|------|----------|
| `checkpoints/resnet_unified/best.weights.h5` | Checkpoint train |
| `checkpoints/.../finetune_epoch_05.weights.h5` | Epoch 5 fine-tune |
| `logs/train_progress_resnet_unified.log` | val_acc cuối **57.9%** (epoch 5) |
| `rbl/rbl_export_vtn10.csv` | Cohort VTN-10 n=30 |
| `rbl/rbl_export_unified199.csv` | Cohort 199-class synthetic |
| `rbl/rbl_results_vtn10.md` | ΔA **+14.2 kcal**, Wilcoxon p≈0.23 |
| `rbl/rbl_results_unified199.md` | ΔA **+42.6 kcal**, p&lt;0.001 (synthetic) |
| `rbl/RESULTS_FILLED.md` | Bản điền kết quả RBL |
| `eval/` | *(đang chờ `resnet50_eval_unified199.json`)* |

---

## 7. Kết quả research chính (tóm tắt)

### Classification (offline — documented)

- **VTN-10 Top-1:** ~68%  
- **Unified 199 Top-1:** ~44% (khó hơn nhiều so với 10 class)  
- UI hiển thị softmax **1%** trên 199 class là **bình thường** khi xác suất bị chia mỏng — không đồng nghĩa pipeline hỏng.

### RBL kcal (MAE)

| Cohort | n | MAE A1.0 | MAE A1.1 | ΔA |
|--------|---|----------|----------|-----|
| VTN-10 | 30 | 57.5 kcal | 43.2 kcal | **+14.2** |
| Unified 199 (synthetic) | 199 | 51.4 kcal | 8.8 kcal | **+42.6** |

→ Grounding DB NutriHome (A1.1) giảm sai số kcal so với macro cố định (A1.0); cần PT live để xác nhận p&lt;0.05 trên VTN-10.

---

## 8. Liên kết với Backend / Frontend

| Layer | File / config quan trọng |
|-------|-------------------------|
| BE AI fusion | `MealAnalysisFusion.java`, `LlavaMealPromptBuilder.java`, `FoodCodeCategory.java` |
| BE analyze | `MealAnalysisServiceImpl.java`, `MealRecognitionServiceImpl.java` |
| BE catalog | `NutriHomeCatalog.java`, `A1_0FixedMacros.java`, `ResNetClassManifest.java` |
| BE data seed | `FoodCatalogDataInitializer.java`, `ResNetFoodCatalogInitializer.java` |
| FE | `DietTrackerPage.jsx` — modal xác nhận 199 món + reliability score |
| Sync JSON | `research/data/*.json` ↔ `nutrican-be/src/main/resources/data/` |

---

## 9. Lệnh thường dùng (Windows)

```bat
:: Menu tất cả
research\run-ai.bat

:: Chỉ AI service
research\run-ai-service.bat

:: Eval đầy đủ 199-class (lâu ~30–90+ phút)
research\ai-service\.venv\Scripts\python.exe research\scripts\eval_resnet50.py ^
  --profile resnet_unified --tag unified199 ^
  --model research\best_resnet50_unified.h5

:: Smoke nhanh 30 class
research\ai-service\.venv\Scripts\python.exe research\scripts\smoke_unified_199.py --sample-size 30

:: RBL phân tích
research\ai-service\.venv\Scripts\python.exe research\scripts\rbl_analyze.py research\output\rbl\rbl_export_vtn10.csv
```

Health check: `http://localhost:8000/health` → `num_classes: 199`, `class_profile: resnet_unified`.

---

## 10. Docs luận văn (ngoài folder research)

| File | Nội dung |
|------|----------|
| `docs/research/RESULTS_TEMPLATE.md` | Bảng kết quả Bohlol + NutriCan |
| `docs/research/BAO_CAO_RESEARCH_HIEN_TAI.md` | Báo cáo tổng quan |
| `docs/research/KE_HOACH.md` | Kế hoạch giả thuyết H1–H4 |
| `docs/research/LO_TRINH.md` | Lộ trình triển khai |
| `docs/research/BOHLOL_TABLE4_REFERENCE.md` | Baseline paper Bohlol |
| `docs/research/NUTRIHOME_ASSETS_CHECKLIST.md` | Checklist data NutriHome |

---

## 11. Hạn chế & việc tiếp theo

| Hạn chế | Hướng xử lý |
|---------|-------------|
| 199-class Top-1 ~44% | Demo VTN-10; hoặc tách model VN / Food-101 |
| LLaVA không train 199 class | Chỉ trust trên cặp confusion đã rule; Food-101 chọn tay |
| Eval 26k ảnh rất lâu | Dùng `smoke_unified_199.py` hàng ngày; full eval khi cần báo cáo |
| RBL VTN-10 p≈0.23 | Cần cohort **live** từ PT review, không chỉ synthetic |
| Ảnh train ≠ nhớ 100% | Model generalize; modal xác nhận user là bắt buộc production |

---

## 12. Trạng thái “đang chạy” lúc tạo file này

- **AI Service** (`main.py`, port 8000): thường chạy song song khi dev.  
- **Eval unified199**: user đã khởi chạy `eval_resnet50.py` — kiểm tra:

```powershell
Test-Path research\output\eval\resnet50_eval_unified199.json
Get-Process python* | Where-Object { $_.CommandLine -like '*eval_resnet*' }
```

Khi eval xong, cập nhật mục **§2 Accuracy** bằng `top1_accuracy` trong file JSON.

---

## 13. Phụ lục — gửi AI khác review & tối ưu ResNet50

### 13.1 File này đủ để làm gì?

| Mục đích | Đủ? | Ghi chú |
|----------|-----|---------|
| Hiểu **đã làm được gì** (pipeline, RBL, deploy) | **Có (~85%)** | Đủ context tổng thể |
| Đề xuất **tối ưu nhận diện ResNet50** cụ thể | **Chưa đủ (~60%)** | Cần thêm §13.2 + file kèm theo |

### 13.2 Thông tin kỹ thuật train (cho AI optimization)

| Tham số | Giá trị hiện tại |
|---------|------------------|
| Backbone | ResNet50 (ImageNet), Keras/TF |
| Head | Bohlol-style FC (`model_builder.py` — `build_resnet50_bohlol`) |
| LR | `1e-4` (Adam) |
| Batch | `4` |
| Augment | Zoom ±20%, flip; resize 224; `resnet50.preprocess_input` |
| Split | Stratified 80/20, seed=42, mỗi class ≥1 ảnh val |
| Oversample | `com_tam`, `pho` thêm bản sao train |
| Class weight | Focus classes có trọng số cao hơn |
| Stages | Head train → fine-tune backbone (5 epoch finetune log) |
| Val acc log | **57.9%** @ finetune epoch 5 (trên split nội bộ) |
| Deploy | `export_resnet_unified.py` → `.h5` full model |

**Inference:** resize 224, cùng preprocess; **không** augment; portion = heuristic pixel (`portion_estimator.py`).

**Vấn đề thực tế đã quan sát (live app):**

- Top-1 softmax **~1%** trên 199 class dù đôi khi rank đúng — UI dễ hiểu nhầm.
- Nhầm cặp tương tự: `beef_carpaccio` ↔ `beef_tartare`, sandwich cluster, dessert cluster.
- Ảnh **từ train set** vẫn sai → model **generalize**, không memorize; 3 domain (VN + Food-101) gộp 1 head.
- LLaVA (Ollama) **không fine-tune** 199 class — không kỳ vọng cải thiện ResNet từ LLaVA.

### 13.3 File nên đính kèm thêm (nếu có)

| File | Lý do |
|------|-------|
| `output/eval/resnet50_eval_unified199.json` | Top-1/3 chính thức + per-class accuracy |
| `output/logs/train_progress_resnet_unified.log` | Diễn biến val_acc theo epoch |
| `scripts/train_resnet50_phase2.py` | Hyperparameter đầy đủ |
| `ai-service/model_builder.py` | Kiến trúc head |
| `docs/research/RESULTS_TEMPLATE.md` | Baseline Bohlol + bảng so sánh |
| 2–3 ảnh fail case + label đúng | Ví dụ cụ thể cho AI phân tích |

### 13.4 Prompt mẫu — copy gửi AI khác

```
Bạn là chuyên gia computer vision / fine-tune ResNet cho food classification.

Context: file đính kèm TONG_HOP_HIEN_TAI.md mô tả project NutriCan:
- ResNet50 unified 199 classes (VTN-10 + 100 VN dishes + Food-101)
- Top-1 offline ~44% (199-way), VTN-10 subset ~68%
- Production: FastAPI inference + Spring Boot + user confirm modal

Ràng buộc:
- Luận văn / demo: ưu tiên cải thiện nhận diện thực tế, không refactor toàn BE
- Có thể: retrain, tách model, đổi head, augment, class-balanced sampling, hierarchical classifier
- Không bắt buộc giữ 199 class trong 1 head nếu có lý do rõ

Yêu cầu output:
1. Đánh giá ngắn: research hiện tại đã đạt gì, bottleneck chính là gì?
2. Top 5 hướng tối ưu ResNet50 xếp theo impact/effort (bảng)
3. Với mỗi hướng top 3: bước cụ thể trong repo này (script/file cần sửa)
4. Kỳ vọng accuracy hợp lý (VTN-10 vs full 199) sau mỗi hướng
5. Cảnh báo rủi ro (data leakage, domain shift VN vs Food-101, overfit)

Giả định: ~130k ảnh train pool, batch 4, LR 1e-4, Bohlol FC head, val_acc train log ~58%.
```

### 13.5 Hướng tối ưu thường được AI đề xuất (tham khảo nhanh)

| Hướng | Impact | Effort | Ghi chú |
|-------|--------|--------|---------|
| **Tách 2–3 model** (VN-10 / VN-100 / Food-101) + router | Cao | Trung bình | Giảm nhầm cross-domain |
| **Hierarchical** (region → dish) | Cao | Cao | Phù hợp 199 class |
| **Class-balanced / focal loss** | Trung bình | Thấp | Sửa lệch Food-101 vs VN |
| **Thêm epoch + early stopping theo macro-F1** | Trung bình | Thấp | val_acc 58% còn room |
| **Stronger augment + MixUp/CutMix** | Trung bình | Trung bình | Cần ablation |
| **EfficientNet / ViT thay ResNet50** | Cao | Cao | Đổi backbone — cần justify luận văn |
| **Test-time augmentation (TTA)** | Thấp–TB | Thấp | Inference chậm hơn |
| **Per-class threshold / reject option** | UX | Thấp | Không tăng Top-1 nhưng giảm auto-sai |

---

*Tài liệu nội bộ team NutriCan — bổ sung khi có checkpoint / eval / RBL mới.*
