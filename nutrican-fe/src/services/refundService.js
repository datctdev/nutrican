import api from './api';

export const refundService = {
  create: (payload) => api.post('/refunds', payload),
};
