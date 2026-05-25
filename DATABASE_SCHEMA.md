# Database Schema - Nutrican PT

## Entity Relationship Diagram (ERD)

```
┌─────────────────┐       ┌─────────────────┐
│      USER       │       │   PT_PROFILE    │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──1:1──│ id (PK)         │
│ email           │       │ user_id (FK)     │
│ password        │       │ bio             │
│ full_name       │       │ certifications  │
│ role            │       │ years_exp       │
│ status          │       │ tier            │
│ avatar_url      │       │ rating          │
│ phone_number    │       │ verified        │
│ created_at      │       │ specializations │
└─────────────────┘       │ created_at      │
        │                 └─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐       ┌─────────────────┐
│   DIET_LOG      │       │  SOS_TICKET     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──1:1──│ id (PK)         │
│ user_id (FK)     │       │ diet_log_id(FK) │
│ meal_type       │       │ pt_id (FK)      │
│ foods_json      │       │ status          │
│ image_url       │       │ message         │
│ status          │       │ priority        │
│ calories        │       │ created_at      │
│ protein         │       │ resolved_at     │
│ carb            │       └─────────────────┘
│ fat             │
│ logged_at       │                 ▲
│ reviewed_by     │                 │
│ review_feedback │       ┌─────────────────┐
└─────────────────┘       │ PT_CLIENT_MAPPING│
        │                 ├─────────────────┤
        │ N:M             │ id (PK)         │
        ▼                 │ pt_id (FK)      │
┌─────────────────┐       │ client_id (FK)  │
│    REVIEW       │       │ status          │
├─────────────────┤       │ assigned_at     │
│ id (PK)         │       └─────────────────┘
│ pt_id (FK)      │                 │
│ reviewer_id(FK)  │                 │ N:1
│ rating          │                 ▼
│ comment         │         ┌─────────────────┐
│ created_at      │         │      USER       │
└─────────────────┘         │   (as client)  │
                            └─────────────────┘

┌─────────────────┐
│  MACRO_TARGET   │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │──1:1──┌─────────────────┐
│ daily_calories  │       │      USER       │
│ protein         │       │   (as pt)       │
│ carb            │       └─────────────────┘
│ fat             │
└─────────────────┘

┌─────────────────┐
│  NOTIFICATION   │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ type            │
│ title           │
│ content         │
│ is_read         │
│ created_at      │
└─────────────────┘
```

---

## Tables Detail

### users

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(50),
    role            VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    avatar_url      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK | User ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password | VARCHAR(255) | NOT NULL | BCrypt encoded |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| phone_number | VARCHAR(50) | | Phone number |
| role | VARCHAR(20) | NOT NULL | CUSTOMER, PT_CERTIFIED, PT_FREELANCE, ADMIN |
| status | VARCHAR(20) | NOT NULL | ACTIVE, INACTIVE, PENDING_APPROVAL, SUSPENDED |
| avatar_url | TEXT | | URL to avatar image in MinIO |

---

### pt_profiles

```sql
CREATE TABLE pt_profiles (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio               TEXT,
    training_philosophy TEXT,
    years_experience  INTEGER DEFAULT 0,
    certifications    TEXT,
    tier              VARCHAR(20) DEFAULT 'TIER_2',
    rating            DECIMAL(3,2) DEFAULT 0.00,
    review_count      INTEGER DEFAULT 0,
    verified          BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pt_profiles_user ON pt_profiles(user_id);
CREATE INDEX idx_pt_profiles_tier ON pt_profiles(tier);
CREATE INDEX idx_pt_profiles_verified ON pt_profiles(verified);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK | Profile ID |
| user_id | BIGINT | FK -> users, UNIQUE | PT user reference |
| bio | TEXT | | Biography/description |
| training_philosophy | TEXT | | Training approach |
| years_experience | INTEGER | DEFAULT 0 | Years of experience |
| certifications | TEXT | | Certifications (comma-separated) |
| tier | VARCHAR(20) | DEFAULT 'TIER_2' | TIER_1 (Certified), TIER_2 (Freelance) |
| rating | DECIMAL(3,2) | DEFAULT 0.00 | Average rating (0.00 - 5.00) |
| review_count | INTEGER | DEFAULT 0 | Number of reviews |
| verified | BOOLEAN | DEFAULT FALSE | Admin verification status |

---

### diet_logs

```sql
CREATE TABLE diet_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type       VARCHAR(20) NOT NULL,
    foods_json      JSONB,
    image_url       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    calories        DECIMAL(10,2) DEFAULT 0,
    protein         DECIMAL(10,2) DEFAULT 0,
    carb            DECIMAL(10,2) DEFAULT 0,
    fat             DECIMAL(10,2) DEFAULT 0,
    logged_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by     BIGINT REFERENCES users(id),
    review_feedback TEXT,
    reviewed_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diet_logs_user ON diet_logs(user_id);
CREATE INDEX idx_diet_logs_status ON diet_logs(status);
CREATE INDEX idx_diet_logs_logged_at ON diet_logs(logged_at);
CREATE INDEX idx_diet_logs_meal_type ON diet_logs(meal_type);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK | Log ID |
| user_id | BIGINT | FK -> users | Customer who logged |
| meal_type | VARCHAR(20) | NOT NULL | BREAKFAST, LUNCH, DINNER, SNACK |
| foods_json | JSONB | | Array of food items with details |
| image_url | TEXT | | MinIO URL of food image |
| status | VARCHAR(20) | NOT NULL | PENDING_AI, DRAFT, LOGGED, PT_REVIEWING, APPROVED, REJECTED |
| calories/protein/carb/fat | DECIMAL | DEFAULT 0 | Nutritional values |
| logged_at | TIMESTAMP | NOT NULL | When the meal was eaten |
| reviewed_by | BIGINT | FK -> users | PT who reviewed |
| review_feedback | TEXT | | PT's feedback |
| reviewed_at | TIMESTAMP | | When reviewed |

**foods_json structure:**
```json
[
  {
    "foodName": "Grilled Chicken",
    "portionSize": 200,
    "portionUnit": "g",
    "calories": 165,
    "protein": 31,
    "carb": 0,
    "fat": 3.6
  }
]
```

---

### pt_client_mappings

```sql
CREATE TABLE pt_client_mappings (
    id          BIGSERIAL PRIMARY KEY,
    pt_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pt_id, client_id)
);

CREATE INDEX idx_pt_client_pt ON pt_client_mappings(pt_id);
CREATE INDEX idx_pt_client_client ON pt_client_mappings(client_id);
CREATE INDEX idx_pt_client_status ON pt_client_mappings(status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK | Mapping ID |
| pt_id | BIGINT | FK -> users | Personal Trainer |
| client_id | BIGINT | FK -> users | Customer |
| status | VARCHAR(20) | NOT NULL | ACTIVE, INACTIVE, PENDING |

---

### macro_targets

```sql
CREATE TABLE macro_targets (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    daily_calories  DECIMAL(10,2) DEFAULT 2000,
    protein         DECIMAL(10,2) DEFAULT 100,
    carb            DECIMAL(10,2) DEFAULT 250,
    fat             DECIMAL(10,2) DEFAULT 65,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_macro_targets_user ON macro_targets(user_id);
```

---

### sos_tickets

```sql
CREATE TABLE sos_tickets (
    id              BIGSERIAL PRIMARY KEY,
    diet_log_id     BIGINT REFERENCES diet_logs(id) ON DELETE SET NULL,
    client_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pt_id           BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority        VARCHAR(10) DEFAULT 'NORMAL',
    message         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP
);

CREATE INDEX idx_sos_tickets_client ON sos_tickets(client_id);
CREATE INDEX idx_sos_tickets_pt ON sos_tickets(pt_id);
CREATE INDEX idx_sos_tickets_status ON sos_tickets(status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK | Ticket ID |
| diet_log_id | BIGINT | FK -> diet_logs | Related diet log |
| client_id | BIGINT | FK -> users | Customer who created |
| pt_id | BIGINT | FK -> users | Assigned PT |
| status | VARCHAR(20) | NOT NULL | OPEN, ASSIGNED, RESOLVED, CLOSED |
| priority | VARCHAR(10) | DEFAULT 'NORMAL' | HIGH, NORMAL, LOW |
| message | TEXT | NOT NULL | SOS message |
| resolved_at | TIMESTAMP | | When resolved |

---

### reviews

```sql
CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    pt_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_pt ON reviews(pt_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
```

---

### notifications

```sql
CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    content     TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

| Notification Types |
|---------------------|
| DIET_LOG_APPROVED |
| DIET_LOG_REJECTED |
| NEW_CLIENT |
| CLIENT_REMOVED |
| SOS_ASSIGNED |
| SOS_RESOLVED |
| NEW_REVIEW |
| PT_APPROVED |
| PT_REJECTED |

---

## Enum Values

```sql
-- users.role
CUSTOMER, PT_CERTIFIED, PT_FREELANCE, ADMIN

-- users.status
ACTIVE, INACTIVE, PENDING_APPROVAL, SUSPENDED

-- diet_logs.status
PENDING_AI, DRAFT, LOGGED, PT_REVIEWING, APPROVED, REJECTED

-- diet_logs.meal_type
BREAKFAST, LUNCH, DINNER, SNACK

-- pt_profiles.tier
TIER_1, TIER_2

-- pt_client_mappings.status
ACTIVE, INACTIVE, PENDING

-- sos_tickets.status
OPEN, ASSIGNED, RESOLVED, CLOSED

-- sos_tickets.priority
HIGH, NORMAL, LOW
```

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| users | idx_users_email | Login lookup |
| users | idx_users_role | Filter by role |
| users | idx_users_status | Filter by status |
| pt_profiles | idx_pt_profiles_user | Join with users |
| pt_profiles | idx_pt_profiles_tier | Filter by tier |
| pt_profiles | idx_pt_profiles_verified | Filter verified PTs |
| diet_logs | idx_diet_logs_user | User's diet logs |
| diet_logs | idx_diet_logs_status | Filter by status |
| diet_logs | idx_diet_logs_logged_at | Date range queries |
| diet_logs | idx_diet_logs_meal_type | Filter by meal type |
| pt_client_mappings | idx_pt_client_pt | PT's clients |
| pt_client_mappings | idx_pt_client_client | Client's PTs |
| sos_tickets | idx_sos_tickets_client | Client's tickets |
| sos_tickets | idx_sos_tickets_pt | PT's tickets |
| sos_tickets | idx_sos_tickets_status | Filter open tickets |
| reviews | idx_reviews_pt | PT's reviews |
| notifications | idx_notifications_user | User's notifications |

---

## Sample Queries

### Get PT's clients with today's log status

```sql
SELECT
    u.id as client_id,
    u.full_name,
    u.avatar_url,
    PCM.status,
    dl_log.last_log_at,
    dl_log.total_logs,
    dl_log.avg_calories
FROM pt_client_mappings PCM
JOIN users u ON u.id = PCM.client_id
LEFT JOIN LATERAL (
    SELECT
        MAX(dl.logged_at) as last_log_at,
        COUNT(*) as total_logs,
        AVG(dl.calories) as avg_calories
    FROM diet_logs dl
    WHERE dl.user_id = PCM.client_id
) dl_log ON true
WHERE PCM.pt_id = 5 AND PCM.status = 'ACTIVE';
```

### Daily nutrition summary

```sql
SELECT
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(carb) as total_carb,
    SUM(fat) as total_fat
FROM diet_logs
WHERE user_id = 1
  AND logged_at >= CURRENT_DATE
  AND logged_at < CURRENT_DATE + INTERVAL '1 day';
```

### Get pending PT verifications

```sql
SELECT
    u.id,
    u.email,
    u.full_name,
    u.phone_number,
    pp.bio,
    pp.years_experience,
    pp.certifications,
    pp.created_at
FROM users u
JOIN pt_profiles pp ON pp.user_id = u.id
WHERE u.role = 'PT_FREELANCE'
  AND u.status = 'PENDING_APPROVAL'
  AND pp.verified = FALSE
ORDER BY pp.created_at DESC;
```
