# NutriCan PT — Master Specification v3.0

> **Phiên bản:** 3.0 — Audit liên mạch chức năng, bổ sung luồng kiểm soát thực ăn, tiến độ học viên, diet preference, goal-based tracking  
> **Ngày:** 2026-07-06 · **Đối chiếu code:** 2026-07-07 (v3 + Addendum v3.1 gate green)  
> **Cơ sở:** `NUTRICAN_PT_MASTER_SPEC_v2.md` + `TONG_HOP_DU_AN_FE_BE.md` + `TESTING_E2E_MATRIX.md`  
> **Scope chuẩn SA/PM:** BRD · PRD · BR · FR · Constraint · Workflow · AC · NFR · UI/UX · Data Model  

### Trạng thái triển khai (as-of 2026-07-07)

> **Source of truth cho reviewer AI:** đối chiếu bảng này + [`PRODUCT_REQUIREMENTS_SUMMARY.md`](./PRODUCT_REQUIREMENTS_SUMMARY.md) + [`TONG_HOP_DU_AN_FE_BE.md`](./TONG_HOP_DU_AN_FE_BE.md).  
> Spec v2 vẫn hợp lệ cho phần lõi v2; **v3 gaps A–K + Addendum ADD-01..08 đã implement**.

| Gap v3 | Mô tả | Code | Tests |
|--------|--------|------|-------|
| **GAP-A** | Diet preference filter + `!PREF` warn | `DietPrefCheckService`, `FoodCatalogController?dietFilter`, `ConfirmFoodModal`, meal plan badges | `DietPrefCheckServiceTest`, `ac04b-diet-pref` |
| **GAP-B** | Intake control loop + PT alert WS | `IntakeControlLoopServiceImpl`, `IntakeDayStatus`, `NutritionProgress` intake card | `IntakeControlLoopServiceTest`, `ac04-control-loop` (BE+Hybrid) |
| **GAP-C** | Progress timeline + goals + milestones | `ProgressTimelineServiceImpl`, `ClientGoal*`, `ProgressTimelineCard` | `ProgressTimelineServiceTest`, `ProgressTimelineIntegrationTest`, `ac12-progress` |
| **GAP-D** | Manual `sendToPt` + review queue | `DietLogServiceImpl`, `FoodInputCard` toggle, `PUT /review-request` | `DietLogManualSendToPtTest`, `ManualLogPtReviewIntegrationTest`, `ac05-pt-review` |
| **GAP-E** | Recipe builder + `MANUAL_RECIPE` log | `UserRecipe*`, `RecipeController` POST/GET/PUT, tab Công thức | `UserRecipeServiceTest`, `RecipeLogIntegrationTest`, `ac11-recipe` |
| **GAP-F** | Meal plan interactive | suggest/skip/weekly summary, `MealPlanSkipModal` | `PtWorkspaceMealPlanSuggestionTest`, `MealPlanIntegrationTest`, `ac08-meal-plan` |
| **GAP-G** | Post-meal rating + PT aggregate | `DietLogFeedback*`, `PostMealRatingSheet`, line chart PT | `DietLogFeedbackServiceTest`, `PostMealAggregateIntegrationTest`, `ac13-post-meal` |
| **GAP-H** | `suggestSubmitToPt` on confirm/log | `MealAnalysisFusion`, `IntakeControlLoopService` | `IntakeControlLoopServiceTest` |
| **GAP-I** | Dual-state canonical | `status` + `reviewStatus` (không `PT_REVIEWING`) | `PtWorkspaceReviewDualStateTest` |
| **GAP-J** | Customer cancel appointment | `AppointmentController` cancel + late fee rule | `AppointmentValidationTest`, `ac09-appointment` |
| **GAP-K** | RBL `experimentCohortKey` | `RblCohortUtil`, export CSV, admin `maeByCohortKey` | `RblCohortUtilTest`, `RblAdminStatsUtilTest`, `ac15-rbl-admin` |

| Addendum | Mô tả | Code chính | Tests |
|----------|--------|------------|-------|
| **ADD-01** | Onboarding wizard + banner | `OnboardingService`, `OnboardingPage`, `OnboardingGuard` | `OnboardingIntegrationTest`, `ac-onboarding` |
| **ADD-02** | Body metrics + reminder | `BodyMetricService`, `ProfileExtensionsController`, `BodyMetricReminderScheduler` | `BodyMetricServiceTest`, `ac-body-metric-reminder`, `ac12-progress` |
| **ADD-03** | Chat context + PDF | `PtWorkspaceServiceImpl.getChatContext`, `ChatPage` | `ChatContextServiceTest`, `ac-chat-context` |
| **ADD-04** | Marketplace goal/diet filter | `MarketplaceServiceImpl`, `MarketplacePage` | `MarketplaceCompatibilityTest`, `ac-marketplace-filter` |
| **ADD-05** | SOS SLA + reassign | `SosSlaScheduler`, `SosAdminServiceImpl`, `SosTicketsPage` | `SosSlaServiceTest`, `ac-sos-sla`, `ac-sos-reassign` |
| **ADD-06** | Notification center | `NotificationService`, `Header` bell, `notificationService.js` | `NotificationIntegrationTest`, `ac-notifications` |
| **ADD-07** | Coaching lifecycle | `CoachingLifecycleService`, `ProfilePage` | `CoachingLifecycleIntegrationTest`, `ac-lifecycle` |
| **ADD-08** | BR-17 enforce | `IntakeControlLoopServiceImpl` (skip alert if PENDING review) | `IntakeControlLoopServiceTest` (`br17_*`) |

**Regression gate (2026-07-07):** `./mvnw test` → **120** tests · `npm run build` pass · Playwright **58** cases (**22** spec) · v3.1 layers **34** pass (`BE-only|FE-only|Hybrid`).

**Còn mở (polish / manual):** GAP-06..10 · marketplace diet chips FE · chat reject `.exe`/`.zip` · SOS full resolve E2E · email SOS/refund/weekly integration tests.

---

## Mục lục

1. [Tầm nhìn & Phạm vi v3](#1-tầm-nhìn--phạm-vi-v3)
2. [Stakeholders & Personas](#2-stakeholders--personas)
3. [Audit Gap — Liên mạch chức năng (v2 → v3)](#3-audit-gap--liên-mạch-chức-năng-v2--v3)
4. [Product Requirements (PRD)](#4-product-requirements-prd)
5. [Business Requirements (BRD)](#5-business-requirements-brd)
6. [Business Rules](#6-business-rules)
7. [Functional Requirements (FR)](#7-functional-requirements-fr)
8. [Workflows end-to-end](#8-workflows-end-to-end)
9. [Acceptance Criteria (AC)](#9-acceptance-criteria-ac)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Data Model — Entities bổ sung / mở rộng](#12-data-model--entities-bổ-sung--mở-rộng)
13. [API Map delta (v2 → v3)](#13-api-map-delta-v2--v3)
14. [Gap & Issue Backlog v3](#14-gap--issue-backlog-v3)
15. [Traceability Matrix](#15-traceability-matrix)

---

## 1. Tầm nhìn & Phạm vi v3

### 1.1 Vision

**NutriCan PT** là nền tảng dinh dưỡng + coaching thông minh: người dùng log bữa ăn (AI + manual), nhận kế hoạch dinh dưỡng cá nhân hóa theo mục tiêu sức khỏe và sở thích ăn uống (mặn/chay/keto…), được PT giám sát tiến độ và chủ động kiểm soát toàn bộ hành trình — từ món ăn hôm nay đến mục tiêu cân nặng 3 tháng tới.

### 1.2 Vấn đề giải quyết (v3 — bổ sung)

| Pain Point | Giải pháp v3 |
|------------|-------------|
| Người ăn chay không có luồng kiểm soát riêng | Diet preference filter toàn hệ thống: food search, meal plan, confirm warn |
| Không có food log control loop (log → phân tích → điều chỉnh) | Daily intake control loop: log → so sánh target → PT alert nếu lệch |
| PT không chủ động được khi học viên ăn lệch | PT threshold alert: tự động notify khi client vượt/thiếu macro target |
| Không có dòng thời gian tiến độ học viên | Progress timeline: body metric + macro adherence + milestone |
| Meal plan bị động (PT lên, customer nhìn) | Meal plan interactive: customer suggest, PT approve/edit |
| Không có feedback loop sau khi ăn | Post-meal rating: customer rate cảm giác sau bữa (năng lượng, no/đói) |
| Manual entry thiếu structure — không đủ để PT review | Manual log với ingredient search: structured, có macro, có thể PT review |
| HOME_COOKED không có kiểm soát nguyên liệu | Recipe builder: lưu công thức tự nấu + tính macro tổng |
| Không rõ khi nào nên submit cho PT, khi nào không | Smart submit suggestion: gợi ý submit khi macro lệch > N% |
| PT không có công cụ tổng kết tuần cho client | Weekly summary: PT gửi nhận xét tuần + điều chỉnh plan |

### 1.3 Phạm vi IN / OUT (v3)

| IN (v3 — bổ sung) | OUT |
|-------------------|-----|
| Diet preference filter (food search, gate, meal plan) | Mobile app native |
| Food log control loop (log → alert → adjust) | Video call coaching |
| PT threshold alert cho client | AI tự động lên menu (không trong scope) |
| Progress timeline (body metric + milestone) | Production DB migration |
| Post-meal rating (cảm giác sau ăn) | Đa ngôn ngữ |
| Recipe builder HOME_COOKED | Payment gateway tích hợp |
| Smart submit suggestion | |
| PT weekly summary | |
| Meal plan interactive (customer suggest) | |

---

## 2. Stakeholders & Personas

| Persona | Role | Mục tiêu chính | Pain v3 giải quyết |
|---------|------|----------------|-------------------|
| **Customer ăn chay** | `CUSTOMER` | Theo dõi macro không vi phạm diet preference | Filter food theo pref, warn khi plan có thịt |
| **Customer tăng/giảm cân** | `CUSTOMER` | Tuân thủ macro target theo lộ trình | Control loop, smart submit, progress timeline |
| **Customer bà bầu** | `CUSTOMER` | Đủ chất theo trimester, không kiêng sai | Goal PREGNANT + PT override macro |
| **PT** | `PT_CERTIFIED/FREELANCE` | Giám sát nhiều client hiệu quả | Alert, weekly summary, progress dashboard |
| **Admin** | `ADMIN` | Đảm bảo chất lượng nền tảng | Toggle eKYC, allergen CRUD, refund |

---

## 3. Audit Gap — Liên mạch chức năng (v2 → v3)

> **Lưu ý triển khai (2026-07-06):** Các gap GAP-A … GAP-K dưới đây mô tả *vấn đề v2* và *thiết kế v3*. **Code hiện tại đã implement** các giải pháp tương ứng — xem [Trạng thái triển khai](#trạng-thái-triển-khai-as-of-2026-07-06) ở đầu tài liệu.

> Đây là phần cốt lõi của v3. Mỗi gap phân tích theo: **Vấn đề**, **Nguyên nhân**, **Giải pháp**, **Impact**.

---

### GAP-A: Diet Preference không thật sự filter gì

**Vấn đề:** `diet_preference` được khai báo trong profile (v2) nhưng không có bất kỳ luồng nào sử dụng nó. Người ăn chay vào food search vẫn thấy thịt; PT lên meal plan vẫn đề xuất món mặn; AI confirm modal không warn.

**Nguyên nhân:** v2 chỉ lưu field, không có `FoodItem.dietTags[]` và không có filter/warn logic.

**Giải pháp:**
- Thêm `diet_tags[]` vào `FoodItem`: `VEGAN`, `VEGETARIAN`, `KETO`, `EAT_CLEAN`, `HALAL`
- Food search: filter theo preference của user (opt-in, default on)
- ConfirmFoodModal: warn nếu món không match preference
- Meal plan: PT thấy badge `!PREF` trên món không phù hợp
- Gate/manual: không block, chỉ warn

**Impact:** UX liên mạch từ profile → log → plan. Người ăn chay có trải nghiệm nhất quán.

---

### GAP-B: Food Log Control Loop bị đứt gãy

**Vấn đề:** Sau khi user confirm log, không có vòng phản hồi nào xảy ra. Daily summary chỉ hiện số, không hành động. PT không biết khi nào cần can thiệp. User không biết mình đang lệch bao nhiêu và nên làm gì.

**Nguyên nhân:** v2 thiếu: (1) threshold so sánh thực tế vs target, (2) alert PT, (3) gợi ý hành động cho user.

**Giải pháp — Daily Intake Control Loop:**

```
Confirm log → LOGGED
  → BE: tính tổng macro ngày (sum LOGGED/APPROVED)
  → So sánh vs MacroTarget
  → Nếu vượt >20% protein/carb/fat → flag OVER_MACRO
  → Nếu ≤50% lúc 18:00 → flag UNDER_INTAKE
  → Nếu có PT ACTIVE + reviewStatus=NOT_REQUIRED → gửi PT alert (WS)
  → FE: hiển thị intake status card (OK / OVER / UNDER / AT_RISK)
```

**Impact:** PT có thể chủ động nhắn tin/điều chỉnh plan mà không cần chờ customer submit.

---

### GAP-C: Tiến độ học viên không đủ chiều sâu

**Vấn đề:** `GET /workspace/progress/{clientId}` trả cân nặng + adherence rate nhưng không có: (1) trend theo thời gian, (2) so sánh với mục tiêu ban đầu, (3) milestone (VD: -2kg tuần 3), (4) cảnh báo regression.

**Nguyên nhân:** `BodyMetric` entity tồn tại nhưng không có milestone, không có target_weight/target_date.

**Giải pháp — Progress Timeline:**
- Thêm `client_goals` entity: `target_weight`, `target_date`, `baseline_weight`, `nutrition_goal`
- `body_metrics` đã có — bổ sung `note` field
- Tính `projected_completion` từ rate of change
- Milestone auto-generate khi đạt: -1kg, -5kg, 4 tuần adherence >80%
- PT có thể thêm manual milestone ("Client hoàn thành tuần 1!")
- Cảnh báo regression: cân nặng tăng 2 lần liên tiếp khi goal là WEIGHT_LOSS

---

### GAP-D: Manual Log không liên mạch với PT Review

**Vấn đề:** Manual log → status `LOGGED` trực tiếp, không có `reviewStatus`. Không có `submitForReview` cho manual log. Nhưng từ code: `FoodInputCard manual → POST /diet/logs → LOGGED`. PT không thấy manual logs trong review queue.

**Nguyên nhân:** v2 spec chỉ cho phép DRAFT → submit. Manual log bỏ qua hoàn toàn PT.

**Giải pháp:**
- Manual log: vẫn `LOGGED` ngay nhưng `reviewStatus=NOT_REQUIRED` mặc định
- Thêm toggle "Gửi PT kiểm tra" ngay trong manual form → `reviewStatus=PENDING`
- PT thấy manual logs trong review queue (không chỉ AI logs)
- Rule: manual log với `reviewStatus=PENDING` → PT có thể APPROVE/ADJUST/REJECT như AI log

---

### GAP-E: HOME_COOKED không có kiểm soát nguyên liệu

**Vấn đề:** Khi user tự nấu ăn, họ upload ảnh → AI đoán → confirm. Nhưng AI không biết tỷ lệ nguyên liệu (VD: canh chua có thể ít/nhiều cà chua rất khác nhau). Người ăn chay nấu ở nhà không có cách log chính xác.

**Nguyên nhân:** Không có Recipe Builder. COMPOSITE mode hiện chỉ dùng cho buffet.

**Giải pháp — Recipe Builder (HOME_COOKED):**
- Cho `mealComplexity=HOME_COOKED_RECIPE` (mới)
- User chọn nguyên liệu từ food DB + gram từng thứ
- BE tính macro tổng = Σ(macro_per_100g × gram / 100)
- Lưu recipe: `user_recipes` entity → reuse lần sau
- RecognitionSource = `MANUAL_RECIPE`
- Phù hợp với người ăn chay, người tự nấu theo chế độ

---

### GAP-F: Meal Plan một chiều (PT → Customer)

**Vấn đề:** PT lên plan 7 ngày → customer chỉ nhìn và mark "đã ăn". Không có: (1) customer feedback về plan, (2) customer request thay món, (3) PT biết tại sao customer bỏ bữa.

**Nguyên nhân:** v2 meal plan không có interaction layer.

**Giải pháp:**
- Customer có thể "suggest" thay thế cho 1 meal item → PT approve/reject
- Customer có thể ghi lý do khi mark "bỏ bữa" (không có thời gian, không ngon, dị ứng)
- PT thấy skip reason trong progress dashboard
- PT gửi "Weekly Summary" cuối tuần: nhận xét + điều chỉnh plan tuần tới

---

### GAP-G: Post-Meal Feedback không tồn tại

**Vấn đề:** Không có cách nào để user phản hồi về cảm giác sau bữa ăn (năng lượng, no/đói, tiêu hóa). Đây là dữ liệu quan trọng để PT điều chỉnh — đặc biệt cho bà bầu và người đang phục hồi.

**Giải pháp:**
- Sau 30 phút kể từ log bữa ăn (LOGGED): notify "Bạn cảm thấy thế nào?"
- Rating 3 chiều: energy (1–5), hunger_after (1–5), digestion (OK/BAD/NOTE)
- Lưu vào `diet_log_feedback`
- PT thấy aggregate trong progress dashboard
- Rule: 3 lần liên tiếp `energy=1` → PT alert "Client có thể ăn thiếu chất"

---

### GAP-H: Smart Submit Suggestion không tồn tại

**Vấn đề:** User không biết khi nào nên submit log cho PT, khi nào không cần. Hiện tại phụ thuộc 100% vào user tự quyết.

**Giải pháp:**
- Sau confirm, BE kiểm tra: có PT ACTIVE không? Macro lệch >15% không?
- Nếu có PT + lệch → `suggestSubmitToPt=true` trong confirm response
- FE: gợi ý "Bữa này lệch 23% protein — bạn có muốn gửi PT kiểm tra không?"
- Không bắt buộc; user vẫn có quyền quyết định

---

### GAP-I: Drift code — `PT_REVIEWING` status vs dual-state

**Vấn đề:** Spec v2 vẫn đề cập `PT_REVIEWING` trong một số chỗ nhưng code thực tế dùng dual-state (`status=LOGGED` + `reviewStatus=PENDING/APPROVED/NOT_REQUIRED`). Các test spec như AC-3.2 trong v2 vẫn dùng khái niệm cũ.

**Giải pháp:** v3 chuẩn hóa hoàn toàn dual-state, xóa tham chiếu `PT_REVIEWING` khỏi tất cả AC/BR.

**Dual-state canonical:**
```
DietLog.status:        DRAFT | MANUAL_REQUIRED | LOGGED
DietLog.reviewStatus:  NOT_REQUIRED | PENDING | APPROVED | REJECTED
```

---

### GAP-J: Appointment không có luồng hủy từ phía Customer

**Vấn đề:** v2 chỉ có PT confirm/cancel. Customer không thể hủy appointment sau khi đã đặt. Thiếu business rule về refund khi customer hủy.

**Giải pháp:**
- Customer được hủy appointment nếu còn ≥ 48h trước lịch
- Hủy < 48h → ghi nhận, không refund
- Hủy ≥ 48h → không tính phí
- PT nhận notification khi customer hủy

---

### GAP-K: RBL Cohort thiếu diet preference dimension

**Vấn đề:** `experimentCohort` theo mealSource + complexity + recognitionSource nhưng không có diet preference. Điều này làm loãng kết quả MAE khi so sánh: người ăn chay vs mặn có pattern ảnh rất khác.

**Giải pháp:** Thêm `dietPreference` vào `experimentCohort` key. Ví dụ: `RESTAURANT_HYBRID_VEGETARIAN`.

---

## 4. Product Requirements (PRD)

### 4.1 Epic Map v3

| Epic | Mô tả | Priority |
|------|-------|----------|
| **E1 — Identity** | Auth, profile, diet preference filter | P0 |
| **E2 — Diet Intelligence** | Food gate, log, confirm, allergy, control loop | P0 |
| **E3 — PT Coaching** | Workspace, review (dual-state), alert, weekly summary | P1 |
| **E4 — Trust & Safety** | KYC toggle, onboarding, resubmit, refund | P1 |
| **E5 — Meal Planning** | Plan 7 ngày, interactive, adherence | P1 |
| **E6 — Progress & Goals** | Timeline, milestone, body metric, post-meal rating | P1 |
| **E7 — Recipe & Home Cooking** | Recipe builder HOME_COOKED | P2 |
| **E8 — Research (RBL)** | Snapshot, blind estimate, export + diet pref dimension | P2 |

### 4.2 User Stories — bổ sung v3

#### E2 — Diet Intelligence
- Là customer ăn chay, food search và confirm modal chỉ ưu tiên hiển thị món VEGETARIAN/VEGAN, và cảnh báo nếu tôi chọn món không phù hợp.
- Là customer, tôi thấy rõ hôm nay tôi đang OVER/UNDER/OK macro và được gợi ý hành động.
- Là customer, tôi có thể log bữa tự nấu bằng cách chọn nguyên liệu + gram (recipe builder) thay vì chụp ảnh.
- Là customer, 30 phút sau bữa ăn tôi được hỏi cảm giác thế nào (năng lượng, no/đói).

#### E3 — PT Coaching
- Là PT, tôi nhận alert tự động khi client vượt/thiếu macro target >20%.
- Là PT, tôi gửi Weekly Summary nhận xét cuối tuần cho client và chỉnh plan tuần tới.
- Là PT, tôi thấy lý do client bỏ bữa trong meal plan.
- Là PT, tôi approve/reject khi client đề nghị thay thế một meal item.

#### E5 — Meal Planning
- Là customer, tôi có thể đề nghị thay thế một món trong plan (PT approve).
- Là customer, khi bỏ bữa tôi ghi lý do để PT biết.

#### E6 — Progress & Goals
- Là customer, tôi xem timeline tiến độ: cân nặng, adherence trend, milestone đạt được.
- Là customer, tôi biết mình đang đi đúng hướng hay không so với target_date.
- Là PT, tôi thấy regression alert khi client tăng cân liên tiếp (goal WEIGHT_LOSS).

#### E7 — Recipe Builder
- Là customer tự nấu ăn, tôi chọn nguyên liệu + gram → nhận macro tổng, lưu recipe để dùng lại.

### 4.3 Product Goals (đo lường)

| Goal | Metric | Target |
|------|--------|--------|
| AI gate accuracy | Non-food rejection rate | ≥ 95% |
| Control loop engagement | % user xem intake status card | ≥ 60% DAU |
| PT alert response time | PT phản hồi trong 4h | ≥ 70% |
| Meal plan adherence | % client mark ≥ 5/7 ngày | Hiển thị; target ≥ 60% |
| Post-meal rating | % logs có rating | ≥ 40% (opt-in) |
| Diet pref accuracy | Warn rate khi user chọn sai pref | Đúng 100% với tag hệ thống |

---

## 5. Business Requirements (BRD)

### 5.1 Mục tiêu kinh doanh

1. **User value:** Log ít ma sát, nhận feedback ngay, biết tiến độ, PT chủ động.
2. **PT value:** Dashboard đủ chiều sâu, alert proactive, công cụ review mạnh, ít thao tác thủ công.
3. **Platform value:** Retention cao hơn khi user thấy tiến độ; PT có thể quản lý nhiều client.
4. **Research value:** RBL với dimension diet_preference cho kết quả MAE sát thực tế hơn.

### 5.2 Ràng buộc nghiệp vụ (cập nhật v3)

| ID | Ràng buộc |
|----|-----------|
| BR-01 | Chỉ owner được CRUD diet log của mình |
| BR-02 | PT chỉ review log của client ACTIVE mapping |
| BR-03 | Chat chỉ mở khi `PtClientMapping.status = ACTIVE` |
| BR-04 | PT cần admin approve trước khi role PT có hiệu lực |
| BR-05 | Macro UI ưu tiên NutriHome × gram (A1.1) |
| BR-06 | `ai_predicted_macros` immutable sau analyze |
| BR-07 | User phải confirm món AI trước khi tính summary |
| BR-08 | AI pipeline chỉ chạy khi ảnh pass food gate |
| BR-09 | `hourly_rate >= 0` |
| BR-10 | PT profile phải có `gender` trước khi marketplace |
| BR-11 | eKYC requirement bật/tắt bởi Admin; default ON |
| BR-12 | PT resubmit: cập nhật record hiện tại, không tạo mới |
| BR-13 | Allergy check tại: confirm log + PT lên meal plan |
| BR-14 | Refund chỉ trong 7 ngày kể từ hire |
| **BR-15** | **[v3]** Diet preference filter áp dụng cho: food search, confirm warn, meal plan badge |
| **BR-16** | **[v3]** Control loop check chạy sau mỗi confirm/manual log |
| **BR-17** | **[v3]** PT alert chỉ gửi nếu client có PT ACTIVE và `reviewStatus=NOT_REQUIRED` (không spam) |
| **BR-18** | **[v3]** Recipe builder chỉ cho `mealSource=HOME_COOKED`; macro = Σ nguyên liệu |
| **BR-19** | **[v3]** Meal plan suggestion từ customer phải có PT approve mới có hiệu lực |
| **BR-20** | **[v3]** Post-meal rating là opt-in; không block user flow |
| **BR-21** | **[v3]** `DietLog.status` canonical: DRAFT | MANUAL_REQUIRED | LOGGED (không dùng PT_REVIEWING) |
| **BR-22** | **[v3]** `DietLog.reviewStatus` canonical: NOT_REQUIRED | PENDING | APPROVED | REJECTED |
| **BR-23** | **[v3]** Customer cancel appointment: miễn phí nếu ≥ 48h; ghi nhận nếu < 48h |
| **BR-24** | **[v3]** `target_weight` + `target_date` là optional; nếu có → tính `projected_completion` |

### 5.3 RBAC v3

| Hành động | CUSTOMER | PT | ADMIN |
|-----------|----------|----|-------|
| Analyze meal (sau gate) | ✅ | ❌ | ❌ |
| Food preference filter toggle | ✅ (self) | ❌ | ❌ |
| Recipe builder | ✅ | ❌ | ❌ |
| Post-meal rating | ✅ | ❌ | ❌ |
| Suggest meal plan item | ✅ | ❌ | ❌ |
| PT workspace + alert | ❌ | ✅ | ❌ |
| Approve meal suggestion | ❌ | ✅ | ❌ |
| Gửi weekly summary | ❌ | ✅ | ❌ |
| Manual log → PT review | ✅ (request) | ✅ (review) | ❌ |
| Toggle eKYC | ❌ | ❌ | ✅ |
| Allergen CRUD | ❌ | ❌ | ✅ |
| Refund approve | ❌ | ❌ | ✅ |

---

## 6. Business Rules

### 6.1 Auth & Account

| Rule | Mô tả |
|------|--------|
| AUTH-01 | Email đăng ký phải unique |
| AUTH-02 | `SUSPENDED`, `PENDING_*` → chặn login |
| AUTH-03 | Refresh token HttpOnly; access token Bearer |
| AUTH-04 | Logout revoke token |
| AUTH-05 | Reset password: one-time + expiry 15 phút |

### 6.2 Diet Log & Status Machine (Dual-State Canonical)

```
DietLog.status:       DRAFT | MANUAL_REQUIRED | LOGGED
DietLog.reviewStatus: NOT_REQUIRED | PENDING | APPROVED | REJECTED
```

| Rule | Mô tả |
|------|--------|
| DIET-01 | AI analyze PASS → `status=DRAFT` |
| DIET-02 | Manual log → `status=LOGGED`, `reviewStatus=NOT_REQUIRED` |
| DIET-02a | Manual log với "Gửi PT" → `reviewStatus=PENDING` |
| DIET-03 | DRAFT + confirm → `status=LOGGED` |
| DIET-04 | Summary ngày cộng tất cả `status=LOGGED` (bất kể reviewStatus) |
| DIET-05 | `DRAFT` và `MANUAL_REQUIRED` không vào summary |
| DIET-06 | Cancel confirm modal → `deleteLog` |
| DIET-07 | Owner-only |
| DIET-08 | Mỗi AI analyze 1 ảnh |
| DIET-09 | Ảnh phải pass `FoodGateService.preCheck` trước pipeline |
| DIET-10 | Gate `NOT_FOOD` → 400, không persist, không tạo DietLog |
| DIET-11 | Gate `OUT_OF_CLASS` → DietLog `MANUAL_REQUIRED`, redirect manual |
| DIET-12 | Sau confirm: chạy allergy check + diet pref check + control loop |

### 6.3 Macro & AI

| Rule | Mô tả |
|------|--------|
| MACRO-01 | `macros_json` = NutriHome × gram sau confirm |
| MACRO-02 | `ai_predicted_macros` = A1.0 fixed — immutable |
| MACRO-03 | `db_matched_macros` = NutriHome × gram (A1.1) |
| MACRO-04 | HOTPOT/COMPOSITE: macro = Σ `diet_log_items` |
| MACRO-05 | `recognitionSource=HYBRID` khi DB match hoặc user confirm |
| MACRO-06 | Reliability < 0.90 → `needsConfirmation=true` |
| MACRO-07 | `OUT_OF_CLASS` gate → không có `ai_predicted_macros` |
| **MACRO-08** | **[v3]** Recipe builder: `recognitionSource=MANUAL_RECIPE`; macro = Σ nguyên liệu |

### 6.4 Food Gate

| Rule | Mô tả |
|------|--------|
| GATE-01 | Pre-check ResNet-only trước LLaVA: binary food/not-food + in-class |
| GATE-02 | Food pass → check top-1 class trong 199-class manifest |
| GATE-03 | `NOT_FOOD` → 400 GATE_FAIL_NOT_FOOD, không persist |
| GATE-04 | `OUT_OF_CLASS` → MANUAL_REQUIRED, persist ảnh, mở manual form |
| GATE-05 | Gate pass → pipeline ResNet full + LLaVA |
| GATE-06 | Gate SLA < 5s |
| GATE-07 | HOTPOT/COMPOSITE bỏ qua gate (đã chọn items từ catalog) |

### 6.5 Diet Preference

| Rule | Mô tả |
|------|--------|
| PREF-01 | `diet_preference`: NORMAL / VEGETARIAN / VEGAN / KETO / EAT_CLEAN |
| PREF-02 | `FoodItem.diet_tags[]`: VEGAN / VEGETARIAN / KETO / EAT_CLEAN / HALAL |
| PREF-03 | Food search: nếu user có preference ≠ NORMAL → default filter = ON (user tắt được) |
| PREF-04 | Confirm modal: warn nếu `confirmedFoodCode.diet_tags` không match `user.diet_preference` |
| PREF-05 | Warn không block; user vẫn confirm được |
| PREF-06 | Meal plan item: badge `!PREF` nếu không match preference của client |
| PREF-07 | Admin seed `diet_tags` cho 199 ResNet dishes; có thể update qua admin |

### 6.6 Daily Intake Control Loop

| Rule | Mô tả |
|------|--------|
| LOOP-01 | Sau mỗi `status=LOGGED`: BE tính tổng macro ngày của user |
| LOOP-02 | So sánh với `MacroTarget` của user |
| LOOP-03 | `OVER_MACRO`: tổng calories > target.calories × 1.20 |
| LOOP-04 | `UNDER_INTAKE`: tổng calories < target.calories × 0.50 VÀ time > 18:00 |
| LOOP-05 | `AT_RISK`: 3 ngày liên tiếp UNDER_INTAKE hoặc OVER_MACRO |
| LOOP-06 | Nếu `AT_RISK` và có PT ACTIVE → gửi WS event `PT_CLIENT_ALERT` đến PT |
| LOOP-07 | PT alert không gửi lặp trong vòng 24h cho cùng client |
| LOOP-08 | `suggestSubmitToPt=true` trong confirm response nếu: có PT ACTIVE + (OVER hoặc UNDER) + `reviewStatus=NOT_REQUIRED` |

### 6.7 Dị ứng thực phẩm

| Rule | Mô tả |
|------|--------|
| ALLERGY-01 | Allergen categories: GLUTEN, SEAFOOD, NUT, DAIRY, EGG, SOY, OTHER |
| ALLERGY-02 | Allergy check sau confirm: `foodCode` → `FoodAllergenMapping` |
| ALLERGY-03 | Match → warning, không block |
| ALLERGY-04 | Meal plan: check allergy toàn plan; flag món có allergen |
| ALLERGY-05 | Allergen data: admin CRUD |

### 6.8 SOS

| Rule | Mô tả |
|------|--------|
| SOS-01 | `suggestSos=true`: `mealSource≠HOME_COOKED` AND (confidence thấp OR no DB match) |
| SOS-02 | SOS không tự tạo — user chủ động |
| SOS-03 | Chỉ owner được tạo SOS cho log của mình |

### 6.9 PT & Client

| Rule | Mô tả |
|------|--------|
| PT-01 | PT chỉ thấy logs của client ACTIVE với `reviewStatus=PENDING` |
| PT-02 | Review: APPROVE → `reviewStatus=APPROVED`; REJECT → `reviewStatus=REJECTED` |
| PT-03 | APPROVE/ADJUST → lưu `pt_adjusted_macros` |
| PT-04 | REJECT → loại khỏi RBL cohort |
| PT-05 | Correction reason: WRONG_FOOD, WRONG_PORTION, WRONG_MACROS |
| PT-06 | Hire duplicate → lỗi |
| PT-07 | `hourly_rate >= 0` |
| PT-08 | `experience_start_date` → `getYearsOfExperience()` tự tính |
| PT-09 | PT profile phải có `gender` |
| PT-10 | PT resubmit sau REJECT: update record, không tạo mới |
| **PT-11** | **[v3]** PT alert gửi WS khi client `AT_RISK`; không lặp trong 24h |
| **PT-12** | **[v3]** Weekly summary: PT gửi text + điều chỉnh plan → `meal_plan_feedback` entity |
| **PT-13** | **[v3]** PT approve/reject meal item suggestion từ customer |

### 6.10 Lịch hẹn (Appointment)

| Rule | Mô tả |
|------|--------|
| APT-01 | Chỉ đặt với PT ACTIVE mapping |
| APT-02 | Slot: 30–120 phút |
| APT-03 | PT confirm trong 24h; quá → `EXPIRED` |
| APT-04 | Customer cancel ≥ 48h → `CANCELLED_NO_FEE` |
| APT-05 | Customer cancel < 48h → `CANCELLED_LATE`; ghi nhận |
| APT-06 | PT cancel → trigger refund consideration |
| APT-07 | Không overlap cho PT |

### 6.11 Hoàn tiền

| Rule | Mô tả |
|------|--------|
| REFUND-01 | Trong 7 ngày từ hire |
| REFUND-02 | Lý do: PT_CANCEL, PT_NO_RESPONSE, SLA_BREACH, CUSTOMER_REQUEST |
| REFUND-03 | Admin review approve/reject |
| REFUND-04 | `PT_CANCEL`, `PT_NO_RESPONSE` → auto approve |
| REFUND-05 | `CUSTOMER_REQUEST` → admin manual |
| REFUND-06 | Approved → mapping `INACTIVE`, WS `REFUND_UPDATE` |

### 6.12 Meal Plan

| Rule | Mô tả |
|------|--------|
| PLAN-01 | PT lên plan 7 ngày cho client ACTIVE |
| PLAN-02 | 3–6 bữa/ngày |
| PLAN-03 | Mỗi item: `foodCode` hoặc text + gram + ghi chú |
| PLAN-04 | Tổng macro/ngày ≤ 110% target (warn, không block) |
| PLAN-05 | Allergy check + diet pref check trước khi save |
| PLAN-06 | Customer mark "đã ăn" → tính adherence |
| PLAN-07 | Customer "bỏ bữa" + lý do → `skip_reason` lưu |
| **PLAN-08** | **[v3]** Customer suggest thay thế → `MealPlanSuggestion` entity |
| **PLAN-09** | **[v3]** PT approve suggestion → item được thay; reject → item giữ nguyên |
| **PLAN-10** | **[v3]** PT gửi Weekly Summary cuối tuần → `meal_plan_feedback` lưu |

### 6.13 Progress & Goal Tracking

| Rule | Mô tả |
|------|--------|
| GOAL-01 | `nutrition_goal`: WEIGHT_LOSS / WEIGHT_GAIN / MAINTAIN / PREGNANT / RECOVERY |
| GOAL-02 | Macro gợi ý theo goal + body metrics (Mifflin-St Jeor); PT override được |
| GOAL-03 | PREGNANT → macro theo trimester (1/2/3); PT confirm |
| GOAL-04 | `target_weight` + `target_date` optional; nếu có → `projected_completion` |
| GOAL-05 | Milestone auto-generate: -1kg, -5kg, 4 tuần adherence >80% |
| GOAL-06 | PT thêm manual milestone |
| **GOAL-07** | **[v3]** Regression alert: weight tăng 2 lần liên tiếp khi goal=WEIGHT_LOSS → PT notify |
| **GOAL-08** | **[v3]** Post-meal rating: opt-in, 30 phút sau LOGGED, 3 chiều (energy/hunger/digestion) |
| **GOAL-09** | **[v3]** 3 lần liên tiếp `energy=1` → `AT_RISK_NUTRITION` → PT alert |

### 6.14 Recipe Builder

| Rule | Mô tả |
|------|--------|
| RECIPE-01 | Chỉ cho `mealSource=HOME_COOKED` |
| RECIPE-02 | User chọn nguyên liệu từ food DB + gram |
| RECIPE-03 | Macro tổng = Σ(macro_per_100g × gram / 100) |
| RECIPE-04 | `recognitionSource=MANUAL_RECIPE` |
| RECIPE-05 | Lưu recipe → `user_recipes` để reuse |
| RECIPE-06 | Recipe có thể submit PT review như log thường |
| RECIPE-07 | Diet pref check: warn nếu nguyên liệu vi phạm preference |

### 6.15 Admin & KYC

| Rule | Mô tả |
|------|--------|
| ADM-01 | APPROVE_CERTIFIED → `PT_CERTIFIED`; APPROVE_FREELANCE → `PT_FREELANCE` |
| ADM-02 | REJECT → profile status `REJECTED`; User status không đổi |
| ADM-03 | `ekyc_required` platform setting; Admin toggle |
| ADM-04 | Khi `ekyc_required=false` → bỏ qua KYC VNPT |
| KYC-01 | CV: PDF/DOC ≤ 10MB |
| KYC-02 | Chứng chỉ: nhiều file, PDF/JPG/PNG ≤ 5MB/file |
| KYC-03 | CV và Chứng chỉ là 2 section tách biệt |

### 6.16 RBL Research

| Rule | Mô tả |
|------|--------|
| RBL-01 | Freeze `ai_predicted_macros`, `db_matched_macros` tại analyze |
| RBL-02 | `experimentCohort` = `{mealSource}_{recognitionSource}_{dietPreference}` |
| RBL-03 | Ground truth = `pt_adjusted_macros` sau APPROVE/ADJUST |
| RBL-04 | `pt_blind_macros` ghi trước khi PT xem AI/DB |
| RBL-05 | `OUT_OF_CLASS` logs không tính vào RBL cohort |

---

## 7. Functional Requirements (FR)

### FR-1 Authentication & Profile

| ID | Requirement |
|----|-------------|
| FR-1.1 | Đăng ký: email, password, tên, `gender`, `diet_preference` |
| FR-1.2 | Đăng nhập → JWT + refresh cookie |
| FR-1.3 | Google OAuth + set password |
| FR-1.4 | Reset password |
| FR-1.5 | Xem/sửa profile, avatar |
| FR-1.6 | Macro target ngày |
| FR-1.7 | Cập nhật `diet_preference` + `nutrition_goal` |
| FR-1.8 | Allergy profile |
| **FR-1.9** | **[v3]** Goal setup: `target_weight`, `target_date`, `baseline_weight` |
| **FR-1.10** | **[v3]** `GET /profile/macro-suggestion` theo goal + body metric |

### FR-2 Diet Logging & AI

| ID | Requirement |
|----|-------------|
| FR-2.0 | Food gate check (nội bộ trong analyze) |
| FR-2.1 | Upload ảnh → analyze |
| FR-2.2 | Context: mealType, mealSource, mealComplexity |
| FR-2.3 | RESTAURANT: bắt buộc `restaurantName` |
| FR-2.4 | HOTPOT: broth + items |
| FR-2.5 | COMPOSITE: nhiều món buffet |
| FR-2.6 | Trả top-3 + reliability |
| FR-2.7 | Confirm `foodCode` + gram → LOGGED |
| FR-2.7a | Sau confirm: allergy check + diet pref warn + control loop |
| **FR-2.7b** | **[v3]** Confirm response trả thêm: `dietPrefWarning`, `suggestSubmitToPt`, `intakeStatus` |
| FR-2.8 | Submit log → PT review (`reviewStatus=PENDING`) |
| FR-2.9 | Manual log (search ingredient) → LOGGED |
| **FR-2.9a** | **[v3]** Manual log có toggle "Gửi PT kiểm tra" → `reviewStatus=PENDING` |
| FR-2.10 | Daily summary vs target |
| **FR-2.10a** | **[v3]** Summary response thêm: `intakeStatus` (OK/OVER/UNDER/AT_RISK), `controlLoopMessage` |
| FR-2.11 | Search food (filter by diet preference default ON) |
| FR-2.12 | Multi-image trên 1 log |
| FR-2.13 | Gate fail: toast + fallback options |
| **FR-2.14** | **[v3]** Post-meal rating: `PUT /diet/logs/{id}/feedback` |
| **FR-2.15** | **[v3]** Recipe builder: `POST /diet/recipes` + dùng trong `POST /diet/logs` |

### FR-3 AI Pipeline (Backend)

| ID | Requirement |
|----|-------------|
| FR-3.0 | `FoodGateService`: binary food/not-food + in-class |
| FR-3.1 | ResNet 199 class |
| FR-3.2 | LLaVA optional |
| FR-3.3 | Fusion |
| FR-3.4 | Macro A1.0 fixed |
| FR-3.5 | Macro A1.1 NutriHome × gram |
| FR-3.6 | `needsConfirmation` nếu reliability < 0.90 |
| **FR-3.7** | **[v3]** `DietPrefCheckService`: kiểm tra `foodCode.diet_tags` vs `user.diet_preference` |
| **FR-3.8** | **[v3]** `IntakeControlLoopService`: tính tổng ngày, flag OVER/UNDER/AT_RISK, emit PT alert |

### FR-4 PT Workspace

| ID | Requirement |
|----|-------------|
| FR-4.1 | Dashboard stats |
| FR-4.2 | Client list + trạng thái |
| FR-4.3 | Accept/reject hire |
| FR-4.4 | Pending logs (`reviewStatus=PENDING`) |
| FR-4.5 | Review: APPROVE / ADJUST / REJECT |
| FR-4.6 | Blind estimate (RBL) |
| FR-4.7 | Progress dashboard: body metric trend, macro adherence, meal plan adherence |
| FR-4.8 | Resolve SOS |
| FR-4.9 | Lên meal plan 7 ngày |
| FR-4.10 | Edit meal plan |
| FR-4.11 | Lịch hẹn của PT |
| FR-4.12 | Confirm/cancel lịch hẹn |
| **FR-4.13** | **[v3]** PT alert inbox: danh sách `AT_RISK` clients + lý do |
| **FR-4.14** | **[v3]** Approve/reject meal plan suggestion từ client |
| **FR-4.15** | **[v3]** Gửi Weekly Summary cho client |
| **FR-4.16** | **[v3]** Xem post-meal feedback của client (aggregate: energy avg, hunger avg) |
| **FR-4.17** | **[v3]** Progress timeline: weight chart, milestone list, regression alert |

### FR-5 Marketplace

| ID | Requirement |
|----|-------------|
| FR-5.1 | Tìm PT (filter: loại, rating, specialization, `trainingMode`) |
| FR-5.2 | Xem profile PT: bio, experience_start_date, certificates, gender, reviews |
| FR-5.3 | Hire request |
| FR-5.4 | Đánh giá PT |
| FR-5.5 | Đặt lịch hẹn với PT |

### FR-6 SOS

| ID | Requirement |
|----|-------------|
| FR-6.1 | Customer tạo SOS |
| FR-6.2 | `suggestSos` trong analyze response |
| FR-6.3 | Admin assign PT |
| FR-6.4 | PT resolve |

### FR-7 Admin

| ID | Requirement |
|----|-------------|
| FR-7.1 | Platform stats |
| FR-7.2 | User list + status |
| FR-7.3 | Duyệt PT: tab CV / Chứng chỉ, badge CERTIFIED/FREELANCE |
| FR-7.4 | RBL export CSV + MAE |
| FR-7.5 | Toggle eKYC |
| FR-7.6 | Refund management |
| FR-7.7 | Allergen CRUD (`/admin/allergen-mappings`) |
| **FR-7.8** | **[v3]** Diet tag management: gán `diet_tags` cho `FoodItem` |
| **FR-7.9** | **[v3]** Platform alert log: xem lịch sử PT alerts đã gửi |

### FR-8 KYC & PT Onboarding

| ID | Requirement |
|----|-------------|
| FR-8.1 | eKYC VNPT (bỏ qua nếu admin tắt) |
| FR-8.2 | Upload CV riêng (PDF/DOC ≤10MB) |
| FR-8.2a | Upload Chứng chỉ: nhiều file, PDF/JPG/PNG ≤5MB |
| FR-8.3 | PT resubmit sau REJECT |
| FR-8.4 | Validate: `gender`, `experience_start_date`, `hourly_rate ≥ 0` |

### FR-9 Chat & Realtime

| ID | Requirement |
|----|-------------|
| FR-9.1 | Thread theo `mappingId` |
| FR-9.2 | Text ≤2000 ký tự hoặc ảnh |
| FR-9.3 | WebSocket: `CHAT_MESSAGE`, `DIET_LOG_UPDATE`, `REFUND_UPDATE`, `PT_CLIENT_ALERT` |

### FR-10 Allergy Profile

| ID | Requirement |
|----|-------------|
| FR-10.1 | Khai báo allergens |
| FR-10.2 | Categories: GLUTEN, SEAFOOD, NUT, DAIRY, EGG, SOY, OTHER |
| FR-10.3 | Warning khi confirm allergen food |
| FR-10.4 | Admin CRUD allergen mapping |

### FR-11 Weekly Meal Plan

| ID | Requirement |
|----|-------------|
| FR-11.1 | PT tạo plan 7 ngày |
| FR-11.2 | 3–6 bữa/ngày, foodCode hoặc text + gram + ghi chú |
| FR-11.3 | Tính macro/ngày vs target |
| FR-11.4 | Allergy + diet pref check trước save |
| FR-11.5 | Customer xem plan |
| FR-11.6 | Customer mark "đã ăn" |
| FR-11.7 | Adherence rate |
| **FR-11.8** | **[v3]** Customer "bỏ bữa" + `skip_reason` |
| **FR-11.9** | **[v3]** Customer suggest thay thế món |
| **FR-11.10** | **[v3]** PT approve/reject suggestion |
| **FR-11.11** | **[v3]** PT gửi Weekly Summary (text + plan revision) |

### FR-12 Appointment Scheduling

| ID | Requirement |
|----|-------------|
| FR-12.1 | Customer chọn slot từ PT availability |
| FR-12.2 | Đặt lịch (ONLINE / IN_PERSON) |
| FR-12.3 | PT confirm hoặc cancel |
| **FR-12.4** | **[v3]** Customer cancel (≥48h: no fee; <48h: late cancel) |
| FR-12.5 | PT khai báo availability |
| FR-12.6 | Customer xem lịch sắp tới |

### FR-13 Payment & Refund

| ID | Requirement |
|----|-------------|
| FR-13.1 | Customer request refund (≤7 ngày) |
| FR-13.2 | Lý do: PT_CANCEL, PT_NO_RESPONSE, SLA_BREACH, CUSTOMER_REQUEST |
| FR-13.3 | Admin list refunds |
| FR-13.4 | Admin approve/reject |
| FR-13.5 | Approved → INACTIVE + WS `REFUND_UPDATE` |

### FR-14 Goal-based Macro Target

| ID | Requirement |
|----|-------------|
| FR-14.1 | Chọn `nutrition_goal` |
| FR-14.2 | Gợi ý macro = Mifflin-St Jeor × activity factor |
| FR-14.3 | PREGNANT: chọn trimester |
| FR-14.4 | PT override macro cho client |
| FR-14.5 | User confirm dùng gợi ý hay tự nhập |

### FR-15 Recipe Builder (MỚI v3)

| ID | Requirement |
|----|-------------|
| FR-15.1 | User chọn nguyên liệu từ food DB + gram → macro tổng |
| FR-15.2 | Lưu recipe: tên, nguyên liệu, gram, tổng macro |
| FR-15.3 | Reuse recipe trong log lần sau |
| FR-15.4 | `recognitionSource=MANUAL_RECIPE` |
| FR-15.5 | Diet pref warn nếu nguyên liệu vi phạm |
| FR-15.6 | Submit recipe log → PT review được |

### FR-16 Progress Timeline (MỚI v3)

| ID | Requirement |
|----|-------------|
| FR-16.1 | Customer khai báo `target_weight`, `target_date`, `baseline_weight` |
| FR-16.2 | Chart cân nặng theo thời gian (từ body_metrics) |
| FR-16.3 | `projected_completion` dựa trên rate of change |
| FR-16.4 | Milestone list: auto-generate + PT manual |
| FR-16.5 | Regression alert hiển thị trên FE + PT notify |
| FR-16.6 | Macro adherence trend (tuần) |

### FR-17 Post-meal Feedback (MỚI v3)

| ID | Requirement |
|----|-------------|
| FR-17.1 | Sau 30 phút LOGGED: push notification "Rate your meal" |
| FR-17.2 | 3 chiều: energy (1–5), hunger_after (1–5), digestion (OK/BAD/NOTE) |
| FR-17.3 | Lưu `diet_log_feedback` gắn với `diet_log_id` |
| FR-17.4 | PT aggregate view: avg energy, avg hunger theo tuần |
| FR-17.5 | `3 × energy=1` → `AT_RISK_NUTRITION` flag → PT alert |

---

## 8. Workflows end-to-end

### WF-A: AI Meal Log với Gate + Control Loop (v3)

```
Customer upload ảnh → POST /diet/logs/analyze
  ↓
FoodGateService.preCheck
  ├─ NOT_FOOD → 400 (stop, không persist)
  ├─ OUT_OF_CLASS → DietLog(MANUAL_REQUIRED) + redirect manual/recipe
  └─ PASS → ResNet(cached) + LLaVA + Fusion + NutriHome macro
               → DietLog(DRAFT)
               ↓
ConfirmFoodModal: chọn foodCode + gram
  ↓
PUT /confirm-recognition
  → DietLog.status = LOGGED
  → AllergyCheckService → allergyWarnings[]
  → DietPrefCheckService → dietPrefWarning (nếu có)
  → IntakeControlLoopService:
      → tính tổng macro ngày
      → flag: OK | OVER_MACRO | UNDER_INTAKE | AT_RISK
      → nếu AT_RISK + có PT ACTIVE → WS PT_CLIENT_ALERT (debounce 24h)
  → Response: { logId, macros, allergyWarnings, dietPrefWarning,
                intakeStatus, suggestSubmitToPt, controlLoopMessage }
  ↓
FE hiển thị:
  - Allergy banner (nếu có)
  - Diet pref warn (nếu có)
  - Intake status card: OK/OVER/UNDER/AT_RISK
  - Nếu suggestSubmitToPt=true → "Gửi PT kiểm tra? [Có] [Không]"
  ↓ (user chọn "Có")
PUT /diet/logs/{id}/review-request → reviewStatus=PENDING
  → WS DIET_LOG_UPDATE → PT thấy pending log
```

### WF-B: Diet Log Status Machine (Dual-State Canonical v3)

```
gate NOT_FOOD ──────────────────────────────────────► 400 (no log)
gate OUT_OF_CLASS ──────────────────────────────────► MANUAL_REQUIRED
                                                          │
                          manual nhập hoặc recipe ────────┘
                                                          ↓
                          status=LOGGED, reviewStatus=NOT_REQUIRED
                                (hoặc PENDING nếu user chọn submit PT)
gate PASS ──────────────────────────────────────────► DRAFT
                   confirm ────────────────────────► LOGGED
                                          reviewStatus=NOT_REQUIRED (default)
                                          reviewStatus=PENDING (user submit / auto suggest)
                                                          │
                                          PT review ──────┘
                                                     APPROVED | REJECTED
                                                     (status vẫn = LOGGED)
manual entry ──────────────────────────────────────► LOGGED
                   + "gửi PT" toggle ──────────────► reviewStatus=PENDING
recipe builder ─────────────────────────────────────► LOGGED (MANUAL_RECIPE)
```

### WF-C: Thuê PT → Coaching Loop

```
Customer browse marketplace → hire (PENDING)
  ↓
PT accept → ACTIVE → chat enabled
  ↓
PT: khai báo availability
PT: lên meal plan 7 ngày (allergy + pref check)
PT: set macro target (nếu override goal gợi ý)
  ↓
Customer daily loop:
  → Log bữa ăn (AI / manual / recipe)
  → Xem intake status (OK/OVER/UNDER)
  → Nhận gợi ý submit PT nếu lệch
  → Mark meal plan: đã ăn / bỏ bữa + lý do
  → Post-meal rating (opt-in)
  ↓
PT daily loop:
  → Xem alert AT_RISK clients
  → Review pending logs
  → Xem post-meal feedback aggregate
  ↓
Cuối tuần:
  → PT gửi Weekly Summary
  → Điều chỉnh plan tuần tới
  → Customer suggest thay món → PT approve/reject
  ↓
Progress check (PT + Customer):
  → Body metric trend
  → Projected completion
  → Milestone
  → Regression alert (nếu có)
```

### WF-D: PT Onboarding (v3)

```
GET /settings/require-kyc
├─ true → KYC VNPT CCCD + selfie
└─ false → skip
↓
Form 4 section:
  1. Cơ bản: preferredTrack, bio, phone, gender
  2. Kinh nghiệm: experienceStartDate, specializations, trainingMode, location
  3. Chứng chỉ: nhiều file ≤5MB (tab riêng)
  4. CV: 1 file ≤10MB (tab riêng) + social links
↓
POST /profile/pt/register → PENDING_APPROVAL
↓
Admin PtVerificationPage:
  - Tab "Thông tin" | Tab "CV" | Tab "Chứng chỉ"
  - Badge: CERTIFIED / FREELANCE
  - APPROVE → PT_CERTIFIED | PT_FREELANCE
  - REJECT (kèm lý do) → status=REJECTED (User.status không đổi)
↓
PT bị REJECT:
  → Banner thông báo lý do reject trên /kyc page
  → PUT /profile/pt/resubmit → PENDING_APPROVAL (record cũ)
```

### WF-E: Appointment (v3)

```
Customer /profile → tab "Lịch hẹn"
  → Xem PT availability
  → Chọn slot + type (ONLINE/IN_PERSON)
  → POST /appointments → PENDING
↓
PT nhận WS notify
  → Confirm → CONFIRMED
  → Cancel → CANCELLED_BY_PT → trigger refund consideration
↓
Customer cancel:
  ≥ 48h → CANCELLED_NO_FEE
  < 48h → CANCELLED_LATE (ghi nhận, không refund)
↓
Auto EXPIRED nếu PT không confirm trong 24h
```

### WF-F: Refund (v3)

```
Customer POST /refunds (≤7 ngày từ hire)
  lý do: PT_CANCEL | PT_NO_RESPONSE → auto approve
  lý do: CUSTOMER_REQUEST → admin queue
↓
Admin review → approve:
  → PtClientMapping.status = INACTIVE
  → WS REFUND_UPDATE → Customer + Admin reload
Admin review → reject:
  → notify customer + lý do
```

### WF-G: Recipe Builder HOME_COOKED

```
Customer DietTracker → tab HOME_COOKED → "Dùng công thức"
  ↓
Recipe search (saved) hoặc tạo mới:
  → Chọn nguyên liệu từ food DB + gram từng thứ
  → Preview macro tổng
  → Diet pref check → warn nếu vi phạm
  → Save recipe (optional)
  ↓
POST /diet/logs (mealSource=HOME_COOKED, recipeId hoặc ingredients[])
  → status=LOGGED, recognitionSource=MANUAL_RECIPE
  → Allergy check + control loop
  → Optional: submit PT review
```

### WF-H: PT Weekly Summary

```
Cuối tuần (PT action, không auto):
PT /pt/clients/:id/meal-plan → tab "Tuần này"
  → Xem adherence: X/7 ngày, X/N bữa
  → Xem skip reasons
  → Xem post-meal feedback aggregate
  → Viết Weekly Summary text
  → Điều chỉnh plan tuần tới (copy + edit)
  → POST /workspace/weekly-summary
↓
Customer nhận notification:
  → /profile → tab Thực đơn → badge "Có nhận xét tuần mới"
  → Xem summary + plan mới
```

### WF-I: RBL Research (v3)

```
Analyze → freeze snapshots (A1.0 + A1.1)
  + diet_preference của user ghi vào experimentCohort
  → PT blind estimate (trước khi thấy AI)
  → PT review → ground truth
  → Admin export CSV → MAE(A1.0 vs label) | MAE(A1.1 vs label) | ΔA
    per cohort: {mealSource}_{recognitionSource}_{dietPreference}
```

---

## 9. Acceptance Criteria (AC)

### AC-1 Authentication

| # | Given | When | Then |
|---|-------|------|------|
| AC-1.1 | Email chưa tồn tại | Register với diet_preference, gender | User CUSTOMER ACTIVE |
| AC-1.2 | Credentials đúng | Login | accessToken + refresh cookie |
| AC-1.3 | Google user mới | Google login | → /set-password |
| AC-1.4 | Token hết hạn | API 401 | Auto refresh |

### AC-2 Food Gate

| # | Given | When | Then |
|---|-------|------|------|
| AC-2.1 | Ảnh selfie | POST analyze | 400 NOT_FOOD; không tạo DietLog; không upload MinIO |
| AC-2.2 | Ảnh cơm tấm (in-class) | POST analyze | Gate PASS → pipeline |
| AC-2.3 | Ảnh pizza (out-of-class) | POST analyze | MANUAL_REQUIRED; redirect manual/recipe |
| AC-2.4 | Bất kỳ | Gate check | < 5s |
| AC-2.5 | HOTPOT/COMPOSITE | POST analyze | Gate bị bỏ qua; items từ catalog |

### AC-3 AI Analyze

| # | Given | When | Then |
|---|-------|------|------|
| AC-3.1 | Gate PASS, AI up | POST analyze | logId, top-3, ảnh MinIO |
| AC-3.2 | RESTAURANT thiếu tên | POST analyze | 400 restaurantName required |
| AC-3.3 | Reliability < 90% | Analyze | needsConfirmation=true |
| AC-3.4 | ResNet down | Analyze | Fallback, không crash |

### AC-4 Confirm + Control Loop

| # | Given | When | Then |
|---|-------|------|------|
| AC-4.1 | Log DRAFT | Confirm foodCode + gram | status=LOGGED; macros HYBRID |
| AC-4.2 | User có allergy SEAFOOD, confirm cá | Confirm | allergyWarnings có; log vẫn tạo |
| AC-4.3 | User VEGETARIAN, confirm thịt bò | Confirm | dietPrefWarning=true; log vẫn tạo |
| AC-4.4 | Tổng ngày vượt 120% calories | Confirm | intakeStatus=OVER_MACRO; suggestSubmitToPt=true nếu có PT |
| AC-4.5 | Tổng ngày < 50% lúc 18:00 | Confirm | intakeStatus=UNDER_INTAKE |
| AC-4.6 | 3 ngày AT_RISK liên tiếp, có PT | Confirm lần 3 | WS PT_CLIENT_ALERT gửi đến PT |
| AC-4.7 | Cancel modal | Cancel | deleteLog |

### AC-5 PT Review (Dual-State)

| # | Given | When | Then |
|---|-------|------|------|
| AC-5.1 | Client ACTIVE, reviewStatus=PENDING | PT APPROVE | reviewStatus=APPROVED; status vẫn LOGGED |
| AC-5.2 | PT ADJUST macro mới | Review | reviewStatus=APPROVED; pt_adjusted_macros set |
| AC-5.3 | PT REJECT | Review | reviewStatus=REJECTED |
| AC-5.4 | PT khác client | Review | 403 not assigned |
| AC-5.5 | Manual log + "Gửi PT" | PT workspace | Hiển thị trong pending queue như AI log |

### AC-6 PT Onboarding

| # | Given | When | Then |
|---|-------|------|------|
| AC-6.1 | `hourly_rate = -1` | Register | 400 hourly_rate >= 0 |
| AC-6.2 | Thiếu gender | Register | 400 gender required |
| AC-6.3 | CV + Cert upload | Admin view | 2 tab riêng biệt |
| AC-6.4 | PT REJECTED | Resubmit | PENDING_APPROVAL; không tạo profile mới |
| AC-6.5 | `experience_start_date = 2020-03` | Hiển thị | "5 năm (từ 03/2020)" |
| AC-6.6 | eKYC tắt | Register | Bỏ qua KYC bước |

### AC-7 Admin

| # | Given | When | Then |
|---|-------|------|------|
| AC-7.1 | PT pending | APPROVE CERTIFIED | role=PT_CERTIFIED |
| AC-7.2 | Admin duyệt PT page | Hiển thị | Badge loại; tab CV / Chứng chỉ riêng |
| AC-7.3 | Toggle ekyc=false | PUT settings | PT mới bỏ qua KYC |
| AC-7.4 | Admin gán diet_tags cho FoodItem | PUT food | Tags lưu; food search filter dùng ngay |

### AC-8 Meal Plan

| # | Given | When | Then |
|---|-------|------|------|
| AC-8.1 | Plan có seafood, client allergy SEAFOOD | Save | Flag allergen; plan lưu |
| AC-8.2 | Plan có thịt, client VEGETARIAN | Save | Badge !PREF; plan lưu |
| AC-8.3 | Macro/ngày > 110% target | Save | Warning; PT confirm override |
| AC-8.4 | Customer mark 5/7 ngày | End of week | adherence=71%; PT dashboard cập nhật |
| AC-8.5 | Customer bỏ bữa + lý do | Skip | skip_reason lưu; PT thấy trong progress |
| AC-8.6 | Customer suggest thay món | Suggest | MealPlanSuggestion PENDING; PT review queue |
| AC-8.7 | PT approve suggestion | Approve | Meal item được thay; customer thấy ngay |

### AC-9 Appointment

| # | Given | When | Then |
|---|-------|------|------|
| AC-9.1 | PT không confirm 24h | Auto | Status=EXPIRED; customer notify |
| AC-9.2 | Customer cancel ≥ 48h | Cancel | CANCELLED_NO_FEE; PT notify |
| AC-9.3 | Customer cancel < 48h | Cancel | CANCELLED_LATE; ghi nhận |
| AC-9.4 | PT cancel | Cancel | Trigger refund consideration; customer notify |

### AC-10 Refund

| # | Given | When | Then |
|---|-------|------|------|
| AC-10.1 | Sau 8 ngày hire | POST refunds | 400 Refund period expired |
| AC-10.2 | PT_CANCEL reason | POST refunds | Auto approve; mapping INACTIVE; notify |
| AC-10.3 | CUSTOMER_REQUEST | POST refunds | PENDING_REVIEW; admin queue |
| AC-10.4 | Admin approve | PUT refunds | WS REFUND_UPDATE; Profile + RefundReview reload |

### AC-11 Recipe Builder

| # | Given | When | Then |
|---|-------|------|------|
| AC-11.1 | Chọn 3 nguyên liệu + gram | Create recipe | macro = Σ nguyên liệu; recognitionSource=MANUAL_RECIPE |
| AC-11.2 | Nguyên liệu có thịt, user VEGETARIAN | Create | dietPrefWarning; vẫn tạo được |
| AC-11.3 | Dùng lại recipe | Reuse | Tìm thấy trong danh sách; log nhanh |

### AC-12 Progress Timeline

| # | Given | When | Then |
|---|-------|------|------|
| AC-12.1 | User set target_weight=-5kg, target_date=3 tháng | View progress | projected_completion hiển thị |
| AC-12.2 | Weight tăng 2 lần liên tiếp, goal=WEIGHT_LOSS | Log body metric | Regression alert FE + WS PT notify |
| AC-12.3 | 4 tuần adherence > 80% | Auto | Milestone "4 tuần kiên trì" generate |

### AC-13 Post-meal Rating

| # | Given | When | Then |
|---|-------|------|------|
| AC-13.1 | 30 phút sau log LOGGED | Notify | Prompt rating hiện |
| AC-13.2 | energy=1 ba lần liên tiếp | Rate | AT_RISK_NUTRITION flag; PT alert |
| AC-13.3 | PT xem aggregate | Dashboard | avg energy, avg hunger theo tuần hiển thị |

### AC-14 Security

| # | Given | When | Then |
|---|-------|------|------|
| AC-14.1 | Không token | Protected API | 401 |
| AC-14.2 | CUSTOMER | PT workspace | 403 |
| AC-14.3 | User A | CRUD log User B | 403 |
| AC-14.4 | CUSTOMER | RBL admin API | 403 |

### AC-15 Control Loop + PT Alert

| # | Given | When | Then |
|---|-------|------|------|
| AC-15.1 | Client AT_RISK ngày 1 | PT alert | WS PT_CLIENT_ALERT gửi |
| AC-15.2 | Client AT_RISK ngày 1 + log lần 2 cùng ngày | Control loop | Không gửi thêm alert (debounce 24h) |
| AC-15.3 | Client OK trở lại | Log bình thường | AT_RISK flag clear; không alert |

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Analyze meal < 30s |
| NFR-01a | Performance | Food gate check < 5s |
| **NFR-01b** | Performance | **[v3]** Control loop calculation < 500ms sau confirm |
| NFR-02 | Security | BCrypt; JWT secret ≥256 bit |
| NFR-03 | Security | CORS whitelist qua env |
| NFR-04 | Security | Rate limit forgot-password (Redis) |
| NFR-04a | Security | `RblAdminController` có `@PreAuthorize("hasRole('ADMIN')")` |
| NFR-05 | Upload | CV ≤10MB; cert ≤5MB; ảnh analyze ≤5MB |
| NFR-06 | Availability | AI optional — ResNet down → fallback |
| NFR-07 | Audit | `model_version`, `prompt_version` trên mỗi AI log |
| NFR-08 | i18n | UI tiếng Việt |
| NFR-09 | Dev | `ddl-auto=create-drop` — không production |
| NFR-10 | Reliability | Allergy check fail → log warn, không block user |
| NFR-11 | Data | `hourly_rate` UNSIGNED DECIMAL |
| **NFR-12** | Reliability | **[v3]** Control loop fail → log error, không block confirm |
| **NFR-13** | Performance | **[v3]** PT alert WS debounce 24h per client — chống spam |
| **NFR-14** | UX | **[v3]** Post-meal rating notification: opt-out được trong profile settings |
| **NFR-15** | Data | **[v3]** `experimentCohort` format: `{MEAL_SOURCE}_{RECOGNITION_SOURCE}_{DIET_PREF}` |

---

## 11. UI/UX Requirements

### 11.1 Priority 1 — Fix ngay

| # | Màn hình | Issue | Fix |
|---|----------|-------|-----|
| UI-01 | Tất cả | Thừa `role` attribute | Xóa; chỉ dùng khi semantic HTML không đủ |
| UI-02 | PT Register | Năm kinh nghiệm text input | Month/year picker |
| UI-03 | PT Register | CV + Cert chung | 2 section tách biệt |
| UI-04 | PT Register | Thiếu gender | Dropdown: Nam/Nữ/Khác |
| UI-05 | PT Register | Input lương âm | `min="0"` + BE validation |
| UI-06 | Admin PT | Chưa phân biệt freelance/certified | Badge + tab CV/Chứng chỉ |
| UI-07 | Profile | Thiếu allergy section | Multi-select allergen |
| UI-08 | Profile | Thiếu diet preference | Dropdown |
| UI-09 | DietTracker | Gate fail chưa có UI | Toast: "Không phải thực phẩm" / "Chưa hỗ trợ → nhập tay" |
| UI-10 | DietTracker | Status log không rõ | Badge DRAFT/LOGGED + reviewStatus badge |

### 11.2 Priority 2 — Feature mới v3

| # | Feature | UI Component |
|---|---------|--------------|
| UI-11 | Intake Status Card | Card dưới Daily Summary: OK (xanh) / OVER (đỏ) / UNDER (cam) / AT_RISK (đỏ đậm) |
| UI-12 | Diet Pref Warn | Inline warn trong ConfirmFoodModal khi foodCode không match pref |
| UI-13 | Food search filter | Toggle "Lọc theo chế độ ăn" (default ON nếu pref ≠ NORMAL) |
| UI-14 | Recipe Builder | Tab mới trong FoodInputCard; step: chọn nguyên liệu → gram → preview macro |
| UI-15 | Smart Submit Suggest | Modal/card sau confirm: "Lệch X% — Gửi PT?" |
| UI-16 | Meal Plan skip reason | Dropdown lý do khi unmark bữa |
| UI-17 | Meal plan suggestion | Button "Đề nghị thay thế" trên meal item; PT review queue tab mới |
| UI-18 | Weekly Summary | PT: form text + plan revision; Customer: notification + read panel |
| UI-19 | Progress Timeline | Line chart weight, milestone badges, projected date, regression alert banner |
| UI-20 | Post-meal Rating | Bottom sheet 30 phút sau log; 3 slider/icon |
| UI-21 | PT Alert Inbox | Badge đỏ trên PT sidebar; list AT_RISK clients với lý do |
| UI-22 | Post-meal Aggregate | PT ClientProgressPage: avg energy/week line chart |
| UI-23 | Customer cancel appt | Button "Hủy" + confirm modal; hiển thị fee policy |
| UI-24 | Diet tags admin | Admin food management: chip multi-select diet_tags trên mỗi FoodItem |

---

## 12. Data Model — Entities bổ sung / mở rộng

### 12.1 FoodItem — bổ sung

```sql
diet_tags TEXT[]  -- VEGAN, VEGETARIAN, KETO, EAT_CLEAN, HALAL
```

### 12.2 User / MacroTarget — bổ sung

```sql
-- User
diet_preference VARCHAR  -- NORMAL/VEGETARIAN/VEGAN/KETO/EAT_CLEAN
notification_opt_in JSONB  -- { post_meal_rating: true, pt_alert: true }

-- client_goals (mới)
id, user_id FK,
nutrition_goal VARCHAR,   -- WEIGHT_LOSS/WEIGHT_GAIN/MAINTAIN/PREGNANT/RECOVERY
target_weight DECIMAL,
baseline_weight DECIMAL,
target_date DATE,
trimester INT,            -- 1/2/3 nếu PREGNANT
created_at, updated_at
```

### 12.3 DietLog — bổ sung

```sql
review_status VARCHAR   -- NOT_REQUIRED | PENDING | APPROVED | REJECTED
-- (thay thế hoàn toàn việc dùng status=PT_REVIEWING)
suggest_submit_to_pt BOOLEAN  -- computed, không persist
intake_status VARCHAR   -- OK | OVER_MACRO | UNDER_INTAKE | AT_RISK
diet_pref_warning BOOLEAN
```

### 12.4 DietLogFeedback (mới)

```sql
id, diet_log_id FK,
energy_rating INT,        -- 1–5
hunger_after_rating INT,  -- 1–5
digestion_status VARCHAR, -- OK | BAD | NOTE
digestion_note TEXT,
created_at
```

### 12.5 UserRecipe (mới)

```sql
id, user_id FK,
name VARCHAR,
meal_source VARCHAR,      -- HOME_COOKED
total_calories DECIMAL,
total_protein DECIMAL,
total_carb DECIMAL,
total_fat DECIMAL,
created_at, updated_at
```

### 12.6 UserRecipeIngredient (mới)

```sql
id, recipe_id FK, food_item_id FK,
gram DECIMAL,
calories DECIMAL, protein DECIMAL, carb DECIMAL, fat DECIMAL  -- computed
```

### 12.7 MealPlanItem — bổ sung

```sql
skip_reason VARCHAR  -- NO_TIME | DONT_LIKE | ALLERGY | OTHER
skip_note TEXT
is_eaten BOOLEAN
```

### 12.8 MealPlanSuggestion (mới)

```sql
id, meal_plan_item_id FK, customer_id FK,
suggested_food_code VARCHAR,
suggested_food_name VARCHAR,
suggested_gram DECIMAL,
status VARCHAR,           -- PENDING | APPROVED | REJECTED
pt_note TEXT,
created_at, updated_at
```

### 12.9 MealPlanFeedback / WeeklySummary (mới)

```sql
id, mapping_id FK, pt_id FK, client_id FK,
week_start_date DATE,
summary_text TEXT,
adherence_rate DECIMAL,
next_plan_note TEXT,
created_at
```

### 12.10 ClientGoalMilestone (mới)

```sql
id, user_id FK,
milestone_type VARCHAR,   -- AUTO | MANUAL
title VARCHAR,
achieved_at TIMESTAMP,
note TEXT
```

### 12.11 IntakeDayStatus (mới — hoặc computed)

```sql
id, user_id FK, log_date DATE,
status VARCHAR,           -- OK | OVER_MACRO | UNDER_INTAKE | AT_RISK
consecutive_at_risk_days INT,
pt_alerted_at TIMESTAMP  -- debounce
```

### 12.12 Appointment — bổ sung

```sql
cancelled_by VARCHAR  -- CUSTOMER | PT
cancel_type VARCHAR   -- NO_FEE | LATE | BY_PT
cancel_reason TEXT
```

---

## 13. API Map delta (v2 → v3)

> Prefix: `/api/v1`. Chỉ liệt kê endpoints **mới hoặc thay đổi** so với v2.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/profile/me` | +`diet_preference`, `notification_opt_in` |
| PUT | `/profile/preferences` | Cập nhật diet_preference + nutrition_goal |
| GET/PUT | `/profile/goals` | **[NEW]** target_weight, target_date, trimester |
| GET | `/profile/macro-suggestion` | Gợi ý macro theo goal |
| PUT | `/diet/logs/{id}/feedback` | **[NEW]** Post-meal rating |
| POST | `/diet/recipes` | **[NEW]** Tạo recipe |
| GET | `/diet/recipes` | **[NEW]** Danh sách recipe của user |
| PUT | `/diet/recipes/{id}` | **[NEW]** Edit recipe |
| GET | `/diet/summary` | +`intakeStatus`, `controlLoopMessage` |
| PUT | `/diet/logs/{id}/review-request` | **[NEW]** Manual submit PT (thay cho submit-for-review) |
| GET | `/workspace/alerts` | **[NEW]** PT alert inbox |
| GET | `/workspace/progress/{clientId}` | +timeline, milestone, regression, post-meal aggregate |
| POST | `/workspace/weekly-summary` | **[NEW]** PT gửi weekly summary |
| PUT | `/workspace/meal-plan-suggestions/{id}` | **[NEW]** PT approve/reject suggestion |
| POST | `/meal-plans/items/{id}/suggest` | **[NEW]** Customer suggest thay thế |
| GET | `/meal-plans/weekly-summaries` | **[NEW]** Customer đọc tổng kết tuần từ PT |
| PUT | `/appointments/{id}/cancel` | **[NEW]** Customer cancel |
| GET | `/profile/milestones` | **[NEW]** Danh sách milestone |
| GET | `/admin/food-tags` | **[NEW]** Quản lý diet_tags cho FoodItem |
| PUT | `/admin/food-tags/{foodCode}` | **[NEW]** Cập nhật diet_tags |
| GET | `/admin/platform-alerts` | **[NEW]** Log PT alerts lịch sử |
| GET | `/foods/search` | +`dietFilter` param (default = user preference) |
| POST | `/diet/logs/analyze` | Response +`dietPrefWarning`, `suggestSubmitToPt`, `intakeStatus` |
| PUT | `/diet/logs/{id}/confirm-recognition` | Response +`dietPrefWarning`, `allergyWarnings`, `intakeStatus`, `controlLoopMessage`, `suggestSubmitToPt` |

---

## 14. Gap & Issue Backlog v3

| # | ID | Mô tả | Impact | Priority | Status |
|---|----|--------|--------|----------|--------|
| 1 | GAP-01 | Confirm → LOGGED + dual-state | — | — | ✅ Closed |
| 2 | GAP-04 | WS URL hardcode | Deploy | P0 | ✅ Closed |
| 3 | GAP-05 | RBL thiếu `@PreAuthorize` | Security | P0 | ✅ Closed |
| 4 | GAP-02 | Auto PT_REVIEWING hardcode | UX | P3 | Open (dual-state giải quyết tốt hơn) |
| 5 | GAP-06 | DB `create-drop` | Dev data | P1 | Open |
| 6 | GAP-07 | 199-class softmax % thấp → user hiểu nhầm | UX | P1 | Open — cần UX copy |
| 7 | GAP-08 | `dietStore` FE unused dead code | Maintain | P2 | Open |
| 8 | GAP-09 | React Query unused | Perf | P3 | Open |
| 9 | GAP-10 | `registerAsPt` không set User PENDING_APPROVAL | Logic | P1 | Open — dùng `ptRequestStatus` |
| 10 | **v3-A** | Diet preference không filter gì | UX liên mạch | P1 | **✅ Closed** |
| 11 | **v3-B** | Food log control loop bị đứt | Core feature | P1 | **✅ Closed** |
| 12 | **v3-C** | Progress không đủ chiều sâu | PT value | P1 | **✅ Closed** |
| 13 | **v3-D** | Manual log không link PT review | UX | P2 | **✅ Closed** |
| 14 | **v3-E** | HOME_COOKED không có recipe builder | Accuracy | P2 | **✅ Closed** |
| 15 | **v3-F** | Meal plan một chiều | Engagement | P2 | **✅ Closed** |
| 16 | **v3-G** | Post-meal feedback không tồn tại | PT insight | P2 | **✅ Closed** |
| 17 | **v3-H** | Smart submit suggestion không tồn tại | UX | P2 | **✅ Closed** |
| 18 | **v3-I** | Drift PT_REVIEWING vs dual-state trong spec cũ | Consistency | P0 | **✅ Fixed in v3** |
| 19 | **v3-J** | Customer không cancel được appointment | UX | P1 | **✅ Closed** |
| 20 | **v3-K** | RBL cohort thiếu diet_preference dimension | Research | P2 | **✅ Closed** |

---

## 15. Traceability Matrix

| FR | Business Rule | Workflow | AC |
|----|--------------|----------|----|
| FR-2.0, FR-3.0 | GATE-01–07, DIET-09–11 | WF-A | AC-2.x |
| FR-2.1–2.7 | MACRO-01–07, DIET-01–08 | WF-A, WF-B | AC-3.x, AC-4.x |
| FR-2.7a, FR-3.7, FR-3.8 | ALLERGY-01–05, PREF-01–07, LOOP-01–08 | WF-A | AC-4.2–4.6, AC-15.x |
| FR-2.9a | DIET-02a | WF-B | AC-5.5 |
| FR-2.14, FR-17.x | GOAL-08–09 | WF-A | AC-13.x |
| FR-2.15, FR-15.x | RECIPE-01–07 | WF-G | AC-11.x |
| FR-4.x, FR-4.13–17 | PT-01–13 | WF-B, WF-C, WF-H | AC-5.x, AC-15.x |
| FR-5.x | MKT, APT-01–07 | WF-C, WF-E | AC-9.x |
| FR-8.x | KYC-01–03, PT-07–10 | WF-D | AC-6.x |
| FR-7.5 | ADM-03–04 | WF-D | AC-7.3 |
| FR-11.x | PLAN-01–10 | WF-C, WF-H | AC-8.x |
| FR-12.x | APT-01–07 | WF-E | AC-9.x |
| FR-13.x | REFUND-01–06 | WF-F | AC-10.x |
| FR-14.x | GOAL-01–07 | WF-C | AC-12.x |
| FR-16.x | GOAL-04–07 | WF-C | AC-12.x |
| FR-1.x | AUTH-01–05 | — | AC-1.x |
| FR-7.4 | RBL-01–05 | WF-I | AC-7.4 |

---

## 16. Handoff cho AI reviewer (2026-07-07)

**Thứ tự đọc đề xuất:**

1. [Trạng thái triển khai](#trạng-thái-triển-khai-as-of-2026-07-07) (bảng GAP-A…K + ADD-01..08) — snapshot nhanh
2. [NUTRICAN_PT_GAP_ADDENDUM_v3_1.md](./NUTRICAN_PT_GAP_ADDENDUM_v3_1.md) — chi tiết ADD epics
3. [PRODUCT_REQUIREMENTS_SUMMARY.md](./PRODUCT_REQUIREMENTS_SUMMARY.md) — Hướng dẫn reviewer + inventory + gap §13
4. [TONG_HOP_DU_AN_FE_BE.md](./TONG_HOP_DU_AN_FE_BE.md) — §1.5 v3.1 files, §6 logic module, §14 FE, §16.1 API, §17 gap
5. [TESTING_E2E_MATRIX.md](./TESTING_E2E_MATRIX.md) — AC → BE/Playwright (Happy/Bad)
6. [TESTING_V2_FLOWS.md](./TESTING_V2_FLOWS.md) — **120** BE tests, **58** Playwright, **34** v3.1 layers, manual checklist
7. [NUTRICAN_PT_MASTER_SPEC_v2.md](./NUTRICAN_PT_MASTER_SPEC_v2.md) — lõi v2 (archive); v3 bổ sung trên v2

**Verify nhanh:** `./mvnw test` → **120** pass · `npm run build` · Playwright **58** cases (cần BE :8080) · v3.1 layers **34** (`-g "BE-only|FE-only|Hybrid"`).

**Ưu tiên rà soát còn mở:** GAP-06..10, polish E2E (SOS resolve flow, notification deep-link), marketplace diet UI. **ADD-01..08 closed** — xem Addendum.

---

*NutriCan PT Master Spec v3.0 — Audit liên mạch + nâng cấp chuẩn doanh nghiệp. Dùng cho SA, PM, dev, QA, và luận văn RBL. Khi thay đổi code cập nhật đồng thời `TONG_HOP_DU_AN_FE_BE.md`.*
