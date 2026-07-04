import api from './api';

export const userService = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  uploadAvatar: (formData) => api.put('/profile/avatar', formData),
  getMacroTarget: () => api.get('/profile/macro-target'),
  setMacroTarget: (data) => api.put('/profile/macro-target', data),
  getUserById: (userId) => api.get(`/profile/${userId}`),
  registerAsPt: (data) => api.post('/profile/pt/register', data),
  uploadCv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/pt/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getRequireKycSetting: () => api.get('/settings/require-kyc'),
  updateRequireKycSetting: (value) => api.put(`/admin/settings/require-kyc?value=${value}`),
};
