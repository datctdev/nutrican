# NutriCan — Manual & Automated Test Matrix

> **Cập nhật:** 2026-07-07 · Addendum v3.1 gate  
> Index AC đầy đủ: [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md) (cột Happy/Bad)  
> Team onboarding: [`TEAM_ONBOARDING.md`](./TEAM_ONBOARDING.md)  
> Spec: [`NUTRICAN_PT_MASTER_SPEC_v3.md`](./NUTRICAN_PT_MASTER_SPEC_v3.md)

## Test pyramid

| Layer | Location | Command | Count (2026-07-07) |
|-------|----------|---------|-------------------|
| BE unit + integration | `nutrican-be/src/test/java/**` | `cd nutrican-be; ./mvnw test` | **120** tests (43 classes) |
| FE compile | `nutrican-fe/` | `cd nutrican-fe; npm run build` | build gate |
| Playwright `tests/` | **22** spec files | `cd e2e; npx playwright test tests/` | **58** test cases |
| Playwright v3.1 layers | 8 addendum specs | `npx playwright test -g "BE-only\|FE-only\|Hybrid"` | **34** cases |
| Optional smoke AI | `e2e/smoke/` | `E2E_REAL_AI=1 npx playwright test smoke/` | 1 spec (skip mặc định) |
| Orchestration | `scripts/test-all.ps1` | `-Layer be\|fe\|e2e\|all` | — |
| Manual | Checklist §1 | WS edge cases, admin food-tags UI, real AI smoke | — |

**Seed users (integration + E2E):** `UserInitializer` — `customer1@gmail.com`, `customer2@gmail.com`, `pt.certified@gmail.com`, `pt.freelance@gmail.com` (password `123456`). Admin dev: `admin@nutrican.com` / `Admin123!` (`DataInitializer`).

---

## 1. Manual checklist (dev + v3)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Analyze in-class food | Upload ảnh món trong 199 class → modal → confirm | Summary tăng; log `LOGGED` |
| 2 | Confirm + PT review | Tick "Gửi PT duyệt" → confirm → PT `/pt/reviews` | Pending → APPROVE; `reviewStatus=APPROVED` |
| 3 | NOT_FOOD gate | Upload ảnh không phải thức ăn | 400; không tạo log |
| 4 | OUT_OF_CLASS | Upload món ngoài manifest | `MANUAL_REQUIRED`; tab nhập tay |
| 5 | Diet pref filter | Profile VEGETARIAN → search "bò" | `!PREF` badge hoặc filter ẩn món |
| 6 | Control loop OVER | Log manual nhiều bữa >120% target | Card "Vượt macro" trên Diet Tracker |
| 7 | Recipe builder | Tab Công thức → 2 nguyên liệu → lưu → dùng lại → log | `MANUAL_RECIPE`, `HOME_COOKED_RECIPE` |
| 8 | Meal plan skip modal | Profile → Bỏ qua món → chọn NO_TIME | API skip; không dùng `window.prompt` |
| 9 | Customer suggest món | Profile suggest → PT meal plan / progress duyệt | Item meal plan đổi freeText |
| 10 | Weekly summary WS | PT gửi tổng kết tuần | Customer Profile badge + panel tổng kết |
| 11 | Post-meal opt-out | Profile tắt "Nhắc đánh giá" → log bữa | Không schedule localStorage prompt |
| 12 | Post-meal rating | Bật opt-in → đợi prompt hoặc mock localStorage | Sheet 3 rating; PT progress aggregate |
| 13 | Progress goals | Profile nhập baseline/target + ghi cân | `ProgressTimelineCard` cập nhật |
| 14 | Refund WS | Admin approve/reject refund | `REFUND_UPDATE` toast + reload |
| 15 | Admin RBL cohort | `/admin` → filter cohort key → export CSV | Cột `experiment_cohort_key` |
| 17 | Onboarding wizard | Register → login → /onboarding 3 bước | MacroTarget tự động; skip → banner Diet |
| 18 | Body metric GET | Profile ghi cân → lịch sử hiện | GET /profile/body-metrics |
| 19 | **v3.1** SMTP hire email | PT accept hire → customer inbox (MAIL_* in `.env`) | Email `hire-result` template |
| 20 | **v3.1** SOS SLA tab | Admin `/admin/sos` → tab Quá hạn 24h | Countdown / `Giao lại PT` |
| 21 | **v3.1** Notification prefs | Profile toggles hire/SOS/weekly/body-metric | Opt-out respected |
| 22 | **v3.1** Coaching confirm modal | Profile / PT clients → end coaching | Modal before API call |
| 23 | **v3.1** Chat context card | PT chat message with `contextType` | Card click → reviews |

---

## 2. Automated tests (BE)

Chạy: `cd nutrican-be; ./mvnw test`

### Unit / service

| Test class | Covers |
|------------|--------|
| `FoodGateServiceImplTest` | GATE-01 `preCheck`: NOT_FOOD, OUT_OF_CLASS, PASS |
| `MealAnalysisFusionTest` | LLaVA + ResNet fusion |
| `DietLogConfirmFlowTest` | Confirm → `LOGGED`; summary chỉ `LOGGED` |
| `DietLogManualSendToPtTest` | Manual `sendToPt` → PENDING + notify PT |
| `IntakeControlLoopServiceTest` | OVER_MACRO, AT_RISK, debounce 24h, suggest PT, NFR-12 fallback |
| `DietPrefCheckServiceTest` | Diet preference warnings |
| `AllergyCheckServiceTest` | foodCode ↔ allergen mapping |
| `UserRecipeServiceTest` | Macro sum, empty ingredients, pref warn, PUT update |
| `DietLogFeedbackServiceTest` | Save feedback, DRAFT reject, 3× energy=1 alert |
| `MealPlanServiceTest` | Macro >110% warning |
| `ProgressTimelineServiceTest` | Regression, projected completion |
| `PtWorkspaceReviewDualStateTest` | APPROVE → dual-state |
| `PtWorkspaceMealPlanSuggestionTest` | Suggest approve/reject |
| `ProgressAdherenceTest` | Adherence calculation |
| `UserProfileServiceResubmitTest` | PT resubmit after reject |
| `AppointmentValidationTest` | Expire / validation |
| `RefundControllerTest` | Auto approve + WS payload |
| `RblCohortUtilTest` | `experimentCohortKey` resolution |
| `BodyMetricServiceTest` | Future date, upsert same day, PT list guard, reminder opt-out |
| `BodyMetricReminderSchedulerTest` | WS reminder send / opt-out skip |
| `SosAdminServiceTest` | SLA reassign / invalid assign |
| `OnboardingServiceTest` | Step macro create, skip, body metric step 1 |

### Integration (`@ActiveProfiles("test")`, H2)

| Test class | Flow |
|------------|------|
| `DietFlowIntegrationTest` | Analyze → confirm → summary (mocked AI) |
| `MealPlanIntegrationTest` | Plan allergy + suggest→approve |
| `ManualLogPtReviewIntegrationTest` | Manual sendToPt → pending → APPROVE |
| `ProgressTimelineIntegrationTest` | Goals + regression alert (AC-BM-03) |
| `NotificationIntegrationTest` | markAllRead, body-metric-reminder-status |
| `CoachingLifecycleIntegrationTest` | End coaching, refund REFUND, maxClients hire 400 |
| `RecipeLogIntegrationTest` | Recipe create → log `MANUAL_RECIPE` |
| `PostMealAggregateIntegrationTest` | Feedback → PT progress aggregate |
| `RefundIntegrationTest` | Refund end-to-end |
| `OnboardingIntegrationTest` | Onboarding flow + skip banner + future body-metric 400 |
| `CoachingLifecycleIntegrationTest` | End coaching, refund REFUND, progress blocked after refund |
| `HireNotificationIntegrationTest` | Hire WS + email; opt-out skips email |

**Note:** `IntegrationTestBase` mocks `FoodGateService.preCheck()` → PASS.

---

## 3. Playwright E2E (`e2e/tests/`)

| Spec | AC / feature |
|------|----------------|
| `ac01-auth.spec.ts` | AC-1 register/login |
| `ac02-food-gate.spec.ts` | GATE-01, NOT_FOOD, OUT_OF_CLASS |
| `ac04-confirm-allergy.spec.ts` | AC-4.2 allergy (GLUTEN) |
| `ac04b-diet-pref.spec.ts` | **v3** diet preference filter |
| `ac04-control-loop.spec.ts` | **v3** OVER_MACRO — BE summary + Hybrid banner |
| `ac05-pt-review.spec.ts` | AC-5 manual PT queue |
| `ac06-pt-onboarding.spec.ts` | AC-6.4 PT resubmit |
| `ac08-meal-plan.spec.ts` | AC-8 skip modal + meal plan |
| `ac09-appointment.spec.ts` | AC-9 appointments |
| `ac10-refund.spec.ts` | AC-10 refund |
| `ac11-recipe.spec.ts` | **v3** recipe tab + validation |
| `ac12-progress.spec.ts` | **v3** goals + weight |
| `ac13-post-meal.spec.ts` | **v3** rating prompt |
| `ac15-rbl-admin.spec.ts` | **v3** admin RBL + customer 403 export |
| `ac-onboarding.spec.ts` | **v3.1** wizard + skip + onboarding-status BE |
| `ac-notifications.spec.ts` | **v3.1** hire notification + bell + markAllRead |
| `ac-lifecycle.spec.ts` | **v3.1** hire blocked 400 + coaching UI |
| `ac-sos-sla.spec.ts` | **v3.1** SLA breach tab + PT SOS |
| `ac-sos-reassign.spec.ts` | **v3.1** admin reassign UI |
| `ac-chat-context.spec.ts` | **v3.1** chat-context API + sidebar |
| `ac-marketplace-filter.spec.ts` | **v3.1** goal chips + search empty |
| `ac-body-metric-reminder.spec.ts` | **v3.1** reminder API + future date 400 + opt-out |

**Env:** `E2E_API_URL` (default `http://localhost:8080/api/v1`), `E2E_BASE_URL` (default `http://localhost:5173`).  
**Helpers:** `e2e/fixtures/auth.ts` (`uiLogin`, `apiLogin`), `e2e/fixtures/api.ts` (`customerRequest`, `acceptHireRequest`, `getNotifications`, `getBodyMetricReminderStatus`, …).

**v3 subset:**

```bash
npx playwright test ac11-recipe ac12-progress ac13-post-meal ac04b-diet-pref ac04-control-loop ac15-rbl-admin
```

---

## 4. FE smoke (manual)

- `VITE_WS_URL` — chat, `REFUND_UPDATE`, `WEEKLY_SUMMARY`, `PT_CLIENT_ALERT`
- `websocketService.js` — handlers trên + `DIET_LOG_REVIEWED`
- `ProfilePage` — health, meal plan + `MealPlanSkipModal`, weekly summary panel, post-meal opt-out toggle
- `DietTrackerPage` — recipe tab, `NutritionProgress` intake status, `PostMealRatingSheet`
- `PtMealPlanPage` — suggestion queue; `ClientProgressPage` — post-meal line chart
- `AdminDashboardPage` — RBL cohort key table + filter

---

## 5. Env notes

- BE dev: `ddl-auto=create-drop` — restart sau schema change (`notification_opt_in` JSONB trên `users`, v.v.)
- Test profile: `application-test.properties` + H2
- AI: integration/E2E mock AI; smoke real AI: `e2e/smoke/ai-real-analyze.spec.ts` (cần Ollama + ai-service)

---

## 6. Handoff cho AI reviewer

Bộ docs đồng bộ **2026-07-07** — đọc [`TEAM_ONBOARDING.md`](./TEAM_ONBOARDING.md) trước khi push.

| Verify | Command |
|--------|---------|
| BE 120 tests | `cd nutrican-be; ./mvnw test` |
| FE build | `cd nutrican-fe; npm run build` |
| E2E 22 specs + v3.1 layers | `.\scripts\test-all.ps1 -Layer e2e -SkipDocker` (BE :8080 running) |
| Full gate | `.\scripts\test-all.ps1 -Layer all -SkipDocker` (BE running for E2E) |
