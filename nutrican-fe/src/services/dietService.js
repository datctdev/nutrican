import api from './api';

export const dietService = {
  createLog: (data) => api.post('/diet/logs', data),
  analyzeMeal: (formData) => api.post('/diet/logs/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  getLogs: (params) => api.get('/diet/logs', { params }),
  getLogById: (id) => api.get(`/diet/logs/${id}`),
  updateLog: (id, data) => api.put(`/diet/logs/${id}`, data),
  deleteLog: (id) => api.delete(`/diet/logs/${id}`),
  getSummary: (params) => api.get('/diet/summary', { params }),
  createSos: (data) => api.post('/diet/sos', data),
  getSosTickets: () => api.get('/diet/sos'),
  uploadImages: (logId, formData) => api.post(`/diet/logs/${logId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  getImages: (logId) => api.get(`/diet/logs/${logId}/images`),
  setPrimaryImage: (logId, imageId) => api.put(`/diet/logs/${logId}/images/${imageId}/primary`),
  deleteImage: (logId, imageId) => api.delete(`/diet/logs/${logId}/images/${imageId}`),
};
