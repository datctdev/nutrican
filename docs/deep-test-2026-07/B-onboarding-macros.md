# Module B — Onboarding + ActivityLevel + RecalculateMacros

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| ONB-01…05 | HAPPY | OnboardingIntegrationTest / ac-onboarding | wizard + skip banner | ✓ | ✓ | macro target | — | ✓ | — | PASS |
| RECALC-HAPPY | HAPPY | POST recalculate-macros → `data.macros` | MacroTargets activity select + apply | ✓ | ✓ | calories/protein | — | ✓ | L1 + ac12 | PASS |
| RECALC-BAD | BAD | bad ActivityLevel enum → 400 | — | ✓ | — | — | — | — | L1 | PASS |
| HAS-PT | HAPPY | GET has-active-pt | DayPlan submit CTA | ✓ | ✓ | — | hasActivePt | ✓ | L1 + SP FE | PASS |
