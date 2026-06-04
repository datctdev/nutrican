import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),

  // KYC
  submitKyc: (data) => api.post('/auth/kyc', data),
  getKycStatus: () => api.get('/auth/kyc/status'),

  // PT Request
  requestPt: (data) => api.post('/auth/pt/request', data),
};
