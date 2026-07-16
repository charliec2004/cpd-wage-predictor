import { describe, expect, it } from 'vitest';
import { formatTime12Hour } from './format';

describe('formatTime12Hour', () => {
  it.each([
    [0, '12:00 AM'],
    [30, '12:30 AM'],
    [540, '9:00 AM'],
    [719, '11:59 AM'],
    [720, '12:00 PM'],
    [900, '3:00 PM'],
    [1_439, '11:59 PM'],
    [1_440, '12:00 AM'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatTime12Hour(minutes)).toBe(expected);
  });
});
