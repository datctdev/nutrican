import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),

  // VNPT-based KYC flow
  startKycSession: () => api.post('/kyc/sessions:start'),
  uploadKycImage: (sessionId, file, title) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api.post(`/kyc/sessions/${sessionId}/fullFlow-upload`, form);
  },
  compareKyc: (sessionId) => api.post(`/kyc/sessions/${sessionId}/compare`),
  getKycSession: (sessionId) => api.get(`/kyc/sessions/${sessionId}`),

  // PT Request
  requestPt: (data) => api.post('/auth/pt/request', data),
};
