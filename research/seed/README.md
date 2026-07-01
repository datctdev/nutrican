# Research seed data

| Thư mục | Mục đích |
|---------|----------|
| `resnet10/` | 30 ảnh mẫu 10 món + 3 negative — dùng cho RBL seed |
| `resnet10_manifest.csv` | Metadata + PT label gợi ý |
| `fixtures/` | Ảnh negative/smoke (`smoke_pho.png`, `smoke_pizza.png`, …) |

Tạo lại seed ResNet10:

```bash
python research/scripts/prepare_resnet_rbl_seed.py
```

Upload + PT label qua API (backend + AI service phải chạy):

```bash
python research/scripts/seed_resnet_rbl.py
```
