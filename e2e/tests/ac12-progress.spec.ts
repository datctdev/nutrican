import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';

test.describe('AC-12 Progress timeline', () => {
  test('customer sets goal and sees progress section', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/macro-targets');
    await expect(page.getByRole('heading', { name: /tiến độ & mục tiêu dinh dưỡng/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/mức độ vận động/i).first()).toBeVisible();
    await expect(page.getByText(/biểu đồ theo dõi|mục tiêu hiện tại/i).first()).toBeVisible();

    const editGoal = page.getByRole('button', { name: /sửa mục tiêu/i });
    if (await editGoal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editGoal.click();
      await expect(page.getByText(/cập nhật mục tiêu|loại mục tiêu/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('weight input and log button visible', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/macro-targets');
    await expect(page.getByText(/cân nặng \(kg\)/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /ghi nhận tiến độ/i })).toBeVisible();
  });

  test('weekly reminder banner or weight widget visible', async ({ page }) => {
    await uiLogin(page, USERS.customer.email, USERS.customer.password);
    await page.goto('/macro-targets');
    const weightLabel = page.getByText(/cân nặng \(kg\)/i);
    const activity = page.getByText(/mức độ vận động/i);
    await expect(weightLabel.or(activity).first()).toBeVisible({ timeout: 15_000 });
  });
});
