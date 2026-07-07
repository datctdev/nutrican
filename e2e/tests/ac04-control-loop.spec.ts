import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { API_BASE, createManualLog, customerRequest, localDateOffsetIso } from '../fixtures/api';

test.describe('AC-4 Control loop intake card', () => {
  test.describe('BE-only', () => {
    test('summary returns OVER_MACRO after high calorie logs (ADD-08 intake)', async ({ request }) => {
      await createManualLog(request, 1300);
      await createManualLog(request, 1200);
      const token = await customerRequest(request);
      const today = localDateOffsetIso(0);
      const res = await request.get(`${API_BASE}/diet/summary?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data?.intakeStatus).toBe('OVER_MACRO');
    });
  });

  test.describe('Hybrid', () => {
    test('high calorie logs show OVER_MACRO banner on diet page', async ({ page, request }) => {
    await createManualLog(request, 1300);
    await createManualLog(request, 1200);
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/diet');
    await page.reload();
    await expect(page.getByText(/vượt macro|OVER_MACRO/i).first()).toBeVisible({ timeout: 15_000 });
    });
  });
});
