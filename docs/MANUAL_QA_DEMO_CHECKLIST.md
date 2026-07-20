# Checklist test thủ công — Demo accounts (mắt thường)

> **Mục đích:** Bạn tự kiểm tra bằng UI với 3 tài khoản demo từ `UserInitializer`.  
> **Phạm vi:** Gồm **2 lớp thay đổi** — commit đã merge (`6df1e210` … meal-windows / nhật ký 5 buổi) và **thay đổi hiện tại** (Coaching sync + PT duyệt + fixture V2).  
> **Cập nhật:** 2026-07-20

---

## 0. Tài khoản dùng trong checklist

| Vai trò | Email | Mật khẩu | Tên hiển thị (PT workspace) |
|---------|-------|----------|-----------------------------|
| Customer **không PT** | `demo.solo@nutrican.com` | `Demo123!` | Demo Solo |
| Customer **có PT** | `demo.coached@nutrican.com` | `Demo123!` | Demo Coached (Co PT) |
| **PT** | `pt.certified@gmail.com` | `123456` | PT Certified |

**Mapping PT ↔ Client:** PT certified quản lý **Demo Coached** (mapping ACTIVE từ seed).

---

## 1. Chuẩn bị trước khi test

### 1.1 Stack chạy

- [ ] Docker: `cd nutrican-be && docker compose up -d`
- [ ] Backend: `cd nutrican-be && .\mvnw spring-boot:run` — đợi log seed (~30s)
- [ ] Frontend: `cd nutrican-fe && npm run dev` → mở `http://localhost:5173`
- [ ] Múi giờ máy test = **Asia/Ho_Chi_Minh** (gate buổi ăn phụ thuộc giờ local)

### 1.2 Seed fixture demo (quan trọng cho Phần B)

Fixture giàu (`DemoVeteranDataInitializer`, flag `DEMO_VETERAN_FIXTURES_V2`) chạy **một lần** khi BE start. Nếu DB cũ / thiếu PENDING ngày +1/+2:

```sql
DELETE FROM system_settings
WHERE setting_key IN ('DEMO_VETERAN_FIXTURES_V1', 'DEMO_VETERAN_FIXTURES_V2');
```

→ Restart BE. Sau seed V2 bạn **kỳ vọng**:

| Account | Dữ liệu seed |
|---------|----------------|
| **demo.solo** | Nhật ký ~13 ngày quá khứ (5 buổi); self-plan **hôm nay → +14 ngày**; sáng hôm nay có thể đã tick + log |
| **demo.coached** | Meal plan PT publish **tuần hiện tại + tuần kế** (đủ ngày trong +14d); mỗi ngày seed **5 buổi PT** (có `foodCode` + macro BE); **hôm nay:** PT chiều đã tick + self chiều settled + **PENDING tối**; **PENDING ngày mai (+1) chỉ MORNING**; **PENDING ngày kia (+2) chỉ EVENING**; lịch sử APPROVED (~7 ngày trước), REJECTED (~4 ngày trước) |

Ghi lại ngày test thực tế:

```
Hôm nay (today)     = __________  (VD: 2026-07-20)
Ngày +1 (duyệt)     = __________
Ngày +2 (từ chối)   = __________
```

### 1.3 Khái niệm — đọc 2 phút trước khi tick

| Khái niệm | Giải thích ngắn |
|-----------|------------------|
| **5 buổi UI** | Sáng / Trưa / Chiều / Tối / Khuya (`mealPeriod`) — **không** gộp “SNACK” trên UI mới |
| **4 mealType API** | BREAKFAST, LUNCH, DINNER, SNACK — Chiều + Khuya cùng SNACK; SoT hiển thị là `mealPeriod` |
| **Plan ăn ngày** | Card trên **Nhật ký ăn uống** (`/diet`) — kế hoạch sẽ ăn |
| **Nhật ký (DietLog)** | Đã ghi thật — tab AI / Manual |
| **Coaching** | Meal plan tuần PT (`/coaching`) — week picker, **không** calendar +14d |
| **Dual-metric** | Tick **PT gốc** = tuân thủ only; tick **SELF_OVERRIDE** = tuân thủ **+** ghi nhật ký calo |
| **Gate giờ** | Tick “Đã ăn” chỉ khi đúng khung giờ buổi đó (`isMealPeriodOpen`) |

**Khung giờ (VN):**

| Buổi | Giờ mở tick (hôm nay) |
|------|------------------------|
| Sáng | 04:00 – 10:59 |
| Trưa | 11:00 – 12:59 |
| Chiều | 13:00 – 17:59 |
| Tối | 18:00 – 21:59 |
| Khuya | 22:00 – 03:59 (plan **hôm qua** tick được 00:00–03:59) |

---

## 2. PHẦN A — Commit trước (`6df1e210`: nhật ký 5 buổi + plan ngày + macro)

> Test chủ yếu với **demo.solo** và **demo.coached**. PT ít liên quan phần này.

---

### A1. Mục tiêu dinh dưỡng + Macro / kcal sync

**Solo** (`demo.solo@nutrican.com`) — đổi mục tiêu / vận động được; **Coached** (`demo.coached@nutrican.com`) — khóa + chỉ ghi cân.

| # | Account | Bước làm | Kỳ vọng mắt thấy | ✓ |
|---|---------|----------|------------------|---|
| **A1-S1** | demo.solo | `/diet` — xem Target kcal | ~2100 kcal (seed lần đầu) | |
| **A1-S2** | demo.solo | **Cài đặt** → Sức khỏe & Dinh dưỡng → đổi Mục tiêu **Giảm cân → Tăng cân** → **Lưu** | Toast có kcal mới; quay `/diet` **tăng** không cần F5 | |
| **A1-S4** | demo.solo | Chỉ đổi **dị ứng** → Lưu | Kcal `/diet` **không đổi** | |
| **A1-S5** | demo.solo | **Bad:** DevTools → Offline → đổi mục tiêu → Lưu | Toast tách: đã lưu tuỳ chọn, **chưa** cập nhật calo | |
| **A1-H1** | demo.solo | `/macro-targets` → đổi vận động → **Áp dụng & tính lại macro** | Macro + `/diet` cùng đổi | |
| **A1-PT1** | demo.coached | **Cài đặt** → Mục tiêu dinh dưỡng | Dropdown **disabled** + note liên hệ PT | |
| **A1-PT2** | demo.coached | `/macro-targets` → **Sửa Mục tiêu** | Nút **disabled** (hoặc không mở modal) + banner PT | |
| **A1-PT3** | demo.coached | `/macro-targets` → vận động + **Áp dụng** | Dropdown + nút **disabled** | |
| **A1-PT4** | demo.coached | Ghi cân trên MacroTargets | Lưu tiến độ OK; **kcal không đổi** | |

**Network (DevTools):** solo Lưu Settings sau đổi mục tiêu → có `POST /profile/recalculate-macros`. Coached **không** gọi (hoặc 400 nếu gọi tay).

**Macro cơ bản (solo):**

| # | Bước | Kỳ vọng | ✓ |
|---|------|---------|---|
| A1.1 | `/macro-targets` | Dropdown vận động nhãn tiếng Việt | |
| A1.2 | Hover icon **(i)** | Tooltip TDEE = BMR × R | |
| A1.4 | Đổi dropdown **không** bấm Áp dụng → F5 | Macro cũ giữ nguyên | |

---

### A2. Nhật ký ăn uống — 5 section + lịch

**Account:** `demo.solo@nutrican.com` → `/diet`

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| A2.1 | Mở **Nhật ký ăn uống** | Có mũi tên ngày, nút lịch, URL `?date=YYYY-MM-DD` | |
| A2.2 | Lùi lịch **2 tuần** (mũi tên ← hoặc calendar) | Các ngày có chấm / có log; mỗi ngày có log group **5 buổi** (Sáng, Trưa, Chiều, Tối, Khuya) — **không** gộp chiều+khuya một section | |
| A2.3 | Chọn **hôm qua** | Log quá khứ hiển thị đúng buổi; có thể có chip **Bù: Buổi …** (makeup) trên vài log seed | |
| A2.4 | Chọn **hôm nay** | Section theo 5 buổi; log đã có nằm đúng section (sáng không nằm dưới chiều) | |
| A2.5 | Calendar → chọn **today + 14 ngày** | Calendar cho phép (max +14d) | |
| A2.6 | Calendar → thử **today + 15** (nếu UI cho chọn) | Không ghi nhật ký / bị chặn tương lai xa | |
| A2.7 | Tab **Manual** — **hôm nay** | Chỉ chọn được buổi **đang mở** (current period); buổi qua/tương lai khóa | |
| A2.8 | Tab **Manual** — **ngày quá khứ** đang xem | Chọn được bất kỳ 1 trong 5 buổi | |
| A2.9 | **Tạo mới:** Manual hôm nay → search **"phở"** hoặc **"cơm"** → nhập gram (VD 200) → Lưu | Log xuất hiện đúng section buổi hiện tại | |
| A2.10 | **Bad — hôm nay:** Cố chọn buổi chưa tới (nếu UI còn hiện) | Không ghi được / bị chặn | |

---

### A3. Plan ăn ngày (Day plan) — solo

**Account:** `demo.solo@nutrican.com` → `/diet` → card **Plan ăn ngày**

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| A3.1 | Ngày **hôm nay** | Plan hiển thị **5 section** (ẩn section trống); mỗi section label Buổi sáng/trưa/… | |
| A3.2 | Chọn buổi **Trưa** → search thực phẩm → gram 250 → **Thêm** | Món mới trong section Trưa; thanh macro bên phải (Planned) tăng | |
| A3.3 | Sửa gram / **Xóa** món vừa thêm | Cập nhật ngay; planned giảm | |
| A3.4 | Chọn **ngày mai** trên calendar | Thêm/sửa plan được; **không** thấy nút tick Đã ăn (future) | |
| A3.5 | Lùi **today + 14** | Có self-plan seed; thêm món được | |
| A3.6 | **Tick Đã ăn** món self — **trong khung giờ buổi đó** | Toast thành công; món marked eaten; **Nhật ký** cùng ngày có log mới đúng buổi | |
| A3.7 | **Bad — ngoài khung giờ:** Tick món buổi **khác** buổi hiện tại | Checkbox disabled hoặc toast lỗi từ BE | |
| A3.8 | **Bad — buổi tối lúc sáng:** Tick plan Khuya khi đang 10:00 sáng | Không tick được | |

### A3b. Readonly quá khứ + tick trễ

| # | Account | Bước làm | Kỳ vọng | ✓ |
|---|---------|----------|---------|---|
| A3b.1 | demo.solo | `/diet` chọn **hôm qua** | Card Plan ăn ngày có banner *"Ngày đã qua - chỉ xem kế hoạch"* | |
| A3b.2 | demo.solo | Hôm qua — thử sửa/xóa/thêm/tick plan | UI không cho thao tác; nếu gọi tay API thì bị chặn | |
| A3b.3 | demo.solo | Hôm qua — thử xóa 1 log đã có | UI ẩn nút xóa; API 400 nếu gọi tay | |
| A3b.4 | demo.solo | Hôm qua — thêm **log mới** bằng Manual | Vẫn tạo được log bù cho ngày cũ | |
| A3b.5 | demo.coached | Hôm nay, chọn một buổi đã qua nhưng vẫn cùng ngày | Tick mở modal / prompt lý do; nhập >= 10 ký tự thì lưu thành công | |
| A3b.6 | demo.coached | Sau tick trễ, vào `/coaching` hoặc `/diet` | Thấy text *Tick trễ: ...* trên item / log tương ứng | |

---

### A4. Plan ăn ngày — coached (có PT)

**Account:** `demo.coached@nutrican.com` → `/diet`

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| A4.1 | Hôm nay — Plan ăn ngày | Có món **PT** (locked) + có thể có self draft seed (chiều/tối) | |
| A4.2 | **Thêm** món self buổi **Sáng** (search + gram) | Thêm được khi chưa PENDING/locked review | |
| A4.3 | Bấm **Gửi PT duyệt** (nếu có nút) | Trạng thái PENDING; món self **khóa** sửa/xóa | |
| A4.4 | **Bad — có PT:** Tick trực tiếp món self **chưa duyệt** | Không được / toast lỗi | |
| A4.5 | Lùi xem ngày **~7 ngày trước** (APPROVED seed) | Có món override đã duyệt; tick override (trong giờ) → ghi nhật ký | |
| A4.6 | Lùi **~4 ngày trước** (REJECTED seed) | Hiện **note PT từ chối**; self items unlock, sửa lại được | |
| A4.7 | Hôm nay — tick PT **Chiều** (hoặc seed đã eaten) | Self đề xuất chiều **gạch ngang**, không edit/delete; badge *Buổi đã chốt* | |
| A4.8 | PT mở meal plan / progress hôm nay | Macro item **> 0 kcal**; progress có section *Tick trễ trong tuần* nếu có | |
| A4.9 | PT pending list hôm nay | Chỉ thấy đề xuất **buổi tối**, không thấy chiều đã chốt | |

---

### A5. Mục tiêu dinh dưỡng live (NutritionProgress)

**Account:** bất kỳ demo customer → `/diet` hôm nay

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| A5.1 | Quan sát cột **Actual** vs **Planned** | Actual = từ nhật ký; Planned = plan chưa eaten | |
| A5.2 | Thêm món plan lớn calo | Badge/cảnh báo vượt macro nếu vượt ngưỡng (~20% calo) | |

---

## 3. PHẦN B — Thay đổi hiện tại (Coaching sync + PT duyệt + fixture V2)

---

### B1. Coaching — 5 section (không gộp SNACK)

**Account:** `demo.coached@nutrican.com` → `/coaching`

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B1.1 | Chọn tuần **có meal plan publish** (week picker) | Load được ngày trong tuần | |
| B1.2 | Chọn tab ngày **hôm nay** (hoặc ngày có đủ món) | Thấy section riêng **Buổi chiều** và **Buổi khuya** — **không** một block “SNACK” gộp cả hai | |
| B1.3 | Ngày chỉ có sáng+trưa | Chỉ 2 section hiện; **không** 3 khung trống | |
| B1.4 | Hover tooltip header ngày | Text kiểu: tick trong khung giờ; nhật ký calo ở Nhật ký / Plan ngày | |
| B1.5 | So sánh cùng ngày trên `/diet` Plan ăn ngày | Cùng logic 5 buổi, label giống | |

---

### B2. Coaching — tick Đã ăn + toast dual-metric

**Account:** `demo.coached@nutrican.com` → `/coaching` → ngày có PT plan

**Chuẩn bị:** Test khi đang **trong khung giờ** của một buổi (VD 14:00 = Chiều).

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B2.1 | Tick món **PT gốc** (source PT, chưa override) | Toast: **"Đã đánh dấu tuân thủ (chưa ghi nhật ký)"**; checkbox checked | |
| B2.2 | Vào `/diet` cùng ngày — Nhật ký | **Không** tự sinh log mới từ tick PT gốc | |
| B2.3 | Ngày đã **APPROVED** override — tick món **self override** | Toast: **"Đã ghi vào nhật ký"** | |
| B2.4 | `/diet` cùng ngày | Có log mới đúng buổi | |
| B2.5 | **Bad — ngoài giờ:** Tick buổi khác | Checkbox disabled; title tooltip *"Chỉ đánh dấu đã ăn trong khung giờ của buổi đó"* | |
| B2.6 | **Bad:** BE trả lỗi (VD tick buổi đã qua) | Toast hiện **message BE**, không nuốt lỗi chung chung | |

---

### B3. Coaching — skip cả bữa theo `mealPeriod`

**Account:** `demo.coached@nutrican.com` → `/coaching` → ngày **hôm nay** có **cả Chiều và Khuya**

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B3.1 | Section **Buổi chiều** → **Không ăn cả bữa** → chọn lý do (VD Không có thời gian) → Xác nhận | Chỉ món **chiều** skip; section **Khuya** vẫn bình thường | |
| B3.2 | **Hoàn tác cả bữa** ở Chiều | Chiều về trạng thái cũ; Khuya không đổi | |
| B3.3 | **Không ăn cả bữa** ở **Khuya** | Chỉ khuya skip | |
| B3.4 | **Bad:** Skip món đã tick eaten | Toast lỗi | |

> **Regression cũ (phải FAIL):** Trước fix, skip “SNACK” skip cả Chiều + Khuya — giờ **không** được xảy ra.

---

### B4. PT — badge + duyệt / từ chối self-plan

**Luồng seed (sau V2):** PENDING **ngày +1** (chỉ Sáng), **ngày +2** (chỉ Tối).

#### B4.1 PT phát hiện pending

**Account:** `pt.certified@gmail.com` → `/pt/clients`

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B4.1a | Tab **Đang huấn luyện** (ACTIVE) | Card **Demo Coached** có badge **"Self-plan chờ duyệt (N)"** với N ≥ 1 | |
| B4.1b | Click vào client → vào **Thực đơn tuần** (`/pt/clients/:id/meal-plan`) | Card **Kế hoạch ngày đặc biệt chờ duyệt** có list submission | |

#### B4.2 Duyệt — ngày +1 (chỉ Sáng)

**Account:** PT trên trang meal plan client

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B4.2a | Mở submission **ngày +1** | Items hiển thị label **Buổi sáng** (không “BREAKFAST” / không “SNACK gộp”) | |
| B4.2b | **Trước duyệt:** Ghi nhận nhanh trên grid tuần — ngày +1 có PT sáng/trưa/chiều/tối/khuya | Có đủ buổi PT gốc | |
| B4.2c | Bấm **Duyệt override** | Submission biến mất khỏi list **không F5** | |
| B4.2d | Badge ClientList | Số pending giảm (không F5 trang clients nếu quay lại) | |
| B4.2e | Login **demo.coached** → `/diet` **ngày +1** | **Chỉ Sáng** là self/override; Trưa/Chiều/Tối/Khuya vẫn PT gốc | |
| B4.2f | **demo.coached** → `/coaching` tuần chứa ngày +1 | Sáng hiển thị món override; tick override (trong giờ sáng) → toast ghi nhật ký | |
| B4.2g | PT duyệt khi học viên đã log món khác cùng buổi | UI customer hiện *"Buổi đã có nhật ký khác - không cần tick lại"*; không tạo log lần 2 | |

#### B4.3 Từ chối — ngày +2 (chỉ Tối)

**Account:** PT

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B4.3a | Mở submission **ngày +2** (EVENING) | Label **Buổi tối** | |
| B4.3b | Bấm **Từ chối** **không** nhập lý do | Không submit / báo bắt buộc note | |
| B4.3c | Nhập lý do VD *"Khẩu phần tối quá cao calo"* → Từ chối | List pending cập nhật; submission biến mất | |
| B4.3d | **demo.coached** → `/diet` **ngày +2** | Hiện note PT; menu PT tối **không** bị override; self items **mở khóa**, sửa/gửi lại được | |
| B4.3e | Coaching kết thúc khi còn submission PENDING | Submission tự chuyển REJECTED với lý do hệ thống; PT không còn backlog treo | |

#### B4.4 Empty state PT

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B4.4 | Sau khi xử lý hết PENDING | Card dashed: *"Chưa có kế hoạch ngày đặc biệt chờ duyệt…"* + hướng dẫn học viên Gửi duyệt từ Nhật ký | |

---

### B5. Customer coached — tự tạo luồng Gửi duyệt (nếu seed PENDING đã xử lý)

**Account:** `demo.coached@nutrican.com`

| # | Bước làm | Kỳ vọng | ✓ |
|---|----------|---------|---|
| B5.1 | `/diet` **hôm nay** — có self draft seed (chiều/tối) chưa gửi | Món unlock | |
| B5.2 | **Gửi PT duyệt** | PENDING; khóa sửa | |
| B5.3 | PT thấy submission mới | Badge + list | |
| B5.4 | **Hủy gửi** (customer) | Unlock lại | |
| B5.5 | **Bad — gửi 2 lần** cùng ngày | Lần 2 lỗi (409 / thông báo đã có pending) | |
| B5.6 | **Bad — gửi duyệt ngày quá khứ** | Lỗi 400 | |

---

### B6. Fixture +14 ngày — solo vs coached

| # | Account | Bước | Kỳ vọng | ✓ |
|---|---------|------|---------|---|
| B6.1 | demo.solo | `/diet` calendar **today → +14** | Mỗi ngày có plan (ít nhất sáng+trưa; nhiều ngày đủ 5 buổi) | |
| B6.2 | demo.coached | `/diet` **+10, +14** | Có plan PT (hasPtPlan) | |
| B6.3 | demo.coached | `/coaching` week picker | Chọn được tuần có ngày tương lai trong +14d; không expect calendar +14 trên Coaching | |

---

## 4. Luồng end-to-end 3 tài khoản (recommended order)

Làm **một lần** theo thứ tự để thấy full vòng đời:

```
1. [solo]     A2 + A3 — nhật ký 5 buổi + plan tick
2. [coached]  A4 — plan + hiểu khóa self khi có PT
3. [coached]  B1–B3 — Coaching 5 section + skip + tick
4. [PT]       B4.2 — Duyệt ngày +1 (Sáng only)
5. [coached]  B4.2e–f — verify override
6. [PT]       B4.3 — Từ chối ngày +2 (Tối)
7. [coached]  B4.3d — verify reject note + unlock
8. [PT]       B4.4 — empty state
```

---

## 5. Bad cases theo giờ (chọn slot phù hợp)

| Giờ test | Case nên chạy |
|----------|----------------|
| **04:00–10:59** | Tick plan **Sáng** hôm nay (OK); tick **Khuya hôm qua** nếu 00:00–03:59 (OK LATE cross-midnight) |
| **11:00–12:59** | Tick Trưa OK; tick Sáng hôm nay **FAIL** |
| **13:00–17:59** | B3 skip Chiều vs Khuya; tick Chiều OK |
| **18:00–21:59** | Tick Tối; tick Khuya hôm nay **FAIL** (chưa 22h) |
| **22:00–23:59** | Tick Khuya **hôm nay** OK |
| **00:00–03:59** | Tick Khuya **hôm qua** OK; makeup select buổi đã qua có thể rỗng trước 04:00 |

---

## 6. Checklist tổng nhanh (tick cuối session)

### Commit trước — Nhật ký & Plan ngày
- [ ] A1 Macro / activity level
- [ ] A2 Nhật ký 5 buổi + calendar +14
- [ ] A3 Solo plan + tick → log
- [ ] A4 Coached plan + gửi duyệt + lịch sử approve/reject
- [ ] A5 NutritionProgress actual/planned

### Commit hiện tại — Coaching & PT
- [ ] B1 Coaching 5 section (chiều ≠ khuya)
- [ ] B2 Toast PT gốc vs override + gate giờ
- [ ] B3 Skip cả bữa scope đúng buổi
- [ ] B4 PT badge + duyệt +1 + từ chối +2 + empty state
- [ ] B5 Gửi / hủy gửi / double submit
- [ ] B6 Fixture +14d solo & coached

---

## 7. Ghi chú khi FAIL — tra nhanh

| Triệu chứng | Kiểm tra |
|-------------|----------|
| Không có PENDING +1/+2 | Chưa seed V2 → xóa `system_settings` flag → restart BE |
| Coaching vẫn 1 block SNACK | FE chưa build lại / cache — hard refresh Ctrl+Shift+R |
| Tick không gate giờ | Giờ máy sai timezone; so với bảng mục 1.3 |
| Duyệt xóa nhầm cả ngày | Bug `scopeMealPeriods` — chỉ buổi trong submission bị override |
| Skip chiều làm khuya skip | Bug mealPeriod skip — báo dev |
| Solo không có plan +14 | `DemoVeteranDataInitializer` chưa chạy |
| Settings đổi mục tiêu nhưng `/diet` kcal cũ | Solo: thiếu `POST /recalculate-macros` sau Lưu; hard refresh `/diet` hoặc mở tab mới |
| Coached vẫn đổi được macro | FE chưa disable / BE chưa gate — kiểm tra `has-active-pt` |
| Restart BE reset macro demo | `UserInitializer` ghi đè — phải insert-only (`seedDemoMacroIfAbsent`) |

---

## 8. Tài liệu liên quan

- [FEATURE_MEAL_WINDOWS_SELFPLAN.md](./FEATURE_MEAL_WINDOWS_SELFPLAN.md) — spec đầy đủ
- [TEAM_ONBOARDING.md](./TEAM_ONBOARDING.md) — account demo & reset seed
- `scripts/seed-demo-meal-windows.mjs` — refresh nhẹ **hôm nay** (không thay full +14d)

---

*Tạo cho manual QA visual — không thay thế automated test (`.\scripts\test-all.ps1`).*
