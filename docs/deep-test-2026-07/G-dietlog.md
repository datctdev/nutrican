# Module G — DietLog service / helper

| ID | Lane | BE | FE | Contract | State | Số liệu | Gate | AuthZ | Cross-check | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-DIETLOG-SEND | HAPPY | DietLogManualSendToPtTest | — | ✓ | PENDING review | — | sendToPt | — | L0 | PASS |
| BE-ADHERENCE | HAPPY | ProgressAdherenceTest | — | ✓ | published plan | adherence | — | — | L0 | PASS |
| BE-DIETFLOW | HAPPY | DietFlowIntegrationTest | diary UI | ✓ | ✓ | summary | — | ✓ | L0 + L2 | PASS |
| L4-CHAIN | HAPPY | log→submit→approve→tick→summary | /diet progress | ✓ | ✓ | kcal move | full chain | ✓ | deep-l4 | PASS |
