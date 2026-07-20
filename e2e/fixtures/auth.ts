import { APIRequestContext, Page, expect } from '@playwright/test';

export const USERS = {
  customer: { email: 'customer1@gmail.com', password: '123456' },
  customer2: { email: 'customer2@gmail.com', password: '123456' },
  demoSolo: { email: 'demo.solo@nutrican.com', password: 'Demo123!' },
  demoCoached: { email: 'demo.coached@nutrican.com', password: 'Demo123!' },
  pt: { email: 'pt.certified@gmail.com', password: '123456' },
  ptFreelance: { email: 'pt.freelance@gmail.com', password: '123456' },
  admin: { email: 'admin@nutrican.com', password: 'Admin123!' },
} as const;

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';

type AuthSession = { token: string; user: Record<string, unknown> };
const sessionCache = new Map<string, AuthSession>();

async function loginSession(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthSession> {
  const cacheKey = `${email}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached) return cached;

  let lastStatus = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
    if (res.ok()) {
      const json = await res.json();
      const session = {
        token: json.data.accessToken as string,
        user: json.data.user as Record<string, unknown>,
      };
      sessionCache.set(cacheKey, session);
      return session;
    }
    lastStatus = res.status();
    await new Promise((r) => setTimeout(r, 800));
  }
  expect(lastStatus, `login failed for ${email}`).toBe(200);
  return { token: '', user: { email } };
}

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const session = await loginSession(request, email, password);
  return session.token;
}

async function setAuthCookie(page: Page, session: AuthSession) {
  const state = {
    state: {
      user: session.user,
      accessToken: session.token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
    version: 0,
  };
  await page.context().addCookies([
    {
      name: 'nutrican-auth',
      value: encodeURIComponent(JSON.stringify(state)),
      url: process.env.E2E_BASE_URL || 'http://localhost:5173',
    },
  ]);
}

export async function uiLogin(
  page: Page,
  email: string,
  password: string,
  options?: { viaForm?: boolean; landingPath?: string },
) {
  const landing = options?.landingPath ?? '/diet';

  if (!options?.viaForm) {
    const session = await loginSession(page.request, email, password);
    await setAuthCookie(page, session);
    await page.goto(landing);
    return;
  }

  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^đăng nhập/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });
}

export async function seedAuthCookie(page: Page, email: string, password: string, request: APIRequestContext) {
  const session = await loginSession(request, email, password);
  await setAuthCookie(page, session);
}
