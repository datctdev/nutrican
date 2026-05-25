import api from './api';

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),
  getPendingPts: (params) => api.get('/admin/pts/pending', { params }),
  verifyPt: (userId, data) => api.put(`/admin/pts/${userId}/verify`, data),
  getPtDocuments: (ptId) => api.get(`/admin/pts/${ptId}/documents`),
  getSosTickets: (params) => api.get('/admin/sos-tickets', { params }),
  assignSosTicket: (ticketId, ptId) => api.put(`/admin/sos-tickets/${ticketId}/assign`, { ptId }),
  getStats: () => api.get('/admin/stats'),
};
