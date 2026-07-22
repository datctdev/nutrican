import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleAuth: (googleIdToken) => api.post('/auth/google', { googleIdToken }),
  setPassword: (password) => api.post('/auth/set-password', { password }),
  refreshToken: () => api.post('/auth/refresh', {}),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/profile/me'),

  startKycSession: () => api.post('/kyc/sessions:start'),
  uploadKycImage: (sessionId, file, title, type) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    if (type) form.append('type', type);
    return api.post(`/kyc/sessions/${sessionId}/fullFlow-upload`, form);
  },
  compareKyc: (sessionId) => api.post(`/kyc/sessions/${sessionId}/compare`),
  getKycSession: (sessionId) => api.get(`/kyc/sessions/${sessionId}`),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};
