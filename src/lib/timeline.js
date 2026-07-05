const DEFAULT_DATE = { year: 1, month: 1, day: 1 };
const LOCAL_VIEW_DATE_PREFIX = "sleepless_timeline_view_date_v1";

export function normalizeDate(date = {}, calendar = {}) {
  const monthsPerYear = Math.max(1, Number(calendar.months_per_year) || 12);
  const daysPerMonth = Math.max(1, Number(calendar.days_per_month) || 30);
  const parsedYear = Number(date.year);
  return {
    year: Number.isFinite(parsedYear) ? Math.floor(parsedYear) : DEFAULT_DATE.year,
    month: Math.min(monthsPerYear, Math.max(1, Math.floor(Number(date.month) || DEFAULT_DATE.month))),
    day: Math.min(daysPerMonth, Math.max(1, Math.floor(Number(date.day) || DEFAULT_DATE.day))),
  };
}

export function dateKey(date = {}, calendar = {}) {
  const normalized = normalizeDate(date, calendar);
  return `${normalized.year}-${normalized.month}-${normalized.day}`;
}

export function dateIndex(date = {}, calendar = {}) {
  const normalized = normalizeDate(date, calendar);
  const monthsPerYear = Math.max(1, Number(calendar.months_per_year) || 12);
  const daysPerMonth = Math.max(1, Number(calendar.days_per_month) || 30);
  return normalized.year * monthsPerYear * daysPerMonth + (normalized.month - 1) * daysPerMonth + (normalized.day - 1);
}

export function campaignDate(campaign, calendar) {
  return normalizeDate(campaign?.timeline_current_date || DEFAULT_DATE, calendar);
}

function localViewDateKey(campaignId, userEmail = "") {
  return `${LOCAL_VIEW_DATE_PREFIX}:${campaignId || "default"}:${userEmail || "user"}`;
}

export function readLocalTimelineViewDate(campaign, calendar = {}, user = null) {
  const fallback = campaignDate(campaign, calendar);
  if (typeof localStorage === "undefined" || !campaign?.id) return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(localViewDateKey(campaign.id, user?.email)) || "null");
    return parsed ? normalizeDate(parsed, calendar) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalTimelineViewDate(campaign, date, calendar = {}, user = null) {
  const normalized = normalizeDate(date, calendar);
  if (typeof localStorage !== "undefined" && campaign?.id) {
    localStorage.setItem(localViewDateKey(campaign.id, user?.email), JSON.stringify(normalized));
  }
  return normalized;
}

export function timelineViewDate(campaign, calendar = {}, user = null, canManage = false, allowStoredView = false) {
  const campaignCurrentDate = campaignDate(campaign, calendar);
  const storedDate = readLocalTimelineViewDate(campaign, calendar, user);
  if (canManage || allowStoredView) return storedDate;

  const storedKey = dateKey(storedDate, calendar);
  const visibleKeys = new Set([
    dateKey(campaignCurrentDate, calendar),
    ...(Array.isArray(campaign?.timeline_player_date_keys) ? campaign.timeline_player_date_keys : []),
  ]);
  return visibleKeys.has(storedKey) ? storedDate : campaignCurrentDate;
}

export function shiftDate(date, delta = {}, calendar = {}) {
  const monthsPerYear = Math.max(1, Number(calendar.months_per_year) || 12);
  const daysPerMonth = Math.max(1, Number(calendar.days_per_month) || 30);
  const start = normalizeDate(date, calendar);
  const totalDays =
    start.year * monthsPerYear * daysPerMonth +
    (start.month - 1) * daysPerMonth +
    (start.day - 1) +
    (Number(delta.years) || 0) * monthsPerYear * daysPerMonth +
    (Number(delta.months) || 0) * daysPerMonth +
    (Number(delta.days) || 0);
  const yearLength = monthsPerYear * daysPerMonth;
  const year = Math.floor(totalDays / yearLength);
  const dayOfYear = ((totalDays % yearLength) + yearLength) % yearLength;
  return {
    year,
    month: Math.floor(dayOfYear / daysPerMonth) + 1,
    day: (dayOfYear % daysPerMonth) + 1,
  };
}

export function formatTimelineDate(date, calendar = {}) {
  const normalized = normalizeDate(date, calendar);
  const monthName = calendar.month_names?.[normalized.month - 1] || `Month ${normalized.month}`;
  const dayName = calendar.day_names?.[normalized.day - 1] || `Day ${normalized.day}`;
  const beforeLabel = calendar.before_era_label || "BCE";
  const afterLabel = calendar.after_era_label || calendar.era_label || "ACE";
  const eraLabel = normalized.year <= 0 ? beforeLabel : afterLabel;
  const displayYear = normalized.year <= 0 ? Math.abs(normalized.year) : normalized.year;
  return `${displayYear} ${eraLabel}, ${monthName}, ${dayName}`;
}

export function hasTimelineDate(record) {
  return Boolean(record?.timeline_date_key || record?.timeline_date);
}

export function isRecordOnDate(record, date, calendar = {}) {
  if (!hasTimelineDate(record)) return false;
  return dateKey(recordTimelineDate(record), calendar) === dateKey(date, calendar);
}

export function timelineSeriesId(record) {
  return record?.timeline_series_id || record?.id;
}

function recordTimelineDate(record) {
  if (record?.timeline_date) return record.timeline_date;
  const match = String(record?.timeline_date_key || "").match(/^(-?\d+)-(\d+)-(\d+)$/);
  if (!match) return {};
  const [, year, month, day] = match;
  return { year, month, day };
}

function recordUpdatedTime(record) {
  return Date.parse(record?.updated_date || record?.created_date || "") || 0;
}

export function latestRecordsForDate(records = [], date, calendar = {}) {
  const activeIndex = dateIndex(date, calendar);
  const latestBySeries = new Map();

  records.forEach((record) => {
    if (!hasTimelineDate(record)) return;
    const recordIndex = dateIndex(recordTimelineDate(record), calendar);
    if (recordIndex > activeIndex) return;

    const seriesId = timelineSeriesId(record);
    const current = latestBySeries.get(seriesId);
    if (!current) {
      latestBySeries.set(seriesId, { record, recordIndex });
      return;
    }

    const isNewerDate = recordIndex > current.recordIndex;
    const isNewerSameDate = recordIndex === current.recordIndex && recordUpdatedTime(record) > recordUpdatedTime(current.record);
    if (isNewerDate || isNewerSameDate) {
      latestBySeries.set(seriesId, { record, recordIndex });
    }
  });

  return [...latestBySeries.values()].map((item) => item.record);
}

export function stripRecordIdentity(record) {
  const {
    id,
    created_date,
    updated_date,
    created_by,
    timeline_date,
    timeline_date_key,
    timeline_source_id,
    ...rest
  } = record || {};
  return rest;
}

export function makeDatedRecord(record, date, calendar = {}) {
  const normalized = normalizeDate(date, calendar);
  return {
    ...stripRecordIdentity(record),
    timeline_date: normalized,
    timeline_date_key: dateKey(normalized, calendar),
    timeline_series_id: timelineSeriesId(record),
    timeline_source_id: record?.id || "",
  };
}

export function datedCreatePayload(record, date, calendar = {}) {
  const normalized = normalizeDate(date, calendar);
  return {
    ...record,
    timeline_date: normalized,
    timeline_date_key: dateKey(normalized, calendar),
  };
}
