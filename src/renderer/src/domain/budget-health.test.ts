import { describe, expect, it } from 'vitest';
import { budgetHealth } from './budget-health';

describe('budgetHealth', () => {
  it('uses remaining-budget thresholds for healthy, watch, and critical states', () => {
    expect(budgetHealth(25_001, 100_000)).toBe('healthy');
    expect(budgetHealth(25_000, 100_000)).toBe('watch');
    expect(budgetHealth(10_001, 100_000)).toBe('watch');
    expect(budgetHealth(10_000, 100_000)).toBe('critical');
    expect(budgetHealth(-1, 100_000)).toBe('critical');
  });

  it('does not imply health before a budget exists', () => {
    expect(budgetHealth(0, 0)).toBe('unknown');
  });
});
