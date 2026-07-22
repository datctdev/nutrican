import api from './api';

export const coachingPaymentService = {
    createVnPayPayment: (mappingId) =>
        api.post(`/payment/mappings/${mappingId}/vnpay`),
    payWithWallet: (mappingId) =>
        api.post(`/payment/mappings/${mappingId}/wallet`),
    purchaseExtraSessions: (mappingId, payload) =>
        api.post(`/coaching/mappings/${mappingId}/extra-sessions`, payload),
    getMyWallet: () => api.get('/coaching-wallet/me'),
    withdraw: (payload) => api.post('/coaching-wallet/me/withdraw', payload),
    getMyTransactions: (params) => api.get('/coaching-wallet/me/transactions', { params }),
    getSystemWallet: (type) => api.get('/coaching-wallet/admin/system', { params: { type } }),
    getSystemTransactions: (type, params = {}) =>
        api.get('/coaching-wallet/admin/system/transactions', { params: { type, ...params } }),
};
