# Smoke results — Debate playbook

**When:** 2026-07-24 ~20:18 ICT  
**Targets:** BE `localhost:8080`, FE `localhost:5173`  
**Method:** API login + GET key endpoints (password `123456`)

## Summary

**29 PASS / 1 FAIL** trên run đầu (wallet path sai); sau chỉnh path: **coaching-wallet/me = 200**.

Overall smoke cho W1–W6: **PASS** (API readiness). Full hire VNPay + UI diet vẫn cần test tay.

## W1 — Auth

| Check | Result |
|-------|--------|
| Login `solo@` / `customer@` / `pt@` / `admin@` | PASS |
| Sai mật khẩu | PASS (reject) |
| Customer gọi `/admin/finance/overview` | PASS (403) |
| FE `/login` | PASS (200) |

## W2 — Solo (`solo@`)

| Check | Result |
|-------|--------|
| `GET /profile/has-active-pt` → false | PASS |
| `GET /profile/goals` | PASS (WEIGHT_LOSS) |
| `GET /profile/body-metrics` | PASS (5 rows, có bodyFat/LBM) |
| `GET /profile/milestones` | PASS (2) |

## W3 — Coached (`customer@` + `pt@`)

| Check | Result |
|-------|--------|
| customer `hasActivePt` | PASS (true) |
| customer goals | PASS (MAINTAIN) |
| `GET /workspace/clients` (PT) | PASS |
| `GET /workspace/diet-logs/pending` | PASS |
| coaching-history | PASS |

## W4 — Hire readiness

| Check | Result |
|-------|--------|
| Login `customer3@` + `pt.offline@` | PASS |
| customer3 `hasActivePt=false` | PASS (sẵn hire) |
| Marketplace list | PASS (4 PTs) |
| `customer2@` + `pt.freelance@` | PASS |

Chưa automate: Accept → VNPay → ACTIVE (làm tay theo TEST_PLAYBOOK W4).

## W5 — Money / end

| Check | Result |
|-------|--------|
| Login hv.an / bao / chi / endreq | PASS |
| Cả bốn `hasActivePt=true` | PASS (endreq = END_REQUESTED vẫn coached) |
| `GET /coaching-wallet/me` (pt@) | PASS (available **3,190,000**) |
| Admin finance overview | PASS (heldEscrowCount=**3**, pendingSessionDisputeCount=0) |
| Admin finance transactions | PASS |

## W6 — Admin + reviews

| Check | Result |
|-------|--------|
| `/admin/pts/pending` | PASS |
| `/admin/pts/update-requests/pending` | PASS |
| `/admin/users` | PASS |
| Marketplace card Coach Nutrican | rating **4.4**, totalReviews **10** |
| Reviews với **userId** | PASS (10 elements) |
| Reviews với **profileId** | FAIL empty — FE đúng dùng `userId` trên PtDetailPage |

## Debate note từ smoke

1. Seed reviews + rating sync **OK** trên listing.  
2. Wallet path đúng: `/coaching-wallet/me`.  
3. Escrow showcase (3 held) hiện trên admin finance.  
4. END_REQUESTED vẫn `hasActivePt=true` — đúng BR.  
5. Điểm yếu audit trước (withdraw SUCCESS, goals API, JWT limited…) **chưa được smoke phá** — vẫn dùng mục 5 trong TEST_PLAYBOOK khi debate.
