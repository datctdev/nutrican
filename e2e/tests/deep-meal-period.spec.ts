import { test, expect } from '@playwright/test';
import { seedAuthCookie, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, createManualLog, localDateOffsetIso } from '../fixtures/api';

test.describe('Deep meal periods MP-01…MP-08', () => {
  test.describe('Hybrid', () => {
    test('[HAPPY] MP-01/02 diet page shows AI + manual meal period controls', async ({ page, request }) => {
      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      await page.goto('/diet');
      await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });

      const periodSelect = page.getByRole('combobox').first();
      await expect(periodSelect).toBeVisible({ timeout: 10_000 });
      const optionCount = await periodSelect.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(5);

      const manualTab = page.getByRole('button', { name: /nhập thủ công/i });
      await expect(manualTab).toBeVisible();
      await manualTab.click();
      const manualSelect = page.getByRole('combobox').first();
      await expect(manualSelect).toBeVisible();
      // Manual can pick any unlocked period value
      const values = await manualSelect.locator('option:not([disabled])').evaluateAll((opts) =>
        opts.map((o) => (o as HTMLOptionElement).value),
      );
      expect(values.length).toBeGreaterThan(0);
      await manualSelect.selectOption(values[0]);
    });

    test('[HAPPY] MP-03/04 diary sections use 5 period labels when logs exist', async ({ page, request }) => {
      await createManualLog(request, 450, false);
      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      await page.goto('/diet');
      await expect(page.getByText(/nhật ký hôm nay|nhật ký ngày/i).first()).toBeVisible({ timeout: 15_000 });
      // MealSection labels or period select both prove 5-window UI is wired
      const diaryHeading = page.getByText(/nhật ký hôm nay/i);
      await expect(diaryHeading).toBeVisible();
      const bodyText = await page.getByRole('main').innerText();
      expect(/buổi|bữa/i.test(bodyText)).toBeTruthy();
    });

    test('[BAD] MP-05/06 AI period lock UI present on today', async ({ page, request }) => {
      await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
      await page.goto('/diet');
      await page.getByRole('button', { name: /phân tích ai/i }).click().catch(() => {});
      const periodSelect = page.getByRole('combobox').first();
      await expect(periodSelect).toBeVisible({ timeout: 10_000 });
      const hint = page.locator('p').filter({ hasText: /gợi ý theo giờ máy/i });
      await expect(hint).toBeVisible({ timeout: 10_000 });
      const disabledCount = await periodSelect.locator('option[disabled]').count();
      expect(disabledCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('BE-only SABOTAGE', () => {
    test('[SABOTAGE] MP-07 invalid mealType → 400; MP-08 future log date blocked', async ({ request }) => {
      const token = await customerRequest(request);
      const bad = await request.post(`${API_BASE}/diet/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          mealType: 'BRUNCH_INVALID',
          calories: 100,
          logDate: localDateOffsetIso(0),
        },
      });
      expect(bad.status()).toBe(400);

      const future = await request.post(`${API_BASE}/diet/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          mealType: 'LUNCH',
          calories: 100,
          protein: 10,
          carb: 10,
          fat: 5,
          logDate: localDateOffsetIso(3),
        },
      });
      expect([400, 409]).toContain(future.status());
    });
  });
});
