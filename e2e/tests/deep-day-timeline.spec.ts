import { test, expect } from '@playwright/test';
import { seedAuthCookie, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest, ptRequest, localDateOffsetIso } from '../fixtures/api';
import { customerUserId } from '../fixtures/selfPlan';

test.describe('Day timeline DT-01…DT-03 API', () => {
  test('[API] customer day-timeline returns periods with labelVi', async ({ request }) => {
    const token = await customerRequest(request);
    const today = localDateOffsetIso(0);
    const res = await request.get(`${API_BASE}/diet/day-timeline`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: today },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.date).toBe(today);
    expect(Array.isArray(body.data.periods)).toBeTruthy();
    expect(body.data.periods.length).toBe(5);
    const morning = body.data.periods.find((p: { mealPeriod: string }) => p.mealPeriod === 'MORNING');
    expect(morning?.labelVi).toBe('Buổi sáng');
  });

  test('[API] PT client day-timeline requires active mapping', async ({ request }) => {
    const ptToken = await ptRequest(request);
    const clientId = await customerUserId(request);
    const today = localDateOffsetIso(0);
    const res = await request.get(`${API_BASE}/workspace/clients/${clientId}/day-timeline`, {
      headers: { Authorization: `Bearer ${ptToken}` },
      params: { date: today },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.periods).toBeDefined();
  });
});

test.describe('Day timeline UI — 2-column layout', () => {
  test('[UI coached] Plan card shows Plan and Actual lanes', async ({ page, request }) => {
    await seedAuthCookie(page, USERS.demoCoached.email, USERS.demoCoached.password, request);
    await page.goto('/diet');
    await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('Kế hoạch').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Thực tế đã ghi').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /đề xuất món/i })).toBeVisible();
  });

  test('[UI solo] Plan card shows Thêm món without PT submit flow', async ({ page, request }) => {
    await seedAuthCookie(page, USERS.demoSolo.email, USERS.demoSolo.password, request);
    await page.goto('/diet');
    await expect(page.getByText(/plan ăn ngày/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /thêm món/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /gửi pt duyệt/i })).toHaveCount(0);
    await expect(page.getByLabel('Kế hoạch').first()).toBeVisible();
    await expect(page.getByLabel('Thực tế đã ghi').first()).toBeVisible();
  });
});
