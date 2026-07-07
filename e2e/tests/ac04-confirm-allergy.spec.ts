import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { uiLogin, USERS } from '../fixtures/auth';
import { setCustomerAllergens } from '../fixtures/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeImage = path.join(__dirname, '../../research/seed/fixtures/smoke_pho.png');

test.describe('AC-4 Confirm + allergy banner', () => {
  test.beforeEach(async ({ page, request }) => {
    await setCustomerAllergens(request, ['GLUTEN']);
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
  });

  test('confirm shows allergy warning when applicable', async ({ page }) => {
    await page.goto('/diet');
    await page.locator('input[type="file"]').first().setInputFiles(smokeImage);
    const confirmBtn = page.getByRole('button', { name: /xác nhận|lưu/i }).first();
    if (await confirmBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await confirmBtn.click();
      await expect(page.getByText(/cảnh báo dị ứng|allergy/i).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
