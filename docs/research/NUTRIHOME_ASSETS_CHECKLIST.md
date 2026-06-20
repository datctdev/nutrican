# NutriCan AI Assets — Checklist (mục tiêu ≥80% chính xác calo)

> Cập nhật: 2026-06-20

## Tài sản bàn giao (BienBan_BanGiao_AI_Module.pdf)

| Tài sản | Trạng thái | Ghi chú |
|---------|------------|---------|
| `best_resnet50_model.h5` | ✅ Có | ~96 MB, 10 class alphabetical |
| `Vietnamese_Food_Dataset/` | ✅ Có | com_tam 936, pho 801 ảnh |
| Paper ResNet50 refined FC | ✅ Có | Related work / Phase 2 |
| FastAPI contract | ✅ | `research/ai-service/main.py` |
| NutriHome PDF | ✅ **333 món extracted** | `research/data/nutrihome_foods.json` |

## Dữ liệu NutriHome (bang-luong-calo-trong-thuc-pham.pdf)

| Hạng mục | Trạng thái |
|----------|------------|
| Extract full PDF → JSON | ✅ 333 foods |
| ResNet10 mapping 10/10 | ✅ |
| Variants (cơm tấm bì/chả, phở gà…) | ✅ |
| Sync vào Spring classpath | ✅ `resources/data/` |
| `NutriHomeCatalog.java` runtime load | ✅ |
| LLaVA prompt dùng bảng NutriHome | ✅ |
| Script tái extract | ✅ `extract_nutrihome_pdf.py` |

## Pipeline AI (ResNet + LLaVA + NutriHome)

| Thành phần | Trạng thái | Ảnh hưởng accuracy |
|------------|------------|-------------------|
| ResNet top-3 + portion_ratio | ✅ Phase 1 | Nhận diện ~16–35% conf (cơm sườn hay nhầm) |
| LLaVA Ollama local | ✅ Code sẵn | **Cần `ollama serve` + `llava`** |
| Fusion ResNet+LLaVA | ✅ | Sửa cặp nhầm com_tam/banh_khot |
| Macro từ NutriHome × gram | ✅ | Đúng nếu món + khẩu phần đúng |
| Modal xác nhận user | ✅ | Safety net |
| ResNet Phase 2 fine-tune | ⏳ Script sẵn | `train_resnet50_phase2.cmd` — chưa chạy full |

## Còn thiếu để đạt ≥80% end-to-end

1. **Chạy fine-tune ResNet Phase 2** trên dataset (đặc biệt com_tam/pho)
2. **Ollama LLaVA luôn bật** khi demo/production local
3. **Đánh giá offline**: chạy `eval_resnet50.py` trước/sau Phase 2 trên val set
4. **RBL cohort**: 30+ ảnh thật học viên + PT label đo MAE kcal (G4 research)
5. **Cá kho tộ**: PDF không có “1 tộ” — đang scale từ “1 lát cá”; có thể cần PT xác nhận

## Lệnh nhanh

```cmd
:: 1. Cập nhật data từ PDF
research\ai-service\.venv\Scripts\python.exe research\scripts\extract_nutrihome_pdf.py

:: 2. Ollama (máy local)
ollama pull llava && ollama serve

:: 3. Fine-tune ResNet
research\scripts\train_resnet50_phase2.cmd

:: 4. Dùng model mới
set MODEL_PATH=d:\FPT\SU26\SBA\project_team\research\best_resnet50_model_phase2.h5
research\scripts\start_ai_service.cmd
```

## Công thức macro cuối cùng

```
kcal_cuối = NutriHome_kcal_suất_chuẩn × (gram_ước / gram_suất_chuẩn)
         ≈ blend(60% NutriHome + 40% LLaVA) khi LLaVA bật
```

Nguồn suất chuẩn: **NutriHome PDF** — không cần tra lại PDF thủ công.
