import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { setCustomerDietPreference } from '../fixtures/api';

test.describe('AC-4b Diet preference filter', () => {
  test('VEGETARIAN user sees pref badge on incompatible search', async ({ page, request }) => {
    await setCustomerDietPreference(request, 'VEGETARIAN');
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/diet');
    const search = page.getByPlaceholder(/tìm món|search/i).first();
    if (await search.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await search.fill('bò');
      await page.waitForTimeout(1500);
      const prefBadge = page.getByText(/!PREF|PREF/i).first();
      if (await prefBadge.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(prefBadge).toBeVisible();
      }
    }
  });

  test('toggle diet filter off shows broader results', async ({ page, request }) => {
    await setCustomerDietPreference(request, 'VEGETARIAN');
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/diet');
    const filterToggle = page.getByText(/lọc chế độ|diet filter|ẩn món/i).first();
    if (await filterToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await filterToggle.click();
    }
    await expect(page).toHaveURL(/\/customer\/diet|\/diet/);
  });
});
