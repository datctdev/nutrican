import { test, expect } from '@playwright/test';
import { uiLogin } from '../fixtures/auth';
import {
  acceptHireRequest,
  customer2Request,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  ptFreelanceRequest,
} from '../fixtures/api';

test.describe('AC-NOTIF Notification center', () => {
  test.describe('BE-only', () => {
    test('hire accept creates HIRE_ACCEPTED notification', async ({ request }) => {
      const loginRes = await request.post(`${process.env.E2E_API_URL || 'http://localhost:8080/api/v1'}/auth/login`, {
        data: { email: 'customer2@gmail.com', password: '123456' },
      });
      expect(loginRes.ok()).toBeTruthy();
      const loginJson = await loginRes.json();
      const customerToken = loginJson.data.accessToken as string;
      const customerId = loginJson.data.user.id as string;

      const ptToken = await ptFreelanceRequest(request);
      const acceptRes = await acceptHireRequest(request, customerId, ptToken);
      if (!acceptRes.ok()) {
        expect(acceptRes.status(), 'hire accept should succeed or already be active').toBe(400);
      }

      const notifications = await getNotifications(request, customerToken);
      const items = notifications.data?.content || [];
      expect(items.some((n: { type: string }) => n.type === 'HIRE_ACCEPTED')).toBeTruthy();
    });

    test('markAllRead clears unread count', async ({ request }) => {
      const token = await customer2Request(request);
      await markAllNotificationsRead(request, token);
      const json = await getUnreadCount(request, token);
      expect(json.data).toBe(0);
    });
  });

  test.describe('FE-only', () => {
    test('header bell shows notification panel', async ({ page }) => {
      await uiLogin(page, 'customer1@gmail.com', '123456', { landingPath: '/diet' });
      await page.getByRole('button', { name: 'Thông báo' }).click();
      await expect(page.getByText('Đọc tất cả')).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Hybrid', () => {
    test('notification panel lists items after API hire', async ({ page, request }) => {
      const token = await customer2Request(request);
      const data = await getNotifications(request, token);
      const items = data.data?.content || [];
      test.skip(items.length === 0, 'No notifications in seed');

      await uiLogin(page, 'customer2@gmail.com', '123456');
      await page.getByRole('button', { name: 'Thông báo' }).click();
      await expect(page.getByText(items[0].title || /thông báo/i).first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
