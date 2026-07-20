# NutriCan PT — Frontend

React 19 SPA cho nền tảng NutriCan PT (customer, PT workspace, admin).

## Tech stack

- React 19 + Vite 8
- Tailwind CSS 3 + Radix UI + Lucide icons
- Zustand (auth persist), TanStack React Query
- Axios + JWT refresh interceptor
- Firebase (Google OAuth)
- WebSocket realtime (`/ws/workspace`)

## Cấu trúc

```
src/
├── pages/          # customer/, pt/, admin/, auth/
├── components/     # ui/, common/, diet/, pt/, layouts/
├── services/       # API modules (15+ files)
├── stores/         # authStore, notificationStore
├── hooks/          # useWebSocket, useToast
└── App.jsx         # React Router v7
```

## Chạy local

```bash
cp .env.example .env
# VITE_API_URL=http://localhost:8080/api/v1

npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run lint
```

**Yêu cầu:** Backend chạy tại `:8080`. Firebase có thể bỏ trống nếu chỉ dùng email/password.

## Routes chính

| Prefix | Vai trò |
|--------|---------|
| `/diet`, `/coaching`, `/marketplace` | Customer |
| `/pt/*` | PT workspace |
| `/admin/*` | Admin |
| `/kyc` | Đăng ký PT + eKYC |

## Tài liệu

- [docs/FRONTEND.md](../docs/FRONTEND.md) — routing, services, guards
- [docs/TEAM_ONBOARDING.md](../docs/TEAM_ONBOARDING.md) — seed users, E2E
- [docs/FEATURE_OFFLINE_PT_HIRE.md](../docs/FEATURE_OFFLINE_PT_HIRE.md) — hire offline UI
