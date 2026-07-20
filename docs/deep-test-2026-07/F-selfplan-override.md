# Module F — Submit / Cancel / PT override (SP-01…14)

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| SP-01/02 | HAPPY | PENDING lock 409; cancel unlock | badge / CTA | ✓ | ✓ | — | published plan | ✓ | deep-selfplan | PASS |
| SP-03/04/05 | HAPPY | PT list; REJECT needs note; APPROVE → SELF_OVERRIDE | — | ✓ | ✓ | override scope | mealTypes | ✓ | deep-selfplan | PASS |
| SP-07/08 | HAPPY | tick SELF_OVERRIDE → DietLog; PT_ORIGINAL no log | summary kcal | ✓ | ✓ | actual↑ | — | ✓ | L4 chain | PASS |
| SP-09…13 | BAD | past/no-plan/double PENDING/locked mutate/eaten with PT | — | ✓ | ✓ | — | 400/409 | ✓ | deep-selfplan | PASS |
| SP-14 | SABOTAGE | IDOR cancel; double review | — | ✓ | — | — | — | ✓ | deep-selfplan | PASS |
| SP-RACE | SABOTAGE | double-submit → 1 PENDING (unique key) | — | ✓ | ✓ | — | — | — | deep-l5 | PASS |
| SP-RACE2 | SABOTAGE | approve∥cancel → terminal non-PENDING | — | ✓ | ✓ | — | — | — | deep-l5 | PASS |
| SP-IDOR | SABOTAGE | customer2 PUT/DELETE/cancel/review | — | ✓ | — | — | — | ✓ | deep-l5 | PASS |
