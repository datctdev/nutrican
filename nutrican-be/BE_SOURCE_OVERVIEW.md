# Nutrican BE — Tóm tắt source code

Tài liệu giúp nắm nhanh kiến trúc Spring Boot backend (`nutrican-be`) để trả lời khi được hỏi về cấu trúc / trách nhiệm từng phần.

- **Package gốc:** `com.sba.nutricanbe`
- **Kiểu kiến trúc:** Feature-based layered monolith (theo domain: `diet`, `user`, `auth`…)
- **Luồng chuẩn mỗi feature:** `Controller` → `Service` / `ServiceImpl` → `Repository` → `Entity`
- **Entry:** `NutricanBeApplication.java` — `@SpringBootApplication`, bật `@EnableScheduling`, `@EnableAsync`

---

## Cách trả lời thầy (1 phút)

> BE chia theo **feature package**. Mỗi package có controller (HTTP), service (nghiệp vụ), entity/repo (DB).  
> Ví dụ: nhận diện món nằm ở `ai` (ResNet + LLaVA); nhật ký / plan ăn nằm ở `diet`; thuê PT / ví nằm ở `payment` + `user`; PT duyệt log / WebSocket nằm ở `workspace`.  
> `common` + `infrastructure` dùng chung (JWT, giờ VN, mail, MinIO, Redis).

---

## Sơ đồ phụ thuộc (tóm tắt)

```
config (Security, OpenAPI, RateLimit)
        ↓
auth  ←→  user  ←→  payment / kyc
        ↓
ai (catalog + nhận diện) → diet (log, plan, self-plan)
        ↓
workspace (PT review, WebSocket chat events)
        ↑
admin (dashboard, duyệt PT, RBL)
```

---

## Package `config` (root)

**Việc gì:** Cấu hình ngang toàn app (không thuộc 1 domain).

| File | Làm gì |
|------|--------|
| `SecurityConfig` | JWT filter chain, CORS, phân quyền HTTP, BCrypt |
| `RateLimitFilter` | Giới hạn số request / IP |
| `OpenApiConfig` | Swagger / OpenAPI + bearer JWT |
| `WebConfig` | Đăng ký `CurrentUserArgumentResolver` |
| `WebClientConfig` | Bean `WebClient` gọi HTTP ra ngoài |

---

## 1. Package `ai` — Nhận diện món & chatbot

**Việc gì:** Gọi AI (ResNet, LLaVA/Ollama), gộp kết quả, food-gate, chatbot dinh dưỡng.

### `ai/catalog` — “Từ điển” món / macro cho AI

Không phải API; là **dữ liệu + mapping** load từ JSON trên classpath.

| File | Làm gì |
|------|--------|
| `ResNetClassManifest` | Load danh sách class ResNet (~199 món unified) từ JSON |
| `ResNetFoodCodeMapping` | Map `food_code` ResNet → tên hiển thị |
| `ResNetFoodDefaults` | Macro mặc định cho bộ ResNet nhỏ (fallback) |
| `NutriHomeCatalog` | Catalog macro NutriHome (PDF→JSON) |
| `A1_0FixedMacros` | Macro cố định theo food_code (dataset RBL) |
| `FoodCodeCategory` | Nhóm cuisine (VN / Food-101…) phục vụ fusion / guardrail |

### Các phần còn lại trong `ai`

| Thư mục / file | Làm gì |
|----------------|--------|
| `controller/AiController` | API `/api/v1/ai`: analyze ảnh, analyze URL, chat, health |
| `config/ResNetClassManifestConfig` | Chọn profile class ResNet lúc startup |
| `service/MealRecognitionService` | Pipeline nhận diện món (file/URL, cache) |
| `service/ResNetFoodRecognitionClient` | Client HTTP gọi service ResNet |
| `service/LlavaMealAnalysisService` | Gọi LLaVA phân tích ảnh |
| `service/OllamaService` | Client Ollama |
| `service/FoodGateService` | Gate sau AI (chặn / cho qua kết quả) |
| `service/NutritionChatbotService` | Chatbot dinh dưỡng |
| `util/MealAnalysisFusion` | Fusion ResNet + LLaVA + NutriHome → code/grams/macros |
| `util/LlavaMealPromptBuilder` | Xây prompt LLaVA |
| `dto/*` | DTO kết quả AI (prediction, gate, fusion…) |

**Câu trả lời mẫu:** *“Folder `ai/catalog` không chứa business flow; nó cung cấp mapping food_code và macro cố định để pipeline nhận diện và fusion dùng. API vào qua `AiController`, xử lý chính ở `MealRecognitionService`.”*

---

## 2. Package `diet` — Domain dinh dưỡng (lớn nhất)

**Việc gì:** Catalog món, nhật ký ăn, day plan / timeline, meal plan PT, self-plan (user tự đề xuất), recipe, vòng kiểm soát calo.

### Controllers

| File | Làm gì |
|------|--------|
| `DietLogController` | CRUD nhật ký, confirm nhận diện, ảnh log, summary |
| `DayPlanController` | Day plan, timeline, self-plan CRUD / gửi PT |
| `FoodCatalogController` | Search món, ResNet dishes, hotpot… |
| `MealPlanController` | PT soạn plan + customer tương tác (tick, skip…) |
| `RecipeController` | Công thức người dùng |
| `FoodDietTagController` | Admin gắn diet tags |

### Services quan trọng

| File | Làm gì |
|------|--------|
| `MealAnalysisService` | Analyze / confirm món (gọi `ai`) |
| `DietLogService` / `DietLogHelper` | Nhật ký + rule reviewStatus theo có PT hay không |
| `DayPlanService` / `DayTimelineService` | Plan ngày + timeline plan vs thực tế |
| `SelfPlanService` | User tự lên món, submit chờ PT |
| `MealPlanAuthoringService` | PT soạn meal plan |
| `MealPlanInteractionService` | Customer tick đã ăn / skip / đề xuất |
| `FoodCatalogService` | Catalog DB |
| `IntakeControlLoopService` | Cảnh báo over/under macro |
| `DietPrefCheckService` | Cảnh báo dị ứng / preference trên plan |

### Entity chính

`FoodItem`, `DietLog` (+ item/image/feedback), `MealPlan` / `MealPlanItem`, `SelfPlanItem` / `SelfPlanSubmission`, `UserRecipe`, `IntakeDayStatus`…

### Util / config seed

| File | Làm gì |
|------|--------|
| `AnalyzeMealContextFactory` | Map form multipart → context analyze (tách khỏi controller) |
| `FoodCatalogDataInitializer` / `ResNetFoodCatalogInitializer` | Seed món vào DB |

**Câu trả lời mẫu:** *“Diet là core: AI chỉ nhận diện; `diet` lưu log, plan, so khớp thực tế/plan, self-plan gửi PT.”*

---

## 3. Package `auth` — Đăng nhập / JWT

| File | Làm gì |
|------|--------|
| `AuthController` | Register, login, refresh, logout, Google, quên mật khẩu |
| `AuthService` | Nghiệp vụ auth |
| `JwtAuthenticationFilter` | Đọc Bearer JWT → SecurityContext |
| `GoogleIdTokenService` | Verify Google token |
| `TokenRevocationService` | Blacklist token khi logout |
| Entity: `PasswordResetToken`, `RevokedToken` | Quên MK / revoke |

---

## 4. Package `user` — Hồ sơ, marketplace, lịch, macro

| Nhóm | Làm gì |
|------|--------|
| `UserProfileController` / `UserProfileService` | Profile, macro target |
| `ProfileExtensionsController` | Dị ứng, preference, body metric, `hasActivePt`, recalculate macros |
| `MarketplaceController` / `PtHireService` | Tìm & thuê PT |
| `AppointmentController` / `AppointmentService` | Đặt lịch coaching |
| `RefundController` / `RefundService` | Yêu cầu hoàn tiền |
| `NotificationController` | Thông báo in-app |
| `OnboardingService` | Onboarding lần đầu |
| `CoachingLifecycleService` | Kết thúc coaching |
| `DemoVeteranDataInitializer` / `UserInitializer` | Seed demo (`solo@`, `customer@`, `pt@`…) |
| `BodyMetricReminderScheduler` | Cron nhắc cân |

Entity chính: `User`, `PtProfile`, `PtClientMapping`, `PtAppointment`, `BodyMetric`, `MacroTarget`, `ClientGoal`, `RefundRequest`, `Notification`…

---

## 5. Package `workspace` — Không gian PT

| File | Làm gì |
|------|--------|
| `PtWorkspaceController` | Clients, duyệt diet log, progress, alerts |
| `PtDietLogReviewService` | PT duyệt / từ chối nhật ký |
| `PtClientService` / `PtDashboardService` / `PtProgressService` | Danh sách HV, dashboard, tiến độ |
| `PtTemplateService` | Template meal plan |
| `PtReviewService` | Review self-plan / suggestion |
| `WorkspaceWebSocketHandler` | WebSocket realtime (chat/events) |
| `WebSocketSessionService` | Gửi event tới user đang online |
| `DietEventListener` | Sau tạo diet log → push PT |

---

## 6. Package `chat` — Tin nhắn PT ↔ client

| File | Làm gì |
|------|--------|
| `ChatController` | REST: threads, gửi tin/ảnh/file, đánh dấu đọc |
| `ChatService` | Lưu tin + publish realtime (qua workspace WS) |
| Entity `ChatMessage` | Nội dung tin nhắn |

---

## 7. Package `payment` — VNPay, ví, escrow

| File | Làm gì |
|------|--------|
| `CoachingPaymentController` | Tạo thanh toán, return/IPN VNPay, release escrow |
| `CoachingWalletController` | Ví PT, rút tiền, admin system wallet |
| `CoachingPaymentService` / `CoachingVnPayService` | Nghiệp vụ thanh toán + checksum VNPay |
| `CoachingWalletService` | Hold / release / refund escrow |
| `CoachingPaymentWindowScheduler` | Hủy giao dịch hết hạn |
| Entity: `Payment`, `Wallet`, `WalletTransaction`, `CoachingEscrow` | Model tiền |

---

## 8. Package `kyc` — eKYC PT (VNPT)

| File | Làm gì |
|------|--------|
| `KycController` | Start session, upload, OCR, liveness, compare |
| `KycOrchestratorService` | Điều phối cả flow KYC |
| `VnptClient` | Gọi API VNPT |
| Các service bước: classify / OCR / face liveness / compare… | Từng bước eKYC |
| Entity: `EkycSession`, `EkycDocument` | Lưu trạng thái hồ sơ |

---

## 9. Package `admin` — Admin vận hành

| File | Làm gì |
|------|--------|
| `DashboardController` | Stats tổng quan |
| `PtAdminController` | Duyệt hồ sơ PT |
| `UserAdminController` | Quản lý user / status |
| `RblAdminController` | Export / stats dataset RBL |

Không có entity riêng — gọi service đọc data từ `user` / `diet`.

---

## 10. Package `common` — Dùng chung

| File | Làm gì |
|------|--------|
| `ApiResponse` / `PageResponse` | Envelope JSON chuẩn |
| `GlobalExceptionHandler` | Bắt exception → lỗi thống nhất |
| `DietDates` | “Hôm nay / now” theo `Asia/Ho_Chi_Minh` (+ demo clock) |
| `MealPeriods` | Khung buổi ăn (sáng/trưa/…/khuya), gate tick đã ăn |
| `DayPlanRules` | Rule buổi đã chốt |
| `JwtUtil` | Tạo / parse JWT |
| `MacroSuggestionCalculator` / `MacroUtils` | Gợi ý / scale macro |
| `DemoVnClockFilter` | Header giả lập giờ VN (demo) |
| `SystemSetting` | Cờ cấu hình (vd. bắt buộc KYC) |
| Enums: `UserRole`, `UserStatus`, `KycStatus`… | Enum dùng nhiều module |

---

## 11. Package `infrastructure` — Hạ tầng

| File | Làm gì |
|------|--------|
| `MinioStorageService` / `StorageService` | Upload ảnh (MinIO) |
| `SmtpMailService` / `MailService` | Gửi email |
| `RedisConfig` + `RateLimitingService` | Redis + rate limit |

---

## Layer trong mỗi feature (trả lời nhanh)

| Layer | Vai trò |
|-------|---------|
| `controller` | Nhận HTTP, validate, gọi service — **không** inject repository |
| `service` + `impl` | Nghiệp vụ, transaction |
| `repository` | Spring Data JPA |
| `entity` | Bảng DB |
| `dto` / `request` / `response` | Object ra/vào API |
| `enums` | Trạng thái / loại cố định |
| `config` | Bean / seed / scheduler của feature đó |

---

## Một số luồng nghiệp vụ hay bị hỏi

1. **Chụp món → nhật ký:** FE upload → `DietLogController` / `MealAnalysisService` → `ai` (ResNet+LLaVA) → lưu `DietLog`; nếu có PT active thì `reviewStatus=PENDING`.
2. **Plan ngày (solo):** `SelfPlanService` tạo item; không gửi PT; tick đã ăn theo `MealPeriods.isMealPeriodOpen`.
3. **Plan ngày (có PT):** Self-plan vào giỏ → submit → PT duyệt ở `workspace` / `PtReviewService`.
4. **Thuê PT:** `user` marketplace → `payment` VNPay/escrow → `PtClientMapping` ACTIVE.
5. **Chat realtime:** REST `chat` lưu DB + `WebSocketSessionService` đẩy event.

---

## Gợi ý học / ôn

1. Nhớ **12 package** + 1 câu mục đích mỗi package.  
2. Với `ai`: phân biệt **catalog** (data mapping) vs **service** (gọi model).  
3. Với `diet`: nhớ 3 trục **Food catalog / DietLog / Plan (PT + Self)**.  
4. Giờ nghiệp vụ luôn **UTC+7 VN** (`DietDates`, `MealPeriods`) — không theo timezone máy client.

---

*File này mô tả cấu trúc source tại thời điểm tạo tài liệu; tên class có thể bổ sung theo thời gian nhưng ranh giới package thường ổn định.*
