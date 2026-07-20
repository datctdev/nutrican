import { test, expect } from '@playwright/test';
import { seedAuthCookie, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, ptRequest, localDateOffsetIso } from '../fixtures/api';
import {
  searchFoodId,
  createSelfPlanItem,
  ensurePublishedPlanForCustomer,
  customerUserId,
} from '../fixtures/selfPlan';

test.describe('Deep self-plan override SP-01…SP-14', () => {
  test.describe('BE-only HAPPY/BAD', () => {
    test('[HAPPY] SP-01 submit → PENDING lock; SP-02 cancel unlock; SP-09 past submit 400; SP-11 double PENDING 409', async ({
      request,
    }) => {
      const token = await customerRequest(request);
      const clientId = await customerUserId(request);
      const today = localDateOffsetIso(0);
      await ensurePublishedPlanForCustomer(request, clientId, today);
      const foodId = await searchFoodId(request, token);

      // cleanup any leftover pending by canceling
      const existing = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today, status: 'PENDING' },
      });
      const existingList = (await existing.json()).data || [];
      for (const s of existingList) {
        await request.post(`${API_BASE}/diet/self-plan/submissions/${s.id}/cancel`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const create = await createSelfPlanItem(request, token, {
        mealType: 'BREAKFAST',
        foodItemId: foodId,
        planDate: today,
      });
      expect(create.ok(), await create.text()).toBeTruthy();
      const itemId = (await create.json()).data.id;

      const past = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: localDateOffsetIso(-2) },
      });
      expect(past.status()).toBe(400);

      const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(submit.ok(), await submit.text()).toBeTruthy();
      const sub = await submit.json();
      expect(sub.data.status).toBe('PENDING');
      const submissionId = sub.data.id as string;

      const lockedPut = await request.put(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 200 },
      });
      expect(lockedPut.status()).toBe(409);

      const lockedPost = await createSelfPlanItem(request, token, {
        mealType: 'DINNER',
        foodItemId: foodId,
        planDate: today,
      });
      expect(lockedPost.status()).toBe(409);

      const double = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect([400, 409]).toContain(double.status());

      const eaten = await request.post(`${API_BASE}/diet/self-plan/${itemId}/eaten`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([400, 409]).toContain(eaten.status());

      const cancel = await request.post(`${API_BASE}/diet/self-plan/submissions/${submissionId}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(cancel.ok(), await cancel.text()).toBeTruthy();
      const cancelBody = await cancel.json();
      expect(cancelBody.data.status).toBe('CANCELLED');

      const unlocked = await request.put(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 170 },
      });
      expect(unlocked.ok()).toBeTruthy();
    });

    test('[HAPPY] SP-03/04/05 APPROVE breakfast-only override + REJECT needs ptNote', async ({ request }) => {
      const token = await customerRequest(request);
      const ptToken = await ptRequest(request);
      const clientId = await customerUserId(request);
      const today = localDateOffsetIso(0);
      await ensurePublishedPlanForCustomer(request, clientId, today);
      const foodId = await searchFoodId(request, token);

      // cancel leftover pending
      const existing = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      for (const s of (await existing.json()).data || []) {
        if (s.status === 'PENDING') {
          await request.post(`${API_BASE}/diet/self-plan/submissions/${s.id}/cancel`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      // REJECT path first on a separate submission
      const createR = await createSelfPlanItem(request, token, {
        mealType: 'LUNCH',
        foodItemId: foodId,
        planDate: today,
      });
      const submitR = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(submitR.ok(), await submitR.text()).toBeTruthy();
      const rejectId = (await submitR.json()).data.id;

      const rejectNoNote = await request.put(`${API_BASE}/workspace/self-plan-submissions/${rejectId}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'REJECT' },
      });
      expect(rejectNoNote.status()).toBe(400);

      const reject = await request.put(`${API_BASE}/workspace/self-plan-submissions/${rejectId}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'REJECT', ptNote: 'Chưa phù hợp macro tuần này' },
      });
      expect(reject.ok(), await reject.text()).toBeTruthy();
      expect((await reject.json()).data.status).toBe('REJECTED');

      // APPROVE breakfast-only
      const createA = await createSelfPlanItem(request, token, {
        mealType: 'BREAKFAST',
        foodItemId: foodId,
        quantityG: 140,
        planDate: today,
      });
      expect(createA.ok()).toBeTruthy();
      const submitA = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(submitA.ok(), await submitA.text()).toBeTruthy();
      const approveId = (await submitA.json()).data.id;

      const listPt = await request.get(`${API_BASE}/workspace/self-plan-submissions`, {
        headers: { Authorization: `Bearer ${ptToken}` },
      });
      expect(listPt.ok()).toBeTruthy();
      const pending = (await listPt.json()).data || [];
      expect(pending.some((s: { id: string }) => s.id === approveId)).toBeTruthy();

      const approve = await request.put(`${API_BASE}/workspace/self-plan-submissions/${approveId}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'APPROVE' },
      });
      expect(approve.ok(), await approve.text()).toBeTruthy();
      expect((await approve.json()).data.status).toBe('APPROVED');

      const dayPlan = await request.get(`${API_BASE}/diet/day-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      const items = (await dayPlan.json()).data.items as Array<{
        mealType: string;
        source: string;
        sourceType?: string;
        foodItemId?: string;
      }>;
      const bfOverride = items.filter(
        (i) => i.mealType === 'BREAKFAST' && i.source === 'PT' && i.sourceType === 'SELF_OVERRIDE',
      );
      expect(bfOverride.length).toBeGreaterThan(0);
      expect(bfOverride[0].foodItemId).toBeTruthy();

      // SP-07 tick SELF_OVERRIDE → DietLog
      const overrideId = (await dayPlan.json()).data.items.find(
        (i: { sourceType?: string; eaten?: boolean }) => i.sourceType === 'SELF_OVERRIDE' && !i.eaten,
      )?.id;
      if (overrideId) {
        const mark = await request.put(`${API_BASE}/meal-plans/items/${overrideId}/eaten`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { eaten: true },
        });
        // some APIs use body
        const mark2 = mark.ok()
          ? mark
          : await request.put(`${API_BASE}/meal-plans/items/${overrideId}/eaten`, {
              headers: { Authorization: `Bearer ${token}` },
              data: { eaten: true },
            });
        expect(mark2.ok() || mark2.status() === 200, await mark2.text()).toBeTruthy();
      }
    });

    test('[BAD] SP-10 submit without published plan → 400', async ({ request }) => {
      const token = await customerRequest(request);
      const foodId = await searchFoodId(request, token);
      // far future week unlikely to have plan
      const far = localDateOffsetIso(60);
      await createSelfPlanItem(request, token, {
        mealType: 'DINNER',
        foodItemId: foodId,
        planDate: far,
      });
      const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: far },
      });
      expect(submit.status()).toBe(400);
      const msg = (await submit.json()).message || '';
      expect(msg.toLowerCase()).toMatch(/thực đơn|plan|duyệt/);
    });
  });

  test.describe('BE-only SABOTAGE', () => {
    test('[SABOTAGE] SP-14 IDOR cancel; double review', async ({ request }) => {
      const token = await customerRequest(request);
      const t2 = await (await import('../fixtures/api')).customer2Request(request);
      const clientId = await customerUserId(request);
      const today = localDateOffsetIso(0);
      await ensurePublishedPlanForCustomer(request, clientId, today);
      const foodId = await searchFoodId(request, token);

      const existing = await request.get(`${API_BASE}/diet/self-plan/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      for (const s of (await existing.json()).data || []) {
        if (s.status === 'PENDING') {
          await request.post(`${API_BASE}/diet/self-plan/submissions/${s.id}/cancel`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      await createSelfPlanItem(request, token, {
        mealType: 'SNACK',
        foodItemId: foodId,
        planDate: today,
      });
      const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(submit.ok(), await submit.text()).toBeTruthy();
      const id = (await submit.json()).data.id;

      const idor = await request.post(`${API_BASE}/diet/self-plan/submissions/${id}/cancel`, {
        headers: { Authorization: `Bearer ${t2}` },
      });
      expect([404, 403]).toContain(idor.status());

      const ptToken = await ptRequest(request);
      const approve = await request.put(`${API_BASE}/workspace/self-plan-submissions/${id}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'APPROVE' },
      });
      expect(approve.ok(), await approve.text()).toBeTruthy();
      const again = await request.put(`${API_BASE}/workspace/self-plan-submissions/${id}`, {
        headers: { Authorization: `Bearer ${ptToken}` },
        data: { action: 'APPROVE' },
      });
      expect([400, 409]).toContain(again.status());
    });
  });

  test.describe('Hybrid', () => {
    test('[HAPPY] SP FE: Plan card shows submit CTA when hasActivePt', async ({ page, request }) => {
      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      await page.goto('/diet');
      await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/ngày đặc biệt|gửi pt duyệt|thêm món/i).first()).toBeVisible();
    });
  });
});
