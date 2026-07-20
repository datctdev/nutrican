# Module A — Auth / login

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | HAPPY | login 200 + token | diet page loads | ✓ | ✓ | — | — | ✓ | cookie→/diet | PASS |
| AUTH-02 | HAPPY | PT login | /pt dashboard | ✓ | ✓ | — | — | ✓ | — | PASS |
| API-401 | SABOTAGE | day-plan no token → 401/403 | — | ✓ | — | — | — | ✓ | L1 | PASS |
