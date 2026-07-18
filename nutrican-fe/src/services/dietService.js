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

    confirmRecognition: (logId, foodCode, portionGrams, sendToPt = false) => api.put(`/diet/logs/${logId}/confirm-recognition`, {
        foodCode,
        portionGrams: portionGrams != null ? Number(portionGrams) : undefined,
        sendToPt: Boolean(sendToPt),
    }),

    submitForReview: (id) => api.put(`/diet/logs/${id}/submit-for-review`),
    saveFeedback: (logId, data) => api.put(`/diet/logs/${logId}/feedback`, data),
    getResNetDishes: () => api.get('/foods/resnet-dishes'),
    searchFoods: (q, params = {}) => api.get('/foods/search', { params: { q, dietFilter: true, ...params } }),
    getFoodsByCodes: (codes) => api.get('/foods/by-codes', { params: { codes: codes.join(',') } }),
    getHotpotBroths: () => api.get('/foods/hotpot/broths'),
    getHotpotItems: () => api.get('/foods/hotpot/items'),

    uploadImages: (logId, formData) => api.post(`/diet/logs/${logId}/images`, formData, {
        timeout: 0,
    }),

    getImages: (logId) => api.get(`/diet/logs/${logId}/images`),
    setPrimaryImage: (logId, imageId) => api.put(`/diet/logs/${logId}/images/${imageId}/primary`),
    deleteImage: (logId, imageId) => api.delete(`/diet/logs/${logId}/images/${imageId}`),
    deletePrimaryImage: (logId) => api.delete(`/diet/logs/${logId}/images/primary`),
};
