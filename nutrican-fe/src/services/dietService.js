import api from './api';

export const dietService = {
  createLog: (data) => api.post('/diet/logs', data),
  analyzeMeal: (formData) => api.post('/diet/logs/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // AI analysis can take up to 2 minutes
  }),
  getLogs: (params) => api.get('/diet/logs', { params }),
  getLogById: (id) => api.get(`/diet/logs/${id}`),
  updateLog: (id, data) => api.put(`/diet/logs/${id}`, data),
  deleteLog: (id) => api.delete(`/diet/logs/${id}`),
  getSummary: (params) => api.get('/diet/summary', { params }),
  createSos: (data) => api.post('/diet/sos', data),
  getSosTickets: () => api.get('/diet/sos'),
};
