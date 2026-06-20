import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { cookieStorage } from '../utils/cookieStorage';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const { accessToken, user } = response.data.data;
          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return response;
        } catch (error) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed',
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          set({ isLoading: false });
          return response;
        } catch (error) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Registration failed',
          });
          throw error;
        }
      },

      registerPt: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.requestPt(data);
          set({ isLoading: false });
          return response;
        } catch (error) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'PT Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
  } catch {
    // Logout API failure is non-critical; clear local state anyway
  }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      setUser: (userData) => set({ user: userData }),

      setAccessToken: (accessToken) => set({ accessToken }),

      checkAuth: async () => {
        const { accessToken, user } = get();
        if (!accessToken) return;
        try {
          const response = await authService.me();
          const profile = response.data?.data;
          if (!profile) return;
          set({
            user: {
              ...user,
              id: profile.id,
              email: profile.email,
              fullName: profile.fullName,
              role: profile.role,
              avatarUrl: profile.avatarUrl,
              isKycVerified: profile.isKycVerified,
            },
          });
        } catch (error) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
            });
          }
        }
      },
    }),
    {
      name: 'nutrican-auth',
      storage: cookieStorage,
    }
  )
);
