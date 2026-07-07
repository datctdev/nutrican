import api from './api';

export const recipeService = {
  list: () => api.get('/diet/recipes'),
  create: (data) => api.post('/diet/recipes', data),
  update: (id, data) => api.put(`/diet/recipes/${id}`, data),
  get: (id) => api.get(`/diet/recipes/${id}`),
};
