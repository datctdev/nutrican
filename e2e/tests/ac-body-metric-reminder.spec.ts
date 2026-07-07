import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import {
  customerRequest,
  getBodyMetricReminderStatus,
  localDateOffsetIso,
  postBodyMetric,
} from '../fixtures/api';

test.describe('AC-BM-04 Body metric reminder', () => {
  test.describe('BE-only', () => {
    test('reminder status endpoint returns shape', async ({ request }) => {
      const token = await customerRequest(request);
      const json = await getBodyMetricReminderStatus(request, token);
      expect(json.data).toBeDefined();
      expect(typeof json.data.showReminder === 'boolean').toBeTruthy();
    });

    test('posting old metric can trigger showReminder', async ({ request }) => {
      const token = await customerRequest(request);
      await postBodyMetric(request, token, localDateOffsetIso(-10), 72);
      const json = await getBodyMetricReminderStatus(request, token);
      expect(json.data.showReminder).toBe(true);
    });

    test('future recordDate returns 400 (AC-BM-02)', async ({ request }) => {
      const token = await customerRequest(request);
      const res = await postBodyMetric(request, token, localDateOffsetIso(1), 70);
      expect(res.status()).toBe(400);
    });
  });

  test.describe('FE-only', () => {
    test('weekly reminder opt-out toggle on profile', async ({ page }) => {
      await uiLogin(page, USERS.customer.email, USERS.customer.password);
      await page.goto('/profile');
      await expect(page.getByText(/nhắc ghi cân hàng tuần/i)).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Hybrid', () => {
    test('banner visible when API reports showReminder', async ({ page, request }) => {
      const token = await customerRequest(request);
      await postBodyMetric(request, token, localDateOffsetIso(-10), 71);
      const status = await getBodyMetricReminderStatus(request, token);
      test.skip(!status.data?.showReminder, 'Reminder not triggered in this seed state');

      await uiLogin(page, USERS.customer.email, USERS.customer.password);
      await page.goto('/profile');
      await expect(page.getByText(/chưa ghi cân nặng hơn 7 ngày/i)).toBeVisible({ timeout: 10_000 });
    });
  });
});
