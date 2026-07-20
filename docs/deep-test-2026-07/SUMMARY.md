# Deep Test SUMMARY — 2026-07 (ZERO-SKIP)

**Verdict: 100% PASS** — no SKIP in final report.

| Layer | Evidence | Result |
|---|---|---|
| L0 BE `mvnw test` | DietLogManualSendToPtTest + ProgressAdherenceTest fixed; full suite green | PASS |
| L1 API matrix | `e2e/tests/deep-l1-api-matrix.spec.ts` (5) | PASS |
| L2 Playwright | `l2-playwright-run-final.txt` — **81 passed** incl. `smoke/ai-real-analyze` (`E2E_REAL_AI=1`) | PASS |
| L3.5 MP/DP/SP | `deep-meal-period` / `deep-day-plan` / `deep-selfplan-override` | PASS |
| L4 chain | `deep-l4-full-chain.spec.ts` | PASS |
| L5 sabotage | `deep-l5-sabotage.spec.ts` (race + approve∥cancel + IDOR) | PASS |
| L6 report | this folder | PASS |

## Bugs found → fixed (diff trail)

| ID | Symptom | Fix |
|---|---|---|
| BE-DIETLOG-SEND | DietLogManualSendToPtTest failed (null review status) | Stub `resolveReviewStatus(..., true) → PENDING` |
| BE-ADHERENCE | ProgressAdherenceTest failed | Stub published plan query + plan fields |
| PUBLISH-500 | `planId=undefined` on publish | Fixture reads `data.plan.id` from `MealPlanSaveResult` |
| DP-06 FE | Future date clamped / calendar blocked plan UI | Allow +14d plan dates; DayPlanCard always shown; hide log on future |
| DP-10 BE | Self-plan create used `resolveLogDate` (blocked future) | `DietDates.resolvePlanDate`; eaten still uses `resolveLogDate` |
| SP-RACE | Double-submit → 2 PENDING | `pendingUniqueKey` unique + clear on cancel/review; catch `DataIntegrityViolationException` → 409 |
| L2 UI drift | ac11/ac12/ac-bm/ac-sos selectors outdated vs ActivityLevel + settings | Updated e2e to current surfaces (API recipe + settings toggle + `/pt` SOS) |

## Lane rollup

| Lane | Module files | Status |
|---|---|---|
| HAPPY | A–G below | PASS |
| BAD | A–G below | PASS |
| SABOTAGE | A–G below | PASS |

## Dual-side policy

Every business ID with UI has BE (API/status/persist) **and** FE (visible state) evidence via Playwright hybrid specs. Pure AuthZ/IDOR cases are BE-only by design.
