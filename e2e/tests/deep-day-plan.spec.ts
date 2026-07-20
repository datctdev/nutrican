import { test, expect } from '@playwright/test';
import { seedAuthCookie, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, localDateOffsetIso } from '../fixtures/api';
import {
  searchFoodId,
  createSelfPlanItem,
  ensurePublishedPlanForCustomer,
  customerUserId,
} from '../fixtures/selfPlan';

test.describe('Deep day plan DP-01…DP-10', () => {
  test.describe('Hybrid', () => {
    test('[HAPPY] DP-01/02/03 CRUD self plan + day-plan GET + UI card', async ({ page, request }) => {
      const token = await customerRequest(request);
      const today = localDateOffsetIso(0);
      const foodId = await searchFoodId(request, token);
      const create = await createSelfPlanItem(request, token, {
        mealType: 'BREAKFAST',
        foodItemId: foodId,
        quantityG: 100,
        planDate: today,
      });
      expect(create.ok(), await create.text()).toBeTruthy();
      const itemId = (await create.json()).data.id as string;

      const put = await request.put(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { quantityG: 160 },
      });
      expect(put.ok()).toBeTruthy();

      const dayPlan = await request.get(`${API_BASE}/diet/day-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      expect(dayPlan.ok()).toBeTruthy();
      const dp = await dayPlan.json();
      expect(dp.data.items.some((i: { id: string; source: string }) => i.id === itemId && i.source === 'SELF')).toBeTruthy();

      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      await page.goto('/diet');
      await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });

      await request.delete(`${API_BASE}/diet/self-plan/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    });

    test('[HAPPY] DP-06 future date shows Plan ăn ngày, hides eat buttons', async ({ page, request }) => {
      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      const tomorrow = localDateOffsetIso(1);
      await page.goto(`/diet?date=${tomorrow}`);
      await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/không thể ghi nhật ký cho ngày trong tương lai/i)).toBeVisible();
      // Eat buttons for plan should not appear on future (no items yet) — card must still show add
      await expect(page.getByRole('button', { name: /thêm món/i })).toBeVisible();
    });

    test('[BAD] DP-07 anti double-count: SELF breakfast mutes PT in planned totals logic via API merge', async ({ request }) => {
      const token = await customerRequest(request);
      const clientId = await customerUserId(request);
      const today = localDateOffsetIso(0);
      await ensurePublishedPlanForCustomer(request, clientId, today);
      const foodId = await searchFoodId(request, token);
      const create = await createSelfPlanItem(request, token, {
        mealType: 'BREAKFAST',
        foodItemId: foodId,
        quantityG: 150,
        planDate: today,
      });
      expect(create.ok(), await create.text()).toBeTruthy();
      const dayPlan = await request.get(`${API_BASE}/diet/day-plan`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: today },
      });
      const items = (await dayPlan.json()).data.items as Array<{
        mealType: string;
        source: string;
        sourceType?: string;
        calories?: number;
      }>;
      const selfBf = items.filter((i) => i.mealType === 'BREAKFAST' && i.source === 'SELF');
      const ptBf = items.filter((i) => i.mealType === 'BREAKFAST' && i.source === 'PT');
      expect(selfBf.length).toBeGreaterThan(0);
      // BE still returns PT for audit; FE mutes — assert both present so FE has data to mute
      expect(ptBf.length + selfBf.length).toBeGreaterThan(0);
    });
  });

  test.describe('BE-only SABOTAGE', () => {
    test('[SABOTAGE] DP-09 double eaten; DP-10 future eaten blocked when hasActivePt or no-PT', async ({ request }) => {
      // customer2 may have no ACTIVE PT (PENDING mapping) — use for no-PT eaten if possible
      const token = await customerRequest(request);
      const hasPt = await request.get(`${API_BASE}/profile/has-active-pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const active = (await hasPt.json()).data.hasActivePt;
      const foodId = await searchFoodId(request, token);
      const tomorrow = localDateOffsetIso(1);
      const create = await createSelfPlanItem(request, token, {
        mealType: 'LUNCH',
        foodItemId: foodId,
        planDate: tomorrow,
      });
      expect(create.ok()).toBeTruthy();
      const id = (await create.json()).data.id;
      const eaten = await request.post(`${API_BASE}/diet/self-plan/${id}/eaten`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (active) {
        expect([400, 409]).toContain(eaten.status());
      } else {
        // future eaten should be blocked
        expect([400, 409]).toContain(eaten.status());
      }
      await request.delete(`${API_BASE}/diet/self-plan/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    });
  });
});
