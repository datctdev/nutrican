# NutriCan — Team Onboarding (pull → chạy → test)

> Cập nhật: 2026-07-07 · Addendum v3.1 **Done** (ADD-01..08)  
> Matrix đầy đủ: [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md)

## 1. Yêu cầu máy dev

| Tool | Phiên bản gợi ý |
|------|-----------------|
| Java | 17+ |
| Node.js | 20+ |
| Docker Desktop | PostgreSQL, MinIO, Redis (chạy app local) |
| Maven | dùng `nutrican-be/mvnw` (không cần cài global) |

## 2. Clone & cấu hình env

```bash
git clone <repo-url>
cd nutrican
```

**Backend** — copy và điền giá trị:

```bash
cp nutrican-be/.env.example nutrican-be/.env
```

Tối thiểu: `DATASOURCE_URL`, `JWT_SECRET_KEY` (≥32 ký tự), `CORS_ALLOWED_ORIGINS=http://localhost:5173`.  
Email (hire/SOS): `MAIL_*` trong `.env` — xem comment trong file.  
**Test BE không cần Docker** — profile `test` dùng H2 in-memory.

**Frontend**:

```bash
cp nutrican-fe/.env.example nutrican-fe/.env
```

Điền `VITE_API_URL=http://localhost:8080/api/v1`. Firebase có thể để trống nếu chỉ login email/password.

## 3. Chạy ứng dụng (dev)

```bash
# Terminal 1 — infra
cd nutrican-be && docker compose up -d

# Terminal 2 — BE
cd nutrican-be && ./mvnw spring-boot:run

# Terminal 3 — FE
cd nutrican-fe && npm install && npm run dev
```

- FE: http://localhost:5173  
- Swagger: http://localhost:8080/swagger-ui.html

## 4. Tài khoản seed (dev + E2E)

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Customer 1 | customer1@gmail.com | 123456 |
| Customer 2 | customer2@gmail.com | 123456 |
| PT certified | pt.certified@gmail.com | 123456 |
| PT freelance | pt.freelance@gmail.com | 123456 |
| Admin | admin@nutrican.com | Admin123! |

Seed: `UserInitializer` + `DataInitializer` (chạy khi BE start).

## 5. Regression gate trước khi push PR

Chạy **theo thứ tự** — không cần stack chạy cho Phase 1–2:

```powershell
# Windows (khuyến nghị)
.\scripts\test-all.ps1 -Layer be -SkipDocker    # 120 tests H2
.\scripts\test-all.ps1 -Layer fe -SkipDocker  # npm run build

# E2E — cần BE :8080 + FE (Playwright tự start FE nếu chưa chạy)
cd nutrican-be; docker compose up -d; ./mvnw spring-boot:run   # terminal riêng
.\scripts\test-all.ps1 -Layer e2e -SkipDocker
```

```bash
# Linux/macOS — tương đương
cd nutrican-be && ./mvnw test
cd nutrican-fe && npm run build
cd e2e && npm install && npx playwright install chromium
# BE đang chạy :8080 rồi:
cd e2e && npx playwright test
```

### Playwright 3 lớp (Addendum v3.1)

| Lớp | Mô tả | Lệnh |
|-----|--------|------|
| **BE-only** | API + JWT, không UI | `npx playwright test -g "BE-only"` |
| **FE-only** | UI login, assert DOM | `npx playwright test -g "FE-only"` |
| **Hybrid** | API setup → UI verify | `npx playwright test -g "Hybrid"` |

Specs v3.1: `ac-onboarding`, `ac-body-metric-reminder`, `ac-notifications`, `ac-sos-sla`, `ac-sos-reassign`, `ac-chat-context`, `ac-lifecycle`, `ac-marketplace-filter`.

Env E2E (tùy chọn):

- `E2E_API_URL` — default `http://localhost:8080/api/v1`
- `E2E_BASE_URL` — default `http://localhost:5173`
- `E2E_SKIP_WEBSERVER=1` — nếu FE đã chạy sẵn

## 5b. Full E2E prerequisites

Trước khi chạy Playwright (layer `e2e` hoặc `all`):

1. **Docker** — `cd nutrican-be && docker compose up -d` (Postgres, MinIO, Redis)
2. **`.env`** — `nutrican-be/.env` từ `.env.example` (JWT ≥32 ký tự, CORS, DB URL)
3. **Backend** — `.\mvnw spring-boot:run` trong terminal riêng; đợi log seed xong (~30s)
4. **Playwright browsers** — `cd e2e && npx playwright install chromium` (một lần)

Gate đầy đủ (một lệnh khi BE đã chạy):

```powershell
.\scripts\test-all.ps1 -Layer e2e -SkipDocker
# Chạy: 22 spec (58 cases) + v3.1 layers (34 cases)
```

Gate toàn bộ (BE test + FE build + E2E):

```powershell
.\scripts\test-all.ps1 -Layer all -SkipDocker   # E2E vẫn cần BE :8080 riêng
```

## 6. Addendum v3.1 — trạng thái & test

| ADD | Feature | Happy test | Bad test |
|-----|---------|------------|----------|
| ADD-01 | Onboarding wizard + banner | `OnboardingIntegrationTest`, `ac-onboarding` | skip → banner |
| ADD-02 | Body metric + reminder | `BodyMetricServiceTest`, `ProgressTimelineIntegrationTest` | future date 400 |
| ADD-03 | Chat context + PDF | `ChatContextServiceTest`, `ac-chat-context` | no ACTIVE mapping 400 |
| ADD-04 | Marketplace filter | `MarketplaceCompatibilityTest`, `ac-marketplace-filter` | empty search |
| ADD-05 | SOS SLA + reassign | `SosSlaSchedulerTest`, `SosAdminServiceTest` | short resolve note |
| ADD-06 | Notifications | `NotificationIntegrationTest`, `ac-notifications` | email opt-out |
| ADD-07 | Coaching lifecycle | `CoachingLifecycleIntegrationTest`, `ac-lifecycle` | hire 400, maxClients |
| ADD-08 | BR-17 debounce | `IntakeControlLoopServiceTest` | PENDING review blocks alert |

**BE:** 120 tests · **Playwright:** 22 spec / **58** cases · **v3.1 layers:** **34** cases · Chi tiết: [`TESTING_E2E_MATRIX.md`](./TESTING_E2E_MATRIX.md)

## 7. Troubleshooting

| Vấn đề | Cách xử lý |
|--------|------------|
| BE test fail JDBC | Không cần Postgres — `./mvnw test` dùng profile `test` |
| E2E login fail / 429 | Kiểm tra BE :8080 + seed; đợi seed ~30s; localhost tắt rate limit (`nutrican.rate-limit.enabled=false` dev) |
| E2E stateful fail | Restart BE (`mvnw spring-boot:run`) để reset seed trước full suite |
| Playwright timeout | `E2E_SKIP_WEBSERVER=1` nếu `npm run dev` đã chạy |
| Email không gửi | Kiểm tra `MAIL_*` trong `nutrican-be/.env` |
