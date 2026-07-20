# ID Coverage — Deep Test 2026-07 (ZERO-SKIP)

Policy: every ID must end as **PASS**. "Manual" means will be executed via browser/API in this audit (not abandoned).

## Wired (existing automation)

| ID | Source | Lane |
|---|---|---|
| AUTH-01 customer login → diet | e2e/tests/ac01-auth.spec.ts | HAPPY |
| AUTH-02 PT login → dashboard | e2e/tests/ac01-auth.spec.ts | HAPPY |
| ONB-01 POST onboarding step2 hasMacroTarget | e2e/tests/ac-onboarding.spec.ts | HAPPY |
| ONB-02 seeded completed | e2e/tests/ac-onboarding.spec.ts | HAPPY |
| ONB-03 new register incomplete | e2e/tests/ac-onboarding.spec.ts | HAPPY |
| ONB-04 FE wizard land | e2e/tests/ac-onboarding.spec.ts | HAPPY |
| ONB-05 skip banner | e2e/tests/ac-onboarding.spec.ts | HAPPY |
| FG-01 food gate | e2e/tests/ac02-food-gate.spec.ts | HAPPY/BAD |
| ALG-01 allergy confirm | e2e/tests/ac04-confirm-allergy.spec.ts | HAPPY |
| CL-01 OVER_MACRO summary | e2e/tests/ac04-control-loop.spec.ts | HAPPY |
| CL-02 OVER_MACRO banner FE | e2e/tests/ac04-control-loop.spec.ts | HAPPY |
| DP-PREF-* | e2e/tests/ac04b-diet-pref.spec.ts | HAPPY |
| PT-REV-* | e2e/tests/ac05-pt-review.spec.ts | HAPPY |
| MP-LEGACY-* | e2e/tests/ac08-meal-plan.spec.ts | HAPPY |
| POSTMEAL-* | e2e/tests/ac13-post-meal.spec.ts | HAPPY |
| AI-REAL-* | e2e/smoke/ai-real-analyze.spec.ts | HAPPY |
| BE-ONB-* | OnboardingIntegrationTest / OnboardingServiceTest | HAPPY/BAD |
| BE-RECALC-* | RecalculateMacrosIntegrationTest | HAPPY |
| BE-MEALPLAN-* | MealPlanServiceTest / MealPlanIntegrationTest | HAPPY |
| BE-DIETFLOW-* | DietFlowIntegrationTest | HAPPY |
| BE-DIETLOG-SEND | DietLogManualSendToPtTest | HAPPY (PASS — L0 fixed) |
| BE-ADHERENCE | ProgressAdherenceTest | HAPPY (PASS — L0 fixed) |
| DEEP-L1…L5 | e2e/tests/deep-*.spec.ts | HAPPY/BAD/SABOTAGE (PASS) |

## Sprint scope — must automate or manual-to-PASS

### Module C — meal periods (MP-01…MP-08)
| ID | Lane | Path |
|---|---|---|
| MP-01 | HAPPY | new e2e + dietUtils |
| MP-02 | HAPPY | new e2e |
| MP-03 | HAPPY | new e2e |
| MP-04 | HAPPY | new e2e / unit dietUtils |
| MP-05 | BAD | new e2e |
| MP-06 | BAD | new e2e |
| MP-07 | SABOTAGE | API |
| MP-08 | SABOTAGE | API |

### Module E — day plan (DP-01…DP-10)
| ID | Lane | Path |
|---|---|---|
| DP-01…DP-10 | HAPPY/BAD/SABOTAGE | new e2e + API |

### Module F — self-plan override (SP-01…SP-14)
| ID | Lane | Path |
|---|---|---|
| SP-01…SP-14 | HAPPY/BAD/SABOTAGE | new e2e + API |

### Module A/B/G gates
| ID | Lane | Path |
|---|---|---|
| API-401/403/IDOR | SABOTAGE | L1 matrix |
| RECALC-BAD enum | BAD | L1 matrix |
| HAS-PT | HAPPY | L1 matrix |
