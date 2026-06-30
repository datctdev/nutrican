// src/services/workspaceService.js
import api from './api';

export const workspaceService = {
    getClients: (params) => api.get('/workspace/clients', { params }),
    getPendingLogs: (params) => api.get('/workspace/diet-logs/pending', { params }),
    reviewLog: (id, data) => api.put(`/workspace/diet-logs/${id}/review`, data),
    getClientProgress: (clientId, params) => api.get(`/workspace/progress/${clientId}`, { params }),
    assignClient: (clientId) => api.post(`/workspace/clients/${clientId}/assign`),
    getStats: () => api.get('/workspace/stats'),
    getSosTickets: () => api.get('/workspace/sos'),
    resolveSosTicket: (ticketId, data) => api.put(`/workspace/sos/${ticketId}/resolve`, data),
    submitBlindEstimate: (logId, data) => api.put(`/workspace/diet-logs/${logId}/blind-estimate`, data),
    getPtRblStats: () => api.get('/workspace/rbl/stats'),
    updateHireRequest: (clientId, action) => api.put(`/workspace/clients/${clientId}/hire-request`, null, { params: { action } }),
};