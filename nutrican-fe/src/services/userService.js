import api from './api';

export const userService = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  uploadAvatar: (formData) => api.put('/profile/avatar', formData),
  getMacroTarget: () => api.get('/profile/macro-target'),
  setMacroTarget: (data) => api.put('/profile/macro-target', data),
  getUserById: (userId) => api.get(`/profile/${userId}`),
  registerAsPt: (data) => api.post('/profile/pt/register', data),
  resubmitPt: (data) => api.put('/profile/pt/resubmit', data),
  getAllergies: () => api.get('/profile/allergies'),
  updateAllergies: (allergens) => api.put('/profile/allergies', { allergens }),
  updatePreferences: (data) => api.put('/profile/preferences', data),
  setMaxClients: (maxClients) => api.put('/profile/pt/max-clients', { maxClients }),
  getMacroSuggestion: (params) => api.get('/profile/macro-suggestion', { params }),
  uploadCv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/pt/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCertImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/pt/cert-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getRequireKycSetting: () => api.get('/settings/require-kyc'),
  updateRequireKycSetting: (value) => api.put(`/admin/settings/require-kyc?value=${value}`),
};
