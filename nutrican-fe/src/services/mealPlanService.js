import api from './api';

export const mealPlanService = {
  getCurrent: () => api.get('/meal-plans/current'),
  markEaten: (itemId, eaten = true) =>
    api.put(`/meal-plans/items/${itemId}/eaten`, null, { params: { eaten } }),
  suggestReplacement: (itemId, data) => api.post(`/meal-plans/items/${itemId}/suggest`, data),
  skipItem: (itemId, data) => api.put(`/meal-plans/items/${itemId}/skip`, data),
  getWeeklySummaries: () => api.get('/meal-plans/weekly-summaries'),
};
