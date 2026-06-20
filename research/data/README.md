# NutriHome Data — Single Source of Truth

Dữ liệu dinh dưỡng trích từ **bang-luong-calo-trong-thuc-pham.pdf** (NutriHome, 21 trang).

## Files

| File | Mô tả | Số dòng |
|------|--------|---------|
| `nutrihome_foods.json` | **Toàn bộ 333 món** — STT, tên, đơn vị, Calo, Protein, Fat, Carb, phân loại | Master catalog |
| `nutrihome_resnet10.json` | 10 class ResNet50 + variants (cơm tấm bì/chả, phở gà…) | AI pipeline |
| `nutrihome_by_category.json` | Nhóm theo 14 phân loại PDF | Tra cứu |
| `nutrihome_resnet10_per100g.json` | Macro / 100g cho scale gram | Portion scaling |

## Cập nhật từ PDF

```cmd
cd research\ai-service
.venv\Scripts\python.exe ..\scripts\extract_nutrihome_pdf.py
```

Script tự sync JSON → `nutrican-be/nutritiontrack-module-ai-gateway/src/main/resources/data/`

## Dùng trong code

| Layer | Class / file |
|-------|----------------|
| Spring Boot | `NutriHomeCatalog.java` → load JSON classpath |
| ResNet macros | `ResNetFoodDefaults.java` → delegate NutriHomeCatalog |
| LLaVA prompt | `LlavaMealPromptBuilder.java` → bảng macro từ catalog |
| Fusion | `MealAnalysisFusion.java` → scaledMacros × portion |

## ResNet10 ↔ NutriHome (chuẩn PDF)

| food_code | Tên PDF | kcal | P | F | C | Đơn vị |
|-----------|---------|------|---|---|---|--------|
| com_tam | Cơm tấm sườn | 528.9 | 20.7 | 13.3 | 81.6 | 1 phần (~350g) |
| pho | Phở bò tái | 414.1 | 17.9 | 11.7 | 59.3 | 1 tô (~500g) |
| banh_xeo | Bánh xèo | 517.3 | 15 | 19.3 | 70.9 | 1 cái (~180g) |
| banh_khot | Bánh khọt | 154.1 | 5.8 | 7.1 | 16.8 | 1 đĩa 5 cái |
| ca_kho_to | Cá lóc kho | 329.5* | 39.2* | 9.5* | 21.8* | 1 tộ* |

\* `ca_kho_to`: PDF chỉ có “1 lát cá” — app scale ×2.5 cho 1 tộ (~350g).

## Mục tiêu độ chính xác ≥80%

- **Macro kcal/P/F/C**: NutriHome PDF (đạt nếu nhận đúng món + khẩu phần)
- **Nhận diện món**: ResNet Phase 2 fine-tune + LLaVA Ollama local
- **Gram/khẩu phần**: LLaVA ước gram × NutriHome per serving
