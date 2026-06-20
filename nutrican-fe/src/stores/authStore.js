import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAuthStore = create(
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
          const { accessToken, refreshToken, user } = response.data.data;
          set({
            user,
            accessToken,
            refreshToken,
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

      setUser: (userData) => set({ user: userData }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const response = await authService.me();
          if (response.data?.data) {
            set({ user: response.data.data });
          }
        } catch (error) {
          console.error('checkAuth failed:', error);
        }
      },
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
