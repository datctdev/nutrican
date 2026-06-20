# NutriCan PT - Documentation Index

## Quick Links

- [README](../README.md) - Project overview
- [API_DOCUMENTATION](./API_DOCUMENTATION.md) - Full API reference
- [ARCHITECTURE](./ARCHITECTURE.md) - System architecture
- [FEATURES](./FEATURES.md) - Feature descriptions
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

---

*Version 2.3.0 | Last Updated: 2026-06-20*
