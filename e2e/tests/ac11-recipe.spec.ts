import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, createManualLog } from '../fixtures/api';
import { searchFoodId } from '../fixtures/selfPlan';

test.describe('AC-11 Recipe builder', () => {
  test('BE: create recipe via API then list contains it', async ({ request }) => {
    const token = await customerRequest(request);
    const foodId = await searchFoodId(request, token);
    const name = `E2E Recipe ${Date.now()}`;
    const create = await request.post(`${API_BASE}/diet/recipes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name,
        ingredients: [{ foodItemId: foodId, gram: 100 }],
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const list = await request.get(`${API_BASE}/diet/recipes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const recipes = (await list.json()).data || [];
    expect(recipes.some((r: { name: string }) => r.name === name)).toBeTruthy();
  });

  test('customer diet page still usable after logging (recipe surface via API)', async ({ page, request }) => {
    await createManualLog(request, 200, false);
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/diet');
    await expect(page.getByText(/plan ăn ngày|nhật ký/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /nhập thủ công/i }).click();
    await expect(page.getByText(/tìm thực phẩm|nguyên liệu|lọc theo chế độ ăn/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
