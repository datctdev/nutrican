import { test, expect } from '@playwright/test';

import { uiLogin, USERS } from '../fixtures/auth';



test.describe('AC-8 Meal plan', () => {

  test('customer profile shows meal plan with skip action', async ({ page }) => {

    await uiLogin(page, USERS.customer.email, USERS.customer.password);

    await page.goto('/coaching');

    const skipBtn = page.getByRole('button', { name: /bỏ qua/i }).first();

    if (await skipBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {

      await skipBtn.click();

      await expect(page.getByText(/không có thời gian|không thích|dị ứng/i).first()).toBeVisible({ timeout: 8_000 });

    } else {

      await expect(page.getByText(/thực đơn tuần/i)).toBeVisible();

    }

  });



  test('PT meal plan page loads with suggestion section when applicable', async ({ page }) => {

    await uiLogin(page, USERS.pt.email, USERS.pt.password);

    await page.goto('/pt/clients');

    const mealBtn = page.getByRole('button', { name: /thực đơn tuần/i }).first();

    if (await mealBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {

      await mealBtn.click();

    }

    await expect(page.getByText(/thực đơn tuần|tuần bắt đầu/i).first()).toBeVisible({ timeout: 10_000 });

  });

});


