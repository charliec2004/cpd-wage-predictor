const DAY_MS = 86_400_000;
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return formatIsoDate(new Date(parseIsoDate(date).getTime() + days * DAY_MS));
}

export function datesBetween(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate).getTime();
  const end = parseIsoDate(endDate).getTime();
  const dates: string[] = [];
  for (let current = start; current <= end; current += DAY_MS) dates.push(formatIsoDate(new Date(current)));
  return dates;
}

export function weekday(date: string): number {
  return parseIsoDate(date).getUTCDay();
}

export function mondayOfWeek(date: string): string {
  const day = weekday(date);
  return addDays(date, -(day === 0 ? 6 : day - 1));
}

export function isWithin(date: string, startDate: string, endDate?: string): boolean {
  return date >= startDate && (!endDate || date <= endDate);
}

export function todayInLosAngeles(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function clampDate(date: string, startDate: string, endDate: string): string {
  return date < startDate ? startDate : date > endDate ? endDate : date;
}

export function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-');
  const monthLabel = SHORT_MONTHS[Number(month) - 1];
  return year && monthLabel && day ? `${monthLabel} ${day}` : date;
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split('-');
  const monthLabel = SHORT_MONTHS[Number(month) - 1];
  return year && monthLabel && day ? `${monthLabel} ${day}, ${year}` : date;
}
