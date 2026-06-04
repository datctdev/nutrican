# NutriCan PT - Documentation

Muc luc toan bo tai lieu du an NutriCan PT.

---

## Muc Luc Tai Lieu

### Tong Quan
| Tai lieu | Mo ta |
|-----------|--------|
| [README](../README.md) | Tong quan du an, cong nghe su dung |
| [ARCHITECTURE](./ARCHITECTURE.md) | Kien truc he thong chi tiet |
| [SECURITY](./SECURITY.md) | Bao mat, JWT, RBAC |

### Backend
| Tai lieu | Mo ta |
|-----------|--------|
| [API_DOCUMENTATION](./API_DOCUMENTATION.md) | Tai lieu API day du |
| [DATABASE_SCHEMA](./DATABASE_SCHEMA.md) | Thiet ke database, ERD |
| [FEATURES](./FEATURES.md) | Mo ta tinh nang chi tiet |

### Trien Khai & Phat Trien
| Tai lieu | Mo ta |
|-----------|--------|
| [DEPLOYMENT](./DEPLOYMENT.md) | Huong dan trien khai |
| [DEVELOPMENT](./DEVELOPMENT.md) | Huong dan phat trien |
| [FRONTEND](./FRONTEND.md) | Tai lieu frontend React |

---

## Lien Ket Nhanh

### Backend (Spring Boot)
- **Base URL**: `http://localhost:8080/api/v1`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **API Docs**: `http://localhost:8080/v3/api-docs`

### Frontend (React)
- **Development**: `http://localhost:5173`
- **State Management**: Zustand
- **HTTP Client**: Axios

### Infrastructure
- **PostgreSQL**: `localhost:5432`
- **MinIO**: `localhost:9000` (API), `localhost:9001` (Console)
- **Ollama**: `localhost:11434`

---

## User Roles

| Role | Mo ta | Truy cap |
|------|--------|----------|
| `CUSTOMER` | Nguoi dung thong thuong | Diet tracking, Marketplace |
| `PT_FREELANCE` | PT chua xac minh | PT Workspace |
| `PT_CERTIFIED` | PT da xac minh | PT Workspace |
| `ADMIN` | Quan tri vien | Admin Dashboard |

---

## Kien Truc Module (Maven Multi-Module)

```
nutrican-be (Parent POM)
  nutritiontrack-module-application (Entry Point)
    nutritiontrack-module-admin
    nutritiontrack-module-pt-management
      nutritiontrack-module-diet-tracker
        nutritiontrack-module-ai-gateway
    nutritiontrack-module-user-profile
    nutritiontrack-module-auth
    nutritiontrack-module-core (Shared)
```

---

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd nutrican-pt-workspace

# 2. Khoi dong infrastructure
cd nutrican-be
docker-compose up -d

# 3. Chay Backend
./mvnw spring-boot:run

# 4. Chay Frontend
cd ../nutrican-fe
npm install
npm run dev
```

---

## Tai Khoan Mac Dinh

| Vai tro | Email | Mat khau |
|---------|-------|----------|
| Admin | admin@nutrican.com | Admin123! |

---

## Lien He

- **Email**: support@nutrican.com
- **Website**: https://nutrican.com

---

## Giao Dien Quan Tri (Admin Pages)

| Route | Mo ta |
|-------|-------|
| `/admin` | Dashboard + thong ke |
| `/admin/pts` | Xac minh PT |
| `/admin/users` | Quan ly nguoi dung |
| `/admin/sos` | Quan ly SOS tickets |

## Giao Dien PT Pages

| Route | Mo ta |
|-------|-------|
| `/pt` | Dashboard + thong ke |
| `/pt/clients` | Danh sach khach hang |
| `/pt/reviews` | Xem xet diet logs |

---

*Document Version: 2.0.0*
*Last Updated: 2026-06-04*
