export type BudgetHealth = 'healthy' | 'watch' | 'critical' | 'unknown';

export function budgetHealth(remainingBudgetCents: number, budgetCents: number): BudgetHealth {
  if (budgetCents <= 0) return 'unknown';

  const remainingRatio = remainingBudgetCents / budgetCents;
  if (remainingRatio <= 0.1) return 'critical';
  if (remainingRatio <= 0.25) return 'watch';
  return 'healthy';
}
