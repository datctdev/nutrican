import { test, expect } from '@playwright/test';
import {
  API_BASE,
  customerRequest,
  customer2Request,
  ptRequest,
  localDateOffsetIso,
} from '../fixtures/api';
import {
  searchFoodId,
  createSelfPlanItem,
  ensurePublishedPlanForCustomer,
  customerUserId,
} from '../fixtures/selfPlan';

test.describe('L1 API matrix — day-plan / self-plan / macros', () => {
  test.describe('BE-only HAPPY', () => {
    test('[HAPPY] day-plan + has-active-pt + self-plan CRUD + submissions list', async ({ request }) => {
      const token = await customerRequest(request);
      const today = localDateOffsetIso(0);
      const foodId = await searchFoodId(request, token);

      const hasPt = await request.get(`${API_BASE}/profile/has-active-pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(hasPt.ok()).toBeTruthy();
      const hasPtBody = await hasPt.json();
      expect(hasPtBody.data.hasActivePt).toBe(true);

      const dayPlan = await request.get(`${API_BASE}/diet/day-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(dayPlan.ok()).toBeTruthy();

      const create = await createSelfPlanItem(request, token, {
        mealType: 'LUNCH',
        foodItemId: foodId,
        quantityG: 120,
        planDate: today,
      });
      expect(create.status(), await create.text()).toBe(200);
      const created = await create.json();
      const itemId = created.data.id as string;
      expect(created.data.quantityG).toBeTruthy();

      const put = await request.put(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 180 },
      });
      expect(put.ok()).toBeTruthy();
      const putBody = await put.json();
      expect(Number(putBody.data.quantityG)).toBe(180);

      const list = await request.get(`${API_BASE}/diet/self-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(list.ok()).toBeTruthy();
      const listBody = await list.json();
      expect(listBody.data.some((i: { id: string }) => i.id === itemId)).toBeTruthy();

      const subs = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(subs.ok()).toBeTruthy();
      expect(Array.isArray((await subs.json()).data)).toBeTruthy();

      const del = await request.delete(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(del.ok()).toBeTruthy();
    });

    test('[HAPPY] PT lists self-plan-submissions; recalculate-macros shape', async ({ request }) => {
      const ptToken = await ptRequest(request);
      const pending = await request.get(`${API_BASE}/workspace/self-plan-submissions`, {
        headers: { Authorization: `Bearer ${ptToken}` },
      });
      expect(pending.ok()).toBeTruthy();
      expect(Array.isArray((await pending.json()).data)).toBeTruthy();

      const token = await customerRequest(request);
      const recalc = await request.post(`${API_BASE}/profile/recalculate-macros`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { activityLevel: 'MODERATE' },
      });
      expect(recalc.ok(), await recalc.text()).toBeTruthy();
      const body = await recalc.json();
      const macros = body.data?.macros || body.data || {};
      expect(macros.calories ?? macros.dailyCalories ?? macros.protein).toBeTruthy();
      expect(body.data?.activityLevel || macros).toBeTruthy();
    });
  });

  test.describe('BE-only BAD', () => {
    test('[BAD] self-plan missing foodItemId → 400; quantityG≤0 → 400; bad enum → 400', async ({ request }) => {
      const token = await customerRequest(request);
      const today = localDateOffsetIso(0);
      const bad = await request.post(`${API_BASE}/diet/self-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { mealType: 'LUNCH', planDate: today },
      });
      expect(bad.status()).toBe(400);

      const foodId = await searchFoodId(request, token);
      const create = await createSelfPlanItem(request, token, {
        mealType: 'DINNER',
        foodItemId: foodId,
        planDate: today,
      });
      const id = (await create.json()).data.id;
      const qty = await request.put(`${API_BASE}/diet/self-plan/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 0 },
      });
      expect(qty.status()).toBe(400);

      const enumBad = await request.post(`${API_BASE}/profile/recalculate-macros`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { activityLevel: 'NOT_A_LEVEL' },
      });
      expect(enumBad.status()).toBe(400);
      const msg = ((await enumBad.json()).message || '').toLowerCase();
      expect(msg.includes('activity') || msg.includes('invalid') || msg.includes('enum')).toBeTruthy();

      await request.delete(`${API_BASE}/diet/self-plan/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    });

    test('[BAD] missing id → 404', async ({ request }) => {
      const token = await customerRequest(request);
      const res = await request.put(`${API_BASE}/diet/self-plan/00000000-0000-0000-0000-000000000099`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 100 },
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('BE-only SABOTAGE', () => {
    test('[SABOTAGE] 401 without token; 403 wrong role; IDOR customer2', async ({ request }) => {
      const anon = await request.get(`${API_BASE}/diet/day-plan`);
      expect([401, 403]).toContain(anon.status());

      const cust = await customerRequest(request);
      const asCustomer = await request.get(`${API_BASE}/workspace/self-plan-submissions`, {
        headers: { Authorization: `Bearer ${cust}` },
      });
      expect([403, 401]).toContain(asCustomer.status());

      const pt = await ptRequest(request);
      const asPt = await request.post(`${API_BASE}/diet/self-plan`, {
        headers: { Authorization: `Bearer ${pt}` },
        data: { mealType: 'LUNCH', foodItemId: '00000000-0000-0000-0000-000000000001' },
      });
      expect([403, 401]).toContain(asPt.status());

      const t1 = await customerRequest(request);
      const foodId = await searchFoodId(request, t1);
      const create = await createSelfPlanItem(request, t1, {
        mealType: 'SNACK',
        foodItemId: foodId,
        planDate: localDateOffsetIso(0),
      });
      const itemId = (await create.json()).data.id;
      const t2 = await customer2Request(request);
      const idor = await request.delete(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${t2}` },
      });
      expect([404, 403]).toContain(idor.status());
      await request.delete(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${t1}` },
      });
    });
  });
});
