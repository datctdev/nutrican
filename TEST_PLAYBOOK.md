# Nutrican — Playbook test tay (Debate)

Password mọi tài khoản seed: `123456`

Trước khi test: bật BE + FE. Thời gian theo giờ máy (Asia/Ho_Chi_Minh); muốn đổi khung bữa thì đổi giờ Windows.

---

## 1. Tài khoản nhanh


| Mục đích               | Email                                               | Role          |
| ---------------------- | --------------------------------------------------- | ------------- |
| Admin                  | `admin@nutrican.com`                                | ADMIN         |
| PT chính               | `pt@nutrican.com`                                   | PT_CERTIFIED  |
| HV có PT               | `customer@nutrican.com`                             | CUSTOMER      |
| HV solo (không PT)     | `solo@nutrican.com`                                 | CUSTOMER      |
| Hire offline từ đầu    | `customer3@gmail.com`                               | CUSTOMER      |
| PT offline (chưa hire) | `pt.offline@gmail.com`                              | PT_CERTIFIED  |
| Hire PENDING           | `customer2@gmail.com` ↔ `pt.freelance@gmail.com`    | PENDING       |
| END_REQUESTED          | `hv.endreq@nutrican.com` ↔ `pt.certified@gmail.com` | END_REQUESTED |
| Escrow dư              | `hv.an@nutrican.com`                                | ACTIVE ↔ pt@  |
| Escrow cạn             | `hv.bao@nutrican.com`                               | ACTIVE ↔ pt@  |
| Escrow chuẩn           | `hv.chi@nutrican.com`                               | ACTIVE ↔ pt@  |
| PT phụ + ACTIVE HV     | `pt.certified@gmail.com` / `customer1@gmail.com`    | —             |


---



## 2. Bản đồ tính năng



### Guest

- [x] Landing `/`
- [x] Register → Check email → Verify email
- [x] Login / Logout
- [x] Forgot password → Reset password
- [x] Set password (sau Google nếu có)



### Customer

- [x] Onboarding
- [x] Marketplace + PT detail + Hire
- [x] Diet Tracker (plan / log / khung bữa)
- [x] Macro Targets + Goals + Body metrics
- [x] Coaching (lịch, thanh toán, end, refund, report)
- [x] Chat với PT
- [x] Profile / Settings / KYC



### PT (`/pt/...`)

- [x] Dashboard
- [x] Clients (accept / reject hire)
- [x] Meal plan theo client
- [x] Review diet log
- [x] Appointments / sessions (mark done)
- [x] Progress client
- [x] Ratings / Chat / Portfolio



### Admin (`/admin/...`)

- [ ] Dashboard
- [ ] PT verification / update request
- [ ] User management (suspend)
- [ ] Finance (overview + ledger)
- [ ] Food tags

---



## 3. Workflow test tay (làm theo thứ tự)



### W1 — Auth (~10–15 phút)


| #   | Bước                                             | Tài khoản           | Pass? | Ghi chú                             |
| --- | ------------------------------------------------ | ------------------- | ----- | ----------------------------------- |
| 1.1 | Register email mới                               | email thật/test     | ☐     | Có `/check-email`?                  |
| 1.2 | Login sai mật khẩu                               | bất kỳ              | ☐     | Báo lỗi rõ                          |
| 1.3 | Login đúng                                       | `solo@nutrican.com` | ☐     | Vào được app                        |
| 1.4 | Logout rồi login lại                             | `solo@`             | ☐     |                                     |
| 1.5 | Refresh F5 vẫn giữ session                       | `solo@`             | ☐     |                                     |
| 1.6 | Customer mở `/admin`                             | `solo@`             | ☐     | Bị chặn / redirect                  |
| 1.7 | Settings → **Đổi mật khẩu** → `/change-password` | `solo@`             | ☐     | Đã có pwd; không set-password       |
| 1.8 | Google lần đầu → gợi ý MK, **Để sau** được       | Google mới          | ☐     | Vào app; Settings hiện Tạo MK       |
| 1.9 | Email đã verify + Google cùng email              |                     | ☐     | Link, giữ MK; không ép set-password |




### W2 — Solo diet (~20 phút) — `solo@nutrican.com` / `123456`

**Mục tiêu:** HV **không có PT** tự quản lý diet + macro + lọc Marketplace.

**Chuẩn bị:** BE+FE chạy; thời gian theo giờ máy.

---

#### 2.0 Login

1. Mở FE → Login: `solo@nutrican.com` / `123456`.
2. Kỳ vọng: vào app (thường `/diet` hoặc dashboard customer).

---

#### 2.1 Onboarding — **chỉ khi hiện**

| Tình huống | Làm gì |
| ---------- | ------ |
| URL `/onboarding` hoặc bị ép khảo sát | Làm A→C bên dưới |
| Vào thẳng Diet / Profile, **không** thấy khảo sát | **Bỏ qua 2.1** (seed `solo@` đã onboard) → sang 2.2 |

**A — Bước 1 (cơ thể)**  
Nhập chiều cao, cân nặng, ngày sinh, **giới tính** → Tiếp tục.

**B — Bước 2 (mục tiêu + vận động)**  
Chọn mục tiêu + chế độ ăn → nhập **buổi/tuần = 3**, **phút/buổi = 40** → preview mức ≈ **Vận động vừa** → Tạo macro / Tiếp.

**C — Bước 3**  
Chọn **tự tập** (không thuê PT) → vào Diet.

---

#### 2.2–2.3 Diet

1. Vào `/diet` (menu Nhật ký / Diet).
2. Header có chip mục tiêu / chế độ ăn (nếu đã set) → Pass.
3. Thêm hoặc chọn món self-plan → đánh dấu **đã ăn** theo khung bữa hiện tại (sáng/trưa/…) → calo/progress cập nhật → Pass.

---

#### 2.4 Macro + buổi×phút (quan trọng)

1. Vào `/macro-targets` (Tiến độ / Mục tiêu dinh dưỡng).
2. Thấy ô **Buổi/tuần** + **Phút/buổi** (không chỉ dropdown cũ).
3. Hover/click icon **(i)** → tooltip đủ 5 mức, **không bị cắt** trong card.
4. Nhập **3** buổi × **40** phút → preview **MODERATE** (vừa) → Pass.
5. Đổi **3** × **300** → preview **VERY_ACTIVE** → Pass.
6. Bấm **Áp dụng & tính lại macro** (xác nhận nếu có) → calo/P/C/F đổi, toast OK → Pass.
7. Thử **0** buổi + **60** phút → báo lỗi / không lưu → Pass.

---

#### 2.5 Cân nặng / Profile giới tính

1. Ở MacroTargets hoặc Profile → ghi cân nặng mới → lưu OK.
2. Profile → card **Giới tính** khớp modal (Nam/Nữ đúng, không lệch).
3. Solo: đổi giới tính → Lưu → F5 vẫn đúng; macro có thể đổi (kcal khác) → Pass.

---

#### 2.6 Giờ máy (khung bữa)

Diet: ngày “Hôm nay” theo giờ máy. (Đổi Windows khi test khung bữa.)

---

#### 2.7 Marketplace filter

1. Vào `/marketplace`.
2. Ngay dưới “Huấn luyện viên nổi bật” có chip **Mục tiêu** + **Chế độ ăn** (không chỉ trong drawer).
3. Chọn **Tăng cân / cơ** → list lọc; PT tag tăng cơ vẫn có thể khớp (alias).
4. Chọn chế độ ăn (vd NORMAL / Keto) → lọc đúng → Pass.

---

**Checklist tick nhanh**

| # | Pass? |
| - | ----- |
| 2.1 Onboarding (nếu hiện) / bỏ qua nếu không | ☐ |
| 2.2–2.3 Diet + đánh dấu ăn | ☐ |
| 2.4 Buổi×phút + tooltip + recalc | ☐ |
| 2.5 Cân / giới tính Profile | ☐ |
| 2.7 Marketplace chip goal/diet | ☐ |

---

### W3 — Coached diet (~25 phút) — 2 tab song song

**Mục tiêu:** HV **đã có PT** (`customer@` ↔ `pt@`) — plan do PT; HV **không** tự sửa goals/macro/vận động; vẫn ghi cân + dị ứng + đề xuất món; PT duyệt / chỉnh plan / chat / progress.

**Chuẩn bị:** BE+FE chạy; thời gian theo giờ máy.  
Mở **2 tab trình duyệt** (hoặc 2 cửa sổ ẩn danh khác nhau):

| Tab | Vai trò | Login |
| --- | ------- | ----- |
| **A — HV** | Customer có PT | `customer@nutrican.com` / `123456` |
| **B — PT** | PT chính | `pt@nutrican.com` / `123456` |

> Đừng dùng `solo@` cho W3 — không có PT. Đừng dùng `customer3@` (W4 hire).

---

#### 3.0 Login 2 tab

1. **Tab A:** Login `customer@` → vào app customer (`/diet` hoặc dashboard).
2. **Tab B:** Login `pt@` → vào `/pt` (dashboard PT).
3. Kỳ vọng: không lẫn role; HV không vào được `/pt` (redirect).

---

#### 3.1 HV thấy plan do PT

1. **Tab A** → `/diet` (Nhật ký / Diet).
2. Kỳ vọng:
   - Có **plan / món từ PT** cho hôm nay (seed veteran thường đã có plan + vài món chờ duyệt).
   - Không như solo: không “tự plan tự do” hoàn toàn — UI coached (đề xuất món / gửi PT).
3. Pass nếu thấy timeline / card ngày có món PT hoặc badge coached.

---

#### 3.2 HV — Goals / macro / buổi×phút **bị khóa** + CTA nhắn PT

Làm lần lượt 3 chỗ (cùng BR):

**A — MacroTargets** (`/macro-targets`)

1. Thấy banner vàng: *Mục tiêu / vận động do PT quản lý…*
2. Nút **Nhắn PT chỉnh mục tiêu** → mở `/chat?draft=1` với sẵn câu nháp trong ô chat.
3. Ô **Buổi/tuần**, **Phút/buổi**, nút tính lại macro / sửa goal → **disabled** (không chỉnh được).
4. Vẫn thấy được số calo/P/C/F hiện tại (chỉ xem).

**B — Profile** → **Chỉnh sửa chỉ số & Mục tiêu**

1. Banner / note: mục tiêu–vận động do PT.
2. **Mục tiêu**, **cân mục tiêu**, **buổi×phút** → disabled.
3. Có CTA **Nhắn PT để chỉnh mục tiêu** (draft chat).
4. **Chiều cao / cân hiện tại / dị ứng / chế độ ăn** vẫn sửa được (xem 3.3).

**C — Diet header** (nếu có)

1. Có nút kiểu **Nhắn PT chỉnh mục tiêu** → chat + draft.

Pass 3.2 nếu khóa UI + CTA chat draft OK.

---

#### 3.2b *(API / DevTools)* — HV không vượt mặt FE

1. Tab A đã login `customer@`.
2. DevTools → Network (hoặc Console) gọi `PUT /profile/goals` với body goals bất kỳ (khi đã có cookie/JWT).
3. Kỳ vọng: **400** + message kiểu *đang có PT — nhờ PT cập nhật mục tiêu* (`saveGoalsForSelf`).
4. Pass = BE chặn, không chỉ khóa UI.

*(Tuỳ chọn nhanh: cố bật lại input bằng DevTools rồi Save — vẫn phải 400 nếu gọi goals/preferences nutritionGoal.)*

---

#### 3.2c PT chỉnh goals / buổi×phút cho HV

1. **Tab B** → Clients / danh sách HV → mở **`customer@`** (hoặc Progress client).
2. Vào trang progress / chỉnh chỉ số HV (Client Progress): đổi **buổi×phút** hoặc mục tiêu.
3. Lưu → **200** OK.
4. Nếu **đổi vận động** → macro của HV **tự tính lại** (calo đổi).
5. **Tab A** F5 `/macro-targets` → số mới khớp PT đã set; HV vẫn không tự sửa.

Pass 3.2c nếu PT ghi được + HV thấy cập nhật.

---

#### 3.3 HV vẫn ghi được cân + diet/allergies

1. **Tab A** → MacroTargets hoặc Profile:
   - Đổi **cân hiện tại** (vd +0.1 kg so với hiện tại) → Lưu → card hiện đúng số mới (ngày VN, không lệch UTC).
2. Profile: sửa **ghi chú dị ứng** hoặc **chế độ ăn** → Lưu OK.
3. Kỳ vọng: **không** đổi được mục tiêu/cân mục tiêu/vận động (đã khóa ở 3.2).

Pass 3.3 nếu cân + dị ứng/diet lưu được.

---

#### 3.4 HV nhập món / gửi PT duyệt

Chỉ món **AI** và món **tự gõ calo / nguyên liệu custom** mới cần PT kiểm tra. Món tick từ plan PT và món chọn từ thư viện thực phẩm được ghi nhận ngay (`NOT_REQUIRED`).

1. **Tab A** `/diet` → ngày hôm nay.
2. Nhập tay 1 món **chọn từ thư viện** (có gợi ý DB) → toast kiểu “đã lưu từ dữ liệu thực phẩm”, log **không** có badge chờ PT.
3. Nhập tay 1 món **tự gõ tên + calo** (không chọn DB) → toast “đã gửi PT kiểm tra”, log `PENDING` với nhãn **Ước tính · chờ PT kiểm tra**.
4. *(Ảnh nhận diện)* Confirm món từ AI → log `PENDING`.
5. Card **Mục tiêu hàng ngày**: tổng “Đã nạp” **đã gồm** cả món PENDING, kèm dòng phụ “X kcal đang là ước tính, chờ PT kiểm tra”.

Pass nếu món DB không chờ duyệt, món custom/AI vào PENDING, và tổng ngày vẫn cộng đủ.

---

#### 3.5 PT duyệt diet — `/pt/reviews`

Không còn “từ chối rồi dừng”: PT chỉ có **Duyệt đúng** hoặc **Chỉnh lại kết quả** (bắt buộc nhập tên món + calo/macro đúng).

1. **Tab B** → `/pt/reviews` (hoặc Dashboard → Reviews).
2. Thấy list log **PENDING** của `customer@` (hoặc HV khác ACTIVE).
3. Ghi lại tổng kcal hôm nay của HV ở **Tab A** trước khi duyệt.
4. **Duyệt đúng** 1 món → biến mất khỏi PENDING, sang tab **Đã xử lý** với nhãn xanh “PT đã duyệt”; tổng ngày **không đổi**.
5. **Chỉnh lại kết quả** 1 món khác: sửa tên món + calo/macro → lưu → nhãn “PT đã chỉnh lại kết quả”.
   - Bỏ trống tên món, calo `0`/âm, macro âm, hoặc không đổi gì → báo lỗi inline, form **không** đóng.
6. **Tab A** (realtime hoặc F5 Diet): toast “PT đã chỉnh lại chỉ số bữa ăn”; log hiện “PT đã chỉnh chỉ số”; tổng ngày = số cũ **thay bằng** số PT sửa (không trừ cả bữa); cảnh báo OVER/UNDER cập nhật theo macro mới.
7. Dữ liệu cũ `reviewStatus=REJECTED` (seed / auto-close khi kết thúc coaching) vẫn xem được ở tab đã xử lý với nhãn đỏ “PT từ chối (cũ)”.

Pass 3.5 nếu duyệt đúng + chỉnh lại đều xong và tổng ngày khớp bước 6.

---

#### 3.6 PT meal plan — chỉnh / xuất bản tuần

1. **Tab B** → Clients → chọn `customer@` → **Meal plan** (`/pt/clients/:id/meal-plan`).
2. Thêm / sửa / xóa 1 món trong ngày (hoặc copy tuần nếu UI có).
3. Lưu / xuất bản → OK.
4. **Tab A** `/diet` F5 → thấy thay đổi plan PT.

Pass 3.6 nếu HV thấy plan cập nhật.

---

#### 3.7 Chat 2 chiều

1. **Tab A** `/chat` → chọn thread với `pt@` (hoặc từ CTA 3.2).
2. Gửi 1 tin (hoặc gửi draft có sẵn) → thấy tin mình.
3. **Tab B** `/pt/chat` → cùng mapping → thấy tin HV → trả lời 1 câu.
4. **Tab A** thấy reply PT (realtime hoặc F5).
5. Card **bữa chờ duyệt** trong chat PT: **Duyệt đúng** xử lý ngay tại chat; **Chỉnh lại** điều hướng sang `/pt/reviews?...&logId=...` với đúng món (không có nút từ chối nhanh).

Pass 3.7 nếu chat 2 chiều OK và 2 hành động ở card chờ duyệt đúng như bước 5.

---

#### 3.8 PT Progress client

1. **Tab B** → `/pt/progress/:clientId` của `customer@` (từ Clients / Progress).
2. Thấy cân / mục tiêu / macro / lịch sử metric (seed + bước 3.3).
3. (Nếu UI cho) PT cập nhật cân / goals tại đây → khớp 3.2c.

Pass 3.8 nếu trang load đủ dữ liệu HV.

---

**Checklist tick nhanh W3**

| # | Pass? |
| - | ----- |
| 3.0 Login 2 tab HV + PT | ☐ |
| 3.1 Diet thấy plan PT | ☐ |
| 3.2 UI khóa goals + CTA Nhắn PT | ☐ |
| 3.2b API PUT goals → 400 | ☐ |
| 3.2c PT set goals/vận động → HV thấy | ☐ |
| 3.3 HV ghi cân + dị ứng/diet | ☐ |
| 3.4 Món DB không chờ duyệt / món custom + AI vào PENDING | ☐ |
| 3.5 PT duyệt đúng + chỉnh lại kết quả, tổng ngày khớp | ☐ |
| 3.6 PT meal plan cập nhật | ☐ |
| 3.7 Chat 2 chiều | ☐ |
| 3.8 PT progress client | ☐ |

**Gợi ý demo thầy (rút ~10 phút):** 3.1 → 3.2 (banner + khóa) → 3.2b (400) → 3.5 duyệt → 3.7 chat.




### W4 — Hire offline end-to-end (~25 phút)

Dùng `customer3@gmail.com` + `pt.offline@gmail.com` (đừng dùng `customer@` — đã có PT).


| #   | Bước                                                         | Ai    | Pass? | Ghi chú            |
| --- | ------------------------------------------------------------ | ----- | ----- | ------------------ |
| 4.1 | Marketplace → mở PT offline                                  | HV    | ☐     | Có venue + lịch    |
| 4.2 | Hire OFFLINE — chọn venue + 2–3 slot                         | HV    | ☐     |                    |
| 4.3 | Clients → Accept hire                                        | PT    | ☐     | → AWAITING_PAYMENT |
| 4.4 | Thanh toán (VNPay / wallet)                                  | HV    | ☐     |                    |
| 4.5 | Mapping ACTIVE + lịch hẹn hiện                               | HV    | ☐     |                    |
| 4.6 | Escrow / Coaching thấy gói                                   | HV    | ☐     |                    |
| 4.7 | PT mark done 1 buổi → HV confirm (hoặc chờ auto)             | PT/HV | ☐     |                    |
| 4.8 | *(phụ)* `customer2@` + `pt.freelance@` Accept/Reject PENDING |       | ☐     |                    |




### W5 — Money / end / report (~20 phút)


| #    | Bước                                                                          | Tài khoản               | Pass? | Ghi chú                                 |
| ---- | ----------------------------------------------------------------------------- | ----------------------- | ----- | --------------------------------------- |
| 5.1  | Coaching — escrow **dư**                                                      | `hv.an@`                | ☐     |                                         |
| 5.2  | Coaching — escrow **cạn**                                                     | `hv.bao@`               | ☐     | Không release thêm nếu hết              |
| 5.3  | Coaching — escrow chuẩn                                                       | `hv.chi@`               | ☐     |                                         |
| 5.4  | Xem trạng thái END_REQUESTED                                                  | `hv.endreq@`            | ☐     |                                         |
| 5.5  | Yêu cầu / xác nhận kết thúc coaching                                          | `customer@` hoặc endreq | ☐     |                                         |
| 5.5b | Sau **confirm end**: 0 DietLog `reviewStatus=PENDING` của HV                  | HV/API                  | ☐     | Auto-close → `REJECTED` legacy; không đụng eaten |
| 5.5c | **Không** auto-đóng PENDING diet ở bước chỉ `END_REQUESTED`                   |                         | ☐     | Chỉ đóng khi COMPLETED                  |
| 5.6  | Report PT (nếu có UI) → Admin xử lý                                           | HV → Admin              | ☐     |                                         |
| 5.6b | Admin suspend PT → mapping INACTIVE + 0 PENDING diet của HV                   | Admin                   | ☐     | `PtSuspendSettlement`                   |
| 5.7  | PT rút tiền (Withdraw)                                                        | `pt@`                   | ☐     | Ghi nhận trạng thái (demo SUCCESS ngay) |
| 5.8  | Admin Finance — overview + transactions                                       | `admin@`                | ☐     |                                         |
| 5.9  | HV dispute buổi (escrow còn) → escrow **DISPUTED**; confirm buổi khác bị chặn | `hv.chi@` / hire mới    | ☐     |                                         |
| 5.10 | Dispute khi escrow **cạn** (`hv.bao@`) vẫn tạo được dispute session           | HV                      | ☐     | Best-effort; có thể không khóa escrow   |
| 5.11 | Admin resolve hết session dispute, **không** refund PENDING → escrow unlock   | Admin                   | ☐     |                                         |
| 5.12 | Có refund `PENDING_REVIEW` → resolve session dispute **không** unlock escrow  | Admin                   | ☐     |                                         |




### W6 — Admin & Marketplace (~10 phút) — `admin@nutrican.com`


| #   | Bước                                                        | Pass? | Ghi chú               |
| --- | ----------------------------------------------------------- | ----- | --------------------- |
| 6.1 | `/admin/pts` — PT update request (`pt.certified@`)          | ☐     |                       |
| 6.2 | `/admin/users` — xem / suspend thử (cẩn thận)               | ☐     |                       |
| 6.3 | `/admin/finance`                                            | ☐     |                       |
| 6.4 | Marketplace — PT có **nhiều review**, rating khớp số review | ☐     | Không 5★ với 0 review |
| 6.5 | `/admin/food-tags` (nếu dùng)                               | ☐     |                       |


---



## 4. Checklist phá luồng (thầy hay làm)


| #   | Hành động                                              | Kỳ vọng                                 | Pass? |
| --- | ------------------------------------------------------ | --------------------------------------- | ----- |
| P1  | UI khóa goals + gọi API `PUT /profile/goals` khi có PT | **400** (đã fix BE `saveGoalsForSelf`)  | ☐     |
| P1b | PT workspace đổi goals client khi coached              | **200** OK                              | ☐     |
| P2  | Double click / 2 tab thanh toán cùng hire              | Không double ACTIVE / double hold       | ☐     |
| P3  | Thanh toán sau khi hết hạn cửa sổ                      | Reject hoặc hoàn, không ACTIVE          | ☐     |
| P4  | Self mark-eaten khi đang có PT                         | Bị chặn                                 | ☐     |
| P5  | Hire khi đã có PT ACTIVE khác                          | Reject                                  | ☐     |
| P6  | Chat sau khi mapping INACTIVE                          | BE từ chối                              | ☐     |
| P7  | Customer vào `/pt` hoặc `/admin`                       | Redirect                                | ☐     |
| P8  | Đổi giờ máy                                            | Plan day đổi theo máy                   | ☐     |
| P9  | END_REQUESTED vẫn xem plan / chat như coached          | Đúng BR hiện tại                        | ☐     |
| P10 | Rating marketplace                                     | `totalReviews` = số dòng review         | ☐     |
| P11 | Confirm end / suspend PT → DietLog PENDING orphan      | 0 PENDING còn lại                       | ☐     |
| P12 | Session dispute khóa escrow (khi còn held)             | Escrow DISPUTED; release thường bị chặn | ☐     |
| P13 | Resolve dispute + còn refund PENDING_REVIEW            | Escrow **vẫn** DISPUTED                 | ☐     |


---



## 5. Câu trả lời debate (điểm yếu — nói chủ động)

Chuẩn bị nói ngắn nếu thầy hỏi (**còn mở** — chưa fix trong vòng này):

1. **Withdraw SUCCESS ngay** — demo ledger, chưa cổng chi ngân hàng; hướng PENDING + admin duyệt.
2. **JWT limited** — token setup cũ; hiện Google skip/set dùng full JWT; vẫn nên siết claim limited nếu còn dùng.

**Đã vá / BR OAuth (nói nếu thầy hỏi Google ATO):**

1. **Google cùng email** — auto-link **chỉ** khi IdP `email_verified` + local không `PENDING_VERIFICATION`; giữ MK nếu đã có (chuẩn Firebase/consumer). Không bắt “login MK rồi mới link” (đó là model bank).
2. **Google lần đầu** — mời tạo MK, **Được bỏ qua**; Settings: chưa MK → Tạo; đã có → Đổi.
3. **PUT /goals khi coached** — BE `saveGoalsForSelf` + `hasActivePt` → 400; PT workspace vẫn `saveGoals`.
4. **PENDING diet log khi hết mapping** — auto-reject trên confirm end + suspend → INACTIVE (không ở `END_REQUESTED`).
5. **Session dispute ↔ escrow** — dispute mark escrow DISPUTED (best-effort); unlock khi hết session dispute PENDING **và** không refund `PENDING_REVIEW`.
6. **Duyệt bữa ăn không còn dead-end** — món thư viện/plan `NOT_REQUIRED`; món custom + AI mới `PENDING`; PT chỉ **Duyệt đúng** hoặc **Chỉnh lại kết quả** (bắt buộc macro đúng → `APPROVED` + `ptAction=ADJUST`, control-loop chạy lại). `REJECTED` chỉ còn là dữ liệu lịch sử / auto-close, nên RBL không nhận sample âm giả.

**Điểm mạnh nhấn mạnh:** hire → pay → escrow thật qua wallet service; diet coached vs solo tách rõ; `END_REQUESTED` vẫn coached; seed rating = aggregate review thật; diet clock theo giờ máy.

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
| --------- | ------- | --------- | -------------- |
|           |         |           |                |
|           |         |           |                |
|           |         |           |                |


**Kết luận sau 1 vòng test tay:**

- Happy path OK? ☐ Có / ☐ Chưa  
- Sẵn sàng demo thầy? ☐ Có / ☐ Cần fix thêm: ________________

