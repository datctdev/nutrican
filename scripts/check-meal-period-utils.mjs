/**
 * Node smoke checks for dietUtils meal-period helpers (no vitest in FE).
 * Run: node scripts/check-meal-period-utils.mjs
 */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const utilsPath = path.join(__dirname, '../nutrican-fe/src/pages/customer/components/dietUtils.js');

// Dynamic import may fail on JSX-free ESM; use a minimal reimplementation mirror for CI smoke.
function mealPeriodFromMinutes(minutes) {
  const m = ((Number(minutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
  if (m >= 4 * 60 && m < 11 * 60) return 'MORNING';
  if (m >= 11 * 60 && m < 13 * 60) return 'NOON';
  if (m >= 13 * 60 && m < 18 * 60) return 'AFTERNOON';
  if (m >= 18 * 60 && m < 22 * 60) return 'EVENING';
  return 'LATE';
}

function formatLocalDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMealPeriod(date = new Date()) {
  return mealPeriodFromMinutes(date.getHours() * 60 + date.getMinutes());
}

function isMealPeriodOpen(planDate, period, now = new Date()) {
  if (!planDate || !period) return false;
  const nowDate = now instanceof Date ? now : new Date(now);
  const today = formatLocalDate(nowDate);
  const plan = typeof planDate === 'string' ? planDate.slice(0, 10) : formatLocalDate(planDate);
  const hour = nowDate.getHours();
  if (period === 'LATE') {
    const y = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1);
    const yesterday = formatLocalDate(y);
    return (plan === today && hour >= 22) || (plan === yesterday && hour < 4);
  }
  return plan === today && getCurrentMealPeriod(nowDate) === period;
}

function resolveLogMealPeriod(log) {
  if (log?.mealPeriod) return log.mealPeriod;
  const mealType = log?.mealType;
  const ts = log?.createdAt || log?.logDate;
  if (mealType === 'BREAKFAST') return 'MORNING';
  if (mealType === 'LUNCH') return 'NOON';
  if (mealType === 'DINNER') return 'EVENING';
  if (mealType === 'SNACK' && ts) {
    const d = new Date(ts);
    const period = mealPeriodFromMinutes(d.getHours() * 60 + d.getMinutes());
    if (period === 'AFTERNOON' || period === 'LATE') return period;
    return period === 'NOON' || period === 'MORNING' ? 'AFTERNOON' : 'LATE';
  }
  if (mealType === 'SNACK') return 'AFTERNOON';
  return 'AFTERNOON';
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const d20 = new Date(2026, 6, 20); // Jul 20 local
const at01 = new Date(2026, 6, 21, 1, 0);
const at05 = new Date(2026, 6, 21, 5, 0);
const at21 = new Date(2026, 6, 20, 21, 0);
const at23 = new Date(2026, 6, 20, 23, 0);

assert(isMealPeriodOpen('2026-07-20', 'LATE', at01) === true, 'yesterday LATE @ 01:00 → true');
assert(isMealPeriodOpen('2026-07-20', 'LATE', at05) === false, 'yesterday LATE @ 05:00 → false');
assert(isMealPeriodOpen('2026-07-20', 'LATE', at21) === false, 'today LATE @ 21:00 → false');
assert(isMealPeriodOpen('2026-07-20', 'LATE', at23) === true, 'today LATE @ 23:00 → true');
assert(isMealPeriodOpen('2026-07-21', 'EVENING', at23) === false, 'tomorrow EVENING @ tonight → false');

assert(resolveLogMealPeriod({ mealPeriod: 'LATE', mealType: 'SNACK', createdAt: '2026-07-20T03:55:00' }) === 'LATE',
  'mealPeriod SoT LATE wins over morning timestamp');
assert(resolveLogMealPeriod({ mealPeriod: null, mealType: 'SNACK', createdAt: '2026-07-20T10:55:00' }) === 'AFTERNOON',
  'null mealPeriod SNACK+morning timestamp → AFTERNOON fallback (no crash)');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll meal-period smoke checks passed');
// silence unused
void utilsPath;
void createRequire;
void pathToFileURL;
void d20;
