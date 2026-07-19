// src/services/marketplaceService.js
import api from './api';

export const marketplaceService = {
    getPts: (params) => api.get('/marketplace/pts', { params }),
    getPtDetail: (ptId) => api.get(`/marketplace/pts/${ptId}`),
    getPtReviews: (ptId, params) => api.get(`/marketplace/pts/${ptId}/reviews`, { params }),

    createReview: (ptId, data, imageFile) => {
        const formData = new FormData();
        formData.append('rating', data.rating);
        if (data.comment) formData.append('comment', data.comment);
        if (data.isAnonymous) formData.append('isAnonymous', true);
        if (imageFile) formData.append('image', imageFile);

        return api.post(`/marketplace/pts/${ptId}/reviews`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    updateReview: (ptId, reviewId, data, imageFile) => {
        const formData = new FormData();
        formData.append('rating', data.rating);
        if (data.comment) formData.append('comment', data.comment);
        if (data.isAnonymous) formData.append('isAnonymous', true);
        if (imageFile) formData.append('image', imageFile);

        return api.put(`/marketplace/pts/${ptId}/reviews/${reviewId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    deleteReview: (ptId, reviewId) => api.delete(`/marketplace/pts/${ptId}/reviews/${reviewId}`),

    hirePt: (ptId) => api.post(`/marketplace/pts/${ptId}/hire`),
};