# NutriCan v3 — E2E Test Matrix (AC → Test Layers)

> Traceability: [`NUTRICAN_PT_MASTER_SPEC_v3.md`](./NUTRICAN_PT_MASTER_SPEC_v3.md) §14  
> Layers: **BE Unit** | **BE Integration** | **Playwright** | **Manual**  
> Columns **Happy** / **Bad** = primary path covered in that layer.

| AC | Scenario | Happy | Bad | BE Unit | BE Integration | Playwright |
|----|----------|-------|-----|---------|----------------|------------|
| AC-1 | Auth register/login | ✓ | 401 refresh | — | `SecurityIntegrationTest` | `ac01-auth.spec.ts` |
| AC-2 | Food gate | PASS in-class | NOT_FOOD / OUT_OF_CLASS | `FoodGateServiceImplTest` | `DietFlowIntegrationTest` | `ac02-food-gate.spec.ts` |
| AC-3 | Analyze → logId | ✓ | rate limit | — | `DietFlowIntegrationTest` | stub AI |
| AC-4.1 | Confirm → LOGGED | ✓ | cancel draft | `DietLogConfirmFlowTest` | `DietFlowIntegrationTest` | — |
| AC-4.2 | Allergy on confirm | warning shown | no allergen | `AllergyCheckServiceTest` | — | `ac04-confirm-allergy.spec.ts` |
| AC-4.4–6 | Control loop OVER/UNDER/AT_RISK | OVER_MACRO card | debounce 24h no WS | `IntakeControlLoopServiceTest` | partial `DietFlowIntegrationTest` | `ac04-control-loop.spec.ts` |
| AC-04b | Diet pref filter / !PREF | VEGETARIAN + meat | filter off | `DietPrefCheckServiceTest` | — | `ac04b-diet-pref.spec.ts` |
| AC-5 | Manual PT review | sendToPt → PENDING → APPROVE | wrong PT 403 | `DietLogManualSendToPtTest` | `ManualLogPtReviewIntegrationTest` | `ac05-pt-review.spec.ts` |
| AC-6 | PT onboarding | resubmit | — | `UserProfileServiceResubmitTest` | — | `ac06-pt-onboarding.spec.ts` |
| AC-8 | Meal plan | suggest → approve | skip + reason modal | `MealPlanServiceTest`, `PtWorkspaceMealPlanSuggestionTest` | `MealPlanIntegrationTest` | `ac08-meal-plan.spec.ts` |
| AC-9 | Appointments | book / list | cancel late | `AppointmentValidationTest` | — | `ac09-appointment.spec.ts` |
| AC-10 | Refund | auto approve | reject | `RefundControllerTest` | `RefundIntegrationTest` | `ac10-refund.spec.ts` |
| AC-11 | Recipe + MANUAL_RECIPE log | create + log HOME_COOKED | empty ingredients 400 | `UserRecipeServiceTest` | `RecipeLogIntegrationTest` | `ac11-recipe.spec.ts` |
| AC-12 | Progress timeline | goals + weight | no goals null projection | `ProgressTimelineServiceTest` | `ProgressTimelineIntegrationTest` | `ac12-progress.spec.ts` |
| AC-13 | Post-meal rating | submit 3 ratings | DRAFT → 400 | `DietLogFeedbackServiceTest` | `PostMealAggregateIntegrationTest` | `ac13-post-meal.spec.ts` |
| AC-ONB | Customer onboarding | wizard → MacroTarget | skip → banner | `OnboardingServiceTest` | `OnboardingIntegrationTest` | `ac-onboarding.spec.ts` |
| AC-ONB-04 | Onboarding resume | step saved → forceRedirect | — | — | `OnboardingIntegrationTest.onboardingResume_continuesFromSavedStep` | `ac-onboarding` Hybrid (resume link) |
| AC-BM | Body metric log | POST + GET history | **future date 400** (E2E BE) | `BodyMetricServiceTest` | `OnboardingIntegrationTest` | `ac12-progress`, `ac-body-metric-reminder` |
| AC-BM-04 | Weekly weight reminder | WS + DB notify + banner | opt-out no remind | `BodyMetricReminderSchedulerTest` | `NotificationIntegrationTest` | `ac-body-metric-reminder.spec.ts` |
| AC-BM-03 | Weight regression alert | 2× +0.6kg → active | &lt;0.5kg inactive | `ProgressTimelineServiceTest` | `ProgressTimelineIntegrationTest` | `ac12-progress.spec.ts` |
| AC-BR17 | PT alert debounce | no alert if PENDING review | alert if no pending | `IntakeControlLoopServiceTest` | — | `ac04-control-loop` (BE OVER_MACRO + Hybrid banner) |
| AC-LIFE | Coaching lifecycle | end request → COMPLETED | hire blocked; maxClients 400; progress 401 refund | `CoachingLifecycleServiceTest`, `SosSlaServiceTest` | `CoachingLifecycleIntegrationTest` | `ac-lifecycle.spec.ts` |
| AC-LIFE-04 | Coaching history read-only | COMPLETED mapping in profile | — | — | `CoachingLifecycleIntegrationTest` | `ac-lifecycle` Hybrid (history section) |
| AC-NOTIF | Notification center | persist + hire email; markAllRead | email opt-out | `NotificationServiceTest` | `HireNotificationIntegrationTest`, `NotificationIntegrationTest` | `ac-notifications.spec.ts` |
| AC-NOTIF-DL | Notification deep link | `linkType` + `linkRefId` navigate | missing link → no crash | — | — | `ac-notifications` FE-only (bell panel); manual Header |
| AC-SOS-SLA | SOS resolution note | resolve ≥20 chars | short note 400 | `SosSlaServiceTest`, `SosSlaSchedulerTest` | — | `ac-sos-sla.spec.ts` |
| AC-SOS-07 | Admin reassign SLA ticket | reassign resets SLA | assign without breach 400 | `SosAdminServiceTest` | — | `ac-sos-reassign.spec.ts` |
| AC-MKT | Marketplace goal filter | compatibility sort | no match filter | `MarketplaceCompatibilityTest` | — | `ac-marketplace-filter.spec.ts` |
| AC-CHAT | Chat context + PDF | sidebar + context card | no ACTIVE mapping 400 | — | `ChatContextServiceTest` | `ac-chat-context.spec.ts` |
| AC-14 | Security RBAC | CUSTOMER diet | CUSTOMER admin 403 | — | `SecurityIntegrationTest` | `ac15-rbl-admin.spec.ts` (403 export) |
| AC-15 | Alerts debounce | 3× energy=1 WS | 2× no alert | `IntakeControlLoopServiceTest`, `DietLogFeedbackServiceTest` | — | — |
| GAP-K | RBL cohort key | export column + stats | insufficient sample | `RblCohortUtilTest`, `RblAdminStatsUtilTest` | — | `ac15-rbl-admin.spec.ts` |

## Re-audit Addendum v3.1 (2026-07-07)

| ADD | Implementation | Happy tests | Bad tests | Ghi chú |
|-----|----------------|-------------|-----------|---------|
| ADD-01 Onboarding | **Done** | BE+FE+Hybrid `ac-onboarding` | skip banner, resume, incomplete status, legacy completed | FR-ONB-04 marketplace redirect = manual |
| ADD-02 Body metrics | **Done** | `ac-body-metric-reminder`, `ac12-progress` | **future date 400**, regression (BE integration) | WS regression alert = BE unit only |
| ADD-03 Chat context | **Done** | `ac-chat-context` 3 layers | no ACTIVE mapping 400 | CHAT-04 reject .exe/.zip = polish, manual |
| ADD-04 Marketplace | **Done** | `ac-marketplace-filter` | empty goal/search | FE diet chips / PREGNANT = P2 polish |
| ADD-05 SOS SLA | **Done** | `ac-sos-sla`, `ac-sos-reassign` | short note 400 (BE unit) | Full resolve flow = manual §20 |
| ADD-06 Notifications | **Done** | `ac-notifications` 3 layers | hire accept idempotent, markAllRead | SOS/refund email opt-out = BE integration |
| ADD-07 Lifecycle | **Done** | `ac-lifecycle` 3 layers | hire 400 when ACTIVE PT | Full COMPLETED flow = destructive, manual |
| ADD-08 BR-17 | **Done** | `IntakeControlLoopServiceTest` | no alert when PENDING (unit); `ac04-control-loop` BE OVER_MACRO | BR-17 WS duplicate = unit only |

**Kết luận:** Không còn gap **implementation P0/P1/P2**. Còn polish ngoài AC (chat `.exe`, marketplace diet UI, PREGNANT chip) — chấp nhận trước push.

**Counts (2026-07-07 v3.1 full matrix):** **120** BE tests · **22** Playwright spec files in `e2e/tests/` · **+1** optional smoke (`e2e/smoke/ai-real-analyze.spec.ts`, skip unless `E2E_REAL_AI=1`) · ADD-01..08 implementation **Done**

## ADD-01..08 traceability (Gap Addendum v3.1)

| ADD | AC / FR | Happy | Bad | BE Unit | BE Integration | Playwright Layer | Manual |
|-----|---------|-------|-----|---------|----------------|------------------|--------|
| ADD-01 Onboarding | AC-ONB-01..04 | wizard → MacroTarget | skip → banner; resume step 2 | `OnboardingServiceTest` | `OnboardingIntegrationTest` | BE+FE+Hybrid `ac-onboarding` | §17 wizard |
| ADD-02 Body metrics | AC-BM-01..04, BM-05 | POST weight, regression | future date; no regression | `BodyMetricServiceTest`, `ProgressTimelineServiceTest`, `BodyMetricReminderSchedulerTest` | `ProgressTimelineIntegrationTest`, `NotificationIntegrationTest` | BE+FE+Hybrid `ac-body-metric-reminder`, `ac12-progress` | §18 ghi cân |
| ADD-03 Chat context | CHAT-01..05 | chat-context 200, sidebar | no ACTIVE mapping 400 | — | `ChatContextServiceTest` | BE+FE+Hybrid `ac-chat-context` | §23 context card |
| ADD-04 Marketplace | AC-MKT-01..02 | filter + compatibility | empty filter | `MarketplaceCompatibilityTest` | — | BE+FE+Hybrid `ac-marketplace-filter` | marketplace chips |
| ADD-05 SOS SLA | SOS-04..10 | 24h escalate, resolve ≥20 | short note 400; 4h skip if responded | `SosSlaServiceTest`, `SosSlaSchedulerTest`, `SosAdminServiceTest` | — | BE+FE `ac-sos-sla`, `ac-sos-reassign` | §20 SOS tab |
| ADD-06 Notifications | NOTIF-01..07 | persist, hire email, markAllRead, deep link | email opt-out | `NotificationServiceTest` | `HireNotificationIntegrationTest`, `NotificationIntegrationTest` | BE+FE+Hybrid `ac-notifications` | §19 SMTP, prefs |
| ADD-07 Lifecycle | AC-LIFE-01..05 | end → COMPLETED; history read-only | hire 400; maxClients; refund block PT | `CoachingLifecycleServiceTest` | `CoachingLifecycleIntegrationTest` | BE+FE+Hybrid `ac-lifecycle` | §22 confirm modal |
| ADD-08 BR-17 | AC-BR17-01..03 | alert when AT_RISK | no alert if PENDING review | `IntakeControlLoopServiceTest` | — | `ac04-control-loop` | control loop card |

Playwright layer filter: `npx playwright test -g "BE-only"` | `-g "FE-only"` | `-g "Hybrid"`

## Test layers (v3.1 Playwright)

| Layer | Mô tả | Ví dụ spec |
|-------|--------|------------|
| **BE-only** | `request` + JWT, không UI | `ac-notifications` hire → GET `/notifications` |
| **FE-only** | UI login, assert DOM | `ac-marketplace-filter` goal chips |
| **Hybrid** | API setup → UI verify | `ac-lifecycle` confirm modal |

## Run commands

```powershell
# Windows — regression gate (không cần Docker cho BE test)
.\scripts\test-all.ps1 -Layer be -SkipDocker   # 120 tests
.\scripts\test-all.ps1 -Layer fe -SkipDocker   # FE build
.\scripts\test-all.ps1 -Layer e2e -SkipDocker  # cần BE :8080
```

```bash
# Phase 1 — BE
cd nutrican-be && ./mvnw test

# Phase 2 — FE build
cd nutrican-fe && npm run build

# Phase 3 — E2E (BE :8080 + FE :5173; Playwright auto-starts Vite)
cd e2e && npm install && npx playwright install chromium
npx playwright test tests/                          # 22 spec — full gate
npx playwright test -g "BE-only|FE-only|Hybrid"     # 8 spec v3.1 — 3 layers
```

Or one command (after BE running): `.\scripts\test-all.ps1 -Layer e2e -SkipDocker`

## Regression gate results

| Run | BE tests | FE build | Playwright `tests/` | v3.1 3-layer | Notes |
|-----|----------|----------|---------------------|--------------|-------|
| 2026-07-07 (re-audit) | **120/120** pass | pass | **58/58** pass (22 spec) | **34/34** pass | Re-audit addendum v3.1 + bad-case E2E (BM future 400, ONB status, control loop BE layer) |

See also: [`TESTING_V2_FLOWS.md`](./TESTING_V2_FLOWS.md), [`TEAM_ONBOARDING.md`](./TEAM_ONBOARDING.md), [`NUTRICAN_PT_MASTER_SPEC_v3.md`](./NUTRICAN_PT_MASTER_SPEC_v3.md)

## Handoff cho AI reviewer

| Doc | Mục đích |
|-----|----------|
| [NUTRICAN_PT_MASTER_SPEC_v3.md](./NUTRICAN_PT_MASTER_SPEC_v3.md) §Trạng thái triển khai | GAP-A…K + regression gate |
| [PRODUCT_REQUIREMENTS_SUMMARY.md](./PRODUCT_REQUIREMENTS_SUMMARY.md) | PRD, gap §13, API §14 |
| [TONG_HOP_DU_AN_FE_BE.md](./TONG_HOP_DU_AN_FE_BE.md) | Code map + v3 APIs §16.1 |
| **File này** | AC → test layers (Happy/Bad) |
| [TESTING_V2_FLOWS.md](./TESTING_V2_FLOWS.md) | Class list + manual checklist |
| [NUTRICAN_PT_MASTER_SPEC_v2.md](./NUTRICAN_PT_MASTER_SPEC_v2.md) | Lõi v2 (archive) |
