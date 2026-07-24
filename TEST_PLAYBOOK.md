# Nutrican — Playbook test tay (Debate)

Password mọi tài khoản seed: **`123456`**

Trước khi test: bật BE + FE, chọn **Giờ demo VN = Giờ thật VN** (không chọn Demo 09:00…), refresh trang.

---

## 1. Tài khoản nhanh

| Mục đích | Email | Role |
|----------|-------|------|
| Admin | `admin@nutrican.com` | ADMIN |
| PT chính | `pt@nutrican.com` | PT_CERTIFIED |
| HV có PT | `customer@nutrican.com` | CUSTOMER |
| HV solo (không PT) | `solo@nutrican.com` | CUSTOMER |
| Hire offline từ đầu | `customer3@gmail.com` | CUSTOMER |
| PT offline (chưa hire) | `pt.offline@gmail.com` | PT_CERTIFIED |
| Hire PENDING | `customer2@gmail.com` ↔ `pt.freelance@gmail.com` | PENDING |
| END_REQUESTED | `hv.endreq@nutrican.com` ↔ `pt.certified@gmail.com` | END_REQUESTED |
| Escrow dư | `hv.an@nutrican.com` | ACTIVE ↔ pt@ |
| Escrow cạn | `hv.bao@nutrican.com` | ACTIVE ↔ pt@ |
| Escrow chuẩn | `hv.chi@nutrican.com` | ACTIVE ↔ pt@ |
| PT phụ + ACTIVE HV | `pt.certified@gmail.com` / `customer1@gmail.com` | — |

---

## 2. Bản đồ tính năng

### Guest
- [ ] Landing `/`
- [ ] Register → Check email → Verify email
- [ ] Login / Logout
- [ ] Forgot password → Reset password
- [ ] Set password (sau Google nếu có)

### Customer
- [ ] Onboarding
- [ ] Marketplace + PT detail + Hire
- [ ] Diet Tracker (plan / log / khung bữa)
- [ ] Macro Targets + Goals + Body metrics
- [ ] Coaching (lịch, thanh toán, end, refund, report)
- [ ] Chat với PT
- [ ] Profile / Settings / KYC

### PT (`/pt/...`)
- [ ] Dashboard
- [ ] Clients (accept / reject hire)
- [ ] Meal plan theo client
- [ ] Review diet log
- [ ] Appointments / sessions (mark done)
- [ ] Progress client
- [ ] Ratings / Chat / Portfolio

### Admin (`/admin/...`)
- [ ] Dashboard
- [ ] PT verification / update request
- [ ] User management (suspend)
- [ ] Finance (overview + ledger)
- [ ] Food tags

---

## 3. Workflow test tay (làm theo thứ tự)

### W1 — Auth (~10–15 phút)

| # | Bước | Tài khoản | Pass? | Ghi chú |
|---|------|-----------|-------|---------|
| 1.1 | Register email mới | email thật/test | ☐ | Có `/check-email`? |
| 1.2 | Login sai mật khẩu | bất kỳ | ☐ | Báo lỗi rõ |
| 1.3 | Login đúng | `solo@nutrican.com` | ☐ | Vào được app |
| 1.4 | Logout rồi login lại | `solo@` | ☐ | |
| 1.5 | Refresh F5 vẫn giữ session | `solo@` | ☐ | |
| 1.6 | Customer mở `/admin` | `solo@` | ☐ | Bị chặn / redirect |
| 1.7 | Settings → **Đổi mật khẩu** → `/change-password` | `solo@` | ☐ | Đã có pwd; không set-password |
| 1.8 | Google lần đầu → gợi ý MK, **Để sau** được | Google mới | ☐ | Vào app; Settings hiện Tạo MK |
| 1.9 | Email đã verify + Google cùng email | | ☐ | Link, giữ MK; không ép set-password |

### W2 — Solo diet (~15 phút) — `solo@nutrican.com`

| # | Bước | Pass? | Ghi chú |
|---|------|-------|---------|
| 2.1 | Onboarding (nếu hiện) hoàn tất | ☐ | |
| 2.2 | `/diet` — xem / thêm món self-plan | ☐ | |
| 2.3 | Đánh dấu ăn theo khung bữa (sáng/trưa/…) | ☐ | |
| 2.4 | `/macro-targets` — đổi mức vận động → tính lại macro | ☐ | |
| 2.5 | Ghi cân nặng / tiến độ | ☐ | |
| 2.6 | Đổi giờ Windows → refresh Diet → “hôm nay” / khung bữa đổi | ☐ | Giờ demo = Giờ thật VN |

### W3 — Coached diet (~20 phút)

**Tab A:** `customer@nutrican.com` · **Tab B:** `pt@nutrican.com`

| # | Bước | Ai | Pass? | Ghi chú |
|---|------|----|-------|---------|
| 3.1 | Diet thấy plan do PT | HV | ☐ | |
| 3.2 | Goals / macros UI **khóa** (có PT) | HV | ☐ | |
| 3.2b | *(API)* `PUT /profile/goals` khi có PT → **400** | HV | ☐ | BE `saveGoalsForSelf` |
| 3.2c | PT workspace set goals client → **200** | PT | ☐ | Vẫn dùng `saveGoals` |
| 3.3 | Vẫn ghi được cân nặng | HV | ☐ | |
| 3.4 | Đề xuất món / gửi PT duyệt (nếu có) | HV | ☐ | |
| 3.5 | `/pt/reviews` — duyệt PENDING | PT | ☐ | |
| 3.6 | Meal plan — chỉnh / xuất bản tuần | PT | ☐ | |
| 3.7 | Chat 2 chiều | HV + PT | ☐ | |
| 3.8 | Progress client | PT | ☐ | |

### W4 — Hire offline end-to-end (~25 phút)

Dùng **`customer3@gmail.com`** + **`pt.offline@gmail.com`** (đừng dùng `customer@` — đã có PT).

| # | Bước | Ai | Pass? | Ghi chú |
|---|------|----|-------|---------|
| 4.1 | Marketplace → mở PT offline | HV | ☐ | Có venue + lịch |
| 4.2 | Hire OFFLINE — chọn venue + 2–3 slot | HV | ☐ | |
| 4.3 | Clients → Accept hire | PT | ☐ | → AWAITING_PAYMENT |
| 4.4 | Thanh toán (VNPay / wallet) | HV | ☐ | |
| 4.5 | Mapping ACTIVE + lịch hẹn hiện | HV | ☐ | |
| 4.6 | Escrow / Coaching thấy gói | HV | ☐ | |
| 4.7 | PT mark done 1 buổi → HV confirm (hoặc chờ auto) | PT/HV | ☐ | |
| 4.8 | *(phụ)* `customer2@` + `pt.freelance@` Accept/Reject PENDING | | ☐ | |

### W5 — Money / end / report (~20 phút)

| # | Bước | Tài khoản | Pass? | Ghi chú |
|---|------|-----------|-------|---------|
| 5.1 | Coaching — escrow **dư** | `hv.an@` | ☐ | |
| 5.2 | Coaching — escrow **cạn** | `hv.bao@` | ☐ | Không release thêm nếu hết |
| 5.3 | Coaching — escrow chuẩn | `hv.chi@` | ☐ | |
| 5.4 | Xem trạng thái END_REQUESTED | `hv.endreq@` | ☐ | |
| 5.5 | Yêu cầu / xác nhận kết thúc coaching | `customer@` hoặc endreq | ☐ | |
| 5.5b | Sau **confirm end**: 0 DietLog `reviewStatus=PENDING` của HV | HV/API | ☐ | Auto-reject; không đụng eaten |
| 5.5c | **Không** auto-đóng PENDING diet ở bước chỉ `END_REQUESTED` | | ☐ | Chỉ đóng khi COMPLETED |
| 5.6 | Report PT (nếu có UI) → Admin xử lý | HV → Admin | ☐ | |
| 5.6b | Admin suspend PT → mapping INACTIVE + 0 PENDING diet của HV | Admin | ☐ | `PtSuspendSettlement` |
| 5.7 | PT rút tiền (Withdraw) | `pt@` | ☐ | Ghi nhận trạng thái (demo SUCCESS ngay) |
| 5.8 | Admin Finance — overview + transactions | `admin@` | ☐ | |
| 5.9 | HV dispute buổi (escrow còn) → escrow **DISPUTED**; confirm buổi khác bị chặn | `hv.chi@` / hire mới | ☐ | |
| 5.10 | Dispute khi escrow **cạn** (`hv.bao@`) vẫn tạo được dispute session | HV | ☐ | Best-effort; có thể không khóa escrow |
| 5.11 | Admin resolve hết session dispute, **không** refund PENDING → escrow unlock | Admin | ☐ | |
| 5.12 | Có refund `PENDING_REVIEW` → resolve session dispute **không** unlock escrow | Admin | ☐ | |

### W6 — Admin & Marketplace (~10 phút) — `admin@nutrican.com`

| # | Bước | Pass? | Ghi chú |
|---|------|-------|---------|
| 6.1 | `/admin/pts` — PT update request (`pt.certified@`) | ☐ | |
| 6.2 | `/admin/users` — xem / suspend thử (cẩn thận) | ☐ | |
| 6.3 | `/admin/finance` | ☐ | |
| 6.4 | Marketplace — PT có **nhiều review**, rating khớp số review | ☐ | Không 5★ với 0 review |
| 6.5 | `/admin/food-tags` (nếu dùng) | ☐ | |

---

## 4. Checklist phá luồng (thầy hay làm)

| # | Hành động | Kỳ vọng | Pass? |
|---|-----------|---------|-------|
| P1 | UI khóa goals + gọi API `PUT /profile/goals` khi có PT | **400** (đã fix BE `saveGoalsForSelf`) | ☐ |
| P1b | PT workspace đổi goals client khi coached | **200** OK | ☐ |
| P2 | Double click / 2 tab thanh toán cùng hire | Không double ACTIVE / double hold | ☐ |
| P3 | Thanh toán sau khi hết hạn cửa sổ | Reject hoặc hoàn, không ACTIVE | ☐ |
| P4 | Self mark-eaten khi đang có PT | Bị chặn | ☐ |
| P5 | Hire khi đã có PT ACTIVE khác | Reject | ☐ |
| P6 | Chat sau khi mapping INACTIVE | BE từ chối | ☐ |
| P7 | Customer vào `/pt` hoặc `/admin` | Redirect | ☐ |
| P8 | Đổi giờ máy + Giờ thật VN | Plan day đổi theo máy | ☐ |
| P9 | END_REQUESTED vẫn xem plan / chat như coached | Đúng BR hiện tại | ☐ |
| P10 | Rating marketplace | `totalReviews` = số dòng review | ☐ |
| P11 | Confirm end / suspend PT → DietLog PENDING orphan | 0 PENDING còn lại | ☐ |
| P12 | Session dispute khóa escrow (khi còn held) | Escrow DISPUTED; release thường bị chặn | ☐ |
| P13 | Resolve dispute + còn refund PENDING_REVIEW | Escrow **vẫn** DISPUTED | ☐ |

---

## 5. Câu trả lời debate (điểm yếu — nói chủ động)

Chuẩn bị nói ngắn nếu thầy hỏi (**còn mở** — chưa fix trong vòng này):

1. **Withdraw SUCCESS ngay** — demo ledger, chưa cổng chi ngân hàng; hướng PENDING + admin duyệt.
2. **JWT limited** — token setup cũ; hiện Google skip/set dùng full JWT; vẫn nên siết claim limited nếu còn dùng.

**Đã vá / BR OAuth (nói nếu thầy hỏi Google ATO):**

3. **Google cùng email** — auto-link **chỉ** khi IdP `email_verified` + local không `PENDING_VERIFICATION`; giữ MK nếu đã có (chuẩn Firebase/consumer). Không bắt “login MK rồi mới link” (đó là model bank).
4. **Google lần đầu** — mời tạo MK, **Được bỏ qua**; Settings: chưa MK → Tạo; đã có → Đổi.
5. **PUT /goals khi coached** — BE `saveGoalsForSelf` + `hasActivePt` → 400; PT workspace vẫn `saveGoals`.
6. **PENDING diet log khi hết mapping** — auto-reject trên confirm end + suspend → INACTIVE (không ở `END_REQUESTED`).
7. **Session dispute ↔ escrow** — dispute mark escrow DISPUTED (best-effort); unlock khi hết session dispute PENDING **và** không refund `PENDING_REVIEW`.

**Điểm mạnh nhấn mạnh:** hire → pay → escrow thật qua wallet service; diet coached vs solo tách rõ; `END_REQUESTED` vẫn coached; seed rating = aggregate review thật; demo clock theo giờ máy.

---

## 6. Smoke 30 phút trước debate

1. [ ] Login `customer@` + `pt@` + `admin@` OK  
2. [ ] W3 nhanh (diet + chat + review) + **P1 goals API 400**  
3. [ ] W4 nếu còn thời gian (hire `customer3`) **hoặc** mở sẵn mapping `hv.chi@`  
4. [ ] Marketplace reviews `pt@`  
5. [ ] Admin finance mở được  
6. [ ] 3 tab sẵn: HV / PT / Admin  
7. [ ] *(nếu còn giờ)* 5.9–5.12 dispute/escrow hoặc P11–P13  
8. [ ] Settings → Đổi mật khẩu (`/change-password`), không kẹt `/set-password`  

---

## 7. Ghi chú buổi test

| Thời gian | Lỗi gặp | Reproduce | Mức (P0/P1/P2) |
|-----------|---------|-----------|----------------|
| | | | |
| | | | |
| | | | |

**Kết luận sau 1 vòng test tay:**

- Happy path OK? ☐ Có / ☐ Chưa  
- Sẵn sàng demo thầy? ☐ Có / ☐ Cần fix thêm: ________________
