import api from './api';

export const coachingPaymentService = {
    createVnPayPayment: (mappingId) =>
        api.post(`/payment/mappings/${mappingId}/vnpay`),
    getMyWallet: () => api.get('/coaching-wallet/me'),
    getMyTransactions: (params) => api.get('/coaching-wallet/me/transactions', { params }),
    getSystemWallet: (type) => api.get('/coaching-wallet/admin/system', { params: { type } }),
    getSystemTransactions: (type, params = {}) =>
        api.get('/coaching-wallet/admin/system/transactions', { params: { type, ...params } }),
};
