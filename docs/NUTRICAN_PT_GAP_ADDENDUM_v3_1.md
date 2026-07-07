# NutriCan PT — Gap Addendum v3.1

> **Phiên bản:** Addendum bổ sung cho `NUTRICAN_PT_MASTER_SPEC_v3.md`  
> **Ngày:** 2026-07-06 · **Đối chiếu code:** 2026-07-07  
> **Mục đích:** Audit thực chất — các gap nghiệp vụ thực tiễn còn thiếu sau v3, không phải feature ảo, mà là các lỗ hổng sẽ gây ra vấn đề khi user thực sự dùng app.  
> **Nguyên tắc:** Mỗi gap phải trả lời được câu hỏi "nếu không có cái này, user sẽ gặp vấn đề gì cụ thể?"

### Trạng thái triển khai (2026-07-07)

| ADD | Priority | Implementation | Regression |
|-----|----------|----------------|------------|
| ADD-01 Onboarding | P0 | **Done** — `OnboardingPage`, `POST /profile/onboarding` | `ac-onboarding` (BE/FE/Hybrid) |
| ADD-02 Body metrics | P0 | **Done** — `BodyMetricService`, `ProfileExtensionsController` | `ac-body-metric-reminder`, `ac12-progress` |
| ADD-08 BR-17 | P0 | **Done** — `IntakeControlLoopServiceImpl` | `IntakeControlLoopServiceTest`, `ac04-control-loop` |
| ADD-07 Lifecycle | P1 | **Done** — `CoachingLifecycleService` | `ac-lifecycle` |
| ADD-06 Notifications | P1 | **Done** — `NotificationService`, bell UI | `ac-notifications` |
| ADD-05 SOS SLA | P1 | **Done** — `SosSlaScheduler`, admin reassign | `ac-sos-sla`, `ac-sos-reassign` |
| ADD-03 Chat context | P2 | **Done** — `PtWorkspaceServiceImpl.getChatContext`, `ChatPage` | `ac-chat-context` |
| ADD-04 Marketplace | P2 | **Done** — `goalFilter`, `sort=compatibility`, `search` | `ac-marketplace-filter` |

**Polish ngoài AC (chưa bắt buộc):** FE diet filter chips · PREGNANT goal chip · chat reject `.exe`/`.zip` · SOS resolve happy-path E2E · email SOS/refund/weekly (chỉ hire có integration test).

**Gate:** 120 BE · 58 Playwright · 34 v3.1 layers — [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md)

---

## Mục lục Addendum

- [ADD-01: Customer Onboarding Flow — Lỗ hổng retention lớn nhất](#add-01-customer-onboarding-flow)
- [ADD-02: Body Metric Logging — FR-16 phụ thuộc vào FR không tồn tại](#add-02-body-metric-logging)
- [ADD-03: Chat Context Linking — Chat không có ngữ cảnh coaching](#add-03-chat-context-linking)
- [ADD-04: Marketplace Goal Compatibility — Filter sai chiều](#add-04-marketplace-goal-compatibility)
- [ADD-05: SOS SLA & Escalation — Ticket không có thời hạn](#add-05-sos-sla--escalation)
- [ADD-06: Notification System Spec — WS events chưa đủ](#add-06-notification-system-spec)
- [ADD-07: PT Coaching Lifecycle — Không có kết thúc bình thường](#add-07-pt-coaching-lifecycle)
- [ADD-08: BR-17 Enforce — Bug tiềm ẩn double alert](#add-08-br-17-enforce)
- [Bảng tổng hợp priority](#bảng-tổng-hợp-priority)

---

## ADD-01: Customer Onboarding Flow

### Vấn đề thực tế

Customer đăng ký xong → redirect vào `/diet` → thấy màn hình trống. Không biết:
- Bắt đầu từ đâu?
- MacroTarget mặc định là bao nhiêu? (chưa khai báo height/weight/age → Mifflin-St Jeor không tính được → control loop so sánh với con số rỗng)
- Có cần PT không? Nếu có thì tìm ở đâu?
- Diet preference là gì? Có cần setup không?

**Hậu quả:** 80% user đăng ký rồi thoát vì không biết làm gì. MacroTarget = null → summary luôn hiển thị "OK" → control loop vô nghĩa.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| ONB-01 | User mới (chưa có `MacroTarget`) → redirect `/onboarding` sau login lần đầu |
| ONB-02 | Onboarding bắt buộc: height, weight, age, gender (nếu chưa có) |
| ONB-03 | Onboarding gợi ý: nutrition_goal, diet_preference, có muốn kết nối PT không |
| ONB-04 | Sau onboarding: MacroTarget tự động tính (Mifflin-St Jeor × activity factor) |
| ONB-05 | Onboarding có thể bỏ qua (skip) nhưng app hiện banner nhắc cho đến khi hoàn thành |
| ONB-06 | User đã login trước v3 mà thiếu MacroTarget → trigger onboarding banner (không force redirect) |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-ONB-01 | Wizard onboarding 3 bước sau đăng ký lần đầu |
| FR-ONB-02 | Bước 1: Body metric cơ bản (height cm, weight kg, age, gender) |
| FR-ONB-03 | Bước 2: Mục tiêu (nutrition_goal + diet_preference) + gợi ý macro |
| FR-ONB-04 | Bước 3: "Bạn có muốn tìm PT không?" — Yes → redirect marketplace; No → vào /diet |
| FR-ONB-05 | MacroTarget được tự động tạo sau onboarding step 2 |
| FR-ONB-06 | Onboarding có thể resume nếu user thoát giữa chừng |

### Acceptance Criteria bổ sung

| # | Given | When | Then |
|---|-------|------|------|
| AC-ONB-01 | User đăng ký mới | Login lần đầu | Redirect /onboarding; không vào /diet |
| AC-ONB-02 | User nhập height=170, weight=65, age=25, goal=WEIGHT_LOSS | Complete step 2 | MacroTarget tự động tạo; intakeStatus tính được ngay |
| AC-ONB-03 | User skip onboarding | Vào /diet | Banner "Hoàn thiện hồ sơ để theo dõi chính xác hơn" |
| AC-ONB-04 | User quay lại onboarding từ banner | Click banner | Resume từ bước còn dở |

### API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/profile/onboarding-status` | Kiểm tra user đã hoàn thành onboarding chưa |
| POST | `/profile/onboarding` | Submit body metrics + goal → tạo MacroTarget |

### Data Model

```sql
-- User bổ sung
height_cm INT,
weight_kg DECIMAL,
age INT,
onboarding_completed_at TIMESTAMP  -- null = chưa hoàn thành
```

---

## ADD-02: Body Metric Logging

### Vấn đề thực tế

FR-16 (Progress Timeline) phụ thuộc vào `body_metrics` entity để vẽ chart cân nặng và tính `projected_completion`. Nhưng trong toàn bộ spec v3 không có:
- FR nào định nghĩa "Customer ghi cân nặng"
- API endpoint nào cho `POST /body-metrics`
- UI component nào cho việc này
- Business rule về tần suất ghi (ngày/tuần?)

Kết quả: FR-16 hoàn toàn không hoạt động được.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| BM-01 | Customer ghi body metric: weight_kg bắt buộc; body_fat_percent, muscle_mass optional |
| BM-02 | Tối thiểu 1 lần/tuần để progress timeline có ý nghĩa (gợi ý, không bắt buộc) |
| BM-03 | Không cho phép ghi cân nặng trong tương lai (date ≤ today) |
| BM-04 | PT xem body metric của client ACTIVE |
| BM-05 | Regression alert: weight tăng ≥ 0.5kg so với lần ghi trước, 2 lần liên tiếp, goal=WEIGHT_LOSS |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-BM-01 | `POST /body-metrics` — ghi cân nặng + optional metrics |
| FR-BM-02 | `GET /body-metrics` — lịch sử của user hiện tại |
| FR-BM-03 | `GET /workspace/clients/{id}/body-metrics` — PT xem lịch sử client |
| FR-BM-04 | Nhắc ghi cân nặng hàng tuần (WS hoặc in-app banner, opt-out được) |
| FR-BM-05 | Quick-log widget trên Profile page: "Ghi cân hôm nay" |

### Acceptance Criteria bổ sung

| # | Given | When | Then |
|---|-------|------|------|
| AC-BM-01 | User ghi weight=63kg | POST body-metrics | Lưu với timestamp; chart progress cập nhật |
| AC-BM-02 | User ghi date = ngày mai | POST body-metrics | 400 date must not be future |
| AC-BM-03 | Weight tăng 0.6kg 2 lần liên tiếp, goal=WEIGHT_LOSS | Log | Regression alert FE + WS PT notify |
| AC-BM-04 | Chưa có MacroTarget | `projected_completion` | null; không hiển thị |

### API

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/body-metrics` | Ghi body metric mới |
| GET | `/body-metrics` | Lịch sử của user (pagination) |
| GET | `/workspace/clients/{id}/body-metrics` | PT xem client |

### Data Model

```sql
-- body_metrics (bổ sung fields còn thiếu)
id, user_id FK,
measured_date DATE NOT NULL,
weight_kg DECIMAL NOT NULL,
body_fat_percent DECIMAL,    -- optional
muscle_mass_kg DECIMAL,      -- optional
note TEXT,
created_at TIMESTAMP
-- UNIQUE(user_id, measured_date) -- một ngày một lần
```

---

## ADD-03: Chat Context Linking

### Vấn đề thực tế

Chat hiện tại: FR-9 — thread theo `mappingId`, gửi text/ảnh. Trong coaching thực tế:

**Tình huống 1:** Customer hỏi "Hôm nay tôi ăn phở được không?" — PT không biết customer đang ở ngày mấy của plan, hôm nay đã ăn gì, còn bao nhiêu macro → trả lời mò.

**Tình huống 2:** PT thấy log bất thường muốn hỏi ngay trong context của log đó — phải thoát sang chat, không có link.

**Tình huống 3:** PT muốn gửi file PDF chế độ ăn tham khảo — không có attachment ngoài ảnh.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| CHAT-01 | Message có thể gắn `context` optional: `{ type: DIET_LOG | MEAL_PLAN | APPOINTMENT, refId }` |
| CHAT-02 | Context message hiển thị preview card (không phải link text) |
| CHAT-03 | PT workspace: nút "Hỏi qua chat" trên diet log review → mở chat với context logId |
| CHAT-04 | File attachment: PDF ≤ 5MB; không cho phép exe, zip |
| CHAT-05 | Chat hiển thị daily macro summary của client dạng sidebar (PT side) |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-CHAT-01 | Message payload: `{ content, type, contextType?, contextRefId?, attachmentUrl? }` |
| FR-CHAT-02 | FE render context card: click → navigate đến log/plan/appointment |
| FR-CHAT-03 | PT workspace: "Quick chat" button trên log row |
| FR-CHAT-04 | PT chat sidebar: hiển thị hôm nay client ăn bao nhiêu calories vs target |
| FR-CHAT-05 | Upload file PDF trong chat → MinIO `chat-attachments/` → URL trong message |

### Data Model

```sql
-- chat_messages bổ sung
context_type VARCHAR,    -- DIET_LOG | MEAL_PLAN | APPOINTMENT | null
context_ref_id BIGINT,   -- FK tương ứng
attachment_url TEXT      -- MinIO URL nếu có file
```

---

## ADD-04: Marketplace Goal Compatibility

### Vấn đề thực tế

Customer mang thai muốn tìm PT có kinh nghiệm với bà bầu → hiện tại chỉ filter theo rating và specialization (text). Không có cách nào biết PT đó đã từng coach ai có goal PREGNANT chưa.

Customer ăn chay muốn PT quen với chế độ VEGAN → không filter được.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| MKT-01 | PT profile có `preferred_goals[]`: goals PT có kinh nghiệm (WEIGHT_LOSS, PREGNANT, etc.) |
| MKT-02 | PT profile có `preferred_diet_types[]`: diet PT quen (VEGAN, KETO, etc.) |
| MKT-03 | Marketplace filter: customer chọn goal/diet → chỉ hiển thị PT có field tương ứng |
| MKT-04 | Marketplace card PT hiển thị badge goal/diet nếu match với customer profile |
| MKT-05 | Sort option: "Phù hợp nhất" = sort theo số field match với customer profile |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-MKT-01 | PT onboarding thêm bước: chọn `preferred_goals[]` + `preferred_diet_types[]` |
| FR-MKT-02 | `GET /marketplace/pts` thêm params: `goalFilter`, `dietFilter` |
| FR-MKT-03 | Marketplace card: badge "Phù hợp với mục tiêu bạn" nếu match |
| FR-MKT-04 | Sort `?sort=compatibility` — ưu tiên PT match goal + diet của customer |

### Acceptance Criteria bổ sung

| # | Given | When | Then |
|---|-------|------|------|
| AC-MKT-01 | Customer goal=PREGNANT, filter PREGNANT | Marketplace | Chỉ PT có preferred_goals chứa PREGNANT |
| AC-MKT-02 | Customer VEGETARIAN, sort=compatibility | Marketplace | PT có VEGETARIAN trong preferred_diet_types lên đầu |

### Data Model

```sql
-- pt_profiles bổ sung
preferred_goals TEXT[],       -- WEIGHT_LOSS, WEIGHT_GAIN, PREGNANT, RECOVERY, MAINTAIN
preferred_diet_types TEXT[]   -- VEGAN, VEGETARIAN, KETO, EAT_CLEAN
```

---

## ADD-05: SOS SLA & Escalation

### Vấn đề thực tế

SOS hiện tại: customer tạo → admin assign PT → PT resolve. Không có:
- Thời hạn PT phải resolve (SLA)
- Escalation nếu PT không phản hồi
- Kết quả cụ thể customer nhận được sau resolve (chỉ "đóng ticket")
- Link giữa SOS resolution và diet log gốc

Nếu PT không trả lời trong 3 ngày → customer không biết, admin không biết, không có gì xảy ra.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| SOS-04 | SLA: PT phải phản hồi (không cần resolve) trong **4 giờ** từ khi assign |
| SOS-05 | SLA: PT phải resolve trong **24 giờ** từ khi assign |
| SOS-06 | Breach SLA-4h: reminder WS đến PT + email |
| SOS-07 | Breach SLA-24h: admin nhận cảnh báo `SOS_ESCALATED`; admin có thể reassign |
| SOS-08 | SOS resolve phải có `resolution_note` (text, min 20 ký tự) |
| SOS-09 | Customer nhận notification + xem `resolution_note` sau khi PT resolve |
| SOS-10 | SOS ticket lưu `diet_log_id` gốc; resolve page PT thấy log đó |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-SOS-01 | Admin SOS page: hiển thị SLA timer countdown per ticket |
| FR-SOS-02 | PT resolve form: bắt buộc `resolution_note` ≥ 20 ký tự |
| FR-SOS-03 | Customer SOS status: OPEN / IN_PROGRESS / RESOLVED; xem resolution_note |
| FR-SOS-04 | Admin escalation inbox: list SOS quá SLA-24h |
| FR-SOS-05 | SOS resolve page PT: hiển thị diet log gốc kèm theo |

### Data Model

```sql
-- sos_tickets bổ sung
assigned_at TIMESTAMP,
first_response_at TIMESTAMP,   -- PT gửi tin nhắn đầu tiên
resolved_at TIMESTAMP,
resolution_note TEXT,
sla_breached BOOLEAN,
escalation_count INT DEFAULT 0
```

---

## ADD-06: Notification System Spec

### Vấn đề thực tế

v3 có nhiều WS events nhưng không có spec cho:
- **In-app notification center:** user xem tất cả thông báo chưa đọc ở đâu?
- **Email vs WS:** khi nào dùng email, khi nào chỉ WS? Khi user offline thì thông báo WS mất đi?
- **Notification preferences:** user tắt được gì?
- **Badge count:** red badge trên icon notification

Hệ quả: user nhận WS toast khi đang online, mất thông báo khi offline — coaching experience bị gián đoạn.

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| NOTIF-01 | Tất cả WS events tạo `Notification` record trong DB (kể cả khi user offline) |
| NOTIF-02 | User online: WS push ngay; user offline: notification lưu, đọc khi login |
| NOTIF-03 | Email gửi khi: PT approve/reject hire, refund approved/rejected, SOS resolved, PT gửi weekly summary |
| NOTIF-04 | Email không gửi cho: CHAT_MESSAGE, DIET_LOG_UPDATE, intake status (too frequent) |
| NOTIF-05 | Badge count = số notification `is_read=false` |
| NOTIF-06 | Mark all read: `PUT /notifications/read-all` |
| NOTIF-07 | Notification preferences (user toggle): weekly_summary_email, hire_result_email, sos_result_email |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-NOTIF-01 | `GET /notifications` — danh sách thông báo của user (pagination, filter read/unread) |
| FR-NOTIF-02 | `PUT /notifications/{id}/read` — mark đã đọc |
| FR-NOTIF-03 | `PUT /notifications/read-all` |
| FR-NOTIF-04 | Badge count trong navbar (FE: subscribe WS + fetch unread count on login) |
| FR-NOTIF-05 | Notification item: icon loại + title + time + link navigate |
| FR-NOTIF-06 | Email service: gửi khi `HIRE_RESULT`, `REFUND_RESULT`, `SOS_RESOLVED`, `WEEKLY_SUMMARY` |

### Data Model

```sql
-- notifications (mới)
id, user_id FK,
type VARCHAR,           -- HIRE_RESULT | REFUND_UPDATE | SOS_RESOLVED | WEEKLY_SUMMARY |
                        -- PT_CLIENT_ALERT | DIET_LOG_REVIEWED | APPOINTMENT_UPDATE | ...
title VARCHAR,
body TEXT,
is_read BOOLEAN DEFAULT false,
link_type VARCHAR,      -- DIET_LOG | APPOINTMENT | REFUND | MEAL_PLAN | ...
link_ref_id BIGINT,
created_at TIMESTAMP
```

### WS event bổ sung

| Event | Mô tả |
|-------|-------|
| `NOTIFICATION_COUNT` | Gửi khi có notification mới → FE cập nhật badge |
| `SOS_ESCALATED` | Admin: ticket quá SLA-24h |

---

## ADD-07: PT Coaching Lifecycle

### Vấn đề thực tế

`PtClientMapping` có status PENDING → ACTIVE → INACTIVE. Nhưng:

**Tình huống 1:** PT và customer thống nhất coaching 8 tuần → tuần 8 kết thúc bình thường → không có flow. Mapping vẫn ACTIVE mãi mãi.

**Tình huống 2:** Customer muốn đổi PT sau 1 tháng → không biết có hire PT mới khi đang ACTIVE với PT cũ không? (Spec không nói rõ, chỉ nói "Hire duplicate → lỗi" nhưng không định nghĩa duplicate là gì — cùng PT hay bất kỳ PT nào đang ACTIVE?)

**Tình huống 3:** Sau mapping INACTIVE — lịch sử diet logs, meal plans, weekly summaries còn truy cập được không?

### Business Rules bổ sung

| Rule | Mô tả |
|------|--------|
| LIFE-01 | Customer chỉ có **1 mapping ACTIVE** tại một thời điểm |
| LIFE-02 | "Hire duplicate" = customer đã có mapping ACTIVE với bất kỳ PT nào → 400 |
| LIFE-03 | Customer muốn đổi PT → phải kết thúc mapping hiện tại trước |
| LIFE-04 | Kết thúc coaching bình thường: PT hoặc customer gửi `END_COACHING` request → cả hai confirm → COMPLETED |
| LIFE-05 | Status `COMPLETED` ≠ `INACTIVE` (bị refund): `COMPLETED` = bình thường, `INACTIVE` = bị terminate |
| LIFE-06 | Sau `COMPLETED`: lịch sử diet logs, meal plans, weekly summaries vẫn xem được (read-only) |
| LIFE-07 | Sau `INACTIVE` (refund): PT không thấy data client; customer vẫn thấy lịch sử của mình |
| LIFE-08 | Customer sau `COMPLETED` có thể hire lại cùng PT → tạo mapping mới |
| LIFE-09 | PT có thể có tối đa `max_clients` client ACTIVE cùng lúc (PT tự set, default 10) |

### Functional Requirements bổ sung

| ID | Requirement |
|----|-------------|
| FR-LIFE-01 | Customer Profile: button "Kết thúc coaching" → confirm modal |
| FR-LIFE-02 | PT workspace: button "Kết thúc coaching" với client → confirm modal |
| FR-LIFE-03 | Cả hai phía confirm → mapping `COMPLETED` |
| FR-LIFE-04 | Nếu chỉ 1 phía gửi → status `END_REQUESTED`; bên kia nhận notification confirm |
| FR-LIFE-05 | Customer Profile: xem lịch sử coaching cũ (COMPLETED) — read-only |
| FR-LIFE-06 | PT Profile setup: `max_clients` (1–20, default 10) |
| FR-LIFE-07 | Marketplace: hiển thị PT còn slot không (`current_clients < max_clients`) |

### Data Model

```sql
-- pt_client_mappings bổ sung
status VARCHAR,   -- PENDING | ACTIVE | END_REQUESTED | COMPLETED | INACTIVE
end_requested_by VARCHAR,   -- CUSTOMER | PT
end_requested_at TIMESTAMP,
completed_at TIMESTAMP,
termination_reason VARCHAR   -- REFUND | NORMAL_COMPLETION | ADMIN_FORCE
```

```sql
-- pt_profiles bổ sung
max_clients INT DEFAULT 10
```

### Acceptance Criteria bổ sung

| # | Given | When | Then |
|---|-------|------|------|
| AC-LIFE-01 | Customer đang ACTIVE với PT A | Hire PT B | 400 "Bạn đang có PT. Kết thúc coaching hiện tại trước." |
| AC-LIFE-02 | PT gửi kết thúc coaching | End request | Status=END_REQUESTED; customer nhận notification |
| AC-LIFE-03 | Customer confirm kết thúc | Confirm | Status=COMPLETED; history read-only; chat đóng |
| AC-LIFE-04 | Customer xem lịch sử sau COMPLETED | Profile → Lịch sử | Thấy meal plans, logs, weekly summaries của period đó |
| AC-LIFE-05 | PT đã đủ max_clients | Customer hire | Marketplace: badge "Hết chỗ"; hire → 400 |

---

## ADD-08: BR-17 Enforce

### Vấn đề

BR-17 phát biểu: *"PT alert chỉ gửi nếu client có PT ACTIVE và `reviewStatus=NOT_REQUIRED`"*. Nhưng v3 ghi nhận "chưa enforce trong control loop". Đây không phải vấn đề nhỏ:

**Scenario bug:** Customer log bữa ăn lớn → vượt macro → `suggestSubmitToPt=true` → customer submit → `reviewStatus=PENDING`. Sau đó customer log thêm bữa nữa → control loop tính lại → vẫn OVER → gửi PT alert. PT nhận 2 thông báo: (1) log pending review, (2) client AT_RISK. Đây là spam và confusing.

### Fix spec

**BR-17 (enforce):**

```
IntakeControlLoopService.sendPtAlert() chỉ gửi WS PT_CLIENT_ALERT khi:
  1. Client có PtClientMapping.status = ACTIVE
  2. Không có log PENDING review trong ngày hôm đó (reviewStatus=PENDING)
  3. Chưa gửi alert trong 24h (debounce — đã có LOOP-07)
  4. intakeStatus IN (AT_RISK, OVER_MACRO, UNDER_INTAKE)

Lý do: nếu đã có log PENDING review → PT đã được thông báo qua review queue.
Hai kênh (alert + review) không cần duplicate.
```

### Acceptance Criteria bổ sung

| # | Given | When | Then |
|---|-------|------|------|
| AC-BR17-01 | Client có log PENDING review hôm nay | Control loop trigger | Không gửi PT_CLIENT_ALERT |
| AC-BR17-02 | Client không có log PENDING, AT_RISK | Control loop trigger | Gửi PT_CLIENT_ALERT |
| AC-BR17-03 | Client submit log → PT review queue | Sau submit | PT thấy pending review; không nhận thêm alert |

---

## Bảng tổng hợp priority

| # | Add-on | Lý do thực tiễn | Priority | Effort | Status |
|---|--------|-----------------|----------|--------|--------|
| ADD-01 | Customer Onboarding | MacroTarget null → control loop vô nghĩa; retention 0 | **P0** | Medium | **Done** |
| ADD-02 | Body Metric Logging | FR-16 Progress Timeline không hoạt động nếu thiếu | **P0** | Low | **Done** |
| ADD-08 | BR-17 Enforce | Bug double alert sẽ xảy ra khi dùng thực tế | **P0** | Low | **Done** |
| ADD-07 | PT Coaching Lifecycle | COMPLETED vs INACTIVE chưa rõ; 1 mapping ACTIVE rule chưa spec | **P1** | Medium | **Done** |
| ADD-06 | Notification System | WS mất khi offline; không có notification center | **P1** | Medium | **Done** |
| ADD-05 | SOS SLA & Escalation | Ticket không có SLA = không ai biết có bị bỏ quên không | **P1** | Low | **Done** |
| ADD-03 | Chat Context Linking | PT trả lời mò không có ngữ cảnh coaching | **P2** | Low | **Done** |
| ADD-04 | Marketplace Goal Filter | Customer không filter được PT phù hợp goal | **P2** | Low | **Done** |

---

## Traceability bổ sung

| Add-on FR | Business Rule | Workflow | AC |
|-----------|--------------|----------|----|
| FR-ONB-01–06 | ONB-01–06 | WF-D mở rộng | AC-ONB-01–04 |
| FR-BM-01–05 | BM-01–05 | WF-C mở rộng | AC-BM-01–04 |
| FR-CHAT-01–05 | CHAT-01–05 | WF-C mở rộng | — |
| FR-MKT-01–04 | MKT-01–05 | WF-D mở rộng | AC-MKT-01–02 |
| FR-SOS-01–05 | SOS-04–10 | WF-G mở rộng | — |
| FR-NOTIF-01–06 | NOTIF-01–07 | Tất cả WF | — |
| FR-LIFE-01–07 | LIFE-01–09 | WF-C, WF-E | AC-LIFE-01–05 |
| BR-17 enforce | LOOP-07 + BR-17 | WF-A | AC-BR17-01–03 |

---

*NutriCan PT Gap Addendum v3.1 — Dùng kèm với NUTRICAN_PT_MASTER_SPEC_v3.md. Không thay thế v3, bổ sung trên v3.*

**Test coverage:** xem [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md) bảng ADD-01..08 (Happy/Bad/BE/Playwright/Manual).
