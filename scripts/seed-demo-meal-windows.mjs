/**
 * Refresh *today-only* plan/log samples for demo veteran accounts.
 * Full 14-day history is seeded by BE DemoVeteranDataInitializer on first start
 * (SystemSetting DEMO_VETERAN_FIXTURES_V2=done). Restart BE after pull to get history.
 *
 *   demo.solo@nutrican.com     / Demo123!   — không PT
 *   demo.coached@nutrican.com  / Demo123!   — có PT
 *   pt.certified@gmail.com     / 123456
 *
 *   node scripts/seed-demo-meal-windows.mjs
 *   DEMO_VETERAN_FORCE=1 node scripts/seed-demo-meal-windows.mjs  # also clears flag via note (need SQL)
 */
const API = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';

const PASSWORD = 'Demo123!';
const SOLO = { email: 'demo.solo@nutrican.com', fullName: 'Demo Solo (Khong PT)', phone: '0911000001' };
const COACHED = { email: 'demo.coached@nutrican.com', fullName: 'Demo Coached (Co PT)', phone: '0911000002' };
const PT = { email: 'pt.certified@gmail.com', password: '123456' };

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function req(method, path, { token, body, query } = {}) {
  const url = new URL(API + path);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, json, text };
}

function log(step, ok, detail = '') {
  console.log(`${ok ? 'OK' : '..'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function login(email, password) {
  const res = await req('POST', '/auth/login', { body: { email, password } });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${res.text}`);
  return res.json.data.accessToken;
}

async function ensureLogin(user) {
  const tryLogin = await req('POST', '/auth/login', { body: { email: user.email, password: PASSWORD } });
  if (tryLogin.ok) return tryLogin.json.data.accessToken;
  await req('POST', '/auth/register', {
    body: { email: user.email, password: PASSWORD, fullName: user.fullName, phoneNumber: user.phone },
  });
  return login(user.email, PASSWORD);
}

async function searchFoodId(token, q = 'cơm') {
  const res = await req('GET', '/foods/search', { token, query: { q, size: '5' } });
  const items = res.json?.data?.content || res.json?.data || [];
  const first = Array.isArray(items) ? items[0] : null;
  if (!first?.id) throw new Error('no food — start BE with food catalog seed');
  return first.id;
}

async function addSelf(token, foodId, period, mealType, qty, planDate) {
  const res = await req('POST', '/diet/self-plan', {
    token,
    body: { planDate, mealType, mealPeriod: period, foodItemId: foodId, quantityG: qty },
  });
  log(`self-plan ${period} @ ${planDate}`, res.ok || res.status === 409, `${res.status}`);
}

async function main() {
  console.log(`
API: ${API}
NOTE: 14-day history comes from BE DemoVeteranDataInitializer (restart BE once).
This script only refreshes a few *today/tomorrow* self-plan rows if missing.
`);

  const soloToken = await ensureLogin(SOLO);
  const food = await searchFoodId(soloToken);
  await addSelf(soloToken, food, 'LATE', 'SNACK', 120, todayIso());
  await addSelf(soloToken, food, 'MORNING', 'BREAKFAST', 180, tomorrowIso());

  const coachedToken = await ensureLogin(COACHED);
  const food2 = await searchFoodId(coachedToken, 'phở');
  await addSelf(coachedToken, food2, 'AFTERNOON', 'SNACK', 140, todayIso());
  await addSelf(coachedToken, food2, 'EVENING', 'DINNER', 280, todayIso());

  // Ensure hire still active (idempotent)
  const ptToken = await login(PT.email, PT.password);
  const me = await req('GET', '/profile/me', { token: coachedToken });
  const clientId = me.json?.data?.id;
  const ptMe = await req('GET', '/profile/me', { token: ptToken });
  const ptId = ptMe.json?.data?.id;
  if (clientId && ptId) {
    const hire = await req('POST', `/marketplace/pts/${ptId}/hire`, { token: coachedToken });
    log('hire ensure', hire.ok || hire.status === 400, `${hire.status}`);
    const accept = await req('PUT', `/workspace/clients/${clientId}/hire-request`, {
      token: ptToken,
      query: { action: 'ACCEPT' },
    });
    log('accept ensure', accept.ok || accept.status === 400, `${accept.status}`);
  }

  console.log(`
========================================
 DEMO VETERAN ACCOUNTS
========================================
 Login: http://localhost:5173/login

 Không PT:  demo.solo@nutrican.com / Demo123!
   → Diet Tracker: lùi lịch ~2 tuần (nhật ký + mealPeriod)
   → Plan hôm nay / ngày mai; Macro Targets + cân nặng

 Có PT:     demo.coached@nutrican.com / Demo123!
   → Plan PT 5 buổi; self draft → Gửi duyệt
   → Lịch sử APPROVED/REJECTED (fixture)

 PT:        pt.certified@gmail.com / 123456
   → Client "Demo Coached"

 Re-seed full 14d (dev DB):
   DELETE FROM system_settings WHERE setting_key = 'DEMO_VETERAN_FIXTURES_V1';
   rồi restart BE.
========================================
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
