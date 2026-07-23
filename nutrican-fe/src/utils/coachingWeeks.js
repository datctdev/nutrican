/**
 * Coaching week helpers (start + 7*i). Hire/offline calendars must keep Monday util.
 */
import { nowInVn } from '../pages/customer/components/dietUtils';

function parseLocalDate(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 3) {
    return new Date(value[0], value[1] - 1, value[2]);
  }
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar Monday (hire / offline). */
export function getCalendarMonday(d = nowInVn()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

/** Current coaching week start Date, or null. */
export function getCoachingWeekStartDate(coachingStartedAt, today = nowInVn()) {
  const start = parseLocalDate(coachingStartedAt);
  if (!start) return null;
  const todayDate = startOfDay(today);
  const startDate = startOfDay(start);
  if (startDate.getTime() > todayDate.getTime()) return null;
  const diffDays = Math.round((todayDate.getTime() - startDate.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const weekStart = new Date(startDate);
  weekStart.setDate(startDate.getDate() + weekIndex * 7);
  return weekStart;
}

/** Prefer coaching week when startedAt present; else Monday. */
export function preferMealPlanWeekStart(coachingStartedAt, today = nowInVn()) {
  return getCoachingWeekStartDate(coachingStartedAt, today) || getCalendarMonday(today);
}

export function preferMealPlanWeekStartIso(coachingStartedAt, today = nowInVn()) {
  return toIsoDate(preferMealPlanWeekStart(coachingStartedAt, today));
}

export function shiftCoachingOrMondayWeek(weekStartDate, deltaWeeks, coachingStartedAt) {
  const base = weekStartDate instanceof Date ? weekStartDate : parseLocalDate(weekStartDate);
  if (!base) return getCalendarMonday();
  if (coachingStartedAt) {
    const next = new Date(base);
    next.setDate(base.getDate() + deltaWeeks * 7);
    return next;
  }
  const monday = getCalendarMonday(base);
  monday.setDate(monday.getDate() + deltaWeeks * 7);
  return monday;
}
