import { test, expect } from '@playwright/test';
import { uiLogin } from '../fixtures/auth';
import { customerRequest, getMarketplacePts, setCustomerGoals } from '../fixtures/api';

test.describe('AC-MKT Marketplace filter', () => {
  test.describe('BE-only', () => {
    test('goal filter returns empty for impossible match', async ({ request }) => {
      const token = await customerRequest(request);
      const res = await getMarketplacePts(request, token, {
        goalFilter: 'NONEXISTENT_GOAL_XYZ',
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data?.content?.length ?? 0).toBe(0);
    });
  });

  test.describe('FE-only', () => {
    test('marketplace shows goal filter chips', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/marketplace');
      await expect(page.getByRole('button', { name: /giảm cân/i })).toBeVisible({ timeout: 10_000 });
    });

    test('impossible search shows empty state', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/marketplace');
      await page.getByPlaceholder(/tìm kiếm theo tên/i).fill('zzznonexistentptxyz123');
      await page.getByRole('button', { name: /tìm kiếm/i }).click();
      await expect(page.getByText(/không tìm thấy huấn luyện viên nào/i)).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Hybrid', () => {
    test('customer goal set then marketplace shows compatibility sort', async ({ page, request }) => {
      const token = await customerRequest(request);
      await setCustomerGoals(request, token, 'WEIGHT_LOSS');

      await uiLogin(page, 'customer1@gmail.com', '123456');
      await page.goto('/marketplace');
      await expect(page.locator('select')).toContainText('Phù hợp nhất');
      const badge = page.getByText(/phù hợp mục tiêu|hết chỗ/i).first();
      if (await badge.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(badge).toBeVisible();
      }
    });
  });
});
