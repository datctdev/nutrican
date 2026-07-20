# Module E — Day plan SELF + live preview (DP-01…10)

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| DP-01/02/03 | HAPPY | CRUD self-plan + GET day-plan | Plan ăn ngày card | ✓ | ✓ | macro scale | — | ✓ | deep-day-plan | PASS |
| DP-04/05 | HAPPY | day-plan items | NutritionProgress planned + OVER_MACRO | ✓ | ✓ | actual+planned | — | — | L2 ac04 + deep | PASS |
| DP-06 | HAPPY | planDate future OK | card on `?date=tomorrow`, no eat | ✓ | ✓ | — | future plan | — | deep-day-plan | PASS |
| DP-07 | BAD | SELF+PT both in day-plan | FE mute PT when SELF | ✓ | ✓ | anti double-count | — | — | deep-day-plan | PASS |
| DP-09/10 | SABOTAGE | eaten blocked (PT / future) | buttons hidden future | ✓ | ✓ | — | hasActivePt / resolveLogDate | ✓ | deep-day-plan | PASS |
