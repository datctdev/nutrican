# NutriCan PT - Documentation

Mục lục toàn bộ tài liệu dự án NutriCan PT.

---

## 📚 Danh Mục Tài Liệu

### Tổng Quan
| Tài liệu | Mô tả |
|-----------|--------|
| [README](./README.md) | Tổng quan dự án, công nghệ sử dụng |
| [ARCHITECTURE](./ARCHITECTURE.md) | Kiến trúc hệ thống chi tiết |
| [SECURITY](./SECURITY.md) | Bảo mật, JWT, RBAC |

### Backend
| Tài liệu | Mô tả |
|-----------|--------|
| [API_DOCUMENTATION](./API_DOCUMENTATION.md) | Tài liệu API đầy đủ |
| [DATABASE_SCHEMA](./DATABASE_SCHEMA.md) | Thiết kế database, ERD |
| [FEATURES](./FEATURES.md) | Mô tả tính năng chi tiết |

### Triển Khai & Phát Triển
| Tài liệu | Mô tả |
|-----------|--------|
| [DEPLOYMENT](./DEPLOYMENT.md) | Hướng dẫn triển khai |
| [DEVELOPMENT](./DEVELOPMENT.md) | Hướng dẫn phát triển |
| [FRONTEND](./FRONTEND.md) | Tài liệu frontend React |

---

## 🔗 Liên Kết Nhanh

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

## 👥 User Roles

| Role | Mô tả | Truy cập |
|------|--------|----------|
| `CUSTOMER` | Người dùng thông thường | Diet tracking, Marketplace |
| `PT_FREELANCE` | PT chưa xác minh | PT Workspace |
| `PT_CERTIFIED` | PT đã xác minh | PT Workspace |
| `ADMIN` | Quản trị viên | Admin Dashboard |

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd nutrican-pt-workspace

# 2. Khởi động infrastructure
cd nutrican-be
docker-compose up -d

# 3. Chạy Backend
./mvnw spring-boot:run

# 4. Chạy Frontend
cd ../nutrican-fe
npm install
npm run dev
```

---

## 📞 Liên Hệ

- **Email**: support@nutrican.com
- **Website**: https://nutrican.com

---

## 📄 Giấy Phép

Copyright © 2026 NutriCan PT. All rights reserved.
