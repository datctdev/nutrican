import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get auth state from Zustand persisted storage
const getAuthState = () => {
  try {
    const stored = localStorage.getItem('nutrican-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Zustand persist stores as: { state: {...}, version: number }
      return parsed.state || parsed;
    }
  } catch (e) {
    console.error('Error reading auth state:', e);
  }
  return {};
};

api.interceptors.request.use(
  (config) => {
    const { accessToken } = getAuthState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { refreshToken } = getAuthState();
        if (refreshToken) {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );
          // Update localStorage with new tokens
          const currentState = getAuthState();
          const newState = {
            ...currentState,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          };
          localStorage.setItem('nutrican-auth', JSON.stringify({ state: newState }));
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth on refresh failure
        localStorage.removeItem('nutrican-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
