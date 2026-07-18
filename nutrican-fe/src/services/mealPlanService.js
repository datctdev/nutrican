import api from './api';

export const mealPlanService = {
  getCurrent: (weekStart) => api.get('/meal-plans/current', {
    params: weekStart ? { weekStart } : undefined,
  }),
  getAvailableWeeks: () => api.get('/meal-plans/weeks'),
  markEaten: (itemId, eaten = true) =>
    api.put(`/meal-plans/items/${itemId}/eaten`, null, { params: { eaten } }),
  suggestReplacement: (itemId, data) => api.post(`/meal-plans/items/${itemId}/suggest`, data),
  getSuggestions: (weekStart) => api.get('/meal-plans/suggestions', { params: { weekStart } }),
  cancelReplacement: (suggestionId) => api.put(`/meal-plans/suggestions/${suggestionId}/cancel`),
  skipItem: (itemId, data) => api.put(`/meal-plans/items/${itemId}/skip`, data),
  unskipItem: (itemId) => api.put(`/meal-plans/items/${itemId}/unskip`),
  skipMeal: (planId, data) => api.put(`/meal-plans/${planId}/meals/skip`, data),
  unskipMeal: (planId, data) => api.put(`/meal-plans/${planId}/meals/unskip`, data),
  getWeeklySummaries: () => api.get('/meal-plans/weekly-summaries'),
};
