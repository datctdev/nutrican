# G2/G3 — Ops Checklist (Team)

Thu thập và label dữ liệu — **không cần sửa code**. Dùng UI hiện có hoặc seed script.

**Cập nhật trạng thái:** 2026-06-14 (30 ảnh user, seed đang chạy)

---

## Trước khi bắt đầu

- [x] Hoàn thành [G0_VERIFICATION.md](./G0_VERIFICATION.md) — **Pass cả 4 mục** (2026-06-14, model **llava**, backend `:8082`)
- [x] Ollama + backend đang chạy (`:8082`)
- [ ] PT đã gán client (seed script tự thử)

**Scripts (dev):**

| Script | Mục đích |
|--------|----------|
| `research/scripts/setup_seed_30.py` | Copy 30 ảnh user → `seed/images/` + `manifest.csv` |
| `research/scripts/g0_smoke_test.py` | G0 smoke test API → tick G0_VERIFICATION |
| `research/scripts/seed_research_dataset.py` | Batch upload + PT auto-label từ manifest |
| `research/scripts/rbl_analyze.py` | Phân tích A1.0/A1.1 (+ Wilcoxon, bootstrap CI ΔA) |
| `research/scripts/fill_results_template.py` | Auto-fill RESULTS_TEMPLATE.md |

```powershell
$env:RESEARCH_API_BASE='http://localhost:8082/api/v1'
python research/scripts/setup_seed_30.py      # nếu cần copy lại 30 ảnh
python research/scripts/g0_smoke_test.py
python research/scripts/seed_research_dataset.py
```

---

## G2 — Thu data (2–3 tuần)

| Hạng mục | Target | Manifest (30 ảnh) |
|----------|--------|-------------------|
| Ảnh trong `research/seed/images/` | 30 | **30** ✅ |
| HOME_HYBRID_DB | ≥8 | **12** |
| RESTAURANT_* | ≥8 | **8** |
| HOTPOT_HYBRID | ≥4 | **1** ⚠️ |
| COMPOSITE_BUFFET | ≥4 | **4** ✅ |
| HOME_AI_ONLY (mix, ngoài DB) | — | **5** |
| Tổng snapshot R0 | ≥30 | **30** ✅ |

- [x] Đặt 30 ảnh vào `research/seed/images/` (gitignored)
- [x] HOME_HYBRID_DB ≥ 8
- [x] RESTAURANT_* ≥ 8
- [ ] HOTPOT_HYBRID ≥ 4 — **chỉ 1 ảnh lẩu gà** (cần thêm 3 nếu strict SOP)
- [x] COMPOSITE_BUFFET ≥ 4 (Korean BBQ ×4)
- [x] Tổng snapshot R0 ≥ 30 — **30/30 seed OK** (2026-06-14, ~24 phút)

Theo dõi: `research/output/seed_run_report.json` hoặc Admin → RBL Research

---

## G3 — PT label (~1 tuần)

Seed script auto-label nếu PT account hoạt động; nếu không → label thủ công `/pt/reviews`.

- [x] 100% log G2 đã review — **30/30 auto PT label** (`pt_labeled=true`)
- [x] ≥70% APPROVE+ADJUST — **100% ADJUST_MACROS** (seed dev)
- [ ] ~30% log có blind estimate (manifest: 4 ảnh `blind_estimate=true`)
- [ ] Ghi tên PT labeler trong báo cáo

---

## Sau G3

```powershell
pip install -r research/scripts/requirements.txt
python research/scripts/rbl_analyze.py research/output/rbl_export.csv
python research/scripts/fill_results_template.py research/output/rbl_export.csv
```

- [x] Pipeline scripts sẵn sàng
- [x] Paper 1 docs + PDF
- [ ] Export CSV sau khi seed + PT label xong
- [ ] RESULTS_TEMPLATE điền từ số thật

---

*Checklist v1.3 — 2026-06-14*
