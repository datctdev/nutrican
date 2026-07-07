# NutriCan PT — Master Specification v2.0

> **Phiên bản:** 2.0 — Tích hợp feedback mentor + nâng cấp chuẩn doanh nghiệp  
> **Ngày spec:** 2026-07-05 · **Đối chiếu code:** 2026-07-07  
> **Scope:** Logic nghiệp vụ v2 (lõi). **Tính năng v3 + Addendum v3.1:** xem [`NUTRICAN_PT_MASTER_SPEC_v3.md`](./NUTRICAN_PT_MASTER_SPEC_v3.md) và [`NUTRICAN_PT_GAP_ADDENDUM_v3_1.md`](./NUTRICAN_PT_GAP_ADDENDUM_v3_1.md).  
> **Cơ sở:** `PRODUCT_REQUIREMENTS_SUMMARY.md` (v1) + Feedback mentor (2026-07-05)

### Trạng thái triển khai (as-of 2026-07-07)

> **v2 epic** — bảng dưới. **v3 gaps A–K + ADD-01..08** → [Master Spec v3 — Trạng thái triển khai](./NUTRICAN_PT_MASTER_SPEC_v3.md#trạng-thái-triển-khai-as-of-2026-07-07).

| Epic mentor / AC | Code | Ghi chú |
|----------------|------|---------|
| GATE-01 food gate | **Done** | `FoodGateService.preCheck()` ResNet-only **trước** LLaVA (`FoodGateServiceImpl`, `MealAnalysisServiceImpl`) |
| `MANUAL_REQUIRED` | **Done** | `DietLogStatus.MANUAL_REQUIRED` khi `OUT_OF_CLASS` |
| eKYC toggle, CV/cert, gender, resubmit PT | **Done** | `SystemSettingController`, `KycPage`, `PtVerificationPage` |
| Allergy + meal plan + appointment + refund | **Done** | BE + FE; admin CRUD FE `/admin/allergens` → API `/admin/allergen-mappings` |
| Macro goal (không AI lộ trình) | **Done** | `GET /profile/macro-suggestion`; không có endpoint sinh bảng ăn |
| PT review dual-state | **Drift** | `status=LOGGED` + `reviewStatus` — không dùng `PT_REVIEWING` trên `status` |
| Confirm → summary | **Fixed (GAP-01)** | `confirmRecognition` → `status=LOGGED`; summary tính ngay |
| Refund WS realtime | **Done** | BE `REFUND_UPDATE`; FE `websocketService.js` + reload Profile/RefundReview |
| GATE-01 binary LLaVA | **Partial** | Spec gợi ý LLaVA yes/no; code dùng ResNet confidence + manifest 199 class |
| Mapping terminate | **Drift** | Code: `ClientMappingStatus.INACTIVE` (tương đương nghiệp vụ TERMINATED) |

**Tests (full stack 2026-07-07):** **120** BE (`./mvnw test`) · Playwright **22** spec / **58** cases · Ma trận: [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md) · Onboarding: [`TEAM_ONBOARDING.md`](./TEAM_ONBOARDING.md)

---

## Mục lục

1. [Tầm nhìn & Phạm vi](#1-tầm-nhìn--phạm-vi)
2. [Stakeholders & Personas](#2-stakeholders--personas)
3. [Danh sách thay đổi so với v1](#3-danh-sách-thay-đổi-so-với-v1)
4. [Product Requirements (PRD)](#4-product-requirements-prd)
5. [Business Requirements (BRD)](#5-business-requirements-brd)
6. [Business Rules](#6-business-rules)
7. [Functional Requirements (FR)](#7-functional-requirements-fr)
8. [Workflows end-to-end](#8-workflows-end-to-end)
9. [Acceptance Criteria (AC)](#9-acceptance-criteria-ac)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Gap & Issue Backlog](#12-gap--issue-backlog)

---

## 1. Tầm nhìn & Phạm vi

### 1.1 Vision

**NutriCan PT** là nền tảng dinh dưỡng thông minh tích hợp AI: người dùng ghi nhận bữa ăn bằng ảnh, AI nhận diện món ăn và ước lượng macro, được **Personal Trainer (PT)** xác nhận và hỗ trợ lên kế hoạch dinh dưỡng cá nhân hóa — bao gồm cả các trường hợp đặc biệt (bà bầu, tăng/giảm cân, dị ứng thực phẩm).

### 1.2 Vấn đề giải quyết

| Pain Point | Giải pháp NutriCan PT v2 |
|------------|--------------------------|
| AI nhận diện sai món hoặc không trong 199 class | Gate check: kiểm tra food/non-food + in-class trước khi chạy pipeline |
| Khó lên kế hoạch ăn trong tuần | Meal plan 7 ngày theo macro target |
| Thiếu chế độ ăn theo mục tiêu đặc thù | Macro target theo goal: tăng/giảm cân, bà bầu, phục hồi |
| Không theo dõi được dị ứng thực phẩm | Food allergy profile + cảnh báo khi plan/log |
| Lịch hẹn PT phân tán | Appointment booking tích hợp trong app |
| Hồ sơ PT chưa đủ thông tin chuyên môn | Tách CV + Chứng chỉ; thêm ngày bắt đầu kinh nghiệm |
| Thiếu kiểm soát tiến độ học viên | Progress dashboard: cân nặng, macro trend, adherence rate |
| eKYC bắt buộc nhưng không linh hoạt | Admin toggle bật/tắt yêu cầu eKYC |
| Chưa có flow hoàn tiền | Refund workflow khi PT cancel/không đáp ứng SLA |
| Ăn mặn/chay không được phân loại | Diet preference: mặn / chay / eat-clean / keto |

### 1.3 Phạm vi IN / OUT

| IN (v2) | OUT |
|---------|-----|
| AI food gate check (food vs non-food, in-class check) | Mobile app native |
| Meal plan 7 ngày | Video call coaching |
| Food allergy profile | Đa ngôn ngữ (ngoài VI) |
| PT appointment scheduling | Production DB migration (cần riêng) |
| Macro target theo goal đặc thù | |
| Refund workflow (cancel/SLA breach) | |
| Diet preference (mặn/chay/keto) | |
| Admin toggle eKYC | |
| PT profile: tách CV + Chứng chỉ | |
| PT experience: start date thay vì số năm | |
| Bổ sung hồ sơ (sau reject) | |

---

## 2. Stakeholders & Personas

| Persona | Role hệ thống | Mục tiêu chính |
|---------|---------------|----------------|
| **Customer** | `CUSTOMER` | Log bữa ăn, xem macro vs target, lên meal plan, thuê PT |
| **PT Chứng nhận** | `PT_CERTIFIED` | Quản lý client, duyệt log, lên lịch hẹn, xử lý SOS |
| **PT Freelance** | `PT_FREELANCE` | Tương tự PT Certified, không có badge chứng nhận |
| **Admin** | `ADMIN` | Duyệt PT, toggle eKYC, quản user, assign SOS, xuất RBL |
| **Research** | Admin + PT | Thu cohort RBL, tính MAE A1.0 vs A1.1 |

---

## 3. Danh sách thay đổi so với v1

> Dựa trực tiếp trên **feedback mentor 2026-07-05**.

| # | Feedback Mentor | Thay đổi / Giải pháp |
|---|-----------------|----------------------|
| M-01 | Dọn dẹp hết roll (UI) | UI: loại bỏ toàn bộ `role` attribute, dùng `data-*` hoặc `aria-*` |
| M-02 | AI gate: có phải món ăn không? Có trong 199 class không? | Thêm FR-2.0: food/non-food gate + in-class pre-check |
| M-03 | Không phải thực phẩm → không chạy pipeline | Gate fail → reject ngay, không gọi ResNet/LLaVA |
| M-04 | Không nhận ra → đá về manual hoặc nhập tay | Gate pass nhưng confidence thấp → force manual fallback |
| M-05 | Admin bật/tắt eKYC | Thêm FR-7.5: Admin toggle eKYC requirement |
| M-06 | Kinh nghiệm PT: chọn tháng năm bắt đầu | PT profile: `experience_start_date` (month/year picker) |
| M-07 | Chứng chỉ ≠ CV, phải tách ra | PT profile: field riêng `certificates[]` vs `cv_file` |
| M-08 | Số lương không nhập âm | Validation: `hourly_rate >= 0`, `UNSIGNED` ở DB |
| M-09 | Thiếu giới tính PT | PT profile: thêm field `gender` (MALE/FEMALE/OTHER) |
| M-10 | Duyệt PT xem hồ sơ phải thấy freelance và certified | Admin PT review page: hiển thị badge loại, tab filter |
| M-11 | Thiếu bổ sung hồ sơ (sau reject) | Thêm FR-8.3: PT resubmit sau REJECT, không tạo profile mới |
| M-12 | Dị ứng món ăn | Thêm FR-10: Food Allergy Profile |
| M-13 | Lên thực đơn 1 tuần | Thêm FR-11: Weekly Meal Plan |
| M-14 | Lịch hẹn PT | Thêm FR-12: PT Appointment Scheduling |
| M-15 | Chỗ ăn mặn/ăn chay | Thêm field `diet_preference` trong User profile |
| M-16 | Luồng kiểm soát, hoàn tiền | Thêm FR-13: Payment & Refund Workflow |
| M-17 | Tiến độ theo dõi học viên | Mở rộng FR-4.7: Progress Dashboard |
| M-18 | Mục tiêu tăng/giảm cân, macro target đặc thù (bà bầu...) | Thêm FR-14: Goal-based Macro Target |

---

## 4. Product Requirements (PRD)

### 4.1 Epic Map v2

| Epic | Mô tả | Priority |
|------|-------|----------|
| **E1 — Identity** | Auth, profile, diet preference, gender | P0 |
| **E2 — Diet Intelligence** | AI gate, log, confirm, summary, allergy check | P0 |
| **E3 — PT Coaching** | Workspace, review, appointment, progress | P1 |
| **E4 — Trust & Safety** | KYC toggle, PT onboarding, resubmit, refund | P1 |
| **E5 — Meal Planning** | Weekly plan, macro target goal-based | P1 |
| **E6 — Research (RBL)** | Snapshot, blind estimate, CSV export | P2 |

### 4.2 User Stories

#### E1 — Identity
- Là customer, tôi đăng ký với email/password và khai báo giới tính, sở thích ăn uống (mặn/chay/keto/eat-clean).
- Là customer, tôi cập nhật dị ứng thực phẩm của mình trong profile.
- Là user, tôi đăng nhập Google và đặt mật khẩu lần đầu.

#### E2 — Diet Intelligence
- Là customer, tôi chụp ảnh bữa ăn; nếu ảnh không phải thực phẩm, app thông báo ngay và không chạy AI.
- Là customer, tôi chụp ảnh món ăn ngoài 199 class; app gợi ý nhập tay thay vì cho kết quả sai.
- Là customer, tôi nhập tay bữa ăn khi không muốn/không thể chụp ảnh.
- Là customer có dị ứng, tôi nhận cảnh báo khi log món ăn chứa thành phần dị ứng.
- Là customer, tôi xem tổng macro ngày so với target cá nhân hóa theo mục tiêu.

#### E3 — PT Coaching
- Là customer, tôi đặt lịch hẹn với PT trực tiếp trong app.
- Là PT, tôi xem lịch hẹn sắp tới và confirm/cancel.
- Là PT, tôi xem tiến độ từng client (cân nặng, adherence, macro trend).
- Là customer, tôi xem lịch thực đơn 1 tuần PT lên cho mình.

#### E4 — Trust & Safety
- Là PT bị reject, tôi bổ sung hồ sơ và gửi lại mà không cần tạo account mới.
- Là admin, tôi bật/tắt yêu cầu eKYC cho PT đăng ký.
- Là customer, tôi yêu cầu hoàn tiền khi PT không đáp ứng SLA.

#### E5 — Meal Planning
- Là customer, tôi thiết lập mục tiêu (tăng cân / giảm cân / duy trì / bà bầu) và nhận macro target tương ứng.
- Là PT, tôi lên thực đơn 7 ngày cho client và gắn ghi chú dinh dưỡng.
- Là customer, tôi xem thực đơn tuần, mark đã ăn và theo dõi adherence.

### 4.3 Product Goals (đo lường)

| Goal | Metric | Target |
|------|--------|--------|
| AI gate accuracy | Non-food rejection rate | ≥ 95% |
| AI gate accuracy | Out-of-class detection rate | ≥ 80% |
| Nhận diện VN core | Top-1 (VTN-10) | ~68% |
| Nhận diện unified | Top-1 (199-class) | ~44% |
| UX trust | User confirm trước summary | Modal bắt buộc |
| PT adherence | % client log ≥ 5 ngày/tuần | Hiển thị trên dashboard |
| Refund SLA | Phản hồi hoàn tiền trong | ≤ 72h |

---

## 5. Business Requirements (BRD)

### 5.1 Mục tiêu kinh doanh

1. **User value:** Theo dõi dinh dưỡng ít ma sát, AI đáng tin (có gate check), có PT khi cần.
2. **PT value:** Workspace tập trung, lịch hẹn, tiến độ client, không cần Excel.
3. **Platform value:** Marketplace PT–client; kiểm soát chất lượng PT; doanh thu qua hire fee.
4. **Research value:** Pipeline RBL đo lợi ích grounding DB so với AI fixed-macro.

### 5.2 Ràng buộc nghiệp vụ

| ID | Ràng buộc |
|----|-----------|
| BR-01 | Chỉ owner được CRUD diet log của mình |
| BR-02 | PT chỉ review log của client ACTIVE |
| BR-03 | Chat chỉ mở khi `PtClientMapping.status = ACTIVE` |
| BR-04 | PT cần admin approve trước khi role PT có hiệu lực |
| BR-05 | Macro hiển thị ưu tiên NutriHome × gram (A1.1) |
| BR-06 | `ai_predicted_macros` immutable sau analyze |
| BR-07 | User phải confirm món AI trước khi tính summary |
| BR-08 | **[NEW]** AI pipeline chỉ chạy khi ảnh pass food gate |
| BR-09 | **[NEW]** Lương PT (`hourly_rate`) không âm |
| BR-10 | **[NEW]** PT profile phải có `gender` trước khi đăng ký marketplace |
| BR-11 | **[NEW]** eKYC requirement có thể bật/tắt bởi Admin; mặc định BẬT |
| BR-12 | **[NEW]** PT resubmit không tạo `PtProfile` mới; cập nhật profile hiện tại |
| BR-13 | **[NEW]** Allergy check chạy tại: (a) confirm log, (b) PT lên meal plan |
| BR-14 | **[NEW]** Refund chỉ khởi tạo được trong 7 ngày kể từ ngày hire |

### 5.3 RBAC v2

| Hành động | CUSTOMER | PT | ADMIN |
|-----------|----------|----|-------|
| Analyze meal (sau gate) | ✅ | ❌ | ❌ |
| Food gate check | ✅ | ❌ | ❌ |
| Xem marketplace | ✅ | ❌ | ❌ |
| PT workspace | ❌ | ✅ | ❌ |
| Lên meal plan | ❌ | ✅ | ❌ |
| Đặt lịch hẹn | ✅ | ❌ | ❌ |
| Confirm/cancel lịch hẹn | ❌ | ✅ | ❌ |
| Toggle eKYC | ❌ | ❌ | ✅ |
| Verify PT | ❌ | ❌ | ✅ |
| Assign SOS | ❌ | ❌ | ✅ |
| RBL export | ❌ | ❌ | ✅ |
| Approve refund | ❌ | ❌ | ✅ |

---

## 6. Business Rules

### 6.1 Auth & Account

| Rule | Mô tả |
|------|--------|
| AUTH-01 | Email đăng ký phải unique |
| AUTH-02 | `SUSPENDED`, `PENDING_APPROVAL`, `PENDING_VERIFICATION`, `PENDING_PASSWORD` → chặn login |
| AUTH-03 | Refresh token HttpOnly; access token Bearer |
| AUTH-04 | Logout revoke token |
| AUTH-05 | Reset password token: one-time + expiry 15 phút |

### 6.2 Diet Log & Status

| Rule | Mô tả |
|------|--------|
| DIET-01 | Analyze (gate PASS) → status `DRAFT` |
| DIET-02 | Manual create → status `LOGGED` |
| DIET-03 | `DRAFT`, `MANUAL_REQUIRED`, hoặc `LOGGED` được `submitForReview` |
| DIET-04 | Summary chỉ cộng `APPROVED`, `LOGGED`, `PT_REVIEWING` |
| DIET-05 | `confirmRecognition` → `status=LOGGED`, `HYBRID` macros *(đã fix GAP-01)* |
| DIET-06 | Cancel modal → `deleteLog` |
| DIET-07 | Owner-only: view/edit/delete/submit |
| DIET-08 | Mỗi analyze 1 ảnh |
| **DIET-09** | **[NEW]** Ảnh phải pass `FoodGateService` trước khi vào pipeline ResNet |
| **DIET-10** | **[NEW]** Gate result `NOT_FOOD` → reject 400, không tạo DietLog |
| **DIET-11** | **[NEW]** Gate result `OUT_OF_CLASS` → tạo DietLog status `MANUAL_REQUIRED`, redirect nhập tay |
| **DIET-12** | **[NEW]** Nếu user có `allergy_profile`, chạy `AllergyCheckService` sau confirm |

### 6.3 Macro & AI

| Rule | Mô tả |
|------|--------|
| MACRO-01 | `macros_json` (UI) = NutriHome × `portionGrams` sau confirm |
| MACRO-02 | `ai_predicted_macros` = A1.0 fixed — không scale portion, immutable |
| MACRO-03 | `db_matched_macros` = NutriHome × gram thực tế (A1.1) |
| MACRO-04 | HOTPOT/COMPOSITE: macro = tổng `diet_log_items` |
| MACRO-05 | `recognitionSource=HYBRID` khi có DB match hoặc user confirm |
| MACRO-06 | Reliability < 0.90 → `needsConfirmation=true` |
| **MACRO-07** | **[NEW]** `OUT_OF_CLASS` gate → không có `ai_predicted_macros` snapshot |

### 6.4 Food Gate (MỚI)

| Rule | Mô tả |
|------|--------|
| GATE-01 | Gate check food/not-food + in-class *(triển khai: `preCheck` ResNet-only trước LLaVA; spec gốc gợi ý LLaVA nhanh hoặc classifier binary)* |
| GATE-02 | Nếu food: kiểm tra top-1 class có trong 199-class ResNet vocab không |
| GATE-03 | `NOT_FOOD` → trả lỗi `GATE_FAIL_NOT_FOOD`, không persist ảnh |
| GATE-04 | `OUT_OF_CLASS` → trả warning `GATE_WARN_OUT_OF_CLASS`, persist ảnh, mở manual form |
| GATE-05 | Gate pass → tiếp tục pipeline ResNet + LLaVA như WF-A cũ |
| GATE-06 | Gate check phải hoàn thành trong < 5s (SLA riêng) |

### 6.5 Dị ứng thực phẩm (MỚI)

| Rule | Mô tả |
|------|--------|
| ALLERGY-01 | User khai báo danh sách allergens (gluten, seafood, nut, dairy, egg, soy, other) |
| ALLERGY-02 | `AllergyCheckService` so khớp `foodCode` confirmed với `FoodAllergenMapping` |
| ALLERGY-03 | Match → warning banner trên UI, không block log |
| ALLERGY-04 | PT lên meal plan → check allergy toàn bộ plan; flag món có allergen |
| ALLERGY-05 | Allergen data: seed `FoodAllergenMappingInitializer` + admin CRUD `FoodAllergenMappingController` |

### 6.6 SOS

| Rule | Mô tả |
|------|--------|
| SOS-01 | `suggestSos=true` khi `mealSource≠HOME_COOKED` AND (confidence thấp OR no DB match) |
| SOS-02 | SOS không tự tạo — user chủ động |
| SOS-03 | Chỉ owner diet log được tạo SOS |

### 6.7 PT & Client

| Rule | Mô tả |
|------|--------|
| PT-01 | PT chỉ thấy pending logs của client ACTIVE |
| PT-02 | Review trên log có `reviewStatus=PENDING` *(implementation: `status` thường vẫn `LOGGED` — dual-state)* |
| PT-03 | `APPROVE`/`ADJUST` → `APPROVED` + lưu `pt_adjusted_macros` |
| PT-04 | `REJECT` → `REJECTED` — loại khỏi MAE research |
| PT-05 | Correction reason: WRONG_FOOD, WRONG_PORTION, WRONG_MACROS |
| PT-06 | Hire duplicate → lỗi "Client already assigned" |
| **PT-07** | **[NEW]** `hourly_rate >= 0`; reject nếu âm |
| **PT-08** | **[NEW]** `experience_start_date` thay thế `years_experience`; tính số năm tự động |
| **PT-09** | **[NEW]** PT profile phải có `gender` |
| **PT-10** | **[NEW]** PT bị REJECT được resubmit; cập nhật fields + set status `PENDING_APPROVAL` lại |
| **PT-11** | **[NEW]** Resubmit không tạo PtProfile mới; chỉ update record hiện tại |

### 6.8 Lịch hẹn (MỚI)

| Rule | Mô tả |
|------|--------|
| APT-01 | Customer chỉ đặt lịch với PT đang ACTIVE mapping |
| APT-02 | Slot tối thiểu 30 phút, tối đa 120 phút |
| APT-03 | PT confirm lịch trong 24h; quá hạn → auto EXPIRED |
| APT-04 | Cancel ≤ 24h trước lịch hẹn → không phát sinh refund |
| APT-05 | Cancel < 24h → trigger refund policy |
| APT-06 | PT không thể đặt 2 lịch hẹn overlap |

### 6.9 Hoàn tiền (MỚI)

| Rule | Mô tả |
|------|--------|
| REFUND-01 | Refund request chỉ trong 7 ngày kể từ ngày hire |
| REFUND-02 | Lý do: PT_CANCEL, PT_NO_RESPONSE, SLA_BREACH, CUSTOMER_REQUEST |
| REFUND-03 | Admin review và approve/reject refund |
| REFUND-04 | `PT_CANCEL` và `PT_NO_RESPONSE` → auto approve |
| REFUND-05 | `CUSTOMER_REQUEST` → admin manual review |
| REFUND-06 | Approved → mapping `INACTIVE` *(spec: TERMINATED)*; role PT không bị affect |

### 6.10 Meal Plan (MỚI)

| Rule | Mô tả |
|------|--------|
| PLAN-01 | PT lên meal plan 7 ngày cho client ACTIVE |
| PLAN-02 | Mỗi ngày: 3–6 bữa (breakfast, lunch, dinner, snack1, snack2, snack3) |
| PLAN-03 | Mỗi meal item trong plan gắn với `foodCode` hoặc text tự do |
| PLAN-04 | Tổng macro/ngày trong plan phải ≤ 110% macro target của client |
| PLAN-05 | Plan allergy-checked trước khi lưu; flag nhưng không block |
| PLAN-06 | Customer mark "đã ăn" trên từng meal → tính adherence rate |
| PLAN-07 | Plan version: mỗi tuần có thể có 1 plan; PT có thể revise |

### 6.11 Admin & KYC

| Rule | Mô tả |
|------|--------|
| ADM-01 | Verify PT: APPROVE_CERTIFIED → `PT_CERTIFIED`, APPROVE_FREELANCE → `PT_FREELANCE` |
| ADM-02 | Reject PT → status `REJECTED` (không phải SUSPENDED); ghi lý do reject |
| **ADM-03** | **[NEW]** `ekyc_required` là setting cấp platform; Admin toggle qua `/admin/settings` |
| **ADM-04** | **[NEW]** Khi `ekyc_required=false`, PT đăng ký bỏ qua bước KYC VNPT |
| KYC-01 | CV chỉ PDF/DOC, max 10MB |
| **KYC-02** | **[NEW]** Chứng chỉ (certificates): upload riêng, nhiều file, mỗi file ≤ 5MB, PDF/JPG/PNG |
| **KYC-03** | **[NEW]** CV và Chứng chỉ là 2 section tách biệt trong PT onboarding flow |

### 6.12 RBL Research

| Rule | Mô tả |
|------|--------|
| RBL-01 | Freeze `ai_predicted_macros`, `db_matched_macros` tại analyze |
| RBL-02 | `experimentCohort` theo mealSource + complexity + recognitionSource |
| RBL-03 | Ground truth = `pt_adjusted_macros` sau APPROVE/ADJUST |
| RBL-04 | `pt_blind_macros` ghi trước khi PT xem AI/DB |
| **RBL-05** | **[NEW]** `OUT_OF_CLASS` logs không tính vào RBL cohort |

### 6.13 Diet Preference & Goal (MỚI)

| Rule | Mô tả |
|------|--------|
| PREF-01 | `diet_preference`: NORMAL / VEGETARIAN / VEGAN / KETO / EAT_CLEAN |
| GOAL-01 | `nutrition_goal`: WEIGHT_LOSS / WEIGHT_GAIN / MAINTAIN / PREGNANT / RECOVERY |
| GOAL-02 | Macro target tự động gợi ý dựa trên goal + cân nặng + chiều cao + tuổi |
| GOAL-03 | PREGNANT → macro target theo trimester (1, 2, 3); PT confirm |
| GOAL-04 | Công thức gợi ý macro: Mifflin-St Jeor (BMR) × activity factor; PT có thể override |
| GOAL-05 | User có thể giữ macro target tự nhập; gợi ý chỉ là tham khảo |

---

## 7. Functional Requirements (FR)

### FR-1 Authentication & Profile

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-1.1 | Đăng ký customer (email, password, tên, `gender`, `diet_preference`) | `POST /auth/register` |
| FR-1.2 | Đăng nhập → JWT + refresh cookie | `POST /auth/login` |
| FR-1.3 | Google OAuth + set password lần đầu | `/auth/google`, `/set-password` |
| FR-1.4 | Quên/reset mật khẩu | `/forgot-password`, `/reset-password` |
| FR-1.5 | Xem/sửa profile, avatar | `GET/PUT /profile/me` |
| FR-1.6 | Cấu hình macro target ngày | `PUT /profile/macro-target` |
| **FR-1.7** | **[NEW]** Cập nhật `diet_preference` và `nutrition_goal` | `PUT /profile/preferences` |
| **FR-1.8** | **[NEW]** Quản lý allergy profile | `GET/PUT /profile/allergies` |

### FR-2 Diet Logging & AI

| ID | Requirement | API / UI |
|----|-------------|----------|
| **FR-2.0** | **[NEW]** Food Gate check trước khi analyze | `POST /diet/gate-check` (gọi nội bộ trong analyze) |
| FR-2.1 | Upload 1 ảnh → analyze | `POST /diet/logs/analyze` |
| FR-2.2 | Context: mealType, mealSource, mealComplexity | FormData fields |
| FR-2.3 | RESTAURANT bắt buộc `restaurantName` | BE validation |
| FR-2.4 | HOTPOT: broth + items + portions | `hotpotBrothId`, `hotpotItemIds[]` |
| FR-2.5 | COMPOSITE: nhiều món buffet | `compositeItemIds[]` |
| FR-2.6 | Trả top-3 predictions + reliability | `AnalyzeMealResponse` |
| FR-2.7 | User confirm `foodCode` + `portionGrams` | `PUT /confirm-recognition` |
| **FR-2.7a** | **[NEW]** Sau confirm, chạy allergy check | tích hợp trong `/confirm-recognition` |
| FR-2.8 | Submit log DRAFT → PT queue | `PUT /submit-for-review` |
| FR-2.9 | Manual log không qua AI | `POST /diet/logs` |
| FR-2.10 | Daily summary vs macro target | `GET /diet/summary` |
| FR-2.11 | Search food / list 199 ResNet dishes | `GET /foods/search` |
| FR-2.12 | Multi-image trên 1 log | `/logs/{id}/images/*` |
| **FR-2.13** | **[NEW]** Gate fail: hiển thị lý do và fallback options | UI toast + redirect |

### FR-3 AI Pipeline (Backend)

| ID | Requirement | Component |
|----|-------------|-----------|
| **FR-3.0** | **[NEW]** `FoodGateService`: binary food/not-food + in-class check | `FoodGateServiceImpl` |
| FR-3.1 | ResNet inference 199 class | `ResNetFoodRecognitionClientImpl` |
| FR-3.2 | LLaVA qua Ollama (optional) | `LlavaMealAnalysisServiceImpl` |
| FR-3.3 | Fusion ResNet + LLaVA | `MealAnalysisFusion` |
| FR-3.4 | Macro A1.0 fixed serving | `A1_0FixedMacros` |
| FR-3.5 | Macro A1.1 DB × portion | `DietLogHelper.macrosForFood` |
| FR-3.6 | `needsConfirmation` nếu reliability < 90% | `AUTO_ACCEPT_RELIABILITY=0.90` |

### FR-4 PT Workspace

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-4.1 | Dashboard stats (clients, pending, SOS) | `GET /workspace/stats` |
| FR-4.2 | Danh sách client + trạng thái log hôm nay | `GET /workspace/clients` |
| FR-4.3 | Accept/reject hire request | `PUT /workspace/clients/{id}/hire-request` |
| FR-4.4 | Danh sách logs cần review | `GET /workspace/pending-logs` |
| FR-4.5 | Review: APPROVE / ADJUST / REJECT | `PUT /workspace/diet-logs/{id}/review` |
| FR-4.6 | Blind macro estimate (RBL) | `PUT /blind-estimate` |
| FR-4.7 | **[EXPANDED]** Client progress dashboard: cân nặng trend, macro adherence, meal plan adherence rate | `GET /workspace/progress/{clientId}` |
| FR-4.8 | Resolve SOS | `PUT /workspace/sos/{id}/resolve` |
| **FR-4.9** | **[NEW]** Lên meal plan 7 ngày cho client | `POST /workspace/meal-plans` |
| **FR-4.10** | **[NEW]** Xem và edit meal plan hiện tại của client | `GET/PUT /workspace/meal-plans/{clientId}` |
| **FR-4.11** | **[NEW]** Xem lịch hẹn của mình | `GET /workspace/appointments` |
| **FR-4.12** | **[NEW]** Confirm / Cancel lịch hẹn | `PUT /workspace/appointments/{id}` |

### FR-5 Marketplace

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-5.1 | Tìm PT (filter: loại, rating, chuyên môn) | `GET /marketplace/pts` |
| FR-5.2 | Xem profile PT: bio, `experience_start_date`, `certificates`, reviews, `gender` | `/pt-profile/:id` |
| FR-5.3 | Gửi hire request | `POST /marketplace/pts/{id}/hire` |
| FR-5.4 | Đánh giá PT (1–5 sao) | `POST /marketplace/pts/{id}/reviews` |
| **FR-5.5** | **[NEW]** Đặt lịch hẹn với PT | `POST /marketplace/pts/{id}/appointments` |

### FR-6 SOS

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-6.1 | Customer tạo SOS gắn diet log | `POST /diet/sos` |
| FR-6.2 | Gợi ý SOS khi ăn ngoài + AI/DB yếu | `suggestSos` trong analyze response |
| FR-6.3 | Admin assign PT | `PUT /admin/sos-tickets/{id}/assign` |
| FR-6.4 | PT resolve | `PUT /workspace/sos/{id}/resolve` |

### FR-7 Admin

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-7.1 | Platform stats | `GET /admin/stats` |
| FR-7.2 | User list + đổi status | `/admin/users` |
| FR-7.3 | Duyệt PT: xem CV, Chứng chỉ, loại (CERTIFIED/FREELANCE), filter | `/admin/pts` |
| FR-7.4 | RBL CSV export + MAE stats | `/admin/rbl/*` |
| **FR-7.5** | **[NEW]** Toggle eKYC requirement | `PUT /admin/settings/ekyc-required` |
| **FR-7.6** | **[NEW]** Quản lý refund requests | `GET/PUT /admin/refunds` |
| **FR-7.7** | **[NEW]** Quản lý allergen data cho food catalog | `POST/PUT /admin/food-allergens` |

### FR-8 KYC & PT Onboarding

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-8.1 | eKYC session VNPT (CCCD + selfie) — bỏ qua nếu admin tắt | `/kyc/sessions/*` |
| FR-8.2 | Đăng ký PT: upload CV riêng (PDF/DOC ≤10MB) | `POST /profile/pt/register` |
| **FR-8.2a** | **[NEW]** Upload Chứng chỉ riêng: nhiều file, PDF/JPG/PNG ≤5MB/file | `POST /profile/pt/certificates` |
| **FR-8.3** | **[NEW]** PT resubmit hồ sơ sau REJECT | `PUT /profile/pt/resubmit` |
| **FR-8.4** | **[NEW]** PT profile có `gender`, `experience_start_date`, `hourly_rate ≥ 0` | validation |

### FR-9 Chat & Realtime

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-9.1 | Thread theo `mappingId` | `GET /chat/threads` |
| FR-9.2 | Gửi text (≤2000 ký tự) hoặc ảnh | `POST messages` |
| FR-9.3 | WebSocket notify | `/ws/workspace?token=` |

### FR-10 Food Allergy Profile (MỚI)

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-10.1 | Khai báo danh sách allergens | `PUT /profile/allergies` |
| FR-10.2 | Allergen categories: GLUTEN, SEAFOOD, NUT, DAIRY, EGG, SOY, OTHER | enum |
| FR-10.3 | Warning khi confirm log có allergen | UI warning banner, không block |
| FR-10.4 | Danh sách food → allergen mapping (admin managed) | `FoodAllergenMapping` table |

### FR-11 Weekly Meal Plan (MỚI)

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-11.1 | PT tạo meal plan 7 ngày cho client | `POST /workspace/meal-plans` |
| FR-11.2 | Mỗi ngày: 3–6 bữa, mỗi bữa có `foodCode` hoặc text + gram + ghi chú | MealPlanItem entity |
| FR-11.3 | Tính macro/ngày trong plan; hiển thị vs target | FE summary card |
| FR-11.4 | Allergy check toàn plan trước khi save | `AllergyCheckService.checkPlan` |
| FR-11.5 | Customer xem plan theo tuần | `GET /meal-plans/current` |
| FR-11.6 | Customer mark "đã ăn" từng meal item | `PUT /meal-plans/items/{id}/eaten` |
| FR-11.7 | Adherence rate = (items eaten / total items) × 100% | tính BE, hiển thị FE |

### FR-12 PT Appointment Scheduling (MỚI)

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-12.1 | Customer chọn slot từ PT availability | `GET /workspace/appointments/availability/{ptId}` |
| FR-12.2 | Đặt lịch hẹn (type: ONLINE / IN_PERSON, note) | `POST /appointments` |
| FR-12.3 | PT confirm hoặc cancel | `PUT /workspace/appointments/{id}` |
| FR-12.4 | Notification khi PT confirm/cancel | WS + email |
| FR-12.5 | PT khai báo availability (khung giờ rảnh trong tuần) | `PUT /workspace/availability` |
| FR-12.6 | Customer xem lịch hẹn sắp tới | `GET /appointments/upcoming` |

### FR-13 Payment & Refund Workflow (MỚI)

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-13.1 | Customer yêu cầu refund (trong 7 ngày từ hire) | `POST /refunds` |
| FR-13.2 | Lý do refund: PT_CANCEL, PT_NO_RESPONSE, SLA_BREACH, CUSTOMER_REQUEST | enum |
| FR-13.3 | Admin xem danh sách refund requests | `GET /admin/refunds` |
| FR-13.4 | Admin approve/reject refund | `PUT /admin/refunds/{id}` |
| FR-13.5 | Approved → mapping `TERMINATED`, thông báo customer + PT | email + WS |

### FR-14 Goal-based Macro Target (MỚI)

| ID | Requirement | API / UI |
|----|-------------|----------|
| FR-14.1 | User chọn `nutrition_goal` khi setup profile | `PUT /profile/preferences` |
| FR-14.2 | Hệ thống gợi ý macro target dựa trên goal + body metrics | `GET /profile/macro-suggestion` |
| FR-14.3 | PREGNANT goal: chọn trimester; macro adjust tự động | trimester field |
| FR-14.4 | PT có thể override macro suggestion cho client | `PUT /workspace/clients/{id}/macro-target` |
| FR-14.5 | User confirm giữ macro tự nhập hoặc dùng gợi ý | UI modal |

---

## 8. Workflows end-to-end

### WF-A: AI Meal Log với Food Gate (Updated)

```
Customer upload ảnh
  → FoodGateService.preCheck(file)   [GATE-01: ResNet-only, trước LLaVA]
    ├─ NOT_FOOD → 400 GATE_FAIL_NOT_FOOD (stop, không upload MinIO)
    ├─ OUT_OF_CLASS → DietLog(MANUAL_REQUIRED) + redirect manual form
    └─ PASS → ResNet (cached) → LLaVA → Fusion
        → ai_predicted_macros (A1.0 snapshot)
        → NutriHome × gram (A1.1)
        → return: logId, top-3, needsConfirmation
        
  Customer Modal:
    ├─ Confirm foodCode + grams
    │   → PUT /confirm-recognition
    │   → status=LOGGED, HYBRID macros
    │   → AllergyCheckService.check() → warning banner (không block)
    │   → (optional) sendToPt → reviewStatus=PENDING
    └─ Cancel → deleteLog
```

### WF-B: Diet Log Status Machine

```
preCheck NOT_FOOD ──────────► 400 (không tạo log)
preCheck OUT_OF_CLASS ──────► MANUAL_REQUIRED ──confirm/manual──► LOGGED
preCheck PASS → analyze ────► DRAFT ──confirm──► LOGGED (summary OK)
POST /logs (manual) ────────► LOGGED
submitForReview ────────────► reviewStatus=PENDING (status thường LOGGED)
PT review ──────────────────► reviewStatus=APPROVED|REJECTED (status vẫn LOGGED)
```

### WF-C: Thuê PT & Lên kế hoạch

```
Customer browse marketplace → hire (PENDING)
  → PT accept → ACTIVE
  → chat enabled
  → PT lên meal plan 7 ngày (allergy-checked)
  → Customer xem plan, mark đã ăn
  → PT xem adherence, tiến độ cân nặng
  → Customer đặt lịch hẹn → PT confirm
```

### WF-D: Đăng ký PT (Updated)

```
Customer → (nếu ekyc_required=true) KYC VNPT
  → POST /profile/pt/register
      + CV (1 file, PDF/DOC ≤10MB)
      + Certificates (nhiều file, PDF/JPG/PNG ≤5MB)
      + gender, experience_start_date, hourly_rate, diet_preference
  → status PENDING_APPROVAL
  → Admin review (xem CV tab + Certificates tab + loại Freelance/Certified)
  → APPROVE_CERTIFIED → PT_CERTIFIED
  → APPROVE_FREELANCE → PT_FREELANCE
  → REJECT (kèm lý do) → status REJECTED
      → PT được resubmit: PUT /profile/pt/resubmit
        → status PENDING_APPROVAL (không tạo profile mới)
```

### WF-E: SOS

```
Analyze (ăn ngoài) → suggestSos=true
  → Customer POST /diet/sos
  → Admin assign PT
  → PT resolve → WS SOS_RESOLVED
```

### WF-F: Hoàn tiền (MỚI)

```
Customer POST /refunds (trong 7 ngày từ hire)
  → lý do: PT_CANCEL | PT_NO_RESPONSE → auto approve
  → lý do: CUSTOMER_REQUEST → Admin manual review
      → Admin approve → mapping INACTIVE + WebSocket REFUND_UPDATE (customer + PT)
      → Admin reject → mapping giữ nguyên + REFUND_UPDATE
```

### WF-G: RBL Research

```
Analyze (freeze snapshots)
  [PT Blind estimate → pt_blind_macros]
  → PT review (ground truth: pt_adjusted_macros)
  → Admin export CSV → MAE(A1.0 vs label), MAE(A1.1 vs label), ΔA
  [OUT_OF_CLASS logs excluded from cohort]
```

---

## 9. Acceptance Criteria (AC)

### AC-1 Authentication

| # | Given | When | Then |
|---|-------|------|------|
| AC-1.1 | Email chưa tồn tại | Register hợp lệ | User CUSTOMER ACTIVE, redirect login |
| AC-1.2 | Credentials đúng, ACTIVE | Login | accessToken + refresh cookie |
| AC-1.3 | Google user mới | Google login | Limited token → `/set-password` |
| AC-1.4 | Access token hết hạn | API call 401 | Auto refresh hoặc logout |

### AC-2 Food Gate (MỚI)

| # | Given | When | Then |
|---|-------|------|------|
| AC-2.1 | Ảnh selfie (không phải thức ăn) | POST analyze | 400 `GATE_FAIL_NOT_FOOD`; không persist ảnh; không tạo DietLog |
| AC-2.2 | Ảnh cơm tấm (trong 199 class) | POST analyze | Gate PASS → pipeline tiếp tục |
| AC-2.3 | Ảnh pizza (ngoài 199 class) | POST analyze | `GATE_WARN_OUT_OF_CLASS`; tạo DietLog `MANUAL_REQUIRED`; redirect manual |
| AC-2.4 | Gate check | Bất kỳ | Hoàn thành trong < 5s |

### AC-3 AI Meal Analyze

| # | Given | When | Then |
|---|-------|------|------|
| AC-3.1 | Ảnh hợp lệ, gate pass, AI up | POST analyze | `logId`, `topPredictions` ≤3, ảnh trên MinIO |
| AC-3.2 | `mealSource=RESTAURANT` thiếu tên quán | POST analyze | 400 `restaurantName is required` |
| AC-3.3 | Reliability < 90% | Analyze | `needsConfirmation=true` |
| AC-3.4 | ResNet down | Analyze | Fallback message, không crash BE |

### AC-4 Confirm & Allergy

| # | Given | When | Then |
|---|-------|------|------|
| AC-4.1 | Log DRAFT sau analyze | Confirm foodCode + grams | `macros_json` cập nhật; `status=LOGGED`; summary tính |
| AC-4.2 | User có allergy SEAFOOD, confirm món có seafood | Confirm | Warning banner hiển thị; log vẫn được tạo |
| AC-4.3 | User không có allergy | Confirm | Không có warning; flow bình thường |
| AC-4.4 | User hủy modal | Cancel | Log bị xóa |

### AC-5 PT Review

| # | Given | When | Then |
|---|-------|------|------|
| AC-5.1 | Client ACTIVE, log `reviewStatus=PENDING` | PT APPROVE | `reviewStatus=APPROVED`, `status` vẫn `LOGGED`; `pt_adjusted_macros` set |
| AC-5.2 | PT ADJUST với macro mới | Review | status=APPROVED, macro PT lưu |
| AC-5.3 | PT REJECT | Review | status=REJECTED |
| AC-5.4 | PT khác client | Review | 400 not assigned client |

### AC-6 PT Onboarding

| # | Given | When | Then |
|---|-------|------|------|
| AC-6.1 | `hourly_rate = -1` | Register PT | 400 `hourly_rate must be >= 0` |
| AC-6.2 | Thiếu `gender` | Register PT | 400 `gender is required` |
| AC-6.3 | CV + Certificates là 2 section riêng | Upload | Hiển thị riêng trong admin review; không gộp chung |
| AC-6.4 | PT status = REJECTED | Resubmit hồ sơ | status → PENDING_APPROVAL; không tạo PtProfile mới |
| AC-6.5 | `experience_start_date` = 2020-03 | Hiển thị | FE hiển thị "5 năm kinh nghiệm (từ 03/2020)" |
| AC-6.6 | eKYC bị tắt bởi admin | Register PT | Bỏ qua bước KYC VNPT; vẫn submit được |

### AC-7 Admin

| # | Given | When | Then |
|---|-------|------|------|
| AC-7.1 | PT pending | Admin APPROVE CERTIFIED | role=PT_CERTIFIED |
| AC-7.2 | Admin vào trang duyệt PT | Hiển thị danh sách | Badge loại (CERTIFIED / FREELANCE); filter tab; tab CV và tab Chứng chỉ riêng |
| AC-7.3 | Admin toggle `ekyc_required=false` | PUT /admin/settings | Setting lưu; PT mới không cần KYC |
| AC-7.4 | Logs reviewed | RBL export | CSV có `ai_predicted_macros`, `pt_adjusted_macros` |

### AC-8 Meal Plan

| # | Given | When | Then |
|---|-------|------|------|
| AC-8.1 | PT tạo plan có món seafood, client có allergy SEAFOOD | Save plan | Warning flag; plan vẫn lưu được |
| AC-8.2 | Tổng macro/ngày > 110% target client | Save plan | Warning; cho phép override nếu PT confirm |
| AC-8.3 | Customer mark "đã ăn" 5/7 ngày | End of week | Adherence = 71%; hiển thị progress PT dashboard |

### AC-9 Appointment

| # | Given | When | Then |
|---|-------|------|------|
| AC-9.1 | PT chưa confirm trong 24h | Slot expire | Status = EXPIRED; customer notify |
| AC-9.2 | PT cancel < 24h trước hẹn | Cancel | Trigger refund policy; mapping không TERMINATE |

### AC-10 Refund

| # | Given | When | Then |
|---|-------|------|------|
| AC-10.1 | Customer request refund sau 8 ngày hire | POST /refunds | 400 `Refund period expired` |
| AC-10.2 | Lý do PT_CANCEL | POST /refunds | Auto approve; mapping `INACTIVE`; `REFUND_UPDATE` WS |
| AC-10.3 | Lý do CUSTOMER_REQUEST | POST /refunds | status PENDING_REVIEW; admin queue |
| AC-10.4 | Admin approve/reject | PUT /admin/refunds/{id} | `REFUND_UPDATE` WS + toast FE |

### AC-11 Security

| # | Given | When | Then |
|---|-------|------|------|
| AC-11.1 | Không token | Protected API | 401 |
| AC-11.2 | CUSTOMER token | PT workspace API | 403 |
| AC-11.3 | User A token | CRUD diet log user B | 403 forbidden |
| AC-11.4 | CUSTOMER token | RBL export admin API | 403 (fix GAP-05) |

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Analyze meal < 30s |
| **NFR-01a** | Performance | **[NEW]** Food gate check < 5s |
| NFR-02 | Security | BCrypt password; JWT secret ≥256 bit |
| NFR-03 | Security | CORS whitelist qua env |
| NFR-04 | Security | Rate limit forgot-password (Redis) |
| **NFR-04a** | Security | **[NEW]** `RblAdminController` phải có `@PreAuthorize("hasRole('ADMIN')")` |
| NFR-05 | Upload | Max CV 10MB; Max certificate 5MB/file; Max ảnh analyze 5MB |
| NFR-06 | Availability | AI optional — ResNet down → fallback |
| NFR-07 | Audit | `model_version`, `prompt_version` trên mỗi AI log |
| NFR-08 | i18n | UI tiếng Việt; food names Vi/En |
| NFR-09 | Dev | `ddl-auto=create-drop` — không dùng production |
| **NFR-10** | Reliability | **[NEW]** Allergy check fail (service down) → log warning, không block user flow |
| **NFR-11** | Data | **[NEW]** `hourly_rate` column: UNSIGNED DECIMAL hoặc CHECK ≥ 0 |

---

## 11. UI/UX Requirements

### 11.1 Ưu tiên UI (Priority 1)

> Thực hiện trước khi các feature mới.

| # | Màn hình | Issue | Fix |
|---|----------|-------|-----|
| UI-01 | Tất cả | Thừa `role` attribute trên DOM elements | Xóa `role` không cần thiết; chỉ giữ khi semantic HTML không đủ |
| UI-02 | PT Register | Năm kinh nghiệm là text input | Thay bằng month/year picker cho `experience_start_date` |
| UI-03 | PT Register | CV và Chứng chỉ chung 1 upload | Tách thành 2 section: "CV (PDF/DOC)" và "Chứng chỉ (nhiều file)" |
| UI-04 | PT Register | Không có field giới tính | Thêm dropdown `gender`: Nam / Nữ / Khác |
| UI-05 | PT Register | Input lương cho nhập số âm | Thêm `min="0"` + BE validation |
| UI-06 | Admin — Duyệt PT | Chưa phân biệt freelance/certified | Badge rõ ràng; tab "CV" và "Chứng chỉ" riêng |
| UI-07 | Profile | Thiếu mục dị ứng thực phẩm | Thêm section Allergies với multi-select |
| UI-08 | Profile | Thiếu diet preference (mặn/chay) | Thêm dropdown diet preference |
| UI-09 | Analyze gate fail | Toast rõ ràng NOT_FOOD / OUT_OF_CLASS → tab manual | **Done** — `DietTrackerPage` |
| UI-10 | Diet Tracker status badges | DRAFT / MANUAL_REQUIRED / LOGGED / PT review | **Done** — `MealSection.jsx` dual-state |

### 11.2 Feature UI mới

| # | Feature | UI Component |
|---|---------|--------------|
| UI-11 | Weekly Meal Plan | Calendar 7×4 bữa PT; customer Profile mark eaten | **Done** — `PtMealPlanPage`, `ProfilePage` |
| UI-12 | Appointment | Date picker; badge PENDING/CONFIRMED/EXPIRED/CANCELLED | **Done** — `ProfilePage`, `PtAppointmentsPage` |
| UI-13 | Progress Dashboard (PT) | Donut adherence + line chart calories + cân nặng | **Done** — `ClientProgressPage` (SVG) |
| UI-14 | Refund Request | Form Profile + admin review + WS notify | **Done** — `ProfilePage`, `RefundReviewPage` |
| UI-15 | Macro Goal Setup | Goal + trimester + gợi ý macro | **Done** — `ProfilePage`, `MacroTargetsPage` |

---

## 12. Gap & Issue Backlog

### Đã xử lý (2026-07-06)

| ID | Mô tả | Trạng thái |
|----|--------|------------|
| GAP-01 | Confirm → LOGGED, summary tính ngay | **Fixed** |
| GAP-05 | RBL `@PreAuthorize` | **Fixed** |
| NEW-01 | Food gate trước pipeline | **Fixed** — GATE-01 `preCheck` |
| NEW-02..NEW-12 | gender, rate, CV/cert, resubmit, allergy, meal plan, appointment, diet pref, macro goal, refund, eKYC | **Fixed** |
| GAP-04 | WS URL | **Mitigated** — `VITE_WS_URL` + fallback trong `websocketService.js` |

### Còn mở / drift có chủ đích

| ID | Mô tả | Ghi chú |
|----|--------|---------|
| GAP-02 | Không auto `PT_REVIEWING` sau analyze | Dual-state: user confirm + optional `sendToPt` |
| GAP-03 | `dietStore` FE không dùng | P2 refactor |
| GAP-06 | `create-drop` dev | Cần migration prod |
| GAP-07 | Softmax % thấp trên UI | P1 UX copy |
| GATE-LLaVA | Binary food/not-food bằng LLaVA | Code dùng ResNet preCheck; edge case ảnh người |
| TERMINATED vs INACTIVE | Refund mapping status | Tương đương nghiệp vụ |

> **v3 gaps A–K** (control loop, recipe, progress, …): xem [Master Spec v3](./NUTRICAN_PT_MASTER_SPEC_v3.md) — **đã implement** (audit QA 2026-07-06).

---

## Tài liệu đối chiếu (handoff)

| File | Dùng khi |
|------|----------|
| [NUTRICAN_PT_MASTER_SPEC_v3.md](./NUTRICAN_PT_MASTER_SPEC_v3.md) | **Spec chuẩn** — gaps v3, AC, backlog |
| [PRODUCT_REQUIREMENTS_SUMMARY.md](./PRODUCT_REQUIREMENTS_SUMMARY.md) | PRD đầy đủ: BR, FR, AC, inventory |
| [TONG_HOP_DU_AN_FE_BE.md](./TONG_HOP_DU_AN_FE_BE.md) | Code map, routing, pipeline, chạy local |
| [TESTING_E2E_MATRIX.md](./TESTING_E2E_MATRIX.md) | AC → test class/spec (Happy/Bad) |
| [TESTING_V2_FLOWS.md](./TESTING_V2_FLOWS.md) | Manual checklist + pyramid |

---

## Phụ lục — Ma trận Traceability v2

| FR | Business Rule | Workflow | AC |
|----|--------------|----------|----|
| FR-2.0 | GATE-01–06, DIET-09–11 | WF-A | AC-2.x |
| FR-2.1–2.7 | MACRO-01–06 | WF-A, WF-B | AC-3.x, AC-4.x |
| FR-2.7a, FR-10.x | ALLERGY-01–05 | WF-A | AC-4.2–4.3 |
| FR-4.x | PT-01–11 | WF-B, WF-C | AC-5.x |
| FR-5.x | MKT-01–02 | WF-C | AC-5.x |
| FR-8.x | KYC-01–03, PT-07–11 | WF-D | AC-6.x |
| FR-7.5 | ADM-03–04 | WF-D | AC-7.3 |
| FR-11.x | PLAN-01–07 | WF-C | AC-8.x |
| FR-12.x | APT-01–06 | WF-C | AC-9.x |
| FR-13.x | REFUND-01–06 | WF-F | AC-10.x |
| FR-14.x | GOAL-01–05 | — | — |
| FR-1.x | AUTH-01–05 | — | AC-1.x |
| FR-7.4 | RBL-01–05 | WF-G | AC-7.4 |

---

*NutriCan PT Master Spec v2.0 — Tổng hợp feedback mentor + nâng cấp chuẩn doanh nghiệp. Dùng cho SA, PM, dev onboarding, test case writing, và luận văn RBL.*
