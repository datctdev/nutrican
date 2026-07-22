import { test, expect } from '@playwright/test';
import { API_BASE, customerRequest, customer2Request, ptRequest, localDateOffsetIso } from '../fixtures/api';
import {
  searchFoodId,
  createSelfPlanItem,
  ensurePublishedPlanForCustomer,
  customerUserId,
} from '../fixtures/selfPlan';

async function cancelPending(request: import('@playwright/test').APIRequestContext, token: string, date: string) {
  const existing = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { date },
  });
  for (const s of (await existing.json()).data || []) {
    if (s.status === 'PENDING') {
      await request.post(`${API_BASE}/diet/self-plan/submissions/${s.id}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
}

test.describe('L5 SABOTAGE race + IDOR sweep', () => {
  test('[SABOTAGE] race double-submit → only one PENDING', async ({ request }) => {
    const token = await customerRequest(request);
    const clientId = await customerUserId(request);
    const today = localDateOffsetIso(0);
    await ensurePublishedPlanForCustomer(request, clientId, today);
    await cancelPending(request, token, today);
    const foodId = await searchFoodId(request, token);
    await createSelfPlanItem(request, token, {
      mealType: 'LUNCH',
      foodItemId: foodId,
      planDate: today,
    });

    const [a, b] = await Promise.all([
      request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      }),
      request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      }),
    ]);
    const statuses = [a.status(), b.status()].sort();
    const oks = [a.ok(), b.ok()].filter(Boolean).length;
    expect(oks).toBe(1);
    expect(statuses.some((s) => s === 409 || s === 400)).toBeTruthy();

    const list = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today, status: 'PENDING' },
    });
    const pending = ((await list.json()).data || []).filter((s: { status: string }) => s.status === 'PENDING');
    expect(pending.length).toBe(1);

    await cancelPending(request, token, today);
  });

  test('[SABOTAGE] approve∥cancel race — consistent terminal state', async ({ request }) => {
    const token = await customerRequest(request);
    const ptToken = await ptRequest(request);
    const clientId = await customerUserId(request);
    const today = localDateOffsetIso(0);
    await ensurePublishedPlanForCustomer(request, clientId, today);
    await cancelPending(request, token, today);
    const foodId = await searchFoodId(request, token);
    await createSelfPlanItem(request, token, {
      mealType: 'DINNER',
      foodItemId: foodId,
      planDate: today,
    });
    const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const id = (await submit.json()).data.id as string;

    const [cancel, approve] = await Promise.all([
      request.post(`${API_BASE}/diet/self-plan/submissions/${id}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      request.put(`${API_BASE}/workspace/self-plan-submissions/${id}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'APPROVE' },
      }),
    ]);
    const success = [cancel.ok(), approve.ok()].filter(Boolean).length;
    expect(success).toBeGreaterThanOrEqual(1);
    expect(success).toBeLessThanOrEqual(2);

    const detail = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    const row = ((await detail.json()).data || []).find((s: { id: string }) => s.id === id);
    expect(row).toBeTruthy();
    expect(['APPROVED', 'CANCELLED', 'REJECTED']).toContain(row.status);
    expect(row.status).not.toBe('PENDING');
  });

  test('[SABOTAGE] IDOR sweep customer2 on customer1 item/submission/day-plan mutate', async ({ request }) => {
    const token = await customerRequest(request);
    const t2 = await customer2Request(request);
    const clientId = await customerUserId(request);
    const today = localDateOffsetIso(0);
    await ensurePublishedPlanForCustomer(request, clientId, today);
    await cancelPending(request, token, today);
    const foodId = await searchFoodId(request, token);
    const create = await createSelfPlanItem(request, token, {
      mealType: 'SNACK',
      foodItemId: foodId,
      planDate: today,
    });
    expect(create.ok()).toBeTruthy();
    const itemId = (await create.json()).data.id as string;

    const putIdor = await request.put(`${API_BASE}/diet/self-plan/${itemId}`, {
      headers: { Authorization: `Bearer ${t2}` },
      data: { quantityG: 999 },
    });
    expect([404, 403]).toContain(putIdor.status());

    const delIdor = await request.delete(`${API_BASE}/diet/self-plan/${itemId}`, {
      headers: { Authorization: `Bearer ${t2}` },
    });
    expect([404, 403]).toContain(delIdor.status());

    const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const subId = (await submit.json()).data.id as string;

    const cancelIdor = await request.post(`${API_BASE}/diet/self-plan/submissions/${subId}/cancel`, {
      headers: { Authorization: `Bearer ${t2}` },
    });
    expect([404, 403]).toContain(cancelIdor.status());

    const ptAsCustomer = await request.put(`${API_BASE}/workspace/self-plan-submissions/${subId}`, {
      headers: { Authorization: `Bearer ${t2}` },
      data: { action: 'APPROVE' },
    });
    expect([401, 403]).toContain(ptAsCustomer.status());

    await cancelPending(request, token, today);
  });
});
