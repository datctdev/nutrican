import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { createManualLog } from '../fixtures/api';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';

test.describe('AC-15 RBL admin', () => {
  test('admin dashboard shows RBL cohort section', async ({ page }) => {
    await uiLogin(page, USERS.admin.email, USERS.admin.password);
    await page.goto('/admin');
    await expect(page.getByText(/RBL|cohort|experiment/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('customer cannot access RBL export API', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: USERS.customer.email, password: USERS.customer.password },
    });
    const token = (await loginRes.json()).data.accessToken;
    const res = await request.get(`${API_BASE}/admin/rbl/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});
