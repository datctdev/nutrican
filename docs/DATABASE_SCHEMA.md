# NutriCan PT - Database Schema

## 1. Overview

This document describes the complete database schema for NutriCan PT application.

### 1.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Database | PostgreSQL | 17+ |
| ORM | Spring Data JPA | - |
| Migrations | Hibernate auto-ddl | - |

### 1.2 Schema Summary

| Table | Primary Key | Foreign Keys | Description |
|-------|-------------|--------------|-------------|
| `users` | id (UUID) | - | User accounts |
| `user_kyc` | id (UUID) | user_id (1:1) | KYC verification documents |
| `pt_profiles` | id (UUID) | user_id (1:1) | PT extended profiles |
| `macro_targets` | id (UUID) | user_id (1:1) | Daily macro targets |
| `diet_logs` | id (UUID) | customer_id, pt_reviewer_id | Meal entries |
| `diet_log_images` | id (UUID) | diet_log_id (N:1) | Meal images (multi-image support) |
| `pt_client_mappings` | id (UUID) | pt_id, client_id | PT-Client relationships |
| `sos_tickets` | id (UUID) | diet_log_id, pt_id, assigned_by | SOS support tickets |
| `body_metrics` | id (UUID) | user_id | Body measurements |
| `reviews` | id (UUID) | pt_id, reviewer_id | PT reviews |
| `notifications` | id (UUID) | user_id | User notifications |

---

## 2. Entity Relationship Diagram

```
users (1) ── (1) user_kyc
         ── (1) pt_profiles
         ── (1) macro_targets
         ── (1) body_metrics
         ── (many) notifications
         ── (many) reviews (given)
         ── (many) diet_logs
         ── (many) pt_client_mappings (as PT)
         ── (many) pt_client_mappings (as client)

diet_logs (1) ── (many) diet_log_images
             ── (1) sos_tickets
```

---

## 3. Table Definitions

### 3.1 users

Main user accounts table.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone_number VARCHAR(50),
    address TEXT,
    date_of_birth TIMESTAMP,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_google_id ON users(google_id);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt hashed password |
| role | VARCHAR(50) | NOT NULL | User role enum |
| status | VARCHAR(50) | NOT NULL | Account status enum |
| full_name | VARCHAR(255) | - | User's full name |
| avatar_url | VARCHAR(500) | - | Profile picture URL |
| phone_number | VARCHAR(50) | - | Phone number |
| address | TEXT | - | Physical address |
| date_of_birth | TIMESTAMP | - | Date of birth |
| google_id | VARCHAR(255) | UNIQUE | Google OAuth ID |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.2 user_kyc

KYC (Know Your Customer) verification documents for PT registration.

```sql
CREATE TABLE user_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    id_card_number VARCHAR(20),
    id_card_front_url VARCHAR(500),
    id_card_back_url VARCHAR(500),
    full_name_on_card VARCHAR(255),
    date_of_birth_on_card DATE,
    address_on_card TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    rejection_reason TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_kyc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_kyc_user_id ON user_kyc(user_id);
CREATE INDEX idx_user_kyc_status ON user_kyc(verification_status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK, UNIQUE, NOT NULL | Reference to users table |
| id_card_number | VARCHAR(20) | - | ID card number |
| id_card_front_url | VARCHAR(500) | - | Front side of ID card image |
| id_card_back_url | VARCHAR(500) | - | Back side of ID card image |
| full_name_on_card | VARCHAR(255) | - | Name as on ID card |
| date_of_birth_on_card | DATE | - | DOB as on ID card |
| address_on_card | TEXT | - | Address as on ID card |
| is_verified | BOOLEAN | DEFAULT FALSE | KYC verification status |
| verification_status | VARCHAR(50) | DEFAULT 'PENDING_APPROVAL' | Admin review status |
| rejection_reason | TEXT | - | Reason if rejected |
| reviewed_at | TIMESTAMP | - | When admin reviewed |
| reviewed_by | UUID | - | Admin who reviewed |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.3 pt_profiles

Extended profile information for Personal Trainers.

```sql
CREATE TABLE pt_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    bio TEXT,
    training_philosophy TEXT,
    years_of_experience INTEGER,
    portfolio_showcase JSONB,
    specializations TEXT[],
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_reviews INTEGER DEFAULT 0,
    tier VARCHAR(50) DEFAULT 'TIER_2',
    hourly_rate DECIMAL(10,2),
    certifications TEXT,
    cv_url VARCHAR(500),
    document_urls TEXT,
    verification_status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_pt_profiles_user_id ON pt_profiles(user_id);
CREATE INDEX idx_pt_profiles_is_verified ON pt_profiles(is_verified);
CREATE INDEX idx_pt_profiles_tier ON pt_profiles(tier);
CREATE INDEX idx_pt_profiles_verification_status ON pt_profiles(verification_status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK, UNIQUE, NOT NULL | Reference to users table |
| is_verified | BOOLEAN | DEFAULT FALSE | Verification status |
| bio | TEXT | - | PT biography |
| training_philosophy | TEXT | - | Training approach |
| years_of_experience | INTEGER | - | Years of experience |
| portfolio_showcase | JSONB | - | Portfolio items |
| specializations | TEXT[] | - | Areas of expertise |
| rating | DECIMAL(3,2) | DEFAULT 5.00 | Average rating |
| total_reviews | INTEGER | DEFAULT 0 | Number of reviews |
| tier | VARCHAR(50) | DEFAULT 'TIER_2' | Tier level |
| hourly_rate | DECIMAL(10,2) | - | Cost per hour |
| certifications | TEXT | - | Certifications |
| cv_url | VARCHAR(500) | - | CV document URL |
| document_urls | TEXT | - | Additional documents |
| verification_status | VARCHAR(50) | DEFAULT 'PENDING_APPROVAL' | Admin verification status |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.4 macro_targets

Daily macro nutrient targets for users.

```sql
CREATE TABLE macro_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    daily_calories DECIMAL(10,2) DEFAULT 2000.00,
    protein DECIMAL(10,2) DEFAULT 120.00,
    carb DECIMAL(10,2) DEFAULT 200.00,
    fat DECIMAL(10,2) DEFAULT 65.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_macro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_macro_targets_user_id ON macro_targets(user_id);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK, UNIQUE, NOT NULL | Reference to users table |
| daily_calories | DECIMAL(10,2) | DEFAULT 2000.00 | Target daily calories |
| protein | DECIMAL(10,2) | DEFAULT 120.00 | Target protein (grams) |
| carb | DECIMAL(10,2) | DEFAULT 200.00 | Target carbs (grams) |
| fat | DECIMAL(10,2) | DEFAULT 65.00 | Target fat (grams) |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.5 diet_logs

Records of user meals/diet entries.

```sql
CREATE TABLE diet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    image_url VARCHAR(500),
    image_object_name VARCHAR(500),
    ai_confidence_score DECIMAL(5,4),
    macros_json JSONB,
    meal_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING_AI',
    food_description TEXT,
    sos_ticket_flag BOOLEAN DEFAULT FALSE,
    pt_reviewer_id UUID,
    pt_note TEXT,
    log_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_diet_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_diet_pt_reviewer FOREIGN KEY (pt_reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_diet_logs_customer_id ON diet_logs(customer_id);
CREATE INDEX idx_diet_logs_log_date ON diet_logs(log_date);
CREATE INDEX idx_diet_logs_status ON diet_logs(status);
CREATE INDEX idx_diet_logs_pt_reviewer_id ON diet_logs(pt_reviewer_id);
CREATE INDEX idx_diet_logs_sos_ticket_flag ON diet_logs(sos_ticket_flag) WHERE sos_ticket_flag = TRUE;
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| customer_id | UUID | FK, NOT NULL | User who logged |
| image_url | VARCHAR(500) | - | Meal image URL (primary) |
| image_object_name | VARCHAR(500) | - | MinIO object name |
| ai_confidence_score | DECIMAL(5,4) | - | AI recognition confidence (0.0000-1.0000) |
| macros_json | JSONB | - | Macro nutrients data |
| meal_type | VARCHAR(50) | - | BREAKFAST, LUNCH, DINNER, SNACK |
| status | VARCHAR(50) | DEFAULT 'PENDING_AI' | Review status |
| food_description | TEXT | - | Food description |
| sos_ticket_flag | BOOLEAN | DEFAULT FALSE | SOS ticket flag |
| pt_reviewer_id | UUID | FK | PT who reviewed |
| pt_note | TEXT | - | PT's review notes |
| log_date | DATE | NOT NULL | Date of meal |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.6 diet_log_images

Stores multiple images per diet log (supports multi-image uploads).

```sql
CREATE TABLE diet_log_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_log_id UUID NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_object_name VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    file_size BIGINT,
    content_type VARCHAR(100),
    ai_confidence_score DECIMAL(3,2),
    macros_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_diet_log_images_diet_log FOREIGN KEY (diet_log_id) REFERENCES diet_logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_diet_log_images_diet_log_id ON diet_log_images(diet_log_id);
CREATE INDEX idx_diet_log_images_is_primary ON diet_log_images(diet_log_id, is_primary) WHERE is_primary = TRUE;
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| diet_log_id | UUID | FK, NOT NULL | Reference to diet_logs |
| image_url | VARCHAR(500) | NOT NULL | Image URL in MinIO |
| image_object_name | VARCHAR(500) | NOT NULL | MinIO object name |
| is_primary | BOOLEAN | DEFAULT FALSE | Primary image flag |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| file_size | BIGINT | - | File size in bytes |
| content_type | VARCHAR(100) | - | MIME type |
| ai_confidence_score | DECIMAL(3,2) | - | AI confidence score |
| macros_json | JSONB | - | Per-image macro data |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.7 pt_client_mappings

Maps Personal Trainers to their clients.

```sql
CREATE TABLE pt_client_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pt_id UUID NOT NULL,
    client_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mapping_pt FOREIGN KEY (pt_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mapping_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_pt_client UNIQUE (pt_id, client_id)
);

CREATE INDEX idx_pt_client_pt_id ON pt_client_mappings(pt_id);
CREATE INDEX idx_pt_client_client_id ON pt_client_mappings(client_id);
CREATE INDEX idx_pt_client_status ON pt_client_mappings(status);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| pt_id | UUID | FK, NOT NULL | PT user ID |
| client_id | UUID | FK, NOT NULL | Client user ID |
| status | VARCHAR(50) | DEFAULT 'PENDING' | Mapping status |
| assigned_at | TIMESTAMP | NOT NULL | Assignment timestamp |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.8 sos_tickets

SOS/urgent support tickets from diet logs.

```sql
CREATE TABLE sos_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_log_id UUID,
    pt_id UUID,
    assigned_by UUID,
    status VARCHAR(50) DEFAULT 'OPEN',
    priority VARCHAR(50) DEFAULT 'HIGH',
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sos_diet_log FOREIGN KEY (diet_log_id) REFERENCES diet_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_sos_pt FOREIGN KEY (pt_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sos_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sos_tickets_diet_log_id ON sos_tickets(diet_log_id);
CREATE INDEX idx_sos_tickets_pt_id ON sos_tickets(pt_id);
CREATE INDEX idx_sos_tickets_status ON sos_tickets(status);
CREATE INDEX idx_sos_tickets_priority ON sos_tickets(priority);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| diet_log_id | UUID | FK | Related diet log |
| pt_id | UUID | FK | Assigned PT |
| assigned_by | UUID | FK | Admin who assigned |
| status | VARCHAR(50) | DEFAULT 'OPEN' | Ticket status |
| priority | VARCHAR(50) | DEFAULT 'HIGH' | Priority level |
| note | TEXT | - | Ticket notes |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.9 body_metrics

Tracks user body measurements over time.

```sql
CREATE TABLE body_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    record_date DATE NOT NULL,
    weight DECIMAL(5,2),
    body_fat_percent DECIMAL(5,2),
    lbm DECIMAL(5,2),
    muscle_mass DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_metrics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_body_metrics_user_id ON body_metrics(user_id);
CREATE INDEX idx_body_metrics_record_date ON body_metrics(record_date);
CREATE INDEX idx_body_metrics_user_date ON body_metrics(user_id, record_date DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK, NOT NULL | User reference |
| record_date | DATE | NOT NULL | Date of record |
| weight | DECIMAL(5,2) | - | Weight in kg |
| body_fat_percent | DECIMAL(5,2) | - | Body fat percentage |
| lbm | DECIMAL(5,2) | - | Lean body mass |
| muscle_mass | DECIMAL(5,2) | - | Muscle mass |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

---

### 3.10 reviews

Client reviews for Personal Trainers.

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pt_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    rating DOUBLE PRECISION NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_pt FOREIGN KEY (pt_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reviews_pt_id ON reviews(pt_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| pt_id | UUID | FK, NOT NULL | PT being reviewed |
| reviewer_id | UUID | FK, NOT NULL | Client who reviewed |
| rating | DOUBLE | NOT NULL, CHECK 1-5 | Rating value |
| comment | TEXT | - | Review comment |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

---

### 3.11 notifications

User notifications system.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK, NOT NULL | Recipient user |
| type | VARCHAR(100) | NOT NULL | Notification type |
| message | TEXT | NOT NULL | Notification message |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| reference_id | VARCHAR(255) | - | Related entity reference |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

---

## 4. Enumerations

### 4.1 UserRole

```sql
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'PT_CERTIFIED', 'PT_FREELANCE', 'ADMIN');
```

| Value | Description |
|-------|-------------|
| CUSTOMER | Regular end user |
| PT_CERTIFIED | Verified professional trainer |
| PT_FREELANCE | Independent trainer |
| ADMIN | Platform administrator |

### 4.2 UserStatus

```sql
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'SUSPENDED');
```

| Value | Description |
|-------|-------------|
| ACTIVE | Fully operational account |
| INACTIVE | Deactivated account |
| PENDING_APPROVAL | Awaiting approval (PTs) |
| SUSPENDED | Temporarily blocked |

### 4.3 MealType

```sql
CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
```

### 4.4 DietLogStatus

```sql
CREATE TYPE diet_log_status AS ENUM ('PENDING_AI', 'DRAFT', 'LOGGED', 'PT_REVIEWING', 'APPROVED', 'REJECTED');
```

| Value | Description |
|-------|-------------|
| PENDING_AI | Awaiting AI analysis |
| DRAFT | Draft entry (low AI confidence) |
| LOGGED | Manually logged |
| PT_REVIEWING | Pending PT review |
| APPROVED | Approved by PT |
| REJECTED | Rejected by PT |

### 4.5 ClientMappingStatus

```sql
CREATE TYPE client_mapping_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
```

| Value | Description |
|-------|-------------|
| ACTIVE | Active client-PT relationship |
| INACTIVE | Inactive relationship |
| PENDING | Pending acceptance |

### 4.6 Tier

```sql
CREATE TYPE tier AS ENUM ('TIER_1', 'TIER_2');
```

| Value | Description |
|-------|-------------|
| TIER_1 | Certified PT (higher tier) |
| TIER_2 | Freelance PT (standard tier) |

### 4.7 SOSTicketStatus

```sql
CREATE TYPE sos_ticket_status AS ENUM ('OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED');
```

| Value | Description |
|-------|-------------|
| OPEN | Ticket is open |
| ASSIGNED | Assigned to PT |
| RESOLVED | Issue resolved |
| CLOSED | Ticket closed |

---

## 5. JSONB Structures

### 5.1 diet_logs.macros_json

```json
{
  "calories": 485.00,
  "protein": 42.00,
  "carb": 18.00,
  "fat": 28.00
}
```

### 5.2 pt_profiles.portfolio_showcase

```json
{
  "images": ["url1", "url2"],
  "videos": ["url1"],
  "achievements": ["Best PT 2025"]
}
```

### 5.3 pt_profiles.specializations

```json
["Weight Loss", "Muscle Building", "Sports Nutrition", "Rehabilitation"]
```

---

## 6. Indexes Summary

| Table | Index Name | Columns | Type |
|-------|-----------|---------|------|
| users | idx_users_email | email | B-tree |
| users | idx_users_role | role | B-tree |
| users | idx_users_status | status | B-tree |
| users | idx_users_google_id | google_id | B-tree |
| user_kyc | idx_user_kyc_user_id | user_id | B-tree |
| user_kyc | idx_user_kyc_status | verification_status | B-tree |
| pt_profiles | idx_pt_profiles_user_id | user_id | B-tree |
| pt_profiles | idx_pt_profiles_is_verified | is_verified | B-tree |
| pt_profiles | idx_pt_profiles_tier | tier | B-tree |
| diet_logs | idx_diet_logs_customer_id | customer_id | B-tree |
| diet_logs | idx_diet_logs_log_date | log_date | B-tree |
| diet_logs | idx_diet_logs_status | status | B-tree |
| diet_logs | idx_diet_logs_sos_ticket_flag | sos_ticket_flag | Partial |
| diet_log_images | idx_diet_log_images_diet_log_id | diet_log_id | B-tree |
| body_metrics | idx_body_metrics_user_date | user_id, record_date | B-tree |
| reviews | idx_reviews_pt_id | pt_id | B-tree |
| notifications | idx_notifications_user_unread | user_id, is_read | Partial |

---

## 7. Constraints & Triggers

### 7.1 Auto-update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_kyc_updated_at BEFORE UPDATE ON user_kyc FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pt_profiles_updated_at BEFORE UPDATE ON pt_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_macro_targets_updated_at BEFORE UPDATE ON macro_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diet_logs_updated_at BEFORE UPDATE ON diet_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diet_log_images_updated_at BEFORE UPDATE ON diet_log_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pt_client_mappings_updated_at BEFORE UPDATE ON pt_client_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sos_tickets_updated_at BEFORE UPDATE ON sos_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7.2 Check Constraints

```sql
ALTER TABLE reviews ADD CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5);
```

---

## 8. Initial Data

### 8.1 Default Admin Account

```sql
-- Admin user (password: Admin123!)
INSERT INTO users (id, email, password_hash, role, status, full_name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@nutrican.com',
    '$2a$10$...', -- BCrypt hash of 'Admin123!'
    'ADMIN',
    'ACTIVE',
    'System Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

---

## 9. Maintenance

### 9.1 Vacuum & Analyze

```sql
VACUUM ANALYZE users;
VACUUM ANALYZE diet_logs;
VACUUM ANALYZE body_metrics;
```

### 9.2 Connection Pool Settings

```properties
# HikariCP settings
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

---

*Document Version: 2.0.0*
*Last Updated: 2026-06-04*
