---
name: Backend Architecture Refactor
overview: "Analyze and refactor the nutrican-be multi-module architecture to enforce proper layering: entities only in core, services must have interfaces, no direct cross-module repository calls, no logic in entities/controllers, and each module exposes its capabilities via interfaces only."
todos:
  - id: stage1-immediate
    content: "Stage 1: Fix immediate issues (ReviewRepository missing, @Component cleanup, isExpired move)"
    status: pending
  - id: stage2-entities
    content: "Stage 2: Move entities to correct modules + update @EntityScan/@EnableJpaRepositories"
    status: pending
  - id: stage3-interfaces
    content: "Stage 3: Define service interfaces per module + replace direct repository calls with service calls"
    status: pending
  - id: stage4-polish
    content: "Stage 4: Polish (Redis rate limiter, dashboard stubs, config boundaries)"
    status: pending
isProject: false
---

## Analysis: Tat ca cac loi kien truc phat hien

### Cac module hien tai

- `nutritiontrack-module-core` -- shared domain (entities, repositories, enums, DTOs, exceptions, utilities, services)
- `nutritiontrack-module-auth` -- auth
- `nutritiontrack-module-admin` -- admin panel
- `nutritiontrack-module-application` -- aggregator/assembly
- `nutritiontrack-module-user-profile` -- user & PT marketplace
- `nutritiontrack-module-diet-tracker` -- diet logging
- `nutritiontrack-module-pt-management` -- PT workspace
- `nutritiontrack-module-kyc` -- eKYC
- `nutritiontrack-module-ai-gateway` -- AI inference
- `nutritiontrack-module-rbl` -- RBL research
- `nutritiontrack-module-sos` -- SOS tickets

---

## CAC LOI KIEN TRUC CHINH (Theo do uu tien)

### 1. **Missing `ReviewRepository`** (Crash potential)

- `Review.java` entity ton tai nhung `ReviewRepository.java` khong ton tai
- Tat ca module su dung `ReviewRepository` deu se crash

### 2. **Direct cross-module repository calls** (Layer violation - pho bien)

Cac module goi thang `core` repository thay vi qua service interface:


| Module goi      | Repository bi goi thang                                                                                          | nen goi qua                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `auth`          | `UserRepository`, `PasswordResetTokenRepository`, `RevokedTokenRepository`                                       | Service interface trong `auth`                                               |
| `admin`         | `SOSTicketRepository`, `DietLogRepository`, `PtClientMappingRepository`, `UserRepository`, `PtProfileRepository` | Service interfaces tu `sos`, `diet-tracker`, `pt-management`, `user-profile` |
| `user-profile`  | `UserRepository`, `PtProfileRepository`, `MacroTargetRepository`, `ReviewRepository`                             | Service interfaces tu `user-profile`                                         |
| `diet-tracker`  | `UserRepository`, `PtProfileRepository`, `MacroTargetRepository`                                                 | Service interfaces tu `user-profile`                                         |
| `pt-management` | `UserRepository`, `DietLogRepository`, `PtClientMappingRepository`, `ReviewRepository`                           | Service interfaces tu `pt-management`                                        |


### 3. **Business logic in entities** (Clean Architecture violation)

- `PasswordResetToken.isExpired()` -- domain logic in entity

### 4. **Static utility classes with @Component** (Design smell)

- `JwtUtil` la `@Component` nhung chi co static methods
- `MacroUtils` la `@Component` nhung chi co static methods
- `RblMetricsUtil`, `RblDatasetFilter`, `RblCohortUtil`, `MultipartUtils`, `PromptVersionUtil` khong co @Component (dung)

### 5. **In-memory rate limiting** (Scalability)

- `AuthServiceImpl.passwordResetRateLimit` la `ConcurrentHashMap` trong memory -- khong hoat dong voi nhieu instance

### 6. **Hardcoded stubs in dashboard**

- `AdminDashboardServiceImpl` tra ve `totalDietLogs = 0`, `averageRating = 4.5` cung la hardcoded

### 7. **Missing service interfaces** (Inconsistency)

- `TokenRevocationService`, `GoogleIdTokenService`, `MinioService` khong co interface
- `EmailService` co interface (dung pattern)

### 8. **Broad Spring scanBasePackages** (Coupling)

- `NutricanBeApplication` scan tat ca `com.sba.nutrican_be` -- tat ca module cung 1 Spring context
- Khong co boundary giua cac module ve mat Spring DI

### 9. **DTO nam trong module thay vi shared** (Potential duplication)

- Cac module co DTO rieng nhung cung co the can chia se giua cac module (vi du `PtProfileResponse` nam trong user-profile, nhung admin, diet-tracker deu can)

---

## KE HOACH REFACTOR CHI TIET

### GIAI DOAN 1: Fix cac loi gap (Khong can thay doi kien truc)

**1.1. Tao `ReviewRepository`** trong `core`

- Entity `Review` ton tai nhung repository khong co
- Tao interface `ReviewRepository extends JpaRepository<Review, UUID>`

**1.2. Chuyen `PasswordResetToken.isExpired()`** ra service

- Tao method `isTokenValid(token)` trong `PasswordResetTokenService` hoac `AuthService`

**1.3. Loai bo @Component khoi `JwtUtil` va `MacroUtils`**

- `JwtUtil` -> `final class JwtUtil` (khong con la bean)
- `MacroUtils` -> `final class MacroUtil` (khong con la bean)
- Update tat ca cac import

**1.4. Them interface cho cac service chua co**

- `TokenRevocationService` -> tao interface `TokenRevocationService` (vi tri goc: `auth.service.TokenRevocationService` -> interface trong `auth.service`)
- `GoogleIdTokenService` -> tao interface `GoogleIdTokenVerifier`
- `MinioService` -> tao interface `FileStorageService` trong `core`

### GIAI DOAN 2: Reorganize entities ve dung module

**2.1. Phan tich entity-entity chua dung vi tri**
Cac entity hien tai trong `core` nhung thuc ra thuoc ve module khac:


| Entity                                       | Hien tai | Nen thuoc ve                                              | Ly do                                                      |
| -------------------------------------------- | -------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `SOSTicket`                                  | core     | `nutritiontrack-module-sos`                               | SOS ticket chi lien quan den SOS, nen nam trong module sos |
| `Review`                                     | core     | `nutritiontrack-module-pt-management` hoac `user-profile` | Review gắn với PT, nên ở pt-management                     |
| `PtProfile`                                  | core     | `nutritiontrack-module-pt-management`                     | PT profile, nên ở pt-management                            |
| `PtClientMapping`                            | core     | `nutritiontrack-module-pt-management`                     | Mapping PT-client, nên ở pt-management                     |
| `DietLog`, `DietLogItem`, `DietLogImage`     | core     | `nutritiontrack-module-diet-tracker`                      | Diet log, nên ở diet-tracker                               |
| `FoodItem`                                   | core     | `nutritiontrack-module-diet-tracker`                      | Food catalog, nên ở diet-tracker                           |
| `MacroTarget`, `BodyMetric`                  | core     | `user-profile`                                            | Macro target gắn với user profile                          |
| `Notification`                               | core     | `user-profile`                                            | Notification gắn với user                                  |
| `User`, `PasswordResetToken`, `RevokedToken` | core     | `core` (dung)                                             | User la shared entity, can o core                          |


**2.2. Di chuyen entities** (bat dau tu cac entity don gian nhat)

Di chuyen theo thu tu: `SOSTicket` -> `Review` -> `PtProfile` -> `PtClientMapping` -> `DietLog` -> `DietLogItem` -> `DietLogImage` -> `FoodItem` -> `MacroTarget` -> `BodyMetric` -> `Notification`

 Moi buoc:

1. Tao file entity moi trong module dich
2. Di chuyen cac repository tuong ung
3. Update `NutricanBeApplication` @EntityScan/@EnableJpaRepositories
4. Update tat ca import trong tat ca cac module

### GIAI DOAN 3: Dien tao service interfaces va facades

**3.1. Moi module dinh nghia service interface cho phan no**

VD: Trong `nutritiontrack-module-sos`:

```
service/
  SosTicketService.java         <- interface
  impl/
    SosTicketServiceImpl.java   <- implementation
```

**3.2. Cac module goi nhau qua interface (khong goi repository thang)**

Thay vi:

```java
// admin - SAI: goi thang repository cua sos
@RequiredArgsConstructor
public class SosAdminServiceImpl {
    private final SOSTicketRepository sosTicketRepository; // VI PHAM
}
```

Thi:

```java
// admin - DUNG: goi qua interface
@RequiredArgsConstructor
public class SosAdminServiceImpl {
    private final SosTicketService sosTicketService; // DUNG
}
```

**3.3. Cross-module service interfaces can tao:**


| Interface (trong module)            | Duoc goi boi                                           | Hien tai goi                   |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `UserService` (core)                | auth, admin, user-profile, diet-tracker, pt-management | `UserRepository`               |
| `PasswordResetService` (auth)       | auth                                                   | `PasswordResetTokenRepository` |
| `TokenService` (auth)               | auth                                                   | `RevokedTokenRepository`       |
| `SosTicketService` (sos)            | admin                                                  | `SOSTicketRepository`          |
| `PtProfileService` (pt-management)  | admin, user-profile                                    | `PtProfileRepository`          |
| `DietLogService` (diet-tracker)     | admin, pt-management                                   | `DietLogRepository`            |
| `MacroTargetService` (user-profile) | diet-tracker                                           | `MacroTargetRepository`        |
| `ReviewService` (pt-management)     | user-profile                                           | `ReviewRepository`             |


### GIAI DOAN 4: Nhung cai khac

**4.1. Thay in-memory rate limit bang Redis** (hoac tao onfig interface)c

- `RateLimitService` interface trong core
- `InMemoryRateLimitService` implementation (hien tai)
- `RedisRateLimitService` implementation (tuong lai)

**4.2. Fix hardcoded dashboard stubs**

- Implement that `totalDietLogs` va `averageRating` that tu DB

**4.3. Tach `NutricanBeApplication` thanh nhieu config**

- Moi module co `*ApplicationConfig` rieng de config Spring boundaries
- Su dung `@SpringBootTest` voi `@ActiveProfiles` de test nhanh hon

---

## REVERSE DEPENDENCY GRAPH (hien tai)

```
core <-- auth, admin, user-profile, diet-tracker, pt-management, kyc, ai-gateway
admin --> core (repo)
user-profile --> core (repo)
diet-tracker --> core (repo)
pt-management --> core (repo)
auth --> core (repo)
kyc --> core
ai-gateway --> core
```

## TARGET DEPENDENCY GRAPH (sau refactor)

```
core <-- [shared entities, enums, base exceptions, base DTOs]
auth <-- core (UserService interface, TokenService interface)
admin <-- auth (service interfaces), sos (service interface), diet-tracker (service interface), pt-management (service interface)
user-profile <-- core, pt-management (PtProfileService interface)
diet-tracker <-- core, user-profile (MacroTargetService interface), pt-management (PtProfileService interface)
pt-management <-- core
sos <-- core
kyc <-- core
ai-gateway <-- core
```

---

## THU TU THUC HIEN

1. **GIAI DOAN 1** (Gap roi): ReviewRepository + @Component cleanup + isExpired move
2. **GIAI DOAN 2** (Kien truc tot): Di chuyen entities ve dung module + update imports + @EntityScan
3. **GIAI DOAN 3** (Clean): Dien tao service interfaces cho moi module + facades cho cross-module calls
4. **GIAI DOAN 4** (Polish): Rate limiter, dashboard stubs, config boundaries

**Du kien**: 4-6 buoc commit, moi buoc co the test duoc.