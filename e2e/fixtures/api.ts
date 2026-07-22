import { APIRequestContext } from '@playwright/test';
import { apiLogin, USERS } from './auth';

export const API_BASE = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';

function localDateIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localDateOffsetIso(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


export async function waitForBackend(
  request: APIRequestContext,
  maxAttempts = 30,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: USERS.customer.email, password: USERS.customer.password },
    });
    if (res.ok()) return;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Backend not ready at ${API_BASE} after ${maxAttempts} attempts`);
}

export async function customerRequest(request: APIRequestContext) {
  return apiLogin(request, USERS.customer.email, USERS.customer.password);
}

export async function customer2Request(request: APIRequestContext) {
  return apiLogin(request, USERS.customer2.email, USERS.customer2.password);
}

export async function ptRequest(request: APIRequestContext) {
  return apiLogin(request, USERS.pt.email, USERS.pt.password);
}

export async function ptFreelanceRequest(request: APIRequestContext) {
  return apiLogin(request, USERS.ptFreelance.email, USERS.ptFreelance.password);
}

export async function adminRequest(request: APIRequestContext) {
  return apiLogin(request, USERS.admin.email, USERS.admin.password);
}

export async function setCustomerAllergens(request: APIRequestContext, allergens: string[]) {
  const token = await customerRequest(request);
  await request.put(`${API_BASE}/profile/allergies`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { allergens },
  });
}

export async function setCustomerDietPreference(request: APIRequestContext, dietPreference: string) {
  const token = await customerRequest(request);
  await request.put(`${API_BASE}/profile/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dietPreference },
  });
}

export async function setNotificationOptIn(request: APIRequestContext, token: string, optIn: Record<string, boolean>) {
  await request.put(`${API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { notificationOptIn: optIn },
  });
}

export async function getNotifications(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/notifications?page=0&size=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function acceptHireRequest(request: APIRequestContext, clientId: string, ptToken: string) {
  return request.put(`${API_BASE}/workspace/clients/${clientId}/hire-request`, {
    headers: { Authorization: `Bearer ${ptToken}` },
    params: { action: 'ACCEPT' },
  });
}

export async function hirePt(request: APIRequestContext, ptId: string, customerToken: string) {
  return request.post(`${API_BASE}/marketplace/pts/${ptId}/hire`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
}

export async function getBodyMetricReminderStatus(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/profile/body-metric-reminder-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getUnreadCount(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function markAllNotificationsRead(request: APIRequestContext, token: string) {
  return request.put(`${API_BASE}/notifications/read-all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function postBodyMetric(request: APIRequestContext, token: string, recordDate: string, weight: number) {
  return request.post(`${API_BASE}/profile/body-metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { recordDate, weight },
  });
}

export async function setCustomerGoals(
  request: APIRequestContext,
  token: string,
  nutritionGoal: string,
  targetWeight = 68,
  baselineWeight = 75,
) {
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + 2);
  return request.put(`${API_BASE}/profile/goals`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nutritionGoal,
      targetWeight,
      baselineWeight,
      targetDate: targetDate.toISOString().slice(0, 10),
    },
  });
}

export async function getChatContext(request: APIRequestContext, ptToken: string, clientId: string) {
  return request.get(`${API_BASE}/workspace/clients/${clientId}/chat-context`, {
    headers: { Authorization: `Bearer ${ptToken}` },
  });
}

export async function getMarketplacePts(request: APIRequestContext, token: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ page: '0', size: '12', verifiedOnly: 'true', ...params });
  return request.get(`${API_BASE}/marketplace/pts?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createManualLog(request: APIRequestContext, calories: number, sendToPt = false) {
  const token = await customerRequest(request);
  const today = localDateIso();
  const res = await request.post(`${API_BASE}/diet/logs`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      mealType: 'LUNCH',
      calories,
      protein: 20,
      carb: 40,
      fat: 10,
      logDate: today,
      sendToPt,
    },
  });
  return res.json();
}
