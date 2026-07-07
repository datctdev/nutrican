import { test, expect } from '@playwright/test';
import { uiLogin, USERS } from '../fixtures/auth';
import { API_BASE, customerRequest } from '../fixtures/api';

test.describe('AC-ONB Customer onboarding', () => {
  test.describe('BE-only', () => {
    test('POST onboarding step 2 returns hasMacroTarget', async ({ request }) => {
      const email = `onb-be-${Date.now()}@test.local`;
      const password = 'Test1234!';
      await request.post(`${API_BASE}/auth/register`, {
        data: { email, password, fullName: 'Onb BE', phoneNumber: '0900000099' },
      });
      const loginRes = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
      expect(loginRes.ok()).toBeTruthy();
      const token = (await loginRes.json()).data.accessToken as string;

      await request.post(`${API_BASE}/profile/onboarding`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { step: 1, heightCm: 170, weightKg: 70, age: 25, gender: 'MALE' },
      });

      const res = await request.post(`${API_BASE}/profile/onboarding`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          step: 2,
          nutritionGoal: 'WEIGHT_LOSS',
          dietPreference: 'NORMAL',
          weightKg: 65,
        },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data?.hasMacroTarget ?? json.data?.data?.hasMacroTarget).toBeTruthy();
    });

    test('seeded customer has completed onboarding (ONB-06 legacy)', async ({ request }) => {
      const token = await customerRequest(request);
      const res = await request.get(`${API_BASE}/profile/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.data?.completed ?? json.data?.onboardingCompleted).toBeTruthy();
    });

    test('new register has incomplete onboarding status', async ({ request }) => {
      const email = `onb-status-${Date.now()}@test.local`;
      const password = 'Test1234!';
      await request.post(`${API_BASE}/auth/register`, {
        data: { email, password, fullName: 'Status Test', phoneNumber: '0900000098' },
      });
      const loginRes = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
      const token = (await loginRes.json()).data.accessToken as string;
      const statusRes = await request.get(`${API_BASE}/profile/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(statusRes.ok()).toBeTruthy();
      const status = await statusRes.json();
      expect(status.data?.completed ?? status.data?.onboardingCompleted).toBeFalsy();
    });
  });

  test.describe('FE-only', () => {
    test('new user lands on onboarding wizard', async ({ page, request }) => {
      const email = `onb-${Date.now()}@test.local`;
      const password = 'Test1234!';
      await request.post(`${API_BASE}/auth/register`, {
        data: { email, password, fullName: 'Onb Test', phoneNumber: '0900000001' },
      });
      await uiLogin(page, email, password, { viaForm: true });
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
      await expect(page.getByText(/thiết lập hồ sơ/i)).toBeVisible();
    });
  });

  test.describe('Hybrid', () => {
    test('skip onboarding shows banner and resume link on diet', async ({ page, request }) => {
      const email = `onb-skip-${Date.now()}@test.local`;
      const password = 'Test1234!';
      await request.post(`${API_BASE}/auth/register`, {
        data: { email, password, fullName: 'Skip Test', phoneNumber: '0900000002' },
      });
      await uiLogin(page, email, password, { viaForm: true });
      await page.getByText(/bỏ qua/i).click();
      await expect(page).toHaveURL(/\/diet/, { timeout: 15_000 });
      await expect(page.getByText(/hoàn thiện hồ sơ/i)).toBeVisible({ timeout: 10_000 });
      await page.getByRole('link', { name: /hoàn thiện|tiếp tục/i }).click();
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    });
  });
});
