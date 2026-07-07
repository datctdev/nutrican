import { test, expect } from '@playwright/test';

import { uiLogin, USERS } from '../fixtures/auth';



test.describe('AC-9 Appointments', () => {

  test('customer profile shows appointment booking section', async ({ page }) => {

    await uiLogin(page, USERS.customer.email, USERS.customer.password);

    await page.goto('/profile');

    await expect(page.getByText(/lịch hẹn|đặt lịch/i).first()).toBeVisible({ timeout: 10_000 });

  });



  test('PT appointments page loads', async ({ page }) => {

    await uiLogin(page, USERS.pt.email, USERS.pt.password);

    await page.goto('/pt/appointments');

    await expect(page.getByText(/lịch hẹn|appointment/i).first()).toBeVisible();

  });

});


