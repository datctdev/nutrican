const DAY_LABELS = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

export function sessionMinutesFromRateUnit(rateUnit) {
  if (rateUnit === 'SESSION_90') return 90;
  if (rateUnit === 'SESSION_60') return 60;
  return 60;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toLocalDateTimeIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function parseTimeParts(timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

function parseIsoDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function slotsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function isSlotOccupied(slotStart, slotEnd, occupiedSlots = []) {
  return occupiedSlots.some((occupied) => {
    const occStart = parseIsoDate(occupied.startTime);
    const occEnd = parseIsoDate(occupied.endTime);
    if (!occStart || !occEnd) return false;
    return slotsOverlap(slotStart, slotEnd, occStart, occEnd);
  });
}


export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const opts = { day: '2-digit', month: '2-digit' };
  return `${weekStart.toLocaleDateString('vi-VN', opts)} – ${weekEnd.toLocaleDateString('vi-VN', opts)}`;
}

export function computePackageTotal(sessionCount, perSessionRate) {
  const count = Number(sessionCount) || 0;
  const rate = Number(perSessionRate) || 0;
  return count * rate;
}

export function generateOfflineSlots(availability, rateUnit, daysAhead = 14, occupiedSlots = []) {
  if (!availability?.length) return [];

  const duration = sessionMinutesFromRateUnit(rateUnit);
  const slots = [];
  const now = new Date();

  for (let d = 0; d < daysAhead; d += 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + d);

    const jsDay = day.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const windows = availability.filter((w) => w.dayOfWeek === dayOfWeek);

    windows.forEach((window) => {
      appendWindowSlots(day, window, duration, now, slots, occupiedSlots);
    });
  }

  return slots.sort((a, b) => a.start - b.start);
}

export function generateWeeklySlots(availability, rateUnit, weekStart, occupiedSlots = []) {
  if (!availability?.length) return [];

  const duration = sessionMinutesFromRateUnit(rateUnit);
  const slots = [];
  const now = new Date();
  const start = getWeekStart(weekStart);

  for (let d = 0; d < 7; d += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);

    const jsDay = day.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const windows = availability.filter((w) => w.dayOfWeek === dayOfWeek);

    windows.forEach((window) => {
      appendWindowSlots(day, window, duration, now, slots, occupiedSlots);
    });
  }

  return slots.sort((a, b) => a.start - b.start);
}

function appendWindowSlots(day, window, duration, now, slots, occupiedSlots) {
  const slotStep = window.slotMinutes || duration;
  const startParts = parseTimeParts(window.startTime);
  const endParts = parseTimeParts(window.endTime);

  const cursor = new Date(day);
  cursor.setHours(startParts.h, startParts.m, 0, 0);

  const windowEnd = new Date(day);
  windowEnd.setHours(endParts.h, endParts.m, 0, 0);

  while (cursor.getTime() + duration * 60000 <= windowEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + duration * 60000);
    if (cursor > now && !isSlotOccupied(cursor, slotEnd, occupiedSlots)) {
      slots.push({
        start: new Date(cursor),
        end: slotEnd,
        iso: toLocalDateTimeIso(cursor),
        dayOfWeek: day.getDay() === 0 ? 7 : day.getDay(),
        label: cursor.toLocaleString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }
    cursor.setMinutes(cursor.getMinutes() + slotStep);
  }
}

export function formatSessionRange(startIso, endIso) {
  if (!startIso) return '';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const startText = start.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!end) return startText;
  const endText = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${startText} – ${endText}`;
}

export function createDefaultWeekSchedule() {
  return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    enabled: dayOfWeek <= 5,
    startTime: '08:00',
    endTime: '17:00',
  }));
}

export function weekScheduleToAvailabilityWindows(schedule, slotMinutes = 60) {
  return schedule
    .filter((row) => row.enabled)
    .map((row) => ({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
      endTime: row.endTime.length === 5 ? `${row.endTime}:00` : row.endTime,
      slotMinutes,
    }));
}

export { DAY_LABELS };
