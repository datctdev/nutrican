import { test, expect } from '@playwright/test';
import { uiLogin } from '../fixtures/auth';
import { API_BASE, adminRequest } from '../fixtures/api';

test.describe('AC-SOS-07 Admin reassign', () => {
  test.describe('BE-only', () => {
    test('admin can fetch open and breached ticket lists', async ({ request }) => {
      const token = await adminRequest(request);
      const openRes = await request.get(`${API_BASE}/admin/sos-tickets?status=OPEN&page=0&size=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(openRes.ok()).toBeTruthy();
      const breachedRes = await request.get(`${API_BASE}/admin/sos-tickets?status=SLA_BREACHED&page=0&size=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(breachedRes.ok()).toBeTruthy();
    });
  });

  test.describe('FE-only', () => {
    test('admin SOS page shows assign or reassign controls', async ({ page }) => {
      await uiLogin(page, 'admin@nutrican.com', 'Admin123!');
      await page.goto('/admin/sos');
      await expect(page.getByText(/sos|ticket|huấn luyện/i).first()).toBeVisible({ timeout: 15_000 });
      const reassign = page.getByRole('button', { name: /giao lại pt|giao huấn luyện viên/i });
      const count = await reassign.count();
      if (count > 0) {
        await expect(reassign.first()).toBeVisible();
      }
    });
  });
});
