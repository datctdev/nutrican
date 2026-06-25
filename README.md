# NutriCan PT - AI-Powered Nutrition Tracking Platform

Ung dung theo doi dinh duong voi tich hop AI, ket noi PT, va theo doi tien tri.

## Cau Truc Du An

```
nutrican-pt-workspace/
nutrican-be/                      # Backend - Spring Boot (Modular Monolith)
  src/main/java/com/sba/nutricanbe/
    common/                       # Shared models, entities, repositories, enums, utils
    auth/                         # Authentication, security filters & JWT
    kyc/                          # KYC verification (VNPT OCR + Face Liveness)
    user/                         # User profiles, marketplace, body metrics
    diet/                         # Diet logging, Food Catalog, SOS support tickets
    ai/                           # Ollama AI integration & dish prediction
    workspace/                    # Personal Trainer workspace, notifications & SSE
    admin/                        # Admin dashboard, configurations & system management
nutrican-fe/                      # Frontend - React 19 + Vite
  src/pages/      # Route pages
  src/components/ # UI components
  src/services/   # API services
  src/stores/     # Zustand state
docs/             # Full documentation
```

## Cong Nghe Su Dung

| Component | Backend | Frontend |
|-----------|---------|----------|
| Framework | Spring Boot 4.0.6 | React 19.2.6 |
| Language | Java 17 | JavaScript |
| Database | PostgreSQL | - |
| Storage | MinIO (S3) | - |
| AI | Ollama (llava) & ResNet50 | - |

## Quick Start

```bash
cd nutrican-be && docker-compose up -d
./mvnw spring-boot:run
cd ../nutrican-fe && npm install && npm run dev
```

## Tai Khoan Mac Dinh

| Vai tro | Email | Mat khau |
|---------|-------|----------|
| Admin | admin@nutrican.com | Admin123! |

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Frontend](docs/FRONTEND.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Research](docs/RESEARCH.md)
- [RBL Methodology](docs/RBL_METHODOLOGY.md)

Swagger UI: http://localhost:8080/swagger-ui.html

---
*Version 3.0.0 | Last Updated: 2026-06-20*
