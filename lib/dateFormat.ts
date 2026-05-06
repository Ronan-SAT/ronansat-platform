const APP_DATE_LOCALE = "en-US";
const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

function toValidDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAppDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  fallback = "Unknown",
) {
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(date);
}

export function formatAppDateTime(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  fallback = "Unknown",
) {
  return formatAppDate(value, options, fallback);
}

export function formatAppDateKey(value: Date | string | number | null | undefined = new Date()) {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function dateFromAppDateKey(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? new Date(`${dateKey}T00:00:00.000+07:00`) : null;
}
