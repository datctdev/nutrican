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
7. [KYC Verification](#8-kyc-verification)

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
User (Upload)  →  Backend Service  →  MinIO (Storage)
                                  │
                                  ▼
                          Ollama (qwen2.5-vl)
                          { vision + nutrition prompt }
                                  │
                                  ▼
                          AnalyzeMealResponse
                          { foodName, calories, protein,
                            carb, fat, confidenceScore }
```

### 2.4 AI Prompt

**System prompt** (stored in `MealRecognitionServiceImpl`; hash saved as `prompt_version` on each log):

```
You are a nutritional analysis assistant specialized in food recognition.
Analyze the meal image and provide nutritional information.
Respond ONLY with valid JSON in this exact format:
{
  "foodName": "name of the food",
  "portionSize": number in grams,
  "portionUnit": "grams",
  "calories": estimated calories,
  "protein": protein in grams,
  "carbs": carbohydrates in grams,
  "fat": fat in grams,
  "confidenceScore": confidence between 0.0 and 1.0,
  "mealComplexity": "SIMPLE or COMPOSITE or HOTPOT",
  "detectedItems": [{"name": "item name", "estimatedGrams": number}],
  "uncertaintyReasons": ["reason if any"],
  "fallback": true if you're uncertain,
  "message": "brief message if needed"
}
```

**User prompt** (appended per request):
```
Analyze this food image and provide nutritional information for a {mealType} meal.
Context: mealSource={mealSource}, mealComplexity={mealComplexity}.
Estimate portion size and macros accurately. Be specific about the food type.
For HOTPOT meals, list detectedItems separately. Respond ONLY with valid JSON.
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

---

## 3. Diet Tracking

### 3.1 Overview

The Diet Tracking feature allows users to log their meals, track macronutrients, and monitor their daily nutritional intake against their targets.

### 3.2 Meal Logging Methods

#### 3.2.1 Manual Entry

Users can manually enter their meals with nutritional information.

#### 3.2.2 AI Analysis

Users upload a photo of their meal for automatic analysis via Ollama.

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

Users can view their daily nutritional summary with totals vs targets.

### 3.6 Macro Target Configuration

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

### 3.8 Meal Context (Ăn ngoài vs Tự nấu)

| MealSource | Description |
|------------|-------------|
| HOME_COOKED | User cooked at home |
| RESTAURANT | Eating at restaurant |
| TAKEOUT | Takeaway food |
| CANTEEN | Canteen/cafeteria |

Low AI confidence when eating out triggers SOS suggestion (not auto-created).

### 3.9 Food Database

Internal seed catalog (`food_items`) with Vietnamese dishes. Search API supports name/alias lookup. Used for hybrid CV→DB macro matching.

### 3.10 Hotpot (Lẩu)

Hybrid flow: user selects broth + dipping items from DB, optional photo for AI portion estimate. Macros summed from `diet_log_items`.

### 3.11 DRAFT Submit

Customer can submit DRAFT logs for PT review via `PUT /diet/logs/{id}/submit-for-review`.

### 3.12 RBL Layer (Research Baseline)

The RBL (Research Baseline Layer) freezes AI and DB predictions at analyze time so PT review can produce measurable ground-truth labels for computer-vision evaluation.

**Pipeline:**

```
Customer upload → VLM analyze → Food DB match → snapshots frozen
       → PT queue (PT_REVIEWING) → PT reviewLog → pt_adjusted_macros (label)
       → Admin export CSV / stats (MAE, calibration)
```

**Frozen snapshots (R0):**

| Field | When set | Purpose |
|-------|----------|---------|
| `ai_predicted_macros` | `analyzeMeal` | Immutable VLM output baseline |
| `db_matched_macros` | `analyzeMeal` | DB candidate even when hybrid not applied |
| `db_match_score` | `analyzeMeal` | Match confidence |
| `model_version`, `prompt_version` | `analyzeMeal` | Reproducibility |
| `experiment_cohort` | `analyzeMeal` | Research grouping (e.g. RESTAURANT_HYBRID, COMPOSITE_BUFFET) |
| `macros_at_review` | `reviewLog` (before mutate) | Detect which fields PT changed |
| `pt_adjusted_macros` | APPROVE / ADJUST | Ground-truth label |
| `pt_blind_macros` | Blind estimate (R5) | PT estimate before seeing AI/DB |

**PT review UX (R1/R5):**

- Side-by-side columns: AI prediction | DB/hybrid | Shown to client
- `correctionReason` taxonomy on ADJUST/REJECT (WRONG_FOOD, WRONG_PORTION, etc.)
- Optional blind mode: PT enters macros first, then AI/DB revealed

**Admin research tools (R2/R3):**

- CSV export with `delta_ai_*`, anonymized `customer_hash`, `image_object_name`
- Stats: MAE from `ai_predicted_macros` vs `pt_adjusted_macros` (not `macros_json`)
- Calibration buckets, adjust rate by meal source/cohort, SOS linkage metrics

**Composite buffet (R5):**

- Checkbox "Buffet / nhiều món" on restaurant analyze (mirrors hotpot multi-select)
- `mealComplexity=COMPOSITE` with `compositeItemIds` / `compositePortions`

See [RESEARCH.md](./RESEARCH.md) for research overview and [RBL_METHODOLOGY.md](./RBL_METHODOLOGY.md) for export filters, cohort rules, and thesis workflow.

---

## 4. PT Workflow

### 4.1 Overview

The PT Workflow feature enables Personal Trainers to manage clients, review diet logs, and track progress.

### 4.2 Client Assignment

- Customers browse the marketplace to find suitable PTs
- Client request through marketplace or direct assignment via PT workspace (admin-managed)

### 4.3 PT Workspace

#### 4.3.1 Client Dashboard

PTs see their assigned clients with status indicators:

| Status | Color | Description |
|--------|-------|-------------|
| GREEN | #22c55e | Client logged meal today |
| YELLOW | #eab308 | No meal logged today |

#### 4.3.2 Review Actions

| Action | Description | Result |
|--------|-------------|--------|
| APPROVE | Accept the diet log as is | Status = APPROVED; `pt_adjusted_macros` = current macros |
| ADJUST_MACROS | Modify nutritional values | Status = APPROVED; `pt_adjusted_macros` = adjusted values |
| REJECT | Reject the diet log | Status = REJECTED; excluded from MAE (negative sample) |

PT review also records `pt_action`, `pt_reviewed_at`, `pt_correction_reason`, and optional `pt_blind_macros` (blind mode).

### 4.4 Progress Tracking

PTs can view detailed progress data for each client:

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
Customer  →  Create SOS  →  Backend (status=OPEN)
                            │
                            ▼
                    Admin View Tickets
                            │
                            ▼
                    Assign to PT  →  PT Handles
                            │
                            ▼
                    Status=RESOLVED/CLOSED
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

---

## 6. Marketplace

### 6.1 Overview

The Marketplace allows customers to discover and connect with Personal Trainers.

### 6.2 PT Profile

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

### 6.4 PT Tiers

| Tier | Role | Description |
|------|------|-------------|
| TIER_1 | PT_CERTIFIED | Professionally certified PTs |
| TIER_2 | PT_FREELANCE | Independent/freelance PTs |

### 6.5 Review System

Customers can leave reviews for PTs with rating (1-5) and comments.

---

## 7. Admin Management

### 7.1 Overview

The Admin module provides system administration features for managing users, PT verification, and SOS tickets.

### 7.2 User Management

Admins can view all users with filters by role, status, and search by name/email.

### 7.3 PT Verification

```
1. PT submits registration with documents
2. PT submits KYC documents (ID card, etc.)
3. Admin reviews pending PTs
4. Admin verifies KYC documents
5. Admin approves or rejects
6. PT receives notification
```

| Action | Result |
|--------|--------|
| APPROVE + CERTIFIED | Role = PT_CERTIFIED, Tier = TIER_1 |
| APPROVE + FREELANCE | Role = PT_FREELANCE, Tier = TIER_2 |
| REJECT | Status = SUSPENDED, isVerified = false |

### 7.4 Dashboard Statistics

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

## 8. KYC Verification

### 8.1 Overview

The KYC (Know Your Customer) system collects and verifies identity documents for PT registration.

### 8.2 Documents Collected

| Document | Description |
|----------|-------------|
| ID Card Number | Government-issued ID number |
| ID Card Front | Front side of ID card image |
| ID Card Back | Back side of ID card image |
| Full Name on Card | Name as printed on ID |
| Date of Birth on Card | DOB as on ID |
| Address on Card | Address as on ID |

### 8.3 KYC Status Flow

```
SUBMITTED → PENDING_APPROVAL → APPROVED
                │
                └──→ REJECTED (with rejectionReason)
```

### 8.4 KYC Review (Admin)

- Admin views submitted KYC documents
- Admin can approve or reject with notes
- KYC approval is a prerequisite for PT verification

---

## 9. User Interactions

### 9.1 Customer Journey

```
Register → Set Macro Targets → Find PT in Marketplace → Connect with PT
    │
    └→ Log Diet Daily ─→ View Progress ─→ Receive PT Review
              │
              └→ Create SOS if Need Help
```

### 9.2 PT Journey

```
Register → Submit KYC → Admin Verifies → View Clients → Review Diet Logs
    │                                              │
    └→ Track Client Progress ←─── Approve/Reject Logs ←──┘
              │
              └→ Handle SOS Tickets
```

### 9.3 Admin Journey

```
Login → View Dashboard → Verify PT (KYC + docs) → Assign SOS Tickets → Manage Users
```

---

*Document Version: 2.1.0*
*Last Updated: 2026-06-20*
