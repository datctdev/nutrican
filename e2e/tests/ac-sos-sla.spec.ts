import { test, expect } from '@playwright/test';
import { uiLogin } from '../fixtures/auth';
import { API_BASE, adminRequest } from '../fixtures/api';

test.describe('AC-SOS SLA', () => {
  test.describe('BE-only', () => {
    test('admin can list SLA-breached tickets', async ({ request }) => {
      const token = await adminRequest(request);
      const res = await request.get(`${API_BASE}/admin/sos-tickets?status=SLA_BREACHED&page=0&size=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data).toBeDefined();
    });
  });

  test.describe('FE-only', () => {
    test('admin SOS page shows SLA breach tab', async ({ page }) => {
      await uiLogin(page, 'admin@nutrican.com', 'Admin123!');
      await page.goto('/admin/sos');
      await expect(page.getByRole('button', { name: /quá hạn 24h/i })).toBeVisible({ timeout: 15_000 });
    });

    test('PT review page loads SOS section', async ({ page }) => {
      await uiLogin(page, 'pt.certified@gmail.com', '123456');
      await page.goto('/pt/reviews');
      await expect(page.getByText(/sos/i).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Hybrid', () => {
    test('admin tab filters SLA breached tickets', async ({ page, request }) => {
      const token = await adminRequest(request);
      const res = await request.get(`${API_BASE}/admin/sos-tickets?status=SLA_BREACHED&page=0&size=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();

      await uiLogin(page, 'admin@nutrican.com', 'Admin123!');
      await page.goto('/admin/sos');
      await page.getByRole('button', { name: /quá hạn 24h/i }).click();
      await expect(page.getByText(/sos|ticket|huấn luyện/i).first()).toBeVisible({ timeout: 15_000 });
    });
  });
});
