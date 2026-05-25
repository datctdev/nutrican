import api from './api';

export const userService = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  uploadAvatar: (formData) => api.put('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMacroTarget: () => api.get('/profile/macro-target'),
  setMacroTarget: (data) => api.put('/profile/macro-target', data),
  getUserById: (userId) => api.get(`/profile/${userId}`),
};
