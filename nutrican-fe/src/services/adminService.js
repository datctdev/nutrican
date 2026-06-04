import api from './api';

export const adminService = {
  // Dashboard stats
  getStats: () => api.get('/admin/stats'),

  // Users
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),

  // PT Management
  getPendingPts: (params = {}) => api.get('/admin/pts/pending', { params }),
  verifyPt: (userId, data) => api.put(`/admin/pts/${userId}/verify`, data),
  getPtDocuments: (ptId) => api.get(`/admin/pts/${ptId}/documents`),

  // KYC Management
  getPendingKycs: (params = {}) => api.get('/admin/kyc/pending', { params }),
  approveKyc: (userId) => api.put(`/admin/kyc/${userId}/approve`),
  rejectKyc: (userId, reason) => api.put(`/admin/kyc/${userId}/reject`, { reason }),

  // SOS Tickets
  getSosTickets: (params = {}) => api.get('/admin/sos-tickets', { params }),
  assignSosTicket: (ticketId, ptId) => api.put(`/admin/sos-tickets/${ticketId}/assign`, { ptId }),
};
