# NutriCan PT - API Documentation

Base URL: `http://localhost:8080/api/v1`

API Documentation (Swagger UI): `http://localhost:8080/swagger-ui.html`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Profile](#2-user-profile)
3. [Diet Tracker](#3-diet-tracker)
4. [Marketplace](#4-marketplace)
5. [PT Workspace](#5-pt-workspace)
6. [Admin](#6-admin)
7. [KYC Verification](#7-kyc-verification)

---

## 1. Authentication

### 1.1 Register Customer

**Endpoint:** `POST /api/v1/auth/register`

Register a new customer account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0912345678"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "CUSTOMER",
      "avatarUrl": null
    }
  },
  "message": "Registration successful",
  "timestamp": "2026-06-04T04:45:00"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| email | Required, valid email format |
| password | Required, minimum 6 characters |
| fullName | Required |
| phoneNumber | Optional |

---

### 1.2 PT Request (Become a PT)

**Endpoint:** `POST /api/v1/auth/pt/request`

Request PT status after completing KYC. Requires authenticated user with KYC verified.

**Request Body:**
```json
{
  "bio": "Certified personal trainer with 5 years experience",
  "trainingPhilosophy": "Holistic approach to fitness and nutrition",
  "yearsOfExperience": 5,
  "certifications": "ACE, NASM, ISSA",
  "cvUrl": "https://minio.example.com/cv/pt.pdf",
  "specializations": ["Weight Loss", "Muscle Building"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "PT request submitted successfully, pending admin approval",
  "timestamp": "2026-06-04T04:45:00"
}
  "timestamp": "2026-06-04T04:45:00"
}
```

**Notes:**
- New PTs are created with `PENDING_APPROVAL` status
- PT must submit KYC documents via `POST /api/v1/auth/kyc`
- Admin must approve before PT can access full workspace
- Initial role is `PT_FREELANCE` (tier 2)

---

### 1.3 Submit KYC Documents

**Endpoint:** `POST /api/v1/auth/kyc`

Submit KYC (Know Your Customer) documents for PT verification. Requires PT_FREELANCE or PT_CERTIFIED role.

**Content-Type:** `multipart/form-data`

**Form Data:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| idCardNumber | String | No | ID card number |
| idCardFront | File | No | Front side of ID card (JPEG, PNG, max 500KB) |
| idCardBack | File | No | Back side of ID card (JPEG, PNG, max 500KB) |
| fullNameOnCard | String | No | Name as on ID card |
| dateOfBirthOnCard | String | No | DOB as on ID card (YYYY-MM-DD) |
| addressOnCard | String | No | Address as on ID card |

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "KYC documents submitted successfully",
  "timestamp": "2026-06-04T04:50:00"
}
```

---

### 1.4 Get KYC Status

**Endpoint:** `GET /api/v1/auth/kyc/status`

Get the current KYC verification status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "idCardNumber": "012345678901",
    "idCardFrontUrl": "https://minio.example.com/kyc/xxx-front.jpg",
    "idCardBackUrl": "https://minio.example.com/kyc/xxx-back.jpg",
    "fullNameOnCard": "Tran PT B",
    "dateOfBirthOnCard": "1990-01-15",
    "addressOnCard": "123 Main St, Ho Chi Minh City",
    "isVerified": false,
    "verificationStatus": "PENDING_APPROVAL",
    "rejectionReason": null,
    "reviewedAt": null,
    "reviewedBy": null,
    "createdAt": "2026-06-04T04:50:00"
  },
  "timestamp": "2026-06-04T04:51:00"
}
```

**Status Values:**
| Status | Description |
|--------|-------------|
| `PENDING_APPROVAL` | Submitted, awaiting admin review |
| `APPROVED` | KYC approved by admin |
| `REJECTED` | KYC rejected (see rejectionReason) |

---

### 1.5 Login

**Endpoint:** `POST /api/v1/auth/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "CUSTOMER",
      "avatarUrl": "https://minio.example.com/avatars/xxx.jpg"
    }
  },
  "message": "Login successful",
  "timestamp": "2026-06-04T04:45:00"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid credentials | Email or password incorrect |
| 403 | Account suspended | User status is SUSPENDED |
| 403 | Pending approval | PT account not yet approved |

---

### 1.6 Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": { ... }
  },
  "message": "Token refreshed successfully",
  "timestamp": "2026-06-04T04:45:00"
}
```

---

### 1.7 Logout

**Endpoint:** `POST /api/v1/auth/logout`

Logout user (client should discard tokens).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful",
  "timestamp": "2026-06-04T04:45:00"
}
```

**Note:** JWT is stateless, so server logout is a no-op. Client must discard tokens.

---

## 2. User Profile

All endpoints require authentication.

### 2.1 Get My Profile

**Endpoint:** `GET /api/v1/profile/me`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "phoneNumber": "0912345678",
    "address": "123 Main St, Ho Chi Minh City",
    "dateOfBirth": "1995-03-15",
    "avatarUrl": "https://minio.example.com/avatars/xxx.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "createdAt": "2026-01-15T10:30:00"
  },
  "timestamp": "2026-06-04T04:45:00"
}
```

---

### 2.2 Update My Profile

**Endpoint:** `PUT /api/v1/profile/me`

**Request Body:**
```json
{
  "fullName": "Nguyen Van A Updated",
  "phoneNumber": "0987654321",
  "address": "456 New Street, Hanoi",
  "dateOfBirth": "1995-06-20"
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Profile updated successfully",
  "timestamp": "2026-06-04T04:45:00"
}
```

---

### 2.3 Upload Avatar

**Endpoint:** `PUT /api/v1/profile/avatar`

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| file | File | Image file (JPEG, PNG) max 500KB |

**Response (200 OK):**
```json
{
  "success": true,
  "data": "https://minio.example.com/avatars/yyy.jpg",
  "message": "Avatar updated successfully",
  "timestamp": "2026-06-04T04:45:00"
}
```

---

### 2.4 Get Macro Target

**Endpoint:** `GET /api/v1/profile/macro-target`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "dailyCalories": 2000,
    "protein": 120,
    "carb": 200,
    "fat": 65
  },
  "timestamp": "2026-06-04T04:45:00"
}
```

**Note:** Returns default values if not set.

---

### 2.5 Set Macro Target

**Endpoint:** `PUT /api/v1/profile/macro-target`

**Request Body:**
```json
{
  "dailyCalories": 1800,
  "protein": 150,
  "carb": 150,
  "fat": 60
}
```

**Note:** All fields are optional for partial update.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "dailyCalories": 1800,
    "protein": 150,
    "carb": 150,
    "fat": 60
  },
  "message": "Macro target updated successfully",
  "timestamp": "2026-06-04T04:45:00"
}
```

---

### 2.6 Get User Public Profile

**Endpoint:** `GET /api/v1/profile/{userId}`

Get any user's public profile by ID.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Nguyen Van A",
    "avatarUrl": "https://minio.example.com/avatars/xxx.jpg",
    "role": "CUSTOMER",
    "createdAt": "2026-01-15T10:30:00"
  },
  "timestamp": "2026-06-04T04:45:00"
}
```

---

## 3. Diet Tracker

All endpoints require `CUSTOMER` role.

### 3.1 Create Diet Log (Manual)

**Endpoint:** `POST /api/v1/diet/logs`

**Request Body:**
```json
{
  "mealType": "LUNCH",
  "foodDescription": "Grilled chicken breast with rice",
  "calories": 550,
  "protein": 45,
  "carb": 60,
  "fat": 12,
  "logDate": "2026-06-04"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mealType | Enum | Yes | BREAKFAST, LUNCH, DINNER, SNACK |
| foodDescription | String | Yes | Description of the meal |
| calories | Number | No | Calorie count |
| protein | Number | No | Protein in grams |
| carb | Number | No | Carbohydrates in grams |
| fat | Number | No | Fat in grams |
| logDate | Date | No | Date of meal (defaults to today) |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "customerName": "Nguyen Van A",
    "imageUrl": null,
    "aiConfidenceScore": null,
    "macrosJson": {
      "calories": 550,
      "protein": 45,
      "carb": 60,
      "fat": 12
    },
    "mealType": "LUNCH",
    "status": "LOGGED",
    "foodDescription": "Grilled chicken breast with rice",
    "sosTicketFlag": false,
    "ptReviewerId": null,
    "ptNote": null,
    "logDate": "2026-06-04",
    "createdAt": "2026-06-04T12:30:00"
  },
  "message": "Diet log created successfully",
  "timestamp": "2026-06-04T12:30:00"
}
```

---

### 3.2 Analyze Meal (AI)

**Endpoint:** `POST /api/v1/diet/logs/analyze`

Upload meal image and get AI analysis via Ollama (qwen2.5-vl).

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Meal image (JPEG, PNG, max 500KB) |
| mealType | String | Yes | BREAKFAST, LUNCH, DINNER, SNACK |
| mealSource | String | No | HOME_COOKED (default), RESTAURANT, TAKEOUT, CANTEEN |
| mealComplexity | String | No | SIMPLE (default), HOTPOT, COMPOSITE |
| restaurantName | String | No | Required when mealSource is RESTAURANT |
| hotpotBrothId | UUID | No | Selected hotpot broth from food DB |
| hotpotItemIds | UUID[] | No | Selected hotpot dipping items |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logId": "770e8400-e29b-41d4-a716-446655440002",
    "foodName": "Grilled Salmon with Vegetables",
    "portionSize": 350,
    "portionUnit": "grams",
    "calories": 485,
    "protein": 42,
    "carb": 18,
    "fat": 28,
    "confidenceScore": 0.85,
    "fallback": false,
    "message": "Meal analyzed successfully",
    "mealType": "LUNCH"
  },
  "message": "Meal analyzed successfully",
  "timestamp": "2026-06-04T12:35:00"
}
```

**Fallback Response (when AI confidence is low):**
```json
{
  "success": true,
  "data": {
    "logId": "770e8400-e29b-41d4-a716-446655440002",
    "foodName": "Meal",
    "portionSize": 200,
    "portionUnit": "grams",
    "calories": 300,
    "protein": 15,
    "carb": 35,
    "fat": 10,
    "confidenceScore": 0.0,
    "fallback": true,
    "message": "Low confidence - please verify the information",
    "mealType": "LUNCH"
  },
  "message": "Meal analyzed with fallback values",
  "timestamp": "2026-06-04T12:35:00"
}
```

**Status Logic:**
- High confidence (>=0.6): `PT_REVIEWING`
- Low confidence (fallback): `DRAFT`
- Hybrid DB match may set `recognitionSource` to `HYBRID` or `DB_MATCH`
- Eating out with low confidence returns `suggestSos: true` (customer may create SOS manually)

---

### 3.2.1 Submit Draft for PT Review

**Endpoint:** `PUT /api/v1/diet/logs/{id}/submit-for-review`

Moves a `DRAFT` log to `PT_REVIEWING`. Only the log owner may call this.

**Response (200 OK):** Updated `DietLogResponse`.

---

### 3.2.2 Get Customer SOS Tickets

**Endpoint:** `GET /api/v1/diet/sos`

Returns SOS tickets for the authenticated customer.

---

### 3.3 Get Diet Logs

**Endpoint:** `GET /api/v1/diet/logs`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number |
| size | int | 20 | Items per page (max 100) |
| startDate | date | - | Filter start date |
| endDate | date | - | Filter end date |
| status | string | - | Filter by status |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "customerId": "550e8400-e29b-41d4-a716-446655440000",
        "customerName": "Nguyen Van A",
        "imageUrl": "https://minio.example.com/diet-logs/xxx.jpg",
        "aiConfidenceScore": 0.85,
        "macrosJson": {
          "calories": 485,
          "protein": 42,
          "carb": 18,
          "fat": 28
        },
        "mealType": "LUNCH",
        "status": "PT_REVIEWING",
        "foodDescription": "Grilled Salmon with Vegetables",
        "sosTicketFlag": false,
        "ptReviewerId": null,
        "ptNote": null,
        "logDate": "2026-06-04",
        "createdAt": "2026-06-04T12:35:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T12:40:00"
}
```

---

### 3.4 Get Diet Log by ID

**Endpoint:** `GET /api/v1/diet/logs/{id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-04T12:45:00"
}
```

---

### 3.5 Update Diet Log

**Endpoint:** `PUT /api/v1/diet/logs/{id}`

**Request Body:**
```json
{
  "mealType": "DINNER",
  "foodDescription": "Updated description",
  "calories": 500,
  "protein": 40,
  "carb": 55,
  "fat": 15
}
```

**Note:** Only the logged-in user can update their own logs.

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Diet log updated successfully",
  "timestamp": "2026-06-04T12:50:00"
}
```

---

### 3.6 Delete Diet Log

**Endpoint:** `DELETE /api/v1/diet/logs/{id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Diet log deleted successfully",
  "timestamp": "2026-06-04T12:55:00"
}
```

**Note:** Only the logged-in user can delete their own logs. Associated image in MinIO will also be deleted.

---

### 3.7 Get Daily Summary

**Endpoint:** `GET /api/v1/diet/summary`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| date | date | today | Date to get summary for |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-04",
    "totalCalories": 1535,
    "totalProtein": 127,
    "totalCarb": 173,
    "totalFat": 55,
    "logs": [ ... ]
  },
  "timestamp": "2026-06-04T13:00:00"
}
```

---

### 3.8 Create SOS Ticket

**Endpoint:** `POST /api/v1/diet/sos`

Create an SOS support request (sent to admin for PT assignment).

**Request Body:**
```json
{
  "dietLogId": "770e8400-e29b-41d4-a716-446655440002",
  "note": "I'm confused about my macros for this meal",
  "priority": "HIGH"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dietLogId | UUID | No | Link to specific diet log |
| note | String | No | Description of the issue |
| priority | String | No | HIGH, MEDIUM, LOW (default: HIGH) |

**Response (201 Created):**
```json
{
  "success": true,
  "data": null,
  "message": "SOS ticket created, your PT has been notified",
  "timestamp": "2026-06-04T13:05:00"
}
```

---

### 3.9 Food Catalog

All endpoints require authentication.

#### Search Foods

**Endpoint:** `GET /api/v1/foods/search?q=phở&category=RICE`

Returns matching items from internal Vietnamese food database.

#### Hotpot Broths

**Endpoint:** `GET /api/v1/foods/hotpot/broths`

#### Hotpot Items

**Endpoint:** `GET /api/v1/foods/hotpot/items`

---

## 4. Marketplace

All endpoints require authentication.

### 4.1 Search PTs

**Endpoint:** `GET /api/v1/marketplace/pts`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| specialization | string | - | Filter by specialization |
| minExperience | int | - | Minimum years of experience |
| verifiedOnly | boolean | false | Only show verified PTs |
| tier | string | - | TIER_1 or TIER_2 |
| sortBy | string | tier | Sort field |
| sortDir | string | desc | Sort direction |
| page | int | 0 | Page number |
| size | int | 10 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "userId": "660e8400-e29b-41d4-a716-446655440001",
        "fullName": "Tran PT B",
        "email": "pt@example.com",
        "avatarUrl": "https://minio.example.com/avatars/pt.jpg",
        "isVerified": true,
        "bio": "Certified personal trainer...",
        "trainingPhilosophy": "Holistic approach...",
        "yearsOfExperience": 5,
        "specializations": ["Weight Loss", "Muscle Building"],
        "rating": 4.8,
        "totalReviews": 42,
        "tier": "TIER_1",
        "hourlyRate": 150.00
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 5,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T13:10:00"
}
```

---

### 4.2 Get PT Detail

**Endpoint:** `GET /api/v1/marketplace/pts/{ptId}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "fullName": "Tran PT B",
    "email": "pt@example.com",
    "avatarUrl": "https://minio.example.com/avatars/pt.jpg",
    "isVerified": true,
    "bio": "Certified personal trainer with expertise in...",
    "trainingPhilosophy": "Holistic approach to fitness and nutrition...",
    "yearsOfExperience": 5,
    "specializations": ["Weight Loss", "Muscle Building", "Sports Nutrition"],
    "rating": 4.8,
    "totalReviews": 42,
    "tier": "TIER_1",
    "hourlyRate": 150.00
  },
  "timestamp": "2026-06-04T13:15:00"
}
```

---

### 4.3 Get PT Reviews

**Endpoint:** `GET /api/v1/marketplace/pts/{ptId}/reviews`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number |
| size | int | 10 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "ptId": "660e8400-e29b-41d4-a716-446655440001",
        "reviewerId": "550e8400-e29b-41d4-a716-446655440000",
        "reviewerName": "Nguyen Van A",
        "rating": 5.0,
        "comment": "Great PT! Very knowledgeable about nutrition.",
        "createdAt": "2026-05-20T15:30:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T13:20:00"
}
```

---

### 4.4 Create Review

**Endpoint:** `POST /api/v1/marketplace/pts/{ptId}/reviews`

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent guidance on meal planning!"
}
```

| Field | Type | Required | Validation |
|--------|------|----------|------------|
| rating | number | Yes | 1-5 |
| comment | string | No | Max 1000 chars |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "ptId": "660e8400-e29b-41d4-a716-446655440001",
    "reviewerId": "550e8400-e29b-41d4-a716-446655440000",
    "reviewerName": "Nguyen Van A",
    "rating": 5.0,
    "comment": "Excellent guidance on meal planning!",
    "createdAt": "2026-06-04T13:25:00"
  },
  "message": "Review submitted successfully",
  "timestamp": "2026-06-04T13:25:00"
}
```

---

## 5. PT Workspace

All endpoints require `PT_CERTIFIED` or `PT_FREELANCE` role.

### 5.1 Get Clients

**Endpoint:** `GET /api/v1/workspace/clients`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | ACTIVE, INACTIVE, PENDING |
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "clientId": "550e8400-e29b-41d4-a716-446655440000",
        "clientName": "Nguyen Van A",
        "avatarUrl": "https://minio.example.com/avatars/xxx.jpg",
        "status": "GREEN",
        "statusLabel": "On Track",
        "statusColor": "#22c55e",
        "lastLogTime": "2026-06-04T12:35:00",
        "avgCalories": 1650
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T13:30:00"
}
```

**Status Logic:**
- `GREEN`: Client has logged a meal today
- `YELLOW`: Client has not logged a meal today

---

### 5.2 SSE Stream

**Endpoint:** `GET /api/v1/workspace/stream`

Server-Sent Events endpoint for real-time notifications.

**Headers:**
```
Accept: text/event-stream
```

**Response:** SSE stream with events:

**CONNECTED Event:**
```
event: CONNECTED
data: {"status":"connected"}
```

**NEW_DIET_LOG Event:**
```
event: NEW_DIET_LOG
data: {"client_id":"550e8400-e29b-41d4-a716-446655440000","client_name":"Nguyen Van A","log_id":"770e8400-e29b-41d4-a716-446655440002","message":"New diet log from Nguyen Van A","status_color":"YELLOW"}
```

**SOS_TICKET Event:**
```
event: SOS_TICKET
data: {"client_id":"550e8400-e29b-41d4-a716-446655440000","client_name":"Nguyen Van A","priority":"HIGH","type":"SOS"}
```

---

### 5.3 Get Pending Diet Logs

**Endpoint:** `GET /api/v1/workspace/diet-logs/pending`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "customerId": "550e8400-e29b-41d4-a716-446655440000",
        "customerName": "Nguyen Van A",
        "customerAvatar": "https://minio.example.com/avatars/xxx.jpg",
        "imageUrl": "https://minio.example.com/diet-logs/xxx.jpg",
        "mealType": "LUNCH",
        "foodDescription": "Grilled Salmon with Vegetables",
        "aiConfidenceScore": 0.85,
        "macrosJson": {
          "calories": 485,
          "protein": 42,
          "carb": 18,
          "fat": 28
        },
        "status": "PT_REVIEWING",
        "sosTicketFlag": false,
        "logDate": "2026-06-04",
        "createdAt": "2026-06-04T12:35:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T13:35:00"
}
```

---

### 5.4 Review Diet Log

**Endpoint:** `PUT /api/v1/workspace/diet-logs/{id}/review`

**Request Body:**
```json
{
  "action": "APPROVE",
  "adjustedCalories": 500,
  "adjustedProtein": 40,
  "adjustedCarb": 55,
  "adjustedFat": 15,
  "note": "Looks good! Keep it up.",
  "correctionReason": "OTHER"
}
```

| Action | Description |
|--------|-------------|
| `APPROVE` | Approve the log as is; copies ground truth to `pt_adjusted_macros` |
| `ADJUST_MACROS` | Approve with adjusted macro values |
| `REJECT` | Reject the log (negative sample; excluded from MAE) |

| Field | Description |
|-------|-------------|
| `correctionReason` | Optional on ADJUST/REJECT: WRONG_FOOD, WRONG_PORTION, WRONG_MACROS, UNCLEAR_IMAGE, RESTAURANT_TOO_COMPLEX, DB_MATCH_INCORRECT, OTHER |

**Response (200 OK):** includes RBL fields (`aiPredictedMacros`, `dbMatchedMacros`, `experimentCohort`, `ptAction`, etc.)

```json
{
  "success": true,
  "data": { ... },
  "message": "Diet log reviewed successfully",
  "timestamp": "2026-06-04T13:40:00"
}
```

---

### 5.5 Submit Blind Estimate (RBL)

**Endpoint:** `PUT /api/v1/workspace/diet-logs/{id}/blind-estimate`

PT enters macro estimate before viewing AI/DB predictions (optional blind review workflow).

**Request Body:**
```json
{
  "calories": 520,
  "protein": 35,
  "carb": 48,
  "fat": 18
}
```

**Response (200 OK):** Updated diet log with `ptBlindMacros` saved; PT UI may then reveal AI/DB columns.

---

### 5.6 Get PT SOS Tickets

**Endpoint:** `GET /api/v1/workspace/sos`

Returns SOS tickets assigned to the authenticated PT.

---

### 5.7 Resolve SOS Ticket

**Endpoint:** `PUT /api/v1/workspace/sos/{ticketId}/resolve`

**Request Body:**
```json
{ "note": "I adjusted your macros — check the updated log." }
```

---

### 5.8 Get Client Progress

**Endpoint:** `GET /api/v1/workspace/progress/{clientId}`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | date | 1 month ago | Start date |
| endDate | date | today | End date |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "clientName": "Nguyen Van A",
    "calorieHistory": [
      {
        "date": "2026-06-04",
        "calories": 1535,
        "target": 2000
      },
      {
        "date": "2026-06-03",
        "calories": 1780,
        "target": 2000
      }
    ],
    "bodyMetrics": [
      {
        "date": "2026-06-04",
        "weight": 70.5,
        "bodyFatPercent": 18.5,
        "lbm": 57.5
      }
    ],
    "macroSummary": {
      "avgCalories": 1657,
      "avgProtein": 115,
      "avgCarb": 164,
      "avgFat": 52,
      "adherenceRate": 85.5
    }
  },
  "timestamp": "2026-06-04T13:45:00"
}
```

---

### 5.6 Assign Client

**Endpoint:** `POST /api/v1/workspace/clients/{clientId}/assign`

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Client assigned successfully",
  "timestamp": "2026-06-04T13:50:00"
}
```

---

### 5.7 Get PT Stats

**Endpoint:** `GET /api/v1/workspace/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalClients": 12,
    "pendingReviews": 5,
    "pendingSosTickets": 2,
    "reviewsThisWeek": 28,
    "averageAdherenceRate": 85
  },
  "timestamp": "2026-06-04T13:55:00"
}
```

---

## 6. Admin

All endpoints require `ADMIN` role. Admin endpoints are organized into: User Management (`/admin/users`), PT Verification (`/admin/pts`), KYC Verification (`/admin/kyc`), SOS Tickets (`/admin/sos-tickets`), and Dashboard (`/admin/stats`).

### 6.1 Get Users

**Endpoint:** `GET /api/v1/admin/users`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| role | string | - | Filter by role |
| status | string | - | Filter by status |
| search | string | - | Search by name/email |
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "fullName": "Nguyen Van A",
        "avatarUrl": "https://minio.example.com/avatars/xxx.jpg",
        "role": "CUSTOMER",
        "status": "ACTIVE",
        "createdAt": "2026-01-15T10:30:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T14:00:00"
}
```

---

### 6.2 Update User Status

**Endpoint:** `PUT /api/v1/admin/users/{userId}/status`

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

| Status | Description |
|--------|-------------|
| `ACTIVE` | Normal account |
| `INACTIVE` | Deactivated |
| `SUSPENDED` | Temporarily blocked |

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "User status updated successfully",
  "timestamp": "2026-06-04T14:05:00"
}
```

---

### 6.3 Get Pending PTs

**Endpoint:** `GET /api/v1/admin/pts/pending`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "userId": "660e8400-e29b-41d4-a716-446655440001",
        "email": "pt@example.com",
        "fullName": "Tran PT B",
        "avatarUrl": "https://minio.example.com/avatars/pt.jpg",
        "bio": "Certified personal trainer...",
        "trainingPhilosophy": "Holistic approach...",
        "yearsOfExperience": 5,
        "certifications": "ACE, NASM, ISSA",
        "cvUrl": "https://minio.example.com/cv/pt.pdf",
        "documentUrls": "https://minio.example.com/docs/xxx.pdf",
        "verificationStatus": "PENDING_APPROVAL",
        "kycStatus": "PENDING_APPROVAL",
        "createdAt": "2026-05-20T10:00:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T14:10:00"
}
```

---

### 6.4 Verify PT

**Endpoint:** `PUT /api/v1/admin/pts/{userId}/verify`

**Request Body:**
```json
{
  "action": "APPROVE",
  "ptType": "CERTIFIED",
  "isVerified": true,
  "adminNote": "All documents verified"
}
```

| Action | Description |
|--------|-------------|
| `APPROVE` | Approve PT registration |
| `REJECT` | Reject PT registration |

| PT Type | Resulting Role | Tier |
|---------|---------------|------|
| `CERTIFIED` | PT_CERTIFIED | TIER_1 |
| `FREELANCE` | PT_FREELANCE | TIER_2 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "PT verification processed successfully",
  "timestamp": "2026-06-04T14:15:00"
}
```

---

### 6.5 KYC Management

### 6.5.1 Get Pending KYC Verifications

**Endpoint:** `GET /api/v1/admin/kyc/pending`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "...",
        "userId": "...",
        "email": "user@example.com",
        "fullName": "Nguyen Van A",
        "avatarUrl": "...",
        "idCardNumber": "012345678901",
        "fullNameOnCard": "Nguyen Van A",
        "dateOfBirthOnCard": "1990-01-15",
        "addressOnCard": "123 Main St",
        "idCardFrontUrl": "https://minio.example.com/kyc/xxx-front.jpg",
        "idCardBackUrl": "https://minio.example.com/kyc/xxx-back.jpg",
        "verificationStatus": "PENDING_APPROVAL",
        "createdAt": "2026-06-04T04:50:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T14:05:00"
}
```

### 6.5.2 Approve KYC

**Endpoint:** `PUT /api/v1/admin/kyc/{userId}/approve`

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "KYC approved successfully",
  "timestamp": "2026-06-04T14:10:00"
}
```

### 6.5.3 Reject KYC

**Endpoint:** `PUT /api/v1/admin/kyc/{userId}/reject`

**Request Body:**
```json
{
  "reason": "ID card information does not match"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "KYC rejected",
  "timestamp": "2026-06-04T14:15:00"
}
```

---

### 6.6 Get SOS Tickets

**Endpoint:** `GET /api/v1/admin/sos-tickets`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | OPEN,ASSIGNED | Filter by status |
| page | int | 0 | Page number |
| size | int | 20 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "dietLogId": "770e8400-e29b-41d4-a716-446655440002",
        "customerId": "550e8400-e29b-41d4-a716-446655440000",
        "customerName": "Nguyen Van A",
        "ptId": null,
        "ptName": null,
        "assignedBy": null,
        "status": "OPEN",
        "priority": "HIGH",
        "note": "Confused about macros",
        "createdAt": "2026-06-04T13:05:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-06-04T14:20:00"
}
```

---

### 6.7 Assign SOS Ticket to PT

**Endpoint:** `PUT /api/v1/admin/sos-tickets/{ticketId}/assign`

**Request Body:**
```json
{
  "ptId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "SOS ticket assigned successfully",
  "timestamp": "2026-06-04T14:25:00"
}
```

---

### 6.7 Get Dashboard Stats

**Endpoint:** `GET /api/v1/admin/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalCustomers": 120,
    "totalPts": 25,
    "pendingPtVerifications": 5,
    "activeSosTickets": 3,
    "totalDietLogs": 2500,
    "averageRating": 4.5
  },
  "timestamp": "2026-06-04T14:30:00"
}
```

---

### 6.8 RBL Export Preview

**Endpoint:** `GET /api/v1/admin/rbl/export/preview`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| from | date | - | Start date filter |
| to | date | - | End date filter |
| cvOnly | boolean | true | Exclude MANUAL logs |
| includeRejected | boolean | false | Include REJECT samples |

Returns row count and sample rows for labeled CV dataset.

---

### 6.9 RBL Export CSV

**Endpoint:** `GET /api/v1/admin/rbl/export`

**Query Parameters:** Same as preview, plus optional `mealSource`, `recognitionSource`.

**Response:** `text/csv` attachment with columns including `delta_ai_*`, `experiment_cohort`, `prompt_version`, `customer_hash`, `image_object_name`, `pt_blind_macros`, `diet_log_items_json`. No raw customer names (PII anonymized).

---

### 6.10 RBL Stats

**Endpoint:** `GET /api/v1/admin/rbl/stats`

**Query Parameters:** `from`, `to` (optional date range)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReviewed": 42,
    "totalLabeledCv": 38,
    "maeAiCalories": 85.5,
    "adjustRateByMealSource": { "RESTAURANT": 0.45 },
    "calibrationBuckets": { "0.0-0.5": { "count": 5, "mae": 120 } },
    "maeByDbMatchScoreBucket": { "high": 45.2 },
    "blindVsAiMae": 72.1,
    "compositeMealCount": 6,
    "insufficientSample": true,
    "legacyLogsExcluded": 10
  }
}
```

MAE baseline is always `ai_predicted_macros` vs `pt_adjusted_macros` (APPROVE + ADJUST only).

---

### 6.11 RBL Markdown Report

**Endpoint:** `GET /api/v1/admin/rbl/report`

**Query Parameters:** `from`, `to` (optional)

**Response:** `text/markdown` thesis-ready summary with hypothesis table, MAE, calibration, and cohort breakdown.

---

## 7. KYC Verification

All KYC endpoints require authentication. KYC uses VNPT API for OCR and face liveness detection.

### 7.1 KYC Session Flow

```
1. POST /kyc/sessions:start        → Create KYC session
2. POST /kyc/sessions/{id}/upload   → Upload front/back/selfie image
3. POST /kyc/sessions/{id}/attach   → Attach file to session
4. POST /kyc/sessions/{id}/classify → Classify card type (VNPT)
5. POST /kyc/sessions/{id}/ocr/front → OCR front of ID card
6. POST /kyc/sessions/{id}/ocr/back  → OCR back of ID card
7. POST /kyc/sessions/{id}/ocr/liveness → Face liveness check
8. POST /kyc/sessions/{id}/compare   → Compare face with ID card
```

### 7.2 Start KYC Session

**Endpoint:** `POST /api/v1/kyc/sessions:start`

**Response (200 OK):**
```json
{
  "sessionId": "uuid",
  "status": "DRAFT"
}
```

### 7.3 Upload Document

**Endpoint:** `POST /api/v1/kyc/sessions/{id}/upload`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| type | String | FRONT, BACK, SELFIE |
| file | File | Image file (JPEG, PNG) |
| title | String | Optional title |
| description | String | Optional description |

**Response (200 OK):**
```json
{
  "fileHash": "vnpt_hash",
  "type": "FRONT",
  "sessionId": "uuid"
}
```

### 7.4 Classify Card

**Endpoint:** `POST /api/v1/kyc/sessions/{sessionId}/classify`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fileHash | String | Optional - uses active front if omitted |

**Response (200 OK):**
```json
{
  "name": "cmnd",
  "confidence": 0.95,
  "source": "LIVE",
  "type": 1
}
```

### 7.5 OCR Front

**Endpoint:** `POST /api/v1/kyc/sessions/{sessionId}/ocr/front`

**Response (200 OK):**
```json
{
  "idNumber": "012345678901",
  "fullName": "NGUYEN VAN A",
  "birthDay": "1990-01-15",
  "cardType": "cmnd",
  "nationality": "Việt Nam",
  "gender": "Nam",
  "recentLocation": "TP. Ho Chi Minh",
  "originLocation": "TP. Ho Chi Minh",
  "issueDate": "2010-01-01",
  "issuePlace": "Cục CS QL XNC",
  "validDate": "2030-01-01",
  "source": "LIVE"
}
```

### 7.6 OCR Back

**Endpoint:** `POST /api/v1/kyc/sessions/{sessionId}/ocr/back`

**Response (200 OK):**
```json
{
  "issueDate": "2010-01-01",
  "issuePlace": "Cục CS QL XNC",
  "backTypeId": "cmnd",
  "msgBack": "...",
  "source": "LIVE"
}
```

### 7.7 Face Liveness Check

**Endpoint:** `POST /api/v1/kyc/sessions/{sessionId}/ocr/liveness`

**Response (200 OK):**
```json
{
  "isLive": true,
  "liveness": "success",
  "livenessMsg": "...",
  "isEyeOpen": true,
  "source": "LIVE"
}
```

### 7.8 Compare Face

**Endpoint:** `POST /api/v1/kyc/sessions/{sessionId}/compare`

Compares selfie face with ID card photo. If score >= 95, KYC is verified.

**Response (200 OK):**
```json
{
  "isMatch": true,
  "matchScore": 97.5,
  "status": "VERIFIED",
  "verifiedAt": "2026-06-11T02:30:00"
}
```

**KYC Status Flow:**
```
DRAFT → IN_PROGRESS → VERIFIED (match score >= 95)
                         └──→ REJECTED (match score < 95 or no match)
```

### 7.9 Get Session

**Endpoint:** `GET /api/v1/kyc/sessions/{sessionId}`

**Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "frontHash": "hash",
    "backHash": "hash",
    "selfieHash": "hash",
    "status": "IN_PROGRESS",
    "createdAt": "2026-06-11T02:00:00",
    "updatedAt": "2026-06-11T02:30:00"
  }
}
```

---

## Common Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-06-04T04:45:00"
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "timestamp": "2026-06-04T04:45:00"
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (not authorized) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Pagination Format

```json
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5,
  "first": true,
  "last": false
}
```

---

## Enumerations

### UserRole
```
CUSTOMER
PT_CERTIFIED
PT_FREELANCE
ADMIN
```

### UserStatus
```
ACTIVE
INACTIVE
PENDING_APPROVAL
SUSPENDED
```

### MealType
```
BREAKFAST
LUNCH
DINNER
SNACK
```

### DietLogStatus
```
PENDING_AI
DRAFT
LOGGED
PT_REVIEWING
APPROVED
REJECTED
```

### ClientMappingStatus
```
ACTIVE
INACTIVE
PENDING
```

### Tier
```
TIER_1
TIER_2
```

### SOSTicketStatus
```
OPEN
ASSIGNED
RESOLVED
CLOSED
```

### PtType
```
CERTIFIED
FREELANCE
```

---

*Document Version: 2.1.0*
*Last Updated: 2026-06-11*
