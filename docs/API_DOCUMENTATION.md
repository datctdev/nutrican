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
  "timestamp": "2026-05-29T04:45:00"
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

### 1.2 Register PT

**Endpoint:** `POST /api/v1/auth/register/pt`

Register a new Personal Trainer account (requires admin approval).

**Request Body:**
```json
{
  "email": "pt@example.com",
  "password": "SecurePass123!",
  "fullName": "Tran PT B",
  "phoneNumber": "0923456789",
  "bio": "Certified personal trainer with 5 years experience",
  "trainingPhilosophy": "Holistic approach to fitness and nutrition",
  "yearsOfExperience": 5,
  "certifications": "ACE, NASM, ISSA"
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
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "pt@example.com",
      "fullName": "Tran PT B",
      "role": "PT_FREELANCE",
      "avatarUrl": null
    }
  },
  "message": "PT registration submitted for approval",
  "timestamp": "2026-05-29T04:45:00"
}
```

**Notes:**
- New PTs are created with `PENDING_APPROVAL` status
- Admin must approve before PT can access workspace
- Initial role is `PT_FREELANCE` (tier 2)

---

### 1.3 Login

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
  "timestamp": "2026-05-29T04:45:00"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid credentials | Email or password incorrect |
| 403 | Account suspended | User status is SUSPENDED |
| 403 | Pending approval | PT account not yet approved |

---

### 1.4 Refresh Token

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
  "timestamp": "2026-05-29T04:45:00"
}
```

---

### 1.5 Logout

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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "timestamp": "2026-05-29T04:45:00"
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
  "logDate": "2026-05-29"
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
    "logDate": "2026-05-29",
    "createdAt": "2026-05-29T12:30:00"
  },
  "message": "Diet log created successfully",
  "timestamp": "2026-05-29T12:30:00"
}
```

---

### 3.2 Analyze Meal (AI)

**Endpoint:** `POST /api/v1/diet/logs/analyze`

Upload meal image and get AI analysis.

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Meal image (JPEG, PNG, max 500KB) |
| mealType | String | Yes | BREAKFAST, LUNCH, DINNER, SNACK |

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
  "timestamp": "2026-05-29T12:35:00"
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
  "timestamp": "2026-05-29T12:35:00"
}
```

**Status Logic:**
- High confidence (>=0.6): `PT_REVIEWING`
- Low confidence (fallback): `DRAFT`

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
        "logDate": "2026-05-29",
        "createdAt": "2026-05-29T12:35:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-05-29T12:40:00"
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
  "timestamp": "2026-05-29T12:45:00"
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
  "timestamp": "2026-05-29T12:50:00"
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
  "timestamp": "2026-05-29T12:55:00"
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
    "date": "2026-05-29",
    "totalCalories": 1535,
    "totalProtein": 127,
    "totalCarb": 173,
    "totalFat": 55,
    "logs": [ ... ]
  },
  "timestamp": "2026-05-29T13:00:00"
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
  "timestamp": "2026-05-29T13:05:00"
}
```

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
  "timestamp": "2026-05-29T13:10:00"
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
  "timestamp": "2026-05-29T13:15:00"
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
  "timestamp": "2026-05-29T13:20:00"
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
    "createdAt": "2026-05-29T13:25:00"
  },
  "message": "Review submitted successfully",
  "timestamp": "2026-05-29T13:25:00"
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
        "lastLogTime": "2026-05-29T12:35:00",
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
  "timestamp": "2026-05-29T13:30:00"
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
        "logDate": "2026-05-29",
        "createdAt": "2026-05-29T12:35:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-05-29T13:35:00"
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
  "note": "Looks good! Keep it up."
}
```

| Action | Description |
|--------|-------------|
| `APPROVE` | Approve the log as is |
| `ADJUST_MACROS` | Approve with adjusted macro values |
| `REJECT` | Reject the log |

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Diet log reviewed successfully",
  "timestamp": "2026-05-29T13:40:00"
}
```

---

### 5.5 Get Client Progress

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
        "date": "2026-05-29",
        "calories": 1535,
        "target": 2000
      },
      {
        "date": "2026-05-28",
        "calories": 1780,
        "target": 2000
      }
    ],
    "bodyMetrics": [
      {
        "date": "2026-05-29",
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
  "timestamp": "2026-05-29T13:45:00"
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
  "timestamp": "2026-05-29T13:50:00"
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
  "timestamp": "2026-05-29T13:55:00"
}
```

---

## 6. Admin

All endpoints require `ADMIN` role.

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
  "timestamp": "2026-05-29T14:00:00"
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
  "timestamp": "2026-05-29T14:05:00"
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
  "timestamp": "2026-05-29T14:10:00"
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
  "timestamp": "2026-05-29T14:15:00"
}
```

---

### 6.5 Get SOS Tickets

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
        "createdAt": "2026-05-29T13:05:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-05-29T14:20:00"
}
```

---

### 6.6 Assign SOS Ticket to PT

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
  "timestamp": "2026-05-29T14:25:00"
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
  "timestamp": "2026-05-29T14:30:00"
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
  "timestamp": "2026-05-29T04:45:00"
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "timestamp": "2026-05-29T04:45:00"
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

---

*Document Version: 1.0.0*
*Last Updated: 2026-05-29*
