# Module C — Diet tracker meal periods (MP-01…08)

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| MP-01/02 | HAPPY | mealType map on log | AI/manual `<select>` 5 periods | ✓ | ✓ | — | period default | — | deep-meal-period | PASS |
| MP-03/04 | HAPPY | manual log | diary + Buổi/Bữa labels | ✓ | ✓ | — | SNACK labels | — | deep-meal-period | PASS |
| MP-05/06 | BAD | — | past options disabled + hint “đã qua giờ” | ✓ | ✓ | — | AI lock / future warn | — | deep-meal-period | PASS |
| MP-07 | SABOTAGE | invalid mealType → 400 | — | ✓ | — | — | — | — | deep-meal-period | PASS |
| MP-08 | SABOTAGE | future logDate → 400 | future log UI blocked | ✓ | ✓ | — | DietDates | — | deep-meal-period | PASS |
