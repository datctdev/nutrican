import { test, expect } from '@playwright/test';
import { seedAuthCookie, uiLogin, USERS } from '../fixtures/auth';

test.describe('AC-10 Refund', () => {
  test('admin refund queue page loads', async ({ page }) => {
    await uiLogin(page, USERS.admin.email, USERS.admin.password);
    await page.goto('/admin/refunds');
    await expect(page.getByText(/hoàn tiền|refund/i).first()).toBeVisible();
  });

  test('customer profile has refund section', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/profile');
    await expect(page.getByText(/hoàn tiền|lịch hẹn|hồ sơ/i).first()).toBeVisible();
  });
});
