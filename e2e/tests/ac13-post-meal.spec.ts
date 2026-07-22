import { test, expect } from '@playwright/test';

import { uiLogin, USERS } from '../fixtures/auth';

import { createManualLog } from '../fixtures/api';


test.describe('AC-13 Post-meal rating', () => {

  test('scheduled prompt opens rating sheet', async ({ page, request }) => {

    const logRes = await createManualLog(request, 450);

    const logId = logRes?.data?.id;

    test.skip(!logId, 'Could not create log for rating test');


    await uiLogin(page, USERS.customer.email, USERS.customer.password);

    await page.goto('/diet');

    await page.evaluate((id) => {

      localStorage.setItem('nutrican_post_meal_prompt', JSON.stringify({ logId: id, at: Date.now() - 1000 }));

    }, logId);

    await page.reload();

    await expect(page.getByText(/đánh giá sau bữa|năng lượng|no sau ăn/i).first()).toBeVisible({ timeout: 12_000 });

  });


  test('diet tracker loads rating hook area', async ({ page }) => {

    await uiLogin(page, USERS.customer.email, USERS.customer.password);

    await page.goto('/diet');

    await expect(page.getByText(/nhật ký dinh dưỡng/i)).toBeVisible({ timeout: 10_000 });

  });

});


