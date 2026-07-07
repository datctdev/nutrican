import api from './api';

export const profileExtensionsService = {
  getGoals: () => api.get('/profile/goals'),
  saveGoals: (data) => api.put('/profile/goals', data),
  getMilestones: () => api.get('/profile/milestones'),
  getBodyMetricReminderStatus: () => api.get('/profile/body-metric-reminder-status'),
  recordBodyMetric: (data) => api.post('/profile/body-metrics', data),
  getBodyMetrics: (params) => api.get('/profile/body-metrics', { params }),
  getOnboardingStatus: () => api.get('/profile/onboarding-status'),
  submitOnboarding: (data) => api.post('/profile/onboarding', data),
  skipOnboarding: () => api.post('/profile/onboarding/skip'),
  getCoachingHistory: () => api.get('/profile/coaching-history'),
  requestEndCoaching: () => api.post('/profile/end-coaching'),
  confirmEndCoaching: () => api.put('/profile/end-coaching/confirm'),
  setMaxClients: (maxClients) => api.put('/profile/pt/max-clients', { maxClients }),
};

export async function resolveCustomerHomePath() {
  try {
    const res = await profileExtensionsService.getOnboardingStatus();
    const status = res.data?.data;
    if (status?.forceRedirect) return '/onboarding';
    return '/diet';
  } catch {
    return '/diet';
  }
}
