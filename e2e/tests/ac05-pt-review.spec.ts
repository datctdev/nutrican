import { test, expect } from '@playwright/test';

import { uiLogin, USERS } from '../fixtures/auth';

import { createManualLog } from '../fixtures/api';


test.describe('AC-5 PT review (dual-state)', () => {

  test('manual log with sendToPt appears in PT workspace', async ({ page, request }) => {

    await createManualLog(request, 520, true);

    await uiLogin(page, USERS.pt.email, USERS.pt.password);

    await page.goto('/pt/reviews');

    await expect(page.getByText(/chờ duyệt|pending|bữa ăn/i).first()).toBeVisible({ timeout: 15_000 });

  });


  test('PT can open client list', async ({ page }) => {

    await uiLogin(page, USERS.pt.email, USERS.pt.password);

    await page.goto('/pt/clients');

    await expect(page.getByText(/học viên|client/i).first()).toBeVisible();

  });

});


