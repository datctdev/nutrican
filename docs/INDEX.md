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

### Nghien Cuu (Computer Vision + RBL)
| Tai lieu | Mo ta |
|-----------|--------|
| [RESEARCH](./RESEARCH.md) | Tong quan nghien cuu CV, RQ, limitations, workflow |
| [RBL_METHODOLOGY](./RBL_METHODOLOGY.md) | Pipeline ground truth, MAE, hybrid matching, CSV export |
| [research/KE_HOACH](./research/KE_HOACH.md) | Ke hoach Improve 2.2, A1.0/A1.1, script phan tich |
| [research/PAPER1_JELODAR_SUN](./research/PAPER1_JELODAR_SUN.md) | Paper 1 summary (arXiv 2112.09839) |
| [research/LO_TRINH](./research/LO_TRINH.md) | Lo trinh G0–G5 hanh dong |
| [research/G0_VERIFICATION](./research/G0_VERIFICATION.md) | Checklist xac minh ky thuat |
| [research/DATA_COLLECTION_SOP](./research/DATA_COLLECTION_SOP.md) | SOP thu du lieu G2 |
| [research/PT_LABELING_SOP](./research/PT_LABELING_SOP.md) | SOP PT label G3 |
| [research/OPS_CHECKLIST](./research/OPS_CHECKLIST.md) | Checklist team thu + label |
| [research/THESIS_OUTLINE](./research/THESIS_OUTLINE.md) | Dàn bai luan van |

**Trang thai research (2026-06-14):** G0 pass · G2/G3 seed **30/30** xong · san sang G4 export/analyze

### Trien Khai & Phat Trien
| Tai lieu | Mo ta |
|-----------|--------|
| [DEPLOYMENT](./DEPLOYMENT.md) | Huong dan trien khai |
| [DEVELOPMENT](./DEVELOPMENT.md) | Huong dan phat trien (co workflow thu thap du lieu RBL) |

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
    nutritiontrack-module-kyc (VNPT OCR + Face Liveness)
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
| `/admin/kyc` | Xac minh KYC |
| `/admin/users` | Quan ly nguoi dung |
| `/admin/sos` | Quan ly SOS tickets |

## Giao Dien KYC

| Route | Mo ta |
|-------|-------|
| `/kyc` | Gui tai lieu KYC (Customer) |
| `/admin/kyc` | Xac minh KYC (Admin) |

## Giao Dien PT Pages

| Route | Mo ta |
|-------|-------|
| `/pt` | Dashboard + thong ke |
| `/pt/clients` | Danh sach khach hang |
| `/pt/reviews` | Xem xet diet logs |

---

*Document Version: 2.2.0*
*Last Updated: 2026-06-12*
