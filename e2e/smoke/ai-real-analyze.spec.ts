import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedAuthCookie, USERS } from '../fixtures/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeImage = path.join(__dirname, '../../research/seed/fixtures/smoke_pho.png');

test.describe('@smoke real AI analyze', () => {
  test.skip(!process.env.E2E_REAL_AI, 'Set E2E_REAL_AI=1 and start ai-service + Ollama');

  test('analyze with real AI service returns food label', async ({ page, request }) => {
    await seedAuthCookie(page, USERS.customer.email, USERS.customer.password, request);
    await page.goto('/diet');
    await page.locator('input[type="file"]').first().setInputFiles(smokeImage);
    await expect(page.getByText(/phở|pho|xác nhận/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
