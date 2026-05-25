# Frontend Documentation - Nutrican PT

## Tong Quan

Frontend xay dung bang React 19 voi Vite, su dung Tailwind CSS cho styling va Zustand cho state management.

## Cau Truc Thu Muc

```
nutrican-fe/
├── src/
│   ├── components/
│   │   ├── common/           # Components co ban
│   │   │   ├── Avatar.jsx    # Hinh dai dien
│   │   │   ├── Badge.jsx     # The trang thai
│   │   │   ├── Button.jsx    # Nut bam
│   │   │   ├── Card.jsx      # The bai viet
│   │   │   ├── Input.jsx      # O nhap lieu
│   │   │   ├── Modal.jsx     # Popup
│   │   │   ├── ProtectedRoute.jsx  # Bao ve route
│   │   │   └── Spinner.jsx    # Loading indicator
│   │   │
│   │   ├── layouts/          # Layout wrappers
│   │   │   ├── AuthLayout.jsx   # Layout cho auth pages
│   │   │   ├── Header.jsx       # Header
│   │   │   └── MainLayout.jsx   # Main layout
│   │   │
│   │   └── ui/               # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── badge.jsx
│   │       └── toast.jsx
│   │
│   ├── pages/                # Route pages
│   │   ├── LandingPage.jsx     # Trang chu
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── PtRegistrationPage.jsx
│   │   ├── customer/
│   │   │   ├── MarketplacePage.jsx   # Tim PT
│   │   │   ├── PtDetailPage.jsx      # Chi tiet PT
│   │   │   ├── DietTrackerPage.jsx   # Theo doi an
│   │   │   └── ProfilePage.jsx       # Ho so
│   │   ├── pt/
│   │   │   ├── PtDashboardPage.jsx   # Dashboard PT
│   │   │   ├── ClientListPage.jsx    # Danh sach khach hang
│   │   │   └── ReviewDietLogPage.jsx # Xem xet nhat ky
│   │   └── admin/
│   │       ├── AdminDashboardPage.jsx  # Dashboard Admin
│   │       └── PtVerificationPage.jsx # Xac minh PT
│   │
│   ├── services/             # API calls
│   │   ├── api.js           # Axios instance
│   │   ├── authService.js   # Auth endpoints
│   │   ├── userService.js   # User endpoints
│   │   ├── dietService.js   # Diet endpoints
│   │   ├── marketplaceService.js
│   │   ├── workspaceService.js
│   │   └── adminService.js
│   │
│   ├── stores/              # Zustand stores
│   │   ├── authStore.js     # Auth state
│   │   ├── dietStore.js     # Diet state
│   │   └── notificationStore.js
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useSSE.js        # Server-Sent Events
│   │   └── useToast.js
│   │
│   ├── lib/
│   │   └── utils.js         # Helper functions (cn)
│   │
│   ├── App.jsx              # Main app with routes
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Routing

App su dung React Router DOM voi cau hinh nhu sau:

```jsx
// App.jsx
const router = createBrowserRouter([
  {
    element: <MainLayout />,     // Wrapper voi Header
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/register/pt', element: <PtRegistrationPage /> },
      // Protected routes
      {
        path: '/marketplace',
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <MarketplacePage />
          </ProtectedRoute>
        ),
      },
      // ... more routes
    ],
  },
]);
```

### Route Protection

Component `ProtectedRoute` kiem tra:

1. Da dang nhap chua (`isAuthenticated`)
2. Co quyen truy cap khong (`allowedRoles`)

```jsx
// Redirect flow:
// - Chua login -> /login
// - Sai role -> Dashboard cua role do
```

## State Management

### Auth Store (Zustand)

```javascript
// authStore.js
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => { ... },
      register: async (data) => { ... },
      logout: () => { ... },
      clearError: () => set({ error: null }),
    }),
    { name: 'nutrican-auth' }
  )
);

// Su dung
const { user, login, logout } = useAuthStore();
```

### Persisted State

Auth state duoc luu vao localStorage voi key `nutrican-auth`:

```json
{
  "user": { "id": 1, "email": "...", "role": "CUSTOMER" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "isAuthenticated": true
}
```

## API Service

### Axios Instance

```javascript
// api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
});

// Request interceptor - them token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Tu dong refresh token
    }
    return Promise.reject(error);
  }
);
```

### Auth Service

```javascript
// authService.js
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  registerPt: (data) => api.post('/auth/register/pt', data),
  refreshToken: (token) => api.post('/auth/refresh', { refreshToken: token }),
  logout: () => api.post('/auth/logout'),
};
```

## Components

### Button Component

```jsx
import { Button } from './components/ui/button';

// Variants
<Button variant="default">Primary</Button>
<Button variant="destructive">Danger</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="success">Success</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
```

### Card Component

```jsx
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Input Component

```jsx
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

// Voi label
<Input label="Email" type="email" placeholder="you@example.com" />

// Voi error
<Input label="Password" error="Password required" />
```

### Badge Component

```jsx
import { Badge } from './components/ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Danger</Badge>
<Badge variant="info">Info</Badge>
```

### Avatar Component

```jsx
import Avatar from './components/common/Avatar';

<Avatar alt="John Doe" size="sm" />  // sm, md, lg, xl
<Avatar src={user.avatarUrl} alt={user.fullName} />
```

## Styling

### Tailwind CSS Classes

Project su dung Tailwind CSS voi custom theme:

```css
/* Custom colors trong tailwind.config.js */
bg-blue-600, text-primary, bg-muted, etc.

/* Border radius */
rounded-lg, rounded-xl (su dung --radius variable)

/* Animations */
animate-fade-in, animate-slide-in, animate-scale-in
```

### CSS Variables

```css
:root {
  --background: 0 0% 98%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}
```

## Server-Sent Events (SSE)

```javascript
// useSSE.js - Custom hook
const { createSseConnection } = useSSE(userId);

// Su dung trong component
useEffect(() => {
  if (!userId) return;

  const sse = createSseConnection(userId);

  sse.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Xu ly su kien
  };

  return () => sse.close();
}, [userId]);
```

## Toast Notifications

Su dung thu vien Sonner:

```javascript
import { toast } from 'sonner';

// Cac loai toast
toast.success('Thanh cong!', { description: 'Da luu thay doi' });
toast.error('That bai', { description: 'Da xay ra loi' });
toast.warning('Canh bao', { description: 'Kiem tra lai thong tin' });
toast.info('Thong tin', { description: 'Day la thong bao' });
```

## Environment Variables

Tao file `.env` trong thu muc `nutrican-fe`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

## Chay Du An

```bash
# Cai dat dependencies
npm install

# Chay dev server
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview
```

## Development Notes

### Them trang moi

1. Tao component trong `src/pages/`
2. Import va them vao router trong `App.jsx`
3. Bao ve route neu can:

```jsx
{
  path: '/new-page',
  element: (
    <ProtectedRoute allowedRoles={['CUSTOMER', 'PT_CERTIFIED']}>
      <NewPage />
    </ProtectedRoute>
  ),
}
```

### Them API endpoint

1. Tao ham trong `services/` tuong ung:
```javascript
// services/exampleService.js
export const exampleService = {
  getData: (params) => api.get('/endpoint', { params }),
  createData: (data) => api.post('/endpoint', data),
};
```

2. Su dung trong component:
```javascript
import { exampleService } from '../services/exampleService';

const { data } = await exampleService.getData({ page: 1 });
```

### Them component UI

1. Tao file trong `components/ui/`
2. Su dung Radix UI primitives neu can
3. Export tu component

```jsx
// components/ui/new-component.jsx
import * as React from "react";
import { cn } from "../../lib/utils";

const NewComponent = React.forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("...", className)} {...props} />;
});

export { NewComponent };
```
