# API Documentation - Nutrican PT

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

Tat ca endpoints (ngoai tru `/auth/**`) yeu cau JWT token trong header:

```
Authorization: Bearer {access_token}
```

---

## Authentication Endpoints

### POST /auth/register

Dang ky tai khoan khach hang moi.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "John Doe",
  "phoneNumber": "+84912345678"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

---

### POST /auth/register/pt

Dang ky tai khoan Personal Trainer (cho xac minh boi admin).

**Request Body:**
```json
{
  "email": "pt@example.com",
  "password": "Password123!",
  "fullName": "Dr. Sarah",
  "phoneNumber": "+84912345678",
  "bio": "Certified nutritionist with 10 years experience",
  "trainingPhilosophy": "Holistic approach to fitness",
  "yearsOfExperience": 10,
  "certifications": "NASM, ISSA, ACSM"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "PT registration submitted for review",
  "data": null
}
```

---

### POST /auth/login

Dang nhap va nhan JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CUSTOMER",
      "avatarUrl": null
    }
  }
}
```

---

### POST /auth/refresh

Lam moi access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

---

## Profile Endpoints

### GET /profile/me

Lay thong tin nguoi dung hien tai.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+84912345678",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "avatarUrl": null,
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

### PUT /profile/me

Cap nhat thong tin nguoi dung.

**Request Body:**
```json
{
  "fullName": "John Updated",
  "phoneNumber": "+84987654321"
}
```

---

### PUT /profile/avatar

Tai anh dai dien (multipart/form-data).

**Form Data:**
- `file`: Hinh anh (JPG, PNG, max 5MB)

---

### GET /profile/macro-target

Lay muc tieu dinh duong hang ngay.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dailyCalories": 2000,
    "protein": 120,
    "carb": 200,
    "fat": 65
  }
}
```

---

### PUT /profile/macro-target

Dat muc tieu dinh duong.

**Request Body:**
```json
{
  "dailyCalories": 2200,
  "protein": 150,
  "carb": 220,
  "fat": 70
}
```

---

## Marketplace Endpoints

### GET /marketplace/pts

Tim kiem danh sach Personal Trainer.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | So trang (default: 0) |
| `size` | int | So item/trang (default: 20) |
| `specialization` | string | Chuyen nganh |
| `minExperience` | int | So nam kinh nghiem toi thieu |
| `verified` | boolean | Chi hien PT da xac minh |
| `tier` | string | TIER_1 hoac TIER_2 |
| `sortBy` | string | rating, experience, createdAt |
| `sortDir` | string | asc, desc |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "fullName": "Dr. Sarah Johnson",
        "avatarUrl": null,
        "bio": "Certified nutritionist...",
        "specializations": ["Weight Loss", "Nutrition Planning"],
        "yearsExperience": 10,
        "certifications": "NASM, ISSA",
        "tier": "TIER_1",
        "verified": true,
        "rating": 4.8,
        "reviewCount": 120
      }
    ],
    "totalElements": 50,
    "totalPages": 3,
    "currentPage": 0
  }
}
```

---

### GET /marketplace/pts/{id}

Chi tiet mot PT.

---

### POST /marketplace/pts/{id}/reviews

Tao danh gia cho PT.

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great PT! Helped me lose 10kg in 3 months."
}
```

---

## Diet Tracker Endpoints

### POST /diet/logs

Tao nhat ky an thu cong.

**Request Body:**
```json
{
  "mealType": "LUNCH",
  "foods": [
    {
      "foodName": "Grilled Chicken Salad",
      "portionSize": 300,
      "portionUnit": "g",
      "calories": 350,
      "protein": 30,
      "carb": 15,
      "fat": 18
    }
  ],
  "loggedAt": "2026-01-15T12:30:00Z",
  "notes": "Lunch with friends at home"
}
```

---

### POST /diet/logs/analyze

Phan tich hinh anh mon an bang AI.

**Form Data:**
- `file`: Hinh anh mon an (max 500KB)
- `mealType`: BREAKFAST, LUNCH, DINNER, SNACK

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logId": 123,
    "foodName": "Grilled Chicken Salad",
    "portionSize": 300,
    "portionUnit": "g",
    "calories": 350,
    "protein": 30,
    "carb": 15,
    "fat": 18,
    "confidenceScore": 0.85,
    "status": "PT_REVIEWING"
  }
}
```

---

### GET /diet/logs

Danh sach nhat ky an.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | So trang |
| `size` | int | So item/trang |
| `startDate` | date | Tu ngay (yyyy-MM-dd) |
| `endDate` | date | Den ngay |
| `status` | string | Trang thai log |
| `mealType` | string | Loai bua an |

---

### GET /diet/summary

Tong hop dinh duong theo ngay.

**Query Parameters:**
- `date`: Ngay can xem (yyyy-MM-dd, mac dinh: hom nay)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-15",
    "totalCalories": 1850,
    "totalProtein": 95,
    "totalCarb": 180,
    "totalFat": 62,
    "targetCalories": 2000,
    "targetProtein": 120,
    "targetCarb": 200,
    "targetFat": 65,
    "meals": {
      "BREAKFAST": { "calories": 450, "protein": 25, "carb": 40, "fat": 15 },
      "LUNCH": { "calories": 650, "protein": 35, "carb": 60, "fat": 22 },
      "DINNER": { "calories": 550, "protein": 25, "carb": 55, "fat": 18 },
      "SNACK": { "calories": 200, "protein": 10, "carb": 25, "fat": 7 }
    }
  }
}
```

---

### POST /diet/sos

Tao yeu cau ho tro (SOS).

**Request Body:**
```json
{
  "message": "I'm at a restaurant and unsure what to eat. Help!",
  "preferredPtId": 5
}
```

---

## PT Workspace Endpoints

### GET /workspace/clients

Danh sach khach hang cua PT.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "clientId": 2,
        "fullName": "Alice Smith",
        "avatarUrl": null,
        "status": "GREEN",
        "assignedAt": "2026-01-01T00:00:00Z",
        "lastLogAt": "2026-01-15T12:30:00Z",
        "avgCalories": 1850,
        "totalLogs": 45
      }
    ]
  }
}
```

**Client Status:**
- `GREEN`: Tot, trong muc tieu
- `YELLOW`: Thieu log hoac can chu y
- `RED`: Vuot calorie hoac log qua nhieu

---

### GET /workspace/stream

SSE endpoint cho cap nhat real-time.

**Response:** Server-Sent Events stream

```
event: new_log
data: {"clientId":2,"clientName":"Alice","logId":123,"mealType":"LUNCH","timestamp":"..."}

event: sos_ticket
data: {"ticketId":45,"clientId":2,"message":"Help!","priority":"HIGH"}
```

---

### PUT /workspace/diet-logs/{id}/review

Duyet nhat ky an cua khach hang.

**Request Body:**
```json
{
  "action": "APPROVE",
  "adjustedCalories": 380,
  "adjustedProtein": 32,
  "adjustedCarb": 16,
  "adjustedFat": 19,
  "feedback": "Looks good! Just slightly adjusted portions."
}
```

**Actions:** `APPROVE`, `REJECT`, `ADJUST`

---

## Admin Endpoints

### GET /admin/pts/pending

Danh sach PT cho xac minh.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 5,
        "fullName": "Mike Chen",
        "email": "mike@example.com",
        "phoneNumber": "+84912345678",
        "bio": "Former athlete turned PT",
        "yearsOfExperience": 5,
        "certifications": "ACSM",
        "documents": ["cv.pdf", "diploma.pdf"],
        "submittedAt": "2026-01-14T10:00:00Z"
      }
    ]
  }
}
```

---

### PUT /admin/pts/{id}/verify

Xac nhan hoac tu choi PT.

**Request Body:**
```json
{
  "action": "APPROVE_AS_CERTIFIED",
  "rejectionReason": null
}
```

**Actions:**
- `APPROVE_AS_CERTIFIED`: Chap nhan, gan TIER_1
- `APPROVE_AS_FREELANCE`: Chap nhan, gan TIER_2
- `REJECT`: Tu choi voi ly do

---

### GET /admin/stats

Thong ke dashboard.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalCustomers": 1000,
    "totalPTs": 200,
    "pendingPTVerifications": 15,
    "totalDietLogs": 50000,
    "totalSOSTickets": 120,
    "openSOSTickets": 5,
    "todayDietLogs": 350,
    "todayActiveUsers": 450
  }
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 6 characters"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. Required role: ADMIN"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., email already exists) |
| 500 | Internal Server Error |
