import { test, expect } from '@playwright/test';

import { uiLogin, USERS } from '../fixtures/auth';

import { createManualLog } from '../fixtures/api';



test.describe('AC-11 Recipe builder', () => {

  test('customer opens recipe tab and sees save form', async ({ page }) => {

    await uiLogin(page, USERS.customer.email, USERS.customer.password);

    await page.goto('/diet');

    await page.getByRole('button', { name: /công thức/i }).click();

    await expect(page.getByText(/lưu công thức|tên công thức/i).first()).toBeVisible({ timeout: 10_000 });

  });



  test('save recipe disabled without ingredients shows validation', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/diet');
    await page.getByRole('button', { name: /công thức/i }).click();
    const saveBtn = page.getByRole('button', { name: /lưu công thức/i });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await expect(saveBtn).toBeDisabled();
  });

});


