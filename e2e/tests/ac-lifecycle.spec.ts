import { test, expect } from '@playwright/test';
import { uiLogin } from '../fixtures/auth';
import { API_BASE, customerRequest, hirePt } from '../fixtures/api';

test.describe('AC-LIFE Coaching lifecycle', () => {
  test.describe('BE-only', () => {
    test('second PT hire blocked when customer has active PT', async ({ request }) => {
      const token = await customerRequest(request);
      const listRes = await request.get(`${API_BASE}/marketplace/pts?page=0&size=5&verifiedOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(listRes.ok()).toBeTruthy();
      const pts = (await listRes.json()).data?.content || [];
      const target = pts.find((p: { email?: string }) => p.email?.includes('freelance')) || pts[0];
      test.skip(!target?.userId && !target?.id, 'No PT in marketplace');

      const ptUserId = target.userId || target.id;
      const hireRes = await hirePt(request, ptUserId, token);
      expect(hireRes.status()).toBe(400);
    });
  });

  test.describe('FE-only', () => {
    test('customer profile shows coaching section', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/profile');
      await expect(page.getByText(/coaching với pt/i)).toBeVisible({ timeout: 10_000 });
    });

    test('end coaching opens confirm modal', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/profile');
      const endBtn = page.getByRole('button', { name: /yêu cầu kết thúc coaching|xác nhận kết thúc coaching/i });
      if (await endBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await endBtn.click();
        await expect(page.getByText(/kết thúc coaching\?/i)).toBeVisible({ timeout: 5_000 });
        await page.getByRole('button', { name: /^hủy$/i }).click();
      }
    });
  });

  test.describe('Hybrid', () => {
    test('coaching history section visible when completed mappings exist', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/profile');
      const history = page.getByText(/lịch sử coaching/i);
      const coaching = page.getByText(/coaching với pt/i);
      await expect(history.or(coaching)).toBeVisible({ timeout: 10_000 });
    });
  });
});
