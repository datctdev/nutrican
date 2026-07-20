# NutriCan PT — AI-Powered Nutrition & Coaching Platform

Nền tảng theo dõi dinh dưỡng tích hợp AI, kết nối Personal Trainer (PT), quản lý coaching online/offline, meal plan và nghiên cứu RBL (Review-Based Learning).

## Cấu trúc dự án

```
nutrican-pt-workspace/
├── nutrican-be/          # Backend — Spring Boot 4.1 modular monolith (Java 17)
├── nutrican-fe/          # Frontend — React 19 + Vite 8
├── e2e/                  # Playwright E2E tests
├── research/             # ResNet50 AI service, datasets, thesis assets
├── scripts/              # test-all.ps1, seed helpers, SQL backfills
└── docs/                 # Tài liệu kỹ thuật đầy đủ
```

### Backend modules (`com.sba.nutricanbe`)

| Module | Mô tả |
|--------|--------|
| `auth` | JWT, Firebase Google, password reset, token revocation |
| `user` | Profile, marketplace, hire, appointments, venues, notifications |
| `diet` | Diet logs, meal plans, self-plan, food catalog, SOS |
| `workspace` | PT workspace, meal templates, WebSocket realtime |
| `payment` | VNPay coaching payment, escrow, coaching wallet |
| `chat` | PT–client messaging |
| `kyc` | VNPT eKYC (OCR, liveness, face compare) |
| `ai` | Ollama LLaVA + ResNet50 meal recognition |
| `admin` | Dashboard, PT verification, RBL export, SOS admin |
| `common` / `config` / `infrastructure` | Shared entities, security, MinIO, Redis, mail |

## Công nghệ

| Layer | Stack |
|-------|--------|
| Backend | Spring Boot 4.1, Java 17, PostgreSQL 17, Redis, MinIO |
| Frontend | React 19, Vite 8, Tailwind, Radix UI, Zustand, TanStack Query |
| AI | Ollama (LLaVA), ResNet50 FastAPI (`research/ai-service`) |
| Payment | VNPay sandbox |
| Realtime | WebSocket `/ws/workspace` |

## Quick Start

```bash
# 1. Env
cp nutrican-be/.env.example nutrican-be/.env    # điền JWT, DB, MinIO...
cp nutrican-fe/.env.example nutrican-fe/.env    # VITE_API_URL=http://localhost:8080/api/v1

# 2. Infra + Backend
cd nutrican-be && docker compose up -d
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run

# 3. Frontend
cd ../nutrican-fe && npm install && npm run dev
```

- FE: http://localhost:5173  
- Swagger: http://localhost:8080/swagger-ui.html  

Chi tiết: [docs/TEAM_ONBOARDING.md](docs/TEAM_ONBOARDING.md) · [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Tài khoản seed (dev)

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@nutrican.com | Admin123! |
| Customer | customer1@gmail.com | 123456 |
| PT certified | pt.certified@gmail.com | 123456 |
| Demo solo (không PT) | demo.solo@nutrican.com | Demo123! |
| Demo coached (có PT) | demo.coached@nutrican.com | Demo123! |
| **PT offline (dev)** | pt.offline@gmail.com | 123456 |
| **Customer offline test** | customer3@gmail.com | 123456 |

## Test trước khi push

```powershell
.\scripts\test-all.ps1 -Layer be -SkipDocker   # BE unit/integration (H2)
.\scripts\test-all.ps1 -Layer fe -SkipDocker   # FE production build
.\scripts\test-all.ps1 -Layer e2e -SkipDocker  # Playwright (cần BE :8080)
```

## Tài liệu

| Doc | Nội dung |
|-----|----------|
| [docs/INDEX.md](docs/INDEX.md) | Mục lục toàn bộ docs |
| [docs/TONG_HOP_DU_AN_FE_BE.md](docs/TONG_HOP_DU_AN_FE_BE.md) | Workflow + code map FE/BE |
| [docs/FEATURES.md](docs/FEATURES.md) | Mô tả tính năng |
| [docs/FEATURE_OFFLINE_PT_HIRE.md](docs/FEATURE_OFFLINE_PT_HIRE.md) | Hire PT offline — gói đa buổi |
| [docs/FEATURE_MEAL_WINDOWS_SELFPLAN.md](docs/FEATURE_MEAL_WINDOWS_SELFPLAN.md) | 5 buổi ăn + self-plan |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST API reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc hệ thống |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Schema PostgreSQL |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Frontend routing & services |
| [docs/TESTING_E2E_MATRIX.md](docs/TESTING_E2E_MATRIX.md) | Ma trận test E2E |

---
*Version 3.2.0 · Last Updated: 2026-07-20*
