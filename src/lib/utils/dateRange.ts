/**
 * Centralized EAT (Nairobi, UTC+3, no DST) date/time-range helpers.
 *
 * "Select 12 Aug" must mean the same real-world window everywhere in this app. Before this file
 * existed, each page (Tickets, Dashboard, Report generator) built its own date-range strings by
 * hand, and the Tickets page specifically used `new Date(dateOnlyString)` (parsed as UTC midnight
 * per spec) plus `.setHours()` (which mutates using the BROWSER's local timezone, not Nairobi's) -
 * an asymmetric from/to bug confirmed during the 2026-08-12 audit. These helpers never depend on
 * the browser's local timezone at all: a date-only input is always treated as an EAT calendar day,
 * computed via `Date.UTC(...)` minus a fixed 3-hour offset (Kenya has one fixed UTC+3 offset, no
 * daylight-saving changes, so this static shift is correct).
 */

const EAT_OFFSET_HOURS = 3;

/**
 * Converts a `YYYY-MM-DD` date string (+ optional `HH:mm` time) into a true UTC ISO instant,
 * treating the input as Nairobi (EAT) local time - never the browser's own local timezone.
 */
export function eatDateTimeToUtcIso(dateStr: string, timeStr?: string, endOfDayIfNoTime = false): string {
  const [year, month, day] = dateStr.split('-').map(Number);

  let hour = 0;
  let minute = 0;
  let second = 0;
  let ms = 0;

  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    hour = h;
    minute = m;
  } else if (endOfDayIfNoTime) {
    hour = 23;
    minute = 59;
    second = 59;
    ms = 999;
  }

  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second, ms) - EAT_OFFSET_HOURS * 3_600_000;
  return new Date(utcMillis).toISOString();
}

/**
 * Builds `{ fromDate, toDate }` UTC ISO instants for a date-range filter - EAT-aware and
 * symmetric (both bounds get the same "no time given" treatment, unlike the previous per-page
 * logic where `toDate` always got an implicit end-of-day but `fromDate` did not).
 */
export function buildEatDateRange(
  dateFrom: string,
  dateTo: string,
  timeFrom?: string,
  timeTo?: string
): { fromDate?: string; toDate?: string } {
  return {
    fromDate: dateFrom ? eatDateTimeToUtcIso(dateFrom, timeFrom, false) : undefined,
    toDate: dateTo ? eatDateTimeToUtcIso(dateTo, timeTo, !timeTo) : undefined,
  };
}

/**
 * "Right now" shifted into EAT calendar space: `Date.now()` (a true UTC instant) plus the fixed
 * +3h offset, then read back with the UTC getters. This deliberately does NOT use the browser's
 * own local timezone (`new Date()` + local getters) - a viewer traveling outside Kenya, or CI
 * running in UTC, must still get Nairobi's calendar day, matching how the backend always resolves
 * "today" (see truload-backend's `WeighingQueryHelpers.ResolveEatDayRange`).
 */
function eatShiftedNow(): Date {
  return new Date(Date.now() + EAT_OFFSET_HOURS * 3_600_000);
}

function toDateOnlyFromEatShifted(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date in the EAT calendar, as `YYYY-MM-DD` - independent of the viewer's own timezone. */
export function getEatTodayDateOnly(): string {
  return toDateOnlyFromEatShifted(eatShiftedNow());
}

export type EatQuickRangePreset = 'today' | 'thisWeek' | 'thisMonth' | 'thisQuarter';

/**
 * Quick date-range presets (Today / This Week / This Month / This Quarter) anchored to the EAT
 * calendar, for the Dashboard/Reports/Custom Reports quick-filter row. Weeks start Monday.
 */
export function getEatQuickRange(preset: EatQuickRangePreset): { from: string; to: string } {
  const now = eatShiftedNow();
  const to = toDateOnlyFromEatShifted(now);

  let from: Date;
  switch (preset) {
    case 'today':
      from = now;
      break;
    case 'thisWeek': {
      const dayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat (of the EAT-shifted instant)
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      from = new Date(now);
      from.setUTCDate(from.getUTCDate() + diffToMonday);
      break;
    }
    case 'thisMonth':
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      break;
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      from = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
      break;
    }
  }
  return { from: toDateOnlyFromEatShifted(from), to };
}
