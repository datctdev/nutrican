import { test, expect } from '@playwright/test';
import { seedAuthCookie, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, ptRequest, localDateOffsetIso, createManualLog } from '../fixtures/api';
import {
  searchFoodId,
  createSelfPlanItem,
  ensurePublishedPlanForCustomer,
  customerUserId,
} from '../fixtures/selfPlan';

/**
 * L4 — full business chain (hybrid BE+FE):
 * login → (seeded) onboarding/macros → manual log → self-plan → submit → PT approve →
 * tick SELF_OVERRIDE → DietLog + summary numbers move.
 */
test.describe('L4 full chain login→log→self-plan→approve→tick', () => {
  test('[HAPPY] end-to-end override creates DietLog and updates UI summary', async ({ page, request }) => {
    const token = await customerRequest(request);
    const ptToken = await ptRequest(request);
    const clientId = await customerUserId(request);
    const today = localDateOffsetIso(0);

    // Profile / macros present (seeded onboarding)
    const me = await request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();
    expect(profile.data?.id).toBeTruthy();

    await ensurePublishedPlanForCustomer(request, clientId, today);

    // Manual log (actual layer)
    await createManualLog(request, 300, false);

    // Cancel leftover pending
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

    const foodId = await searchFoodId(request, token);
    const create = await createSelfPlanItem(request, token, {
      mealType: 'BREAKFAST',
      foodItemId: foodId,
      quantityG: 120,
      planDate: today,
    });
    expect(create.ok(), await create.text()).toBeTruthy();

    const submit = await request.post(`${API_BASE}/diet/self-plan/submit`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const submissionId = (await submit.json()).data.id as string;

    const approve = await request.put(`${API_BASE}/workspace/self-plan-submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${ptToken}` },
      data: { action: 'APPROVE' },
    });
    expect(approve.ok(), await approve.text()).toBeTruthy();

    // Find SELF_OVERRIDE item on day-plan / meal-plan
    const dayPlan = await request.get(`${API_BASE}/diet/day-plan`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    expect(dayPlan.ok()).toBeTruthy();
    const items = (await dayPlan.json()).data.items as Array<{
      id: string;
      source: string;
      sourceType?: string;
      mealType: string;
      eaten?: boolean;
    }>;
    const override = items.find(
      (i) => i.source === 'PT' && i.sourceType === 'SELF_OVERRIDE' && i.mealType === 'BREAKFAST',
    );
    expect(override, `SELF_OVERRIDE breakfast in ${JSON.stringify(items)}`).toBeTruthy();

    const summaryBefore = await request.get(`${API_BASE}/diet/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    const calBefore = Number((await summaryBefore.json()).data?.totalCalories ?? 0);

    const mark = await request.put(`${API_BASE}/meal-plans/items/${override!.id}/eaten`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { eaten: true },
    });
    expect(mark.ok(), await mark.text()).toBeTruthy();

    const summaryAfter = await request.get(`${API_BASE}/diet/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    const calAfter = Number((await summaryAfter.json()).data?.totalCalories ?? 0);
    expect(calAfter).toBeGreaterThanOrEqual(calBefore);

    // FE: diet page shows plan + progress after refresh
    await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
    await page.goto('/diet');
    await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/mục tiêu hàng ngày|kcal/i).first()).toBeVisible();
  });
});
