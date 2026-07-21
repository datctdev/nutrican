// src/services/api.js
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { DEMO_VN_CLOCK_KEY } from '../pages/customer/components/dietUtils';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
    timeout: 0,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const accessToken = useAuthStore.getState().accessToken;
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        try {
            const demoClock = localStorage.getItem(DEMO_VN_CLOCK_KEY);
            if (demoClock) {
                config.headers['X-Nutrican-Demo-Vn-Clock'] = demoClock;
            }
        } catch { /* ignore */ }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const skipEndpoints = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/google'];
        const isAuthEndpoint = skipEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await api.post('/auth/refresh', {});
                const newAccessToken = refreshResponse.data?.data?.accessToken;
                if (newAccessToken) {
                    useAuthStore.getState().setAccessToken(newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return api(originalRequest);
            } catch {
                useAuthStore.getState().logout();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;