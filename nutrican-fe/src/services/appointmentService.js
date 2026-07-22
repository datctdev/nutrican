import api from './api';

export const appointmentService = {
  getUpcoming: () => api.get('/appointments/upcoming'),
  getPtUpcoming: () => api.get('/workspace/appointments'),
  updateAppointment: (id, action) => api.put(`/workspace/appointments/${id}`, { action }),
  cancel: (id, reason) => api.put(`/appointments/${id}/cancel`, reason ? { reason } : {}),
};
