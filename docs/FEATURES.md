# NutriCan PT - Features Documentation

## 1. Overview

This document describes the key features of the NutriCan PT application in detail.

---

## Table of Contents

1. [AI Meal Recognition](#2-ai-meal-recognition)
2. [Diet Tracking](#3-diet-tracking)
3. [PT Workflow](#4-pt-workflow)
4. [SOS System](#5-sos-system)
5. [Marketplace](#6-marketplace)
6. [Admin Management](#7-admin-management)

---

## 2. AI Meal Recognition

### 2.1 Overview

The AI Meal Recognition feature uses computer vision and natural language processing to analyze meal images and extract nutritional information automatically.

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| AI Model | Qwen2.5-VL | Vision-language model |
| AI Runtime | Ollama | Local LLM hosting |
| Image Storage | MinIO | S3-compatible object storage |
| API Gateway | Custom Spring Service | AI integration layer |

### 2.3 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User     │     │   Backend   │     │   MinIO     │     │  Ollama     │
│  (Upload)  │     │   Service   │     │  (Storage)  │     │   (AI)      │
└─────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
      │                    │                   │                   │
      │  1. Upload Image   │                   │                   │
      │───────────────────>│                   │                   │
      │                    │                   │                   │
      │                    │  2. Store Image   │                   │
      │                    │───────────────────────────────────────>│
      │                    │                   │                   │
      │                    │  3. Presigned URL│                   │
      │                    │<──────────────────────────────────────│
      │                    │                   │                   │
      │                    │  4. Analyze Request                  │
      │                    │                   │                   │
      │                    │──────────────────────────────────────>│
      │                    │                   │                   │
      │                    │  5. AI Response   │                   │
      │                    │<──────────────────────────────────────│
      │                    │                   │                   │
      │  6. Results        │                   │                   │
      │<───────────────────│                   │                   │
```

### 2.4 AI Prompt

**System Prompt:**
```
You are a nutritional analysis assistant. Analyze the meal image and provide nutritional information.
Respond ONLY with valid JSON in this exact format:
{
  "foodName": "name of the food",
  "portionSize": number in grams,
  "portionUnit": "grams",
  "calories": estimated calories,
  "protein": protein in grams,
  "carb": carbohydrates in grams,
  "fat": fat in grams,
  "confidenceScore": confidence between 0.0 and 1.0,
  "fallback": true if you're uncertain,
  "message": "brief message if needed"
}
```

### 2.5 Confidence Scoring

| Confidence | Status | Description |
|------------|--------|-------------|
| >= 0.6 | High | Reliable data, status = PT_REVIEWING |
| < 0.6 | Low | Fallback values used, status = DRAFT |

### 2.6 Fallback Values

When AI confidence is low (fallback mode):

| Field | Value | Description |
|-------|-------|-------------|
| foodName | "Meal" | Generic name |
| portionSize | 200g | Default portion |
| calories | 300 | Default calories |
| protein | 15g | Default protein |
| carb | 35g | Default carbs |
| fat | 10g | Default fat |
| confidenceScore | 0.0 | Low confidence indicator |

### 2.7 Supported Image Formats

| Format | MIME Type | Max Size |
|--------|-----------|----------|
| JPEG | image/jpeg | 500KB |
| PNG | image/png | 500KB |

### 2.8 Response Example

**Success Response:**
```json
{
  "logId": "550e8400-e29b-41d4-a716-446655440000",
  "foodName": "Grilled Chicken Salad",
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
}
```

---

## 3. Diet Tracking

### 3.1 Overview

The Diet Tracking feature allows users to log their meals, track macronutrients, and monitor their daily nutritional intake against their targets.

### 3.2 Meal Logging Methods

#### 3.2.1 Manual Entry

Users can manually enter their meals with nutritional information:

```json
{
  "mealType": "LUNCH",
  "foodDescription": "Grilled chicken breast with brown rice",
  "calories": 550,
  "protein": 45,
  "carb": 60,
  "fat": 12,
  "logDate": "2026-05-29"
}
```

#### 3.2.2 AI Analysis

Users upload a photo of their meal for automatic analysis:

```
POST /api/v1/diet/logs/analyze
Content-Type: multipart/form-data

file: [meal-image.jpg]
mealType: LUNCH
```

### 3.3 Meal Types

| Type | Code | Description |
|------|------|-------------|
| Breakfast | BREAKFAST | Morning meal |
| Lunch | LUNCH | Midday meal |
| Dinner | DINNER | Evening meal |
| Snack | SNACK | Between meals |

### 3.4 Macronutrients Tracked

| Nutrient | Unit | Description |
|----------|------|-------------|
| Calories | kcal | Total energy |
| Protein | grams | Muscle-building nutrient |
| Carbohydrates | grams | Energy source |
| Fat | grams | Essential fats |

### 3.5 Daily Summary

Users can view their daily nutritional summary:

```json
{
  "date": "2026-05-29",
  "totalCalories": 1850,
  "totalProtein": 142,
  "totalCarb": 198,
  "totalFat": 58,
  "logs": [
    { "mealType": "BREAKFAST", "calories": 450, ... },
    { "mealType": "LUNCH", "calories": 550, ... },
    { "mealType": "DINNER", "calories": 650, ... },
    { "mealType": "SNACK", "calories": 200, ... }
  ]
}
```

### 3.6 Macro Target Configuration

Users can set their daily macro targets:

| Setting | Default | Description |
|---------|---------|-------------|
| Daily Calories | 2000 kcal | Target energy intake |
| Protein | 120g | Target protein |
| Carbohydrates | 200g | Target carbs |
| Fat | 65g | Target fat |

### 3.7 Diet Log Status Flow

```
PENDING_AI ──► DRAFT ──► PT_REVIEWING ──► APPROVED
    │                              │
    │                              └──► REJECTED
    │
    └──► LOGGED (manual entry)
```

| Status | Description |
|--------|-------------|
| PENDING_AI | Awaiting AI analysis |
| DRAFT | Low AI confidence, needs verification |
| LOGGED | Manually logged entry |
| PT_REVIEWING | Waiting for PT review |
| APPROVED | Reviewed and approved |
| REJECTED | Reviewed and rejected |

---

## 4. PT Workflow

### 4.1 Overview

The PT Workflow feature enables Personal Trainers to manage clients, review diet logs, and track progress.

### 4.2 Client Assignment

#### 4.2.1 Finding a PT

Customers browse the marketplace to find suitable PTs:

1. Search by specialization
2. Filter by experience
3. Check ratings and reviews
4. View PT profiles

#### 4.2.2 Client Request

Customers can request to connect with a PT through the marketplace or directly assign via PT workspace (admin-managed).

### 4.3 PT Workspace

#### 4.3.1 Client Dashboard

PTs see their assigned clients with status indicators:

| Status | Color | Description |
|--------|-------|-------------|
| GREEN | #22c55e | Client logged meal today |
| YELLOW | #eab308 | No meal logged today |

#### 4.3.2 Pending Reviews

PTs review diet logs awaiting approval:

```
┌─────────────────────────────────────────────────────────────┐
│                    PENDING DIET LOGS                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Client: Nguyen Van A                                    │ │
│ │ Meal: Lunch                                             │ │
│ │ Date: 2026-05-29                                       │ │
│ │ Image: [thumbnail]                                      │ │
│ │ AI Analysis: 485 cal, 42g protein                      │ │
│ │ Confidence: 85%                                        │ │
│ │                                                         │ │
│ │ Actions: [Approve] [Adjust] [Reject]                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Client: Tran Thi B                                      │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3.3 Review Actions

| Action | Description | Result |
|--------|-------------|--------|
| APPROVE | Accept the diet log as is | Status = APPROVED |
| ADJUST_MACROS | Modify nutritional values | Status = APPROVED, macros updated |
| REJECT | Reject the diet log | Status = REJECTED |

### 4.4 Progress Tracking

#### 4.4.1 Client Progress View

PTs can view detailed progress data for each client:

```
┌─────────────────────────────────────────────────────────────┐
│                   PROGRESS: Nguyen Van A                   │
├─────────────────────────────────────────────────────────────┤
│ Date Range: 2026-04-29 to 2026-05-29 (Last 30 days)        │
│                                                              │
│ CALORIE TREND                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 2500 ┤                                                 │ │
│ │ 2000 ┤                    ┌───┐                       │ │
│ │ 1500 ┤        ┌───┐        │   │  ┌───┐               │ │
│ │ 1000 ┤  ┌───┐ │   │  ┌───┐ │   │  │   │  ┌───┐        │ │
│ │  500 ┤  │   │ │   │  │   │ │   │  │   │  │   │        │ │
│ │    0 ┼──┴───┴─┴───┴──┴───┴─┴───┴──┴───┴──┴───┴────────│ │
│ │        M   T   W   T   F   S   S                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Target: 2000 kcal ─────────────────────────                  │
│                                                              │
│ MACRO SUMMARY                                               │
│ ┌──────────────────┬──────────────────┐                   │
│ │ Avg Calories     │ 1657 kcal        │                   │
│ │ Avg Protein      │ 115g             │                   │
│ │ Avg Carbs        │ 164g             │                   │
│ │ Avg Fat          │ 52g              │                   │
│ │ Adherence Rate   │ 85.5%            │                   │
│ └──────────────────┴──────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4.2 Metrics Tracked

| Metric | Description |
|--------|-------------|
| Calorie History | Daily calorie intake vs target |
| Body Metrics | Weight, body fat %, lean body mass |
| Macro Averages | Average protein, carbs, fat |
| Adherence Rate | % of days meeting targets |

### 4.5 Real-Time Notifications (SSE)

PTs receive real-time notifications via Server-Sent Events:

| Event | Trigger | Payload |
|-------|---------|---------|
| NEW_DIET_LOG | Client creates diet log | client info, log ID |
| SOS_TICKET | Client creates SOS | client info, priority |

---

## 5. SOS System

### 5.1 Overview

The SOS (Support) System allows customers to request help from PTs when they have questions or concerns about their diet.

### 5.2 SOS Ticket Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │     │   Backend   │     │   Admin     │     │     PT      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                   │                   │
       │  1. Create SOS    │                   │                   │
       │──────────────────>│                   │                   │
       │                    │                   │                   │
       │  2. Status = OPEN│                   │                   │
       │                    │                   │                   │
       │                    │  3. View Tickets │                   │
       │                    │───────────────────────────────────────>│
       │                    │                   │                   │
       │                    │  4. Assign to PT │                   │
       │                    │<──────────────────────────────────────│
       │                    │                   │                   │
       │  5. Notification  │                   │                   │
       │<──────────────────│                   │                   │
       │                    │                   │                   │
       │                    │  6. PT Handles  │                   │
       │                    │<──────────────────────────────────────│
       │                    │                   │                   │
       │                    │  7. Status = RESOLVED/CLOSED        │
       │                    │                   │                   │
```

### 5.3 SOS Priority Levels

| Priority | Description | Use Case |
|----------|-------------|----------|
| HIGH | Urgent attention needed | Critical diet issues |
| MEDIUM | Normal priority | General questions |
| LOW | Can wait | Non-urgent concerns |

### 5.4 SOS Ticket Status

| Status | Description |
|--------|-------------|
| OPEN | Newly created, awaiting assignment |
| ASSIGNED | Assigned to a PT |
| RESOLVED | Issue addressed |
| CLOSED | Ticket closed |

### 5.5 Creating SOS Ticket

```json
POST /api/v1/diet/sos
{
  "dietLogId": "550e8400-e29b-41d4-a716-446655440000",
  "note": "I'm confused about the macros in this meal",
  "priority": "HIGH"
}
```

### 5.6 Linking to Diet Log

SOS tickets can be linked to specific diet logs for context:

1. User creates SOS from a diet log
2. Ticket is flagged with `sosTicketFlag = true` on the log
3. PT can view the related diet log when handling the ticket

---

## 6. Marketplace

### 6.1 Overview

The Marketplace allows customers to discover and connect with Personal Trainers.

### 6.2 PT Profile

#### 6.2.1 Profile Information

| Field | Description |
|-------|-------------|
| Full Name | PT's display name |
| Avatar | Profile picture |
| Bio | Professional biography |
| Training Philosophy | Approach to training |
| Years of Experience | Professional experience |
| Specializations | Areas of expertise |
| Certifications | Professional certifications |
| Rating | Average rating (1-5) |
| Total Reviews | Number of reviews |
| Tier | TIER_1 or TIER_2 |

### 6.3 Search & Filtering

| Filter | Options | Description |
|--------|---------|-------------|
| Specialization | Weight Loss, Muscle Building, etc. | Filter by expertise |
| Experience | minExperience | Minimum years |
| Verified | true/false | Show only verified PTs |
| Tier | TIER_1, TIER_2 | PT tier level |
| Sort By | tier, rating, experience | Sort results |
| Sort Direction | asc, desc | Sort order |

### 6.4 PT Tiers

| Tier | Role | Description |
|------|------|-------------|
| TIER_1 | PT_CERTIFIED | Professionally certified PTs |
| TIER_2 | PT_FREELANCE | Independent/freelance PTs |

### 6.5 Review System

#### 6.5.1 Creating a Review

Customers can leave reviews for PTs:

```json
POST /api/v1/marketplace/pts/{ptId}/reviews
{
  "rating": 5,
  "comment": "Excellent guidance on meal planning!"
}
```

#### 6.5.2 Rating Calculation

The PT's average rating is calculated from all reviews:

```
averageRating = SUM(all ratings) / COUNT(reviews)
```

#### 6.5.3 Review Display

Reviews show:
- Reviewer name
- Rating (1-5 stars)
- Comment
- Date

---

## 7. Admin Management

### 7.1 Overview

The Admin module provides system administration features for managing users, PT verification, and SOS tickets.

### 7.2 User Management

#### 7.2.1 View Users

Admins can view all users with filters:

| Filter | Description |
|--------|-------------|
| Role | CUSTOMER, PT_FREELANCE, PT_CERTIFIED, ADMIN |
| Status | ACTIVE, INACTIVE, PENDING_APPROVAL, SUSPENDED |
| Search | Search by name/email |

#### 7.2.2 Update User Status

| Status | Description |
|--------|-------------|
| ACTIVE | Normal account |
| INACTIVE | Deactivated |
| SUSPENDED | Temporarily blocked |

### 7.3 PT Verification

#### 7.3.1 Verification Process

```
1. PT submits registration with documents
2. Admin reviews pending PTs
3. Admin verifies documents
4. Admin approves or rejects
5. PT receives notification
```

#### 7.3.2 Verification Decision

| Action | Result |
|--------|--------|
| APPROVE + CERTIFIED | Role = PT_CERTIFIED, Tier = TIER_1 |
| APPROVE + FREELANCE | Role = PT_FREELANCE, Tier = TIER_2 |
| REJECT | Status = SUSPENDED, isVerified = false |

#### 7.3.3 Documents Reviewed

| Document | Description |
|----------|-------------|
| CV | Professional resume |
| Certifications | Proof of certifications |
| ID | Identity verification |

### 7.4 Dashboard Statistics

Admins can view platform statistics:

| Metric | Description |
|--------|-------------|
| Total Users | All registered users |
| Total Customers | Users with CUSTOMER role |
| Total PTs | All PTs (certified + freelance) |
| Pending Verifications | PTs awaiting approval |
| Active SOS Tickets | Open SOS tickets |
| Total Diet Logs | All diet log entries |
| Average Rating | Platform-wide PT rating |

---

## 8. User Interactions

### 8.1 Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER JOURNEY                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Register│────>│Set Macro    │────>│Find PT in   │────>│Connect with │
│         │     │Targets      │     │Marketplace  │     │PT           │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
┌─────────┐     ┌─────────────┐     ┌─────────────┐                │
│ View    │<────│Log Diet    │<────│Review       │<───────────────┤
│ Progress│     │Daily       │     │Approved Logs│                │
└─────────┘     └──────┬──────┘     └─────────────┘                │
                       │                                           │
                       ▼                                           │
                ┌─────────────┐                                    │
                │Create SOS if│                                    │
                │Need Help    │───────────────────────────────────┘
                └─────────────┘
```

### 8.2 PT Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PT JOURNEY                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Register    │────>│Admin        │────>│View Client  │────>│Review Diet  │
│             │     │Verifies     │     │List         │     │Logs         │
└─────────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘
                                               │                     │
                    ┌──────────────────────────┴────────────────────┤
                    │                                                 │
                    ▼                                                 ▼
             ┌─────────────┐                                   ┌─────────────┐
             │Track Client │                                   │Approve/     │
             │Progress     │                                   │Reject Logs  │
             └──────┬──────┘                                   └─────────────┘
                    │
                    ▼
             ┌─────────────┐
             │Handle SOS   │
             │Tickets      │
             └─────────────┘
```

### 8.3 Admin Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADMIN JOURNEY                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│Login        │────>│View         │────>│Verify PT    │────>│Assign SOS   │
│             │     │Dashboard    │     │Applications │     │Tickets      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
                    ▼
             ┌─────────────┐
             │Manage Users│
             │(Suspend/   │
             │Activate)   │
             └─────────────┘
```

---

## 9. Data Flows

### 9.1 Diet Log Creation Flow

```
User ──> POST /diet/logs/analyze ──> Backend
                                    │
                                    ├── Upload Image ──> MinIO
                                    │
                                    ├── Get Presigned URL
                                    │
                                    ├── Call Ollama AI
                                    │
                                    └── Save Diet Log (status=PT_REVIEWING)
                                         │
                                         └── SSE Notification ──> PT
```

### 9.2 PT Review Flow

```
PT ──> PUT /workspace/diet-logs/{id}/review ──> Backend
                                            │
                                            ├── Update DietLog status
                                            │
                                            ├── Save PT note (if any)
                                            │
                                            ├── Send Notification ──> Client
                                            │
                                            └── Update SSE status
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-05-29*
