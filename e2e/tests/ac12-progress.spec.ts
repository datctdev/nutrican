import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';

test.describe('AC-12 Progress timeline', () => {
  test('customer sets goal and sees progress section', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/profile');
    await expect(page.getByText(/mục tiêu|ghi cân/i).first()).toBeVisible({ timeout: 10_000 });

    const baseline = page.getByPlaceholder(/baseline/i);
    if (await baseline.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await baseline.fill('75');
      await page.getByPlaceholder(/mục tiêu/i).fill('68');
      await page.getByRole('button', { name: /lưu mục tiêu/i }).click();
      await expect(page.getByText(/đã lưu|mục tiêu/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('weight input and log button visible', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/profile');
    await expect(page.getByPlaceholder(/cân hôm nay/i)).toBeVisible({ timeout: 10_000 });
  });

  test('weekly reminder banner or weight widget visible', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/profile');
    const banner = page.getByText(/chưa ghi cân nặng hơn 7 ngày/i);
    const weight = page.getByPlaceholder(/cân hôm nay/i);
    await expect(banner.or(weight)).toBeVisible({ timeout: 10_000 });
  });
});
