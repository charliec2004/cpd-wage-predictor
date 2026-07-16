import { describe, expect, it } from 'vitest';
import { formatDateRange, formatLongDate, formatShortDate } from './dates';

describe('display date formatting', () => {
  it('zero-pads compact dates so labels have a stable width', () => {
    expect(formatShortDate('2026-06-01')).toBe('Jun 01');
    expect(formatShortDate('2026-06-10')).toBe('Jun 10');
  });

  it('formats ranges consistently across month boundaries', () => {
    expect(formatDateRange('2026-07-27', '2026-08-02')).toBe('Jul 27 – Aug 02');
  });

  it('uses the same fixed-width style for dated labels', () => {
    expect(formatLongDate('2026-07-06')).toBe('Jul 06, 2026');
  });
});
