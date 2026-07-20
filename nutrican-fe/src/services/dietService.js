// src/services/dietService.js
import api from './api';

export const dietService = {
    createLog: (data) => api.post('/diet/logs', data),

    analyzeMeal: (formData) => api.post('/diet/logs/analyze', formData, {
        timeout: 0,
    }),

    getLogs: (params) => api.get('/diet/logs', { params }),
    getClientLogsForPt: (clientId, params) => api.get(`/diet/logs/client/${clientId}`, { params }),
    getLogById: (id) => api.get(`/diet/logs/${id}`),
    updateLog: (id, data) => api.put(`/diet/logs/${id}`, data),
    deleteLog: (id) => api.delete(`/diet/logs/${id}`),
    getSummary: (params) => api.get('/diet/summary', { params }),
    createSos: (data) => api.post('/diet/sos', data),
    getSosTickets: () => api.get('/diet/sos'),

    confirmRecognition: (logId, { foodCode, foodItemId, portionGrams, sendToPt = false } = {}) => {
        const body = {
            portionGrams: portionGrams != null ? Number(portionGrams) : undefined,
            sendToPt: Boolean(sendToPt),
        };
        if (foodItemId) body.foodItemId = foodItemId;
        else if (foodCode) body.foodCode = foodCode;
        return api.put(`/diet/logs/${logId}/confirm-recognition`, body);
    },

    submitForReview: async (id) => {
        try {
            return await api.put(`/diet/logs/${id}/submit-for-review`);
        } catch (err) {
            const msg = err.response?.data?.message || '';
            if (err.response?.status === 400 && (msg.includes('chưa có PT') || msg.includes('chua co PT'))) {
                err.userMessage = 'Bạn chưa có PT — không thể gửi duyệt';
            }
            throw err;
        }
    },
    saveFeedback: (logId, data) => api.put(`/diet/logs/${logId}/feedback`, data),
    getResNetDishes: () => api.get('/foods/resnet-dishes'),
    searchFoods: (q, params = {}) => api.get('/foods/search', { params: { q, dietFilter: true, ...params } }),
    getFoodsByCodes: (codes) => api.get('/foods/by-codes', { params: { codes } }),
    getHotpotBroths: () => api.get('/foods/hotpot/broths'),
    getHotpotItems: () => api.get('/foods/hotpot/items'),

    getDayPlan: (date) => api.get('/diet/day-plan', { params: { date } }),
    listSelfPlan: (date) => api.get('/diet/self-plan', { params: { date } }),
    createSelfPlanItem: (data) => api.post('/diet/self-plan', data),
    updateSelfPlanItem: (id, data) => api.put(`/diet/self-plan/${id}`, data),
    deleteSelfPlanItem: (id) => api.delete(`/diet/self-plan/${id}`),
    markSelfPlanEaten: (id, lateTickReason) => api.post(`/diet/self-plan/${id}/eaten`, null, {
        params: lateTickReason ? { lateTickReason } : undefined,
    }),
    submitSelfPlan: (date) => api.post('/diet/self-plan/submit', null, { params: { date } }),
    cancelSelfPlanSubmission: (id) => api.post(`/diet/self-plan/submissions/${id}/cancel`),
    getSelfPlanSubmission: (date) => api.get('/diet/self-plan/submissions', { params: { date } }),

    uploadImages: (logId, formData) => api.post(`/diet/logs/${logId}/images`, formData, {
        timeout: 0,
    }),

    getImages: (logId) => api.get(`/diet/logs/${logId}/images`),
    setPrimaryImage: (logId, imageId) => api.put(`/diet/logs/${logId}/images/${imageId}/primary`),
    deleteImage: (logId, imageId) => api.delete(`/diet/logs/${logId}/images/${imageId}`),
    deletePrimaryImage: (logId) => api.delete(`/diet/logs/${logId}/images/primary`),
};
