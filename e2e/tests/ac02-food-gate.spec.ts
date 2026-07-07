import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { uiLogin, USERS } from '../fixtures/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeImage = path.join(__dirname, '../../research/seed/fixtures/smoke_pho.png');

test.describe('AC-2 Food gate (stub AI)', () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
  });

  test('upload meal image shows analyze flow', async ({ page }) => {
    await page.goto('/diet');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(smokeImage);
    await expect(page.getByText(/phở|pho|xác nhận|nhận diện/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
