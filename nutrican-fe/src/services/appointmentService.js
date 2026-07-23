import api from './api';

export const appointmentService = {
  getUpcoming: () => api.get('/appointments/upcoming'),
  getPtUpcoming: () => api.get('/workspace/appointments'),
  updateAppointment: (id, action) => api.put(`/workspace/appointments/${id}`, { action }),
  cancel: (id, reason) => api.put(`/appointments/${id}/cancel`, reason ? { reason } : {}),
  reschedule: (id, startTime, endTime) =>
    api.put(`/workspace/appointments/${id}/reschedule`, { startTime, endTime }),
  addSession: (mappingId, startTime, endTime, note) =>
    api.post(`/workspace/mappings/${mappingId}/sessions`, { startTime, endTime, note }),
};
