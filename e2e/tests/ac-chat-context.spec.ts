import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, getChatContext, ptRequest } from '../fixtures/api';

test.describe('AC-CHAT Chat context', () => {
  test.describe('BE-only', () => {
    test('chat-context API returns today summary for active client', async ({ request }) => {
      const ptToken = await ptRequest(request);
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'customer1@gmail.com', password: '123456' },
      });
      const customerId = (await loginRes.json()).data.user.id;

      const res = await getChatContext(request, ptToken, customerId);
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data?.date).toBeTruthy();
    });

    test('chat-context rejects client without active mapping', async ({ request }) => {
      const ptToken = await ptRequest(request);
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'customer2@gmail.com', password: '123456' },
      });
      const customerId = (await loginRes.json()).data.user.id;
      const res = await getChatContext(request, ptToken, customerId);
      expect(res.status()).toBe(400);
    });
  });

  test.describe('FE-only', () => {
    test('PT chat shows context sidebar and PDF attach control', async ({ page }) => {
      await uiLogin(page, USERS.pt.email, USERS.pt.password);
      await page.goto('/pt/chat');
      await expect(page).toHaveURL(/\/pt\/chat/, { timeout: 10_000 });

      const thread = page.locator('[class*="cursor-pointer"]').filter({ hasText: /học viên|customer|test/i }).first();
      if (await thread.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await thread.click();
        await expect(page.getByText(/ngữ cảnh hôm nay/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/calo/i).first()).toBeVisible();
      }
      await expect(page.getByLabel(/đính kèm pdf/i)).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Hybrid', () => {
    test('review page Hỏi qua chat opens chat with context', async ({ page }) => {
      await uiLogin(page, USERS.pt.email, USERS.pt.password);
      await page.goto('/pt/reviews');
      const chatBtn = page.getByRole('button', { name: /hỏi qua chat/i }).first();
      if (await chatBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await chatBtn.click();
        await expect(page).toHaveURL(/\/pt\/chat/, { timeout: 10_000 });
        await expect(page.getByText(/nhật ký bữa ăn|ngữ cảnh/i).first()).toBeVisible({ timeout: 10_000 });
      }
    });
  });
});
