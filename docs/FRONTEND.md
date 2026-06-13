# NutriCan PT - Frontend Documentation

## 1. Overview

The NutriCan PT frontend is a React 19 application built with Vite, providing a modern, responsive user interface for the AI-powered nutrition tracking platform.

---

## 2. Project Structure

```
nutrican-fe/
├── public/
│   └── vite.svg
│
├── src/
│   ├── components/
│   │   ├── ui/                        # Radix UI primitives
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   ├── label.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── avatar.jsx
│   │   │   ├── select.jsx
│   │   │   ├── separator.jsx
│   │   │   ├── scroll-area.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   ├── toast.jsx
│   │   │   └── toaster.jsx
│   │   │
│   │   ├── common/                    # Custom shared components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   └── layouts/                   # Layout components
│   │       ├── MainLayout.jsx         # Main app layout with nav
│   │       ├── AuthLayout.jsx          # Auth pages layout
│   │       └── Header.jsx              # Top navigation bar
│   │
│   ├── pages/
│   │   ├── auth/                      # Authentication pages
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── PtRegistrationPage.jsx
│   │   │
│   │   ├── customer/                  # Customer-facing pages
│   │   │   ├── DietTrackerPage.jsx    # Meal logging + AI analysis
│   │   │   ├── MarketplacePage.jsx    # Browse PTs
│   │   │   ├── PtDetailPage.jsx       # PT profile + reviews
│   │   │   ├── ProfilePage.jsx         # User profile + macro targets
│   │   │   └── KycPage.jsx            # KYC submission (CCCD)
│   │   │
│   │   ├── pt/                       # Personal Trainer pages
│   │   │   ├── PtDashboardPage.jsx     # PT overview + stats
│   │   │   ├── ClientListPage.jsx      # Client management
│   │   │   └── ReviewDietLogPage.jsx   # Review client diet logs
│   │   │
│   │   ├── admin/                     # Admin pages
│   │   │   ├── AdminDashboardPage.jsx  # Dashboard + stats
│   │   │   ├── PtVerificationPage.jsx   # PT KYC verification
│   │   │   ├── KycAdminPage.jsx        # KYC verification (VNPT)
│   │   │   ├── UserManagementPage.jsx  # User management
│   │   │   └── SosTicketsPage.jsx      # SOS ticket management
│   │   │
│   │   └── LandingPage.jsx             # Landing/home page
│   │
│   ├── services/                      # API services
│   │   ├── api.js                     # Axios instance + interceptors
│   │   ├── authService.js             # Auth API calls
│   │   ├── userService.js             # Profile API calls
│   │   ├── dietService.js             # Diet log API calls
│   │   ├── marketplaceService.js      # Marketplace API calls
│   │   ├── workspaceService.js        # PT workspace API calls
│   │   ├── adminService.js            # Admin API calls
│   │   └── sseService.js              # Server-Sent Events
│   │
│   ├── stores/                        # Zustand state stores
│   │   ├── authStore.js               # Auth state + persist
│   │   ├── dietStore.js               # Diet log state
│   │   └── notificationStore.js       # Notifications + SSE state
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useToast.js                # Sonner toast wrapper
│   │   └── useSSE.js                  # SSE connection hook
│   │
│   ├── App.jsx                       # Router configuration
│   ├── App.css                       # Global styles
│   ├── main.jsx                      # Entry point
│   └── index.css                     # Tailwind imports
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── .env.example
```

---

## 3. Routing

### 3.1 Route Configuration

Routes are configured in `src/App.jsx` using React Router v7 (createBrowserRouter).

### 3.2 Route List

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | LandingPage | Public | Landing/home page |
| `/login` | LoginPage | Public | User login |
| `/register` | RegisterPage | Public | Customer registration |
| `/register/pt` | PtRegistrationPage | Public | PT registration |
| `/marketplace` | MarketplacePage | CUSTOMER | Browse PTs |
| `/pt-profile/:id` | PtDetailPage | CUSTOMER | PT profile + reviews |
| `/diet` | DietTrackerPage | CUSTOMER | Meal logging + AI |
| `/profile` | ProfilePage | All authenticated | User profile + macros |
| `/kyc` | KycPage | All authenticated | KYC submission (CCCD) |
| `/pt` | PtDashboardPage | PT | PT overview + stats |
| `/pt/clients` | ClientListPage | PT | Client list + status |
| `/pt/reviews` | ReviewDietLogPage | PT | Review diet logs |
| `/admin` | AdminDashboardPage | ADMIN | Dashboard + statistics |
| `/admin/pts` | PtVerificationPage | ADMIN | PT verification |
| `/admin/kyc` | KycAdminPage | ADMIN | KYC verification |
| `/admin/users` | UserManagementPage | ADMIN | User management |
| `/admin/sos` | SosTicketsPage | ADMIN | SOS ticket management |

### 3.3 Protected Routes

```jsx
// src/components/common/ProtectedRoute.jsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
};
```

**Dashboard path by role:**
```jsx
const dashboardPath = {
  CUSTOMER: '/diet',
  PT_CERTIFIED: '/pt',
  PT_FREELANCE: '/pt',
  ADMIN: '/admin',
}[user?.role];
```

---

## 4. State Management

### 4.1 Zustand Stores

#### 4.1.1 Auth Store (with Persistence)

```javascript
// src/stores/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const { user, accessToken, refreshToken } = response.data.data;
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return response;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
    }),
    {
      name: 'nutrican-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**Persisted to localStorage:** user, accessToken, refreshToken, isAuthenticated

#### 4.1.2 Diet Store

```javascript
// src/stores/dietStore.js
const useDietStore = create((set) => ({
  logs: [],
  currentLog: null,
  summary: null,
  isLoading: false,
  error: null,

  setLogs: (logs) => set({ logs }),
  setCurrentLog: (log) => set({ currentLog: log }),
  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearLogs: () => set({ logs: [], currentLog: null, summary: null }),
}));
```

#### 4.1.3 Notification Store

```javascript
// src/stores/notificationStore.js
const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  sseConnection: null,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  setSseConnection: (connection) => set({ sseConnection: connection }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));
```

---

## 5. API Services

### 5.1 Axios Configuration

```javascript
// src/services/api.js
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 5.2 Service Functions

```javascript
// Auth Service
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  registerPt: (data) => api.post('/auth/register/pt', data),
  refreshToken: (data) => api.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'),
  submitKyc: (formData) => api.post('/auth/kyc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getKycStatus: () => api.get('/auth/kyc/status'),
};

// Diet Service
export const dietService = {
  createLog: (data) => api.post('/diet/logs', data),
  analyzeMeal: (formData) => api.post('/diet/logs/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getLogs: (params) => api.get('/diet/logs', { params }),
  getLog: (id) => api.get(`/diet/logs/${id}`),
  updateLog: (id, data) => api.put(`/diet/logs/${id}`, data),
  deleteLog: (id) => api.delete(`/diet/logs/${id}`),
  getSummary: (params) => api.get('/diet/summary', { params }),
  createSos: (data) => api.post('/diet/sos', data),
};

// Marketplace Service
export const marketplaceService = {
  getPts: (params) => api.get('/marketplace/pts', { params }),
  getPtDetail: (id) => api.get(`/marketplace/pts/${id}`),
  getPtReviews: (id, params) => api.get(`/marketplace/pts/${id}/reviews`, { params }),
  createReview: (id, data) => api.post(`/marketplace/pts/${id}/reviews`, data),
};

// Workspace Service (PT)
export const workspaceService = {
  getClients: (params) => api.get('/workspace/clients', { params }),
  getPendingLogs: (params) => api.get('/workspace/diet-logs/pending', { params }),
  reviewLog: (id, data) => api.put(`/workspace/diet-logs/${id}/review`, data),
  submitBlindEstimate: (logId, data) => api.put(`/workspace/diet-logs/${logId}/blind-estimate`, data),
  getPtRblStats: () => api.get('/workspace/rbl/stats'),
  getClientProgress: (clientId, params) => api.get(`/workspace/progress/${clientId}`, { params }),
  assignClient: (clientId) => api.post(`/workspace/clients/${clientId}/assign`),
  getStats: () => api.get('/workspace/stats'),
};

// Admin Service
export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, data) => api.put(`/admin/users/${userId}/status`, data),
  getPendingPts: (params) => api.get('/admin/pts/pending', { params }),
  verifyPt: (userId, data) => api.put(`/admin/pts/${userId}/verify`, data),
  getSosTickets: (params) => api.get('/admin/sos-tickets', { params }),
  assignSosTicket: (ticketId, data) => api.put(`/admin/sos-tickets/${ticketId}/assign`, data),
  getStats: () => api.get('/admin/stats'),
  // RBL Research
  getRblStats: (params) => api.get('/admin/rbl/stats', { params }),
  getRblExportPreview: (params) => api.get('/admin/rbl/export/preview', { params }),
  downloadRblExport: (params) => api.get('/admin/rbl/export', { params, responseType: 'blob' }),
  getRblReport: (params) => api.get('/admin/rbl/report', { params, responseType: 'text' }),
};
```

### 5.3 SSE Service

```javascript
// src/services/sseService.js
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const sseService = {
  connect: () => {
    const { accessToken } = useAuthStore.getState();

    const eventSource = new EventSourcePolyfill(
      `${API_URL}/workspace/stream`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    eventSource.addEventListener('CONNECTED', (event) => {
      console.log('SSE Connected:', JSON.parse(event.data));
    });

    eventSource.addEventListener('NEW_DIET_LOG', (event) => {
      const data = JSON.parse(event.data);
      useNotificationStore.getState().addNotification({
        id: Date.now(),
        type: 'DIET_LOG',
        message: `New diet log from ${data.client_name}`,
        data,
        createdAt: new Date().toISOString(),
      });
    });

    eventSource.addEventListener('SOS_TICKET', (event) => {
      const data = JSON.parse(event.data);
      useNotificationStore.getState().addNotification({
        id: Date.now(),
        type: 'SOS',
        message: `SOS from ${data.client_name} - ${data.priority}`,
        data,
        createdAt: new Date().toISOString(),
      });
    });

    eventSource.onerror = () => {
      console.error('SSE Error, reconnecting in 5s...');
      setTimeout(() => {
        eventSource.close();
        sseService.connect();
      }, 5000);
    };

    useNotificationStore.getState().setSseConnection(eventSource);
    return eventSource;
  },

  disconnect: () => {
    const connection = useNotificationStore.getState().sseConnection;
    if (connection) {
      connection.close();
      useNotificationStore.getState().setSseConnection(null);
    }
  },
};
```

---

## 6. Hooks

### 6.1 useSSE Hook

```javascript
// src/hooks/useSSE.js
import { useEffect } from 'react';
import { sseService } from '../services/sseService';
import { useAuthStore } from '../stores/authStore';

export const useSSE = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      const eventSource = sseService.connect();
      return () => sseService.disconnect();
    }
  }, [isAuthenticated]);
};
```

### 6.2 useToast Hook

```javascript
// src/hooks/useToast.js
import { toast } from 'sonner';

export const useToast = () => {
  const success = (message) => toast.success(message);
  const error = (message) => toast.error(message);
  const info = (message) => toast.info(message);

  return { success, error, info };
};
```

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Backend API URL |
| `VITE_APP_TITLE` | `NutriCan PT` | Application title |

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:8080/api/v1
```

---

## 8. Styling

### 8.1 Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
};
```

### 8.2 CSS Variables

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 9. Troubleshooting

### 9.1 Common Issues

#### CORS Error

```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/auth/login'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:** Ensure backend CORS is configured in SecurityConfig.

#### Token Expiration

Tokens expire and user is logged out unexpectedly.

**Solution:** The axios interceptor handles automatic token refresh. Ensure refresh token endpoint is working.

#### SSE Not Connecting

SSE events not being received.

**Solution:**
1. Check network tab for EventSource connection
2. Verify SSE endpoint returns correct content-type: `text/event-stream`
3. Check if proxy is blocking SSE

---

## 12. Research & RBL UI

Giao dien ho tro thu thap ground truth cho nghien cuu Computer Vision. Chi tiet nghiep vu: [RESEARCH.md](./RESEARCH.md), [RBL_METHODOLOGY.md](./RBL_METHODOLOGY.md).

### 12.1 Customer — Diet Tracker (`/diet`)

**File:** `src/pages/customer/DietTrackerPage.jsx`

| UI element | Research purpose |
|------------|------------------|
| Image upload | Input CV dataset |
| Meal source selector | HOME_COOKED vs RESTAURANT cohort |
| Meal complexity | SIMPLE / HOTPOT / COMPOSITE |
| Hotpot / buffet multi-select | Hybrid DB macro path |
| Submit for review (DRAFT) | Dua log vao PT queue |

Analyze gọi `dietService.analyzeMeal(formData)` → `POST /diet/logs/analyze`.

### 12.2 PT — Review Diet Logs (`/pt/reviews`)

**File:** `src/pages/pt/ReviewDietLogPage.jsx`

**RBL stats bar** (top of page): `workspaceService.getPtRblStats()` hiển thị:
- `totalReviewed`, `totalLabeledCv`, `maeAiCalories`, `adjustRate`

**Review columns** (side-by-side):
- AI prediction (`aiPredictedMacros`)
- DB / hybrid (`dbMatchedMacros`)
- Shown to client (`macrosJson`)

**Blind mode workflow:**
1. PT bấm **Blind mode** trên một log pending
2. Nhập calories/protein/carb/fat (ẩn AI/DB)
3. **Save & reveal AI/DB** → `submitBlindEstimate`
4. Hoàn tất APPROVE / ADJUST_MACROS / REJECT + `correctionReason`

### 12.3 Admin — RBL Dashboard (`/admin`)

**File:** `src/pages/admin/AdminDashboardPage.jsx`

Section **RBL Research (CV + PT Ground Truth)**:
- Stats cards: reviewed count, labeled CV, MAE calories, restaurant adjust rate
- Warning khi `insufficientSample` (< 30 mẫu)
- Calibration buckets table
- **Download CSV** → `downloadRblExport({ cvOnly: true })`
- **Download Report** → `getRblReport()` (Markdown)
- **Refresh stats**

---

*Document Version: 2.2.0*
*Last Updated: 2026-06-12*
