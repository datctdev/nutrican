import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';

test.describe('AC-1 Auth', () => {
  test('customer login redirects to diet tracker', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password, { viaForm: true });
    await expect(page).toHaveURL(/\/diet/);
    await expect(page.getByText(/nhật ký|diet|ăn uống/i).first()).toBeVisible();
  });

  test('PT login redirects to dashboard', async ({ page }) => {
    await uiLogin(page, USERS.pt.email, USERS.pt.password, { viaForm: true });
    await expect(page).toHaveURL(/\/pt/);
  });
});
