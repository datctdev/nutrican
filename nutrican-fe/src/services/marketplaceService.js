import api from './api';

export const marketplaceService = {
    getPts: (params) => api.get('/marketplace/pts', { params }),
    getPtDetail: (ptId) => api.get(`/marketplace/pts/${ptId}`),
    getPtReviews: (ptId, params) => api.get(`/marketplace/pts/${ptId}/reviews`, { params }),
    createReview: (ptId, data) => api.post(`/marketplace/pts/${ptId}/reviews`, data),
    hirePt: (ptId) => api.post(`/marketplace/pts/${ptId}/hire`),
};