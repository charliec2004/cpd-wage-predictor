export const HOUR_INPUT_STEP = 0.25;

export function formatHoursValue(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(2))) : '0';
}

export function parseHoursInputValue(value: string): number | null {
  const normalized = value.trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampHours(value: number, min?: number, max?: number): number {
  const lowerBounded = typeof min === 'number' ? Math.max(value, min) : value;
  return typeof max === 'number' ? Math.min(lowerBounded, max) : lowerBounded;
}
