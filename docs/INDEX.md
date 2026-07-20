# NutriCan PT - Documentation Index

## Quick Links

- [README](../README.md) - Project overview
- [NUTRICAN_PT_MASTER_SPEC_v3](./NUTRICAN_PT_MASTER_SPEC_v3.md) - **Master Spec v3 (source of truth)**
- [NUTRICAN_PT_GAP_ADDENDUM_v3_1](./NUTRICAN_PT_GAP_ADDENDUM_v3_1.md) - **Addendum v3.1 (ADD-01..08)**
- [NUTRICAN_PT_MASTER_SPEC_v2](./NUTRICAN_PT_MASTER_SPEC_v2.md) - Master Spec v2 (archive — lõi v2)
- [PRODUCT_REQUIREMENTS_SUMMARY](./PRODUCT_REQUIREMENTS_SUMMARY.md) - **PRD đầy đủ: BR, FR, AC, Constraints, Business Rules**
- [TONG_HOP_DU_AN_FE_BE](./TONG_HOP_DU_AN_FE_BE.md) - **Tổng hợp FE+BE kỹ thuật — workflow, code map, chạy local**
- [API_DOCUMENTATION](./API_DOCUMENTATION.md) - Full API reference
- [ARCHITECTURE](./ARCHITECTURE.md) - System architecture
- [FEATURES](./FEATURES.md) - Feature descriptions
- [FEATURE_MEAL_WINDOWS_SELFPLAN](./FEATURE_MEAL_WINDOWS_SELFPLAN.md) - **Mức vận động + 5 buổi + Plan ăn ngày + Duyệt PT (luồng & biên)**
- [MANUAL_QA_DEMO_CHECKLIST](./MANUAL_QA_DEMO_CHECKLIST.md) - **Checklist test thủ công (demo.solo / demo.coached / pt.certified)**
- [FRONTEND](./FRONTEND.md) - Frontend documentation
- [DATABASE_SCHEMA](./DATABASE_SCHEMA.md) - Database design
- [DEPLOYMENT](./DEPLOYMENT.md) - Deployment guide
- [DEVELOPMENT](./DEVELOPMENT.md) - Development guide
- [SECURITY](./SECURITY.md) - Security documentation

## Research Documentation

| Document | Description |
|----------|-------------|
| [RESEARCH](./RESEARCH.md) | CV research overview |
| [RBL_METHODOLOGY](./RBL_METHODOLOGY.md) | RBL methodology |
| [research/KE_HOACH](./research/KE_HOACH.md) | Improvement plan |
| [research/THESIS_OUTLINE](./research/THESIS_OUTLINE.md) | Thesis outline |

## User Roles

| Role | Description | Access |
|------|-------------|--------|
| `CUSTOMER` | Regular user | Diet tracking, Marketplace |
| `PT_FREELANCE` | Unverified PT | PT Workspace |
| `PT_CERTIFIED` | Verified PT | PT Workspace |
| `ADMIN` | Administrator | Admin Dashboard |

## Quick Start

```bash
# Backend
cd nutrican-be && docker-compose up -d && ./mvnw spring-boot:run

# Frontend
cd nutrican-fe && npm install && npm run dev

# Default Admin
admin@nutrican.com / Admin123!
```

- [TESTING_E2E_MATRIX](./TESTING_E2E_MATRIX.md) - AC → test matrix (Happy/Bad)
- [TESTING_V2_FLOWS](./TESTING_V2_FLOWS.md) - Manual flows + regression gate
- [TEAM_ONBOARDING](./TEAM_ONBOARDING.md) - Dev onboarding + seed users

## Regression gate (2026-07-07)

| Layer | Command | Expected |
|-------|---------|----------|
| BE | `cd nutrican-be; ./mvnw test` | **120** pass |
| FE | `cd nutrican-fe; npm run build` | pass |
| E2E | `cd e2e; npx playwright test tests/` (BE :8080) | **58** cases |
| v3.1 layers | `npx playwright test -g "BE-only\|FE-only\|Hybrid"` | **34** cases |

---
