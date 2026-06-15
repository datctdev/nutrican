# PT Labeling SOP — G3

Quy trình gán ground truth (LO_TRINH §3).

---

## Workflow (`/pt/reviews`)

1. Xem log pending — 3 cột AI / DB / Shown (sau blind reveal nếu có)
2. **(Optional ~30%)** Blind mode:
   - Bật Blind → nhập macro → Save & reveal
   - Không xem confidence/source/cohort trước reveal
3. **APPROVE** — đồng ý macro hiện tại
4. **ADJUST_MACROS** — sửa + chọn `correctionReason`
5. **REJECT** — loại khỏi MAE (negative sample); không lạm dụng

---

## correctionReason taxonomy

| Reason | Khi dùng |
|--------|----------|
| WRONG_FOOD | VLM nhận sai món |
| WRONG_PORTION | Portion/size sai |
| WRONG_MACROS | Macro sai dù tên đúng |
| UNCLEAR_IMAGE | Ảnh mờ/khó nhìn |
| RESTAURANT_TOO_COMPLEX | Buffet/phức tạp ngoài DB |
| DB_MATCH_INCORRECT | Hybrid match sai món DB |
| OTHER | Khác |

---

## Ethics & reproducibility

Ghi vào lab notebook / báo cáo:
- **Tên PT labeler**
- **Vai trò / kinh nghiệm** (năm, chuyên môn dinh dưỡng)
- **Ngày label** (export có `pt_reviewed_at`)

---

## Output G3

Mọi log G2 có:
- `pt_action` ∈ {APPROVE, ADJUST, REJECT}
- `pt_adjusted_macros` (trừ REJECT)

---

*SOP v1.0*
