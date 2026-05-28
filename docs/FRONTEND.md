# NutriCan PT - Frontend Documentation

## 1. Overview

The NutriCan PT frontend is a React 19 application built with Vite, providing a modern, responsive user interface for the nutrition tracking platform.

---

## 2. Project Structure

```
nutrican-fe/
├── public/
│   └── vite.svg
│
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                    # Radix UI primitives
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
│   │   ├── common/                # Custom shared components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Spinner.jsx
│   │   │
│   │   └── layout/                # Layout components
│   │       ├── MainLayout.jsx
│   │       ├── AuthLayout.jsx
│   │       └── ProtectedRoute.jsx
│   │
│   ├── pages/                     # Page components
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── PtRegistrationPage.jsx
│   │   │
│   │   ├── customer/
│   │   │   ├── MarketplacePage.jsx
│   │   │   ├── PtDetailPage.jsx
│   │   │   ├── DietTrackerPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   │
│   │   ├── pt/
│   │   │   ├── PtDashboardPage.jsx
│   │   │   ├── ClientListPage.jsx
│   │   │   └── ReviewDietLogPage.jsx
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   └── PtVerificationPage.jsx
│   │   │
│   │   └── LandingPage.jsx
│   │
│   ├── services/                  # API services
│   │   ├── api.js                 # Axios instance
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── dietService.js
│   │   ├── marketplaceService.js
│   │   ├── workspaceService.js
│   │   ├── adminService.js
│   │   └── sseService.js
│   │
│   ├── stores/                    # Zustand state stores
│   │   ├── authStore.js
│   │   ├── dietStore.js
│   │   └── notificationStore.js
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useToast.js
│   │   └── useSSE.js
│   │
│   ├── App.jsx                   # Main app with router
│   ├── App.css                   # Global styles
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Tailwind imports
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

Routes are configured in `src/App.jsx` using React Router v7.

```jsx
// src/App.jsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // ... more routes
]);
```

### 3.2 Route List

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | LandingPage | Public | Landing page |
| `/login` | LoginPage | Public | User login |
| `/register` | RegisterPage | Public | Customer registration |
| `/register/pt` | PtRegistrationPage | Public | PT registration |
| `/marketplace` | MarketplacePage | CUSTOMER | Browse PTs |
| `/pt-profile/:id` | PtDetailPage | CUSTOMER | PT profile view |
| `/diet` | DietTrackerPage | CUSTOMER | Diet logging |
| `/profile` | ProfilePage | All | User profile |
| `/pt` | PtDashboardPage | PT | PT overview |
| `/pt/clients` | ClientListPage | PT | Client management |
| `/pt/reviews` | ReviewDietLogPage | PT | Review diet logs |
| `/admin` | AdminDashboardPage | ADMIN | Admin dashboard |
| `/admin/pts` | PtVerificationPage | ADMIN | PT verification |

### 3.3 Protected Routes

```jsx
// src/components/layout/ProtectedRoute.jsx
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

---

## 4. State Management

### 4.1 Zustand Stores

The application uses Zustand for lightweight state management.

#### 4.1.1 Auth Store

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

**Persisted State:**
- `user`: User object
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `isAuthenticated`: Boolean flag

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

#### Auth Service

```javascript
// src/services/authService.js
import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  registerPt: (data) => api.post('/auth/register/pt', data),
  refreshToken: (data) => api.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'),
};
```

#### Diet Service

```javascript
// src/services/dietService.js
import api from './api';

export const dietService = {
  createLog: (data) => api.post('/diet/logs', data),
  analyzeMeal: (formData) =>
    api.post('/diet/logs/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getLogs: (params) => api.get('/diet/logs', { params }),
  getLog: (id) => api.get(`/diet/logs/${id}`),
  updateLog: (id, data) => api.put(`/diet/logs/${id}`, data),
  deleteLog: (id) => api.delete(`/diet/logs/${id}`),
  getSummary: (params) => api.get('/diet/summary', { params }),
  createSos: (data) => api.post('/diet/sos', data),
};
```

#### Marketplace Service

```javascript
// src/services/marketplaceService.js
import api from './api';

export const marketplaceService = {
  getPts: (params) => api.get('/marketplace/pts', { params }),
  getPtDetail: (id) => api.get(`/marketplace/pts/${id}`),
  getPtReviews: (id, params) => api.get(`/marketplace/pts/${id}/reviews`, { params }),
  createReview: (id, data) => api.post(`/marketplace/pts/${id}/reviews`, data),
};
```

#### Workspace Service

```javascript
// src/services/workspaceService.js
import api from './api';

export const workspaceService = {
  getClients: (params) => api.get('/workspace/clients', { params }),
  getPendingLogs: (params) => api.get('/workspace/diet-logs/pending', { params }),
  reviewLog: (id, data) => api.put(`/workspace/diet-logs/${id}/review`, data),
  getClientProgress: (clientId, params) =>
    api.get(`/workspace/progress/${clientId}`, { params }),
  assignClient: (clientId) => api.post(`/workspace/clients/${clientId}/assign`),
  getStats: () => api.get('/workspace/stats'),
};
```

#### Admin Service

```javascript
// src/services/adminService.js
import api from './api';

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, data) =>
    api.put(`/admin/users/${userId}/status`, data),
  getPendingPts: (params) => api.get('/admin/pts/pending', { params }),
  verifyPt: (userId, data) => api.put(`/admin/pts/${userId}/verify`, data),
  getSosTickets: (params) => api.get('/admin/sos-tickets', { params }),
  assignSosTicket: (ticketId, data) =>
    api.put(`/admin/sos-tickets/${ticketId}/assign`, data),
  getStats: () => api.get('/admin/stats'),
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

## 6. Components

### 6.1 Layout Components

#### MainLayout

```jsx
// src/components/layout/MainLayout.jsx
const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <nav className="container mx-auto px-4">
          {/* Navigation items based on user role */}
          <NavItems user={user} />
          {/* User menu */}
          <UserMenu user={user} onLogout={logout} />
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
```

#### ProtectedRoute

```jsx
// src/components/layout/ProtectedRoute.jsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const dashboardPath = {
      CUSTOMER: '/diet',
      PT_CERTIFIED: '/pt',
      PT_FREELANCE: '/pt',
      ADMIN: '/admin',
    }[user?.role];
    
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};
```

### 6.2 UI Components

All UI components are built using Radix UI primitives with Tailwind CSS styling.

#### Button Component

```jsx
// src/components/ui/button.jsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = 'Button';
```

#### Card Component

```jsx
// src/components/ui/card.jsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-white text-gray-950 shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';
```

---

## 7. Pages

### 7.1 Authentication Pages

#### LoginPage

```jsx
// src/pages/auth/LoginPage.jsx
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form fields */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 7.2 Customer Pages

#### DietTrackerPage

```jsx
// src/pages/customer/DietTrackerPage.jsx
const DietTrackerPage = () => {
  const [file, setFile] = useState(null);
  const [mealType, setMealType] = useState('LUNCH');
  const { logs, setLogs, analyzeMeal, isLoading } = useDietStore();

  const handleFileUpload = async (e) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mealType', mealType);
    
    try {
      await analyzeMeal(formData);
      // Refresh logs
    } catch (err) {
      // Handle error
    }
  };

  return (
    <div className="space-y-6">
      {/* Image upload section */}
      <Card>
        <CardHeader>
          <CardTitle>Log Meal</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="DINNER">Dinner</option>
            <option value="SNACK">Snack</option>
          </select>
          <Button onClick={handleFileUpload} disabled={!file || isLoading}>
            Analyze Meal
          </Button>
        </CardContent>
      </Card>

      {/* Daily summary */}
      <SummaryCard />

      {/* Logs list */}
      <LogsList logs={logs} />
    </div>
  );
};
```

### 7.3 PT Pages

#### PtDashboardPage

```jsx
// src/pages/pt/PtDashboardPage.jsx
const PtDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [statsRes, clientsRes] = await Promise.all([
        workspaceService.getStats(),
        workspaceService.getClients(),
      ]);
      setStats(statsRes.data.data);
      setClients(clientsRes.data.data.content);
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={stats?.totalClients} />
        <StatCard title="Pending Reviews" value={stats?.pendingReviews} />
        <StatCard title="SOS Tickets" value={stats?.pendingSosTickets} />
        <StatCard title="Adherence Rate" value={`${stats?.averageAdherenceRate}%`} />
      </div>

      {/* Client list with status */}
      <ClientList clients={clients} />
    </div>
  );
};
```

---

## 8. Hooks

### 8.1 useSSE Hook

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

### 8.2 useToast Hook

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

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Backend API URL |
| `VITE_APP_TITLE` | `NutriCan PT` | Application title |

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:8080/api/v1
```

---

## 10. Styling

### 10.1 Tailwind Configuration

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

### 10.2 CSS Variables

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... */
  }
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 11. Testing

### 11.1 Component Testing

```javascript
// src/__tests__/LoginPage.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../pages/auth/LoginPage';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    render(<LoginPage />);
    const button = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(button);
    // Assert expected behavior
  });
});
```

### 11.2 Running Tests

```bash
npm test
npm test -- --coverage
```

---

## 12. Build & Deployment

### 12.1 Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### 12.2 Preview Production Build

```bash
npm run preview
```

### 12.3 Deploy to Static Hosting

```bash
# Copy dist contents to web server
scp -r dist/* user@server:/var/www/nutrican
```

---

## 13. Troubleshooting

### 13.1 Common Issues

#### CORS Error

```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/auth/login' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:** Ensure backend CORS is configured:
```java
// SecurityConfig.java
.cors(cors -> cors.configurationSource(corsConfigurationSource()))
```

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

*Document Version: 1.0.0*
*Last Updated: 2026-05-29*
