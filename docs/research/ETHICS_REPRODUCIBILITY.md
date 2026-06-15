# Ethics & Reproducibility — RBL Research

Theo đặc tả đề tài và KE_HOACH §13.

---

## Đạo đức nghiên cứu

| Nguyên tắc | Cách NutriCan tuân thủ |
|------------|------------------------|
| Không ma số liệu | MAE/ΔA tính từ CSV export thật; không chỉnh `ai_predicted_macros` sau analyze |
| Báo cáo kết quả xấu | Nếu ΔA ≤ 0 → hạ Apply, giải thích (DB nhỏ, match yếu) — vẫn publish |
| Ground truth minh bạch | Nhãn = `pt_adjusted_macros` từ PT review, không phải SOS resolution |
| Privacy | CSV chỉ `customer_id_hash`, không tên/email; ảnh qua `image_object_name` |
| Consent | Thông báo participant (customer/PT) data dùng cho học tập/nghiên cứu |

---

## Reproducibility checklist (bắt buộc ghi trong báo cáo)

- [x] `model_version` — **`llava`** (G0 smoke 2026-06-14)
- [ ] `prompt_version` — hash prompt tại thời điểm thu
- [x] `food_db_version` — header CSV (`v2-60`, xác nhận G0.3)
- [ ] Khoảng thời gian thu (`from`, `to`)
- [ ] Số mẫu labeled CV (`totalLabeledCv`, `insufficientSample`)
- [ ] Filter export: `cvOnly=true`, `includeRejected=false`
- [x] Git commit hash code tại lúc G0 — **`53520e0`**
- [ ] **Người label PT:** tên, vai trò, kinh nghiệm (LO_TRINH §3.4)

---

## Export command (reference)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/admin/rbl/export?cvOnly=true&includeRejected=false" \
  -o rbl_export.csv
```

Phân tích: `python research/scripts/rbl_analyze.py rbl_export.csv`

---

*Document Version: 1.0.1 | Last Updated: 2026-06-14*
