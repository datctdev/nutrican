# NutriCan PT - Architecture Documentation

## 1. System Overview

NutriCan PT is an AI-powered nutrition tracking platform that connects users with Personal Trainers (PTs). The system uses a microservices-inspired modular architecture with Spring Boot on the backend and React on the frontend.

### 1.1 High-Level Architecture

```
                            ┌──────────────────────────────────────────────┐
                            │                    CLIENTS                   │
                            ├──────────────────────────────────────────────┤
                            │                                              │
                            │   ┌──────────┐   ┌──────────┐            │
                            │   │ Browser  │   │  Mobile  │            │
                            │   │  (React) │   │   (PWA)  │            │
                            │   └─────┬────┘   └─────┬────┘            │
                            └─────────┼───────────────┼─────────────────┘
                                      │               │
                                      └───────┬───────┘
                                              │
                                         HTTPS/REST
                                              │
┌─────────────────────────────────────────────┼────────────────────────────────────────────────┐
│                                        INTERNET                                        │
└─────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                              │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
            │    Frontend   │          │    Backend    │          │    External   │
            │   (React)    │          │(Spring Boot)  │          │    Services   │
            │              │          │               │          │              │
            │  React 19   │          │  Java 17      │          │   Ollama AI  │
            │  Vite       │          │  Spring 4.x   │          │   MinIO      │
            │  Tailwind   │          │  PostgreSQL   │          │              │
            │  Zustand    │          │               │          │              │
            └──────┬──────┘          └───────┬───────┘          └───────────────┘
                   │                          │
                   │                          ▼
                   │                 ┌───────────────┐
                   │                 │   PostgreSQL  │
                   │                 │  (Database)   │
                   │                 └───────────────┘
                   │
                   │                 ┌───────────────┐
                   │                 │     MinIO     │
                   │                 │  (S3 Storage) │
                   │                 └───────────────┘
```

---

## 2. Backend Architecture

### 2.1 Module Structure (Multi-Module Maven)

```
nutrican-be/
├── pom.xml                                  # Parent POM
├── docker-compose.yml                       # Infrastructure (PostgreSQL, MinIO)
├── .env / .env.example                     # Environment configuration
├── minio-init.sh                           # MinIO bucket initialization
├── ollama-init.sh                          # Ollama model setup

├── nutritiontrack-module-core/              # Shared entities, utils
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/core/
│       ├── entity/                         # JPA Entities
│       │   ├── BaseEntity.java
│       │   ├── User.java
│       │   ├── DietLog.java
│       │   ├── DietLogImage.java          # Multi-image support
│       │   ├── MacroTarget.java
│       │   ├── PtProfile.java
│       │   ├── PtClientMapping.java
│       │   ├── SOSTicket.java
│       │   ├── BodyMetric.java
│       │   ├── Review.java
│       │   ├── Notification.java
│       │   └── UserKyc.java              # KYC verification
│       ├── repository/                     # Spring Data Repositories
│       ├── enums/                          # Enumerations
│       │   ├── UserRole.java
│       │   ├── UserStatus.java
│       │   ├── MealType.java
│       │   ├── DietLogStatus.java
│       │   ├── ClientMappingStatus.java
│       │   ├── Tier.java
│       │   ├── SOSTicketStatus.java
│       │   └── PtType.java
│       ├── util/                           # Utilities
│       │   ├── JwtUtil.java
│       │   └── MacroUtils.java
│       ├── dto/                            # Common DTOs
│       │   ├── ApiResponse.java
│       │   └── PageResponse.java
│       ├── service/                        # Shared services
│       │   └── MinioService.java
│       └── exception/                       # Exception handling
│           ├── GlobalExceptionHandler.java
│           ├── ResourceNotFoundException.java
│           ├── UnauthorizedException.java
│           └── BadRequestException.java

├── nutritiontrack-module-auth/              # Authentication & KYC
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/auth/
│       ├── controller/
│       │   └── AuthController.java          # Auth + KYC endpoints
│       ├── service/
│       │   ├── AuthService.java
│       │   ├── AuthServiceImpl.java
│       │   ├── KycService.java
│       │   └── KycServiceImpl.java
│       ├── dto/
│       │   ├── LoginRequest.java
│       │   ├── RegisterRequest.java
│       │   ├── RegisterPtRequest.java
│       │   ├── RefreshTokenRequest.java
│       │   ├── AuthResponse.java
│       │   ├── PtRequestDto.java
│       │   ├── KycRequest.java
│       │   ├── KycStatusDto.java
│       │   └── RejectRequest.java
│       └── security/
│           ├── SecurityConfig.java
│           └── JwtAuthenticationFilter.java

├── nutritiontrack-module-user-profile/        # User profiles & marketplace
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/userprofile/
│       ├── controller/
│       │   ├── UserProfileController.java
│       │   └── MarketplaceController.java
│       ├── service/
│       │   ├── UserProfileService.java
│       │   ├── UserProfileServiceImpl.java
│       │   ├── MarketplaceService.java
│       │   └── MarketplaceServiceImpl.java
│       └── dto/
│           ├── UserProfileResponse.java
│           ├── UpdateProfileRequest.java
│           ├── MacroTargetRequest.java
│           ├── MacroTargetResponse.java
│           ├── PtProfileResponse.java
│           ├── PtSearchRequest.java
│           ├── ReviewResponse.java
│           └── CreateReviewRequest.java

├── nutritiontrack-module-diet-tracker/       # Diet logging
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/diet/
│       ├── controller/
│       │   └── DietLogController.java
│       ├── service/
│       │   ├── DietLogService.java
│       │   ├── DietLogServiceImpl.java
│       │   ├── DietLogImageService.java
│       │   └── DietLogImageServiceImpl.java
│       └── dto/
│           ├── CreateDietLogRequest.java
│           ├── DietLogResponse.java
│           ├── AnalyzeMealResponse.java
│           ├── DietSummaryResponse.java
│           ├── CreateSosRequest.java
│           └── DietLogImageDTO.java

├── nutritiontrack-module-ai-gateway/         # AI Integration
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/ai/
│       ├── controller/
│       │   └── AiController.java
│       ├── service/
│       │   ├── MealRecognitionService.java
│       │   ├── MealRecognitionServiceImpl.java  # qwen2.5-vl integration
│       │   ├── OllamaService.java
│       │   ├── OllamaServiceImpl.java           # WebFlux HTTP client
│       │   ├── NutritionChatbotService.java
│       │   └── NutritionChatbotServiceImpl.java
│       └── dto/
│           └── MealRecognitionResult.java

├── nutritiontrack-module-pt-management/      # PT Workspace
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/workspace/
│       ├── controller/
│       │   └── PtWorkspaceController.java
│       ├── service/
│       │   ├── PtWorkspaceService.java
│       │   ├── PtWorkspaceServiceImpl.java
│       │   └── SseEmitterService.java          # Real-time SSE
│       └── dto/
│           ├── ClientStatusDto.java
│           ├── DietLogReviewResponse.java
│           ├── ProgressDataDto.java
│           ├── ReviewActionRequest.java
│           └── PtStatsDto.java

├── nutritiontrack-module-admin/               # Admin Dashboard
│   ├── pom.xml
│   └── src/main/java/com/sba/nutrican_be/admin/
│       ├── controller/
│       │   └── AdminController.java
│       ├── service/
│       │   ├── AdminService.java
│       │   └── AdminServiceImpl.java
│       ├── dto/
│       │   ├── AdminDashboardDto.java
│       │   ├── PendingPtDto.java
│       │   ├── PendingKycDto.java
│       │   └── PtVerificationRequest.java
│       └── config/
│           └── DataInitializer.java           # Seeds default admin

└── nutritiontrack-module-application/         # Main Application
    ├── pom.xml
    └── src/main/java/com/sba/nutrican_be/
        ├── NutricanBeApplication.java         # Entry point
        ├── WebConfig.java
        ├── WebClientConfig.java              # WebClient beans
        └── OpenApiConfig.java                # SpringDoc Swagger
```

### 2.2 Module Dependencies

```
nutritiontrack-module-application (Entry Point)
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
nutritiontrack-module-admin               nutritiontrack-module-pt-management
         │                                              │
         │                                              ▼
         │                              nutritiontrack-module-diet-tracker
         │                                              │
         │                                              ▼
         │                              nutritiontrack-module-ai-gateway
         │                                              │
         ├──────────────────────────────────────────────┤
         │                                              │
         ▼                                              ▼
nutritiontrack-module-user-profile          nutritiontrack-module-auth
         │                                              │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
                   nutritiontrack-module-core
         (Entities, Repositories, Utils, Exceptions, MinioService)
```

### 2.3 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Spring Boot | 4.0.6 |
| Language | Java | 17 |
| ORM | Spring Data JPA | - |
| Security | Spring Security + JWT | - |
| Database | PostgreSQL | 17 |
| Object Storage | MinIO | 8.5.12 |
| AI | Ollama + WebFlux | qwen2.5-vl |
| API Documentation | SpringDoc OpenAPI | 2.5.0 |
| JWT Library | jjwt | 0.12.6 |
| Build Tool | Maven | 3.9+ |

---

## 3. Frontend Architecture

### 3.1 Project Structure

```
nutrican-fe/
├── src/
│   ├── components/
│   │   ├── ui/                        # Radix UI primitives
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   ├── label.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── avatar.jsx
│   │   │   ├── select.jsx
│   │   │   ├── separator.jsx
│   │   │   ├── scroll-area.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   ├── toast.jsx
│   │   │   └── toaster.jsx
│   │   │
│   │   ├── common/                    # Custom shared components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   └── layouts/                   # Layout components
│   │       ├── MainLayout.jsx
│   │       ├── AuthLayout.jsx
│   │       └── Header.jsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── PtRegistrationPage.jsx
│   │   │
│   │   ├── customer/
│   │   │   ├── DietTrackerPage.jsx
│   │   │   ├── MarketplacePage.jsx
│   │   │   ├── PtDetailPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   │
│   │   ├── pt/
│   │   │   ├── PtDashboardPage.jsx
│   │   │   ├── ClientListPage.jsx
│   │   │   └── ReviewDietLogPage.jsx
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── PtVerificationPage.jsx
│   │   │   ├── UserManagementPage.jsx
│   │   │   └── SosTicketsPage.jsx
│   │   │
│   │   └── LandingPage.jsx
│   │
│   ├── services/
│   │   ├── api.js                    # Axios instance + interceptors
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── dietService.js
│   │   ├── marketplaceService.js
│   │   ├── workspaceService.js
│   │   ├── adminService.js
│   │   └── sseService.js             # Server-Sent Events
│   │
│   ├── stores/
│   │   ├── authStore.js              # Zustand + persist
│   │   ├── dietStore.js
│   │   └── notificationStore.js
│   │
│   ├── hooks/
│   │   ├── useToast.js
│   │   └── useSSE.js
│   │
│   ├── App.jsx                       # React Router v7 configuration
│   ├── App.css
│   ├── main.jsx
│   └── index.css
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── .env.example
```

### 3.2 Frontend Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| UI Framework | React | 19.2.6 |
| Build Tool | Vite | 8.0.12 |
| Routing | React Router | 7.15.1 |
| State Management | Zustand | 5.0.13 |
| Data Fetching | TanStack Query | 5.100.14 |
| HTTP Client | Axios | 1.16.1 |
| CSS Framework | Tailwind CSS | 3.4.19 |
| UI Primitives | Radix UI | - |
| Icons | Lucide React | 1.16.0 |
| Toast | Sonner | 2.0.7 |

---

## 4. Database Architecture

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    users                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ id (PK, UUID), email (UNIQUE), password_hash, role, status                     │
│ full_name, avatar_url, phone_number, address, date_of_birth                  │
│ google_id (UNIQUE), created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ├───────────────────┬───────────────────────────────────┬──────────────────┐
         │                   │                                   │                  │
         ▼                   ▼                                   ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   user_kyc      │ │  pt_profiles    │ │  macro_targets  │ │  diet_logs     │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ id (PK)         │ │ id (PK)         │ │ id (PK)         │ │ id (PK)         │
│ user_id (FK,1:1)│ │ user_id (FK,1:1)│ │ user_id (FK,1:1)│ │ customer_id (FK)│
│ id_card_number  │ │ is_verified     │ │ daily_calories  │ │ image_url       │
│ id_card_front   │ │ bio, tier       │ │ protein, carb   │ │ macros_json     │
│ id_card_back    │ │ rating, certifs │ │ fat            │ │ meal_type, status│
│ verification_st │ │ verification_st │ │                 │ │ pt_reviewer_id  │
│ rejection_reason│ │                 │ │                 │ │ sos_ticket_flag │
│ reviewed_at,by   │ │                 │ │                 │ │ log_date        │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └────────┬────────┘
                                                                        │
                                    ┌──────────────────────────────────┤
                                    │                                  │
                                    ▼                                  ▼
                         ┌─────────────────┐              ┌─────────────────┐
                         │ diet_log_images │              │  sos_tickets    │
                         ├─────────────────┤              ├─────────────────┤
                         │ id (PK)         │              │ id (PK)         │
                         │ diet_log_id(FK) │              │ diet_log_id(FK) │
                         │ image_url       │              │ pt_id (FK)      │
                         │ is_primary,sort │              │ assigned_by(FK) │
                         │ file_size,type  │              │ status, priority│
                         │ ai_confidence   │              │ note            │
                         │ macros_json     │              │                 │
                         └─────────────────┘              └────────┬────────┘
                                                                    │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  body_metrics   │ │    reviews      │ │ notifications   │       │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤       │
│ id (PK)         │ │ id (PK)         │ │ id (PK)         │       │
│ user_id (FK)    │ │ pt_id (FK)      │ │ user_id (FK)    │       │
│ record_date     │ │ reviewer_id(FK) │ │ type, message   │       │
│ weight, body_fat│ │ rating, comment │ │ is_read         │       │
│ lbm, muscle_mass│ │                 │ │ reference_id    │       │
└─────────────────┘ └─────────────────┘ └─────────────────┘       │
                                                                    │
┌─────────────────┐                                                 │
│pt_client_mapping│                                                 │
├─────────────────┤                                                 │
│ id (PK)         │                                                 │
│ pt_id (FK)      │◄───────────────────────────────────────────────┘
│ client_id (FK)  │◄───────────────────────────────────────────────┘
│ status,assigned │
└─────────────────┘
```

### 4.2 Database Schema Summary

| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `users` | id | - | User accounts with roles |
| `user_kyc` | id | user_id (1:1) | KYC verification documents |
| `pt_profiles` | id | user_id (1:1) | PT extended profiles |
| `macro_targets` | id | user_id (1:1) | Daily macro targets |
| `diet_logs` | id | customer_id, pt_reviewer_id | Meal entries |
| `diet_log_images` | id | diet_log_id (N:1) | Multi-image per meal |
| `pt_client_mappings` | id | pt_id, client_id | PT-Client relationships |
| `sos_tickets` | id | diet_log_id, pt_id, assigned_by | SOS support tickets |
| `body_metrics` | id | user_id | Body measurements |
| `reviews` | id | pt_id, reviewer_id | PT reviews |
| `notifications` | id | user_id | User notifications |

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
Client  → POST /auth/login     → Backend  → Find User     → DB
         ← {accessToken,       ← Backend ← Validate       ←
            refreshToken}                    BCrypt
         → API Request + Bearer → Backend  → Validate JWT  → JWT
         ← Response              ← Backend ← Load User    ← DB
```

### 5.2 JWT Token Structure

**Access Token:**
```json
{
  "sub": "user@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "CUSTOMER",
  "iat": 1706400000,
  "exp": 1706403600
}
```

**Refresh Token:**
```json
{
  "sub": "user@example.com",
  "type": "refresh",
  "iat": 1706400000,
  "exp": 1706662800
}
```

### 5.3 Role-Based Access Control

```
Endpoint Pattern           │ CUSTOMER │ PT_FREELANCE │ PT_CERTIFIED │ ADMIN │
──────────────────────────┼──────────┼───────────────┼───────────────┼───────┤
/api/v1/auth/**           │    ✓     │       ✓       │       ✓       │   ✓   │
/api/v1/profile/**        │    ✓     │       ✓       │       ✓       │   ✓   │
/api/v1/diet/**           │    ✓     │       ✗       │       ✗       │   ✗   │
/api/v1/marketplace/**    │    ✓     │       ✓       │       ✓       │   ✓   │
/api/v1/workspace/**      │    ✗     │       ✓       │       ✓       │   ✗   │
/api/v1/admin/**          │    ✗     │       ✗       │       ✗       │   ✓   │
```

✓ = Allowed, ✗ = Denied

---

## 6. Real-Time Architecture (SSE)

```
Client (React)  → GET /workspace/stream  →  Backend (SseEmitterService)
    │                                    │
    │◄──── event: CONNECTED             │
    │                                    │
    │                     ◄── Diet Log Created ───│
    │                                    │
    │◄──── event: NEW_DIET_LOG           │
    │                                    │
    │                     ◄── SOS Ticket Created ──│
    │                                    │
    │◄──── event: SOS_TICKET             │
```

| Event | Trigger | Payload |
|-------|---------|---------|
| `CONNECTED` | Connection established | `{ status: "connected" }` |
| `NEW_DIET_LOG` | Client creates diet log | `{ client_id, client_name, log_id, meal_type }` |
| `SOS_TICKET` | Client creates SOS | `{ client_id, client_name, priority, type: "SOS" }` |

---

## 7. AI Integration Architecture

### 7.1 Meal Recognition Flow

```
Client (Upload Image)  →  Backend  →  MinIO (store image)
                                    │
                                    ▼
                          Ollama (qwen2.5-vl)
                          { vision + prompt }
                                    │
                                    ▼
                          AnalyzeMealResponse
                          { foodName, calories, protein,
                            carb, fat, confidenceScore }
```

### 7.2 AI Model Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model | `qwen2.5-vl` | Vision-language model |
| Base URL | `http://localhost:11434` | Ollama endpoint |
| Temperature (Meal) | 0.1 | Low for consistent nutrition data |
| Temperature (Chat) | 0.7 | Balanced creativity |
| Fallback | 300 cal, 15g protein | Default when AI fails |

---

## 8. Deployment Architecture

### 8.1 Docker Compose Services

```yaml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: nutrican_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - backend
```

### 8.2 Production Deployment

```
                        ┌──────────────────────────────────┐
                        │         Load Balancer             │
                        │        (Nginx/Traefik)            │
                        └─────────────────┬────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────┐
         │                                 │                  │
         ▼                                 ▼                  ▼
┌───────────────────┐        ┌─────────────────┐   ┌─────────────────┐
│  Frontend CDN     │        │    Backend      │   │    Backend      │
│  (Static Files)  │        │   (Instance 1)  │   │   (Instance 2)  │
│                   │        │  Spring Boot    │   │  Spring Boot    │
└───────────────────┘        └────────┬────────┘   └────────┬────────┘
                                        │                    │
                                        └──────────┬─────────┘
                                                   │
                                        ┌──────────┴──────────┐
                                        │                      │
                                        ▼                      ▼
                               ┌─────────────┐        ┌─────────────┐
                               │ PostgreSQL  │        │    MinIO    │
                               │  (RDS/Multi │        │  (S3-like)  │
                               │   AZ)       │        │             │
                               └─────────────┘        └─────────────┘
```

---

## 9. Monitoring & Observability

### 9.1 Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `/actuator/health` | Application health |
| `/actuator/info` | Application info |
| `/actuator/metrics` | Prometheus metrics |

### 9.2 Logging Strategy

- **Framework**: SLF4J + Logback
- **Format**: JSON for production
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Rotation**: Daily + size-based

---

## 10. Performance Considerations

| Data | Cache | TTL |
|------|-------|-----|
| User Profile | In-memory | Request-scoped |
| PT Listings | None (DB query) | - |
| Static Assets | CDN | 1 year |

- **Indexes**: On frequently queried columns (user_id, status, dates)
- **Pagination**: Default 20 items, max 100
- **Connection Pool**: HikariCP with sensible defaults
- **Image Optimization**: Max 500KB, JPEG/PNG only, stored in MinIO

---

## 11. Backup & Recovery

| Data | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 30 days |
| MinIO | Daily | 90 days |
| Config | On change | Git |

---

*Document Version: 2.0.0*
*Last Updated: 2026-06-04*
