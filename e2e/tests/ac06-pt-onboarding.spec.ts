import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';

test.describe('AC-6 PT onboarding', () => {
  test('admin can open PT verification page', async ({ page }) => {
    await uiLogin(page, USERS.admin.email, USERS.admin.password);
    await page.goto('/admin/pts');
    await expect(page.getByText(/duyệt|chờ duyệt|PT/i).first()).toBeVisible();
  });
});
