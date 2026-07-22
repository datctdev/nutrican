import api from './api';

export const adminService = {
    getStats: () => api.get('/admin/stats'),

    getUsers: (params = {}) => api.get('/admin/users', { params }),
    updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),

    getPendingPts: (params = {}) => api.get('/admin/pts/pending', { params }),
    verifyPt: (userId, data) => api.put(`/admin/pts/${userId}/verify`, data),
    getPtDocuments: (ptId) => api.get(`/admin/pts/${ptId}/documents`),

    getPendingUpdateRequests: (params = {}) => api.get('/admin/pts/update-requests/pending', { params }),
    reviewUpdateRequest: (requestId, data) => api.put(`/admin/pts/update-requests/${requestId}/review`, data),

    getRblStats: (params) => api.get('/admin/rbl/stats', { params }),
    getRblExportPreview: (params) => api.get('/admin/rbl/export/preview', { params }),
    downloadRblExport: (params) => api.get('/admin/rbl/export', { params, responseType: 'blob' }),
    getRblReport: (params) => api.get('/admin/rbl/report', { params, responseType: 'text' }),
    getRefunds: () => api.get('/admin/refunds'),
    reviewRefund: (id, data) => api.put(`/admin/refunds/${id}`, data),
    getAllergenMappings: () => api.get('/admin/allergen-mappings'),
    createAllergenMapping: (data) => api.post('/admin/allergen-mappings', data),
    updateAllergenMapping: (id, data) => api.put(`/admin/allergen-mappings/${id}`, data),
    deleteAllergenMapping: (id) => api.delete(`/admin/allergen-mappings/${id}`),
    getFoodTags: () => api.get('/admin/food-tags'),
    updateFoodTags: (foodCode, dietTags) => api.put(`/admin/food-tags/${foodCode}`, { dietTags }),
};