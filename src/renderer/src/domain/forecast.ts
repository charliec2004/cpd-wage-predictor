import {
  isWorkStudyEligiblePeriod,
  type AcademicPeriod,
  type FiscalYear,
  type ForecastScenario,
  type HourAdjustment,
  type OfficeClosure,
  type PlannedHire,
  type RecurringShift,
  type Worker,
} from '../../../shared/workspace';
import { addDays, clampDate, datesBetween, isWithin, mondayOfWeek, weekday } from './dates';

export type LedgerState = 'assumed-worked' | 'corrected' | 'planned' | 'scenario';

export interface DailyLedgerRow {
  date: string;
  weekStart: string;
  workerId: string;
  workerName: string;
  state: LedgerState;
  minutes: number;
  grossWagesCents: number;
  outsideJobConsumptionCents: number;
  workStudyCoveredCents: number;
  cpdCostCents: number;
  source: string;
}

export interface WeeklyForecastRow {
  weekStart: string;
  weekEnd: string;
  state: 'assumed-worked' | 'mixed' | 'planned' | 'scenario';
  hours: number;
  grossWagesCents: number;
  outsideJobConsumptionCents: number;
  workStudyCoveredCents: number;
  cpdCostCents: number;
}

export interface ForecastResult {
  asOfDate: string;
  scenarioId: string | null;
  daily: DailyLedgerRow[];
  weekly: WeeklyForecastRow[];
  totals: {
    hours: number;
    grossWagesCents: number;
    outsideJobConsumptionCents: number;
    workStudyCoveredCents: number;
    cpdCostCents: number;
    remainingBudgetCents: number;
  };
  warnings: string[];
}

interface DailyPlan {
  date: string;
  minutes: number;
  source: string;
  corrected: boolean;
}

function periodForDate(year: FiscalYear, date: string): AcademicPeriod | undefined {
  return year.periods.find((period) => isWithin(date, period.startDate, period.endDate));
}

function overlapMinutes(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

type ShiftInterval = Pick<RecurringShift, 'startMinute' | 'endMinute'>;

function mergeShiftIntervals(shifts: ShiftInterval[]): ShiftInterval[] {
  const sorted = shifts.slice().sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const merged: ShiftInterval[] = [];
  for (const shift of sorted) {
    const previous = merged.at(-1);
    if (previous && shift.startMinute <= previous.endMinute) previous.endMinute = Math.max(previous.endMinute, shift.endMinute);
    else merged.push({ startMinute: shift.startMinute, endMinute: shift.endMinute });
  }
  return merged;
}

function clipShiftsToOfficeAvailability(shifts: ShiftInterval[], closures: OfficeClosure[]): ShiftInterval[] {
  let segments = mergeShiftIntervals(shifts);
  for (const closure of closures) {
    if (closure.startMinute === undefined || closure.endMinute === undefined) return [];
    segments = segments.flatMap((segment) => {
      if (overlapMinutes(segment.startMinute, segment.endMinute, closure.startMinute!, closure.endMinute!) === 0) return [segment];
      const remaining: ShiftInterval[] = [];
      if (closure.startMinute! > segment.startMinute) remaining.push({ startMinute: segment.startMinute, endMinute: Math.min(segment.endMinute, closure.startMinute!) });
      if (closure.endMinute! < segment.endMinute) remaining.push({ startMinute: Math.max(segment.startMinute, closure.endMinute!), endMinute: segment.endMinute });
      return remaining;
    });
  }
  return mergeShiftIntervals(segments);
}

export function scheduledPayableMinutes(shifts: ShiftInterval[], closures: OfficeClosure[] = []): number {
  const segments = clipShiftsToOfficeAvailability(shifts, closures);
  const workedBeforeAutomaticBreak = segments.reduce((sum, segment) => sum + segment.endMinute - segment.startMinute, 0);
  const includesThirtyMinuteGap = segments.some((segment, index) => {
    const next = segments[index + 1];
    return Boolean(next && next.startMinute - segment.endMinute >= 30);
  });
  return Math.max(0, workedBeforeAutomaticBreak - (workedBeforeAutomaticBreak > 300 && !includesThirtyMinuteGap ? 30 : 0));
}

function baselineMinutesForDate(year: FiscalYear, worker: Worker, date: string): { minutes: number; source: string } {
  const period = periodForDate(year, date);
  if (!period) return { minutes: 0, source: 'No academic period' };
  const schedule = worker.schedules.find((candidate) => candidate.periodId === period.id);
  if (!schedule) return { minutes: 0, source: `No ${period.name} schedule` };
  const closures = year.closures.filter((closure) => closure.date === date);
  if (schedule.mode === 'recurring') {
    const dayOverride = schedule.dayOverrides?.find((override) => override.date === date);
    const shifts = dayOverride?.shifts ?? schedule.recurringShifts.filter((shift) => shift.weekday === weekday(date));
    return {
      minutes: scheduledPayableMinutes(shifts, closures),
      source: closures.length > 0
        ? `${period.name} ${dayOverride ? 'day change' : 'schedule'}, clipped by closure`
        : dayOverride
          ? `${period.name} day change`
          : `${period.name} recurring schedule`,
    };
  }
  const shifts = schedule.datedShifts.filter((shift) => shift.date === date);
  return {
    minutes: scheduledPayableMinutes(shifts, closures),
    source: closures.length > 0 ? `${period.name} weekly plan, clipped by closure` : `${period.name} weekly plan`,
  };
}

function distributeWeeklyAdjustment(plans: Map<string, DailyPlan>, adjustment: HourAdjustment, year: FiscalYear): void {
  const weekStart = mondayOfWeek(adjustment.date);
  const dates = datesBetween(weekStart, addDays(weekStart, 6)).filter((date) => isWithin(date, year.startDate, year.endDate));
  const currentTotal = dates.reduce((total, date) => total + (plans.get(date)?.minutes ?? 0), 0);
  let assigned = 0;
  const eligibleDates = currentTotal > 0 ? dates.filter((date) => (plans.get(date)?.minutes ?? 0) > 0) : [dates[0]].filter(Boolean) as string[];
  eligibleDates.forEach((date, index) => {
    const current = plans.get(date)?.minutes ?? 0;
    const minutes =
      index === eligibleDates.length - 1
        ? adjustment.minutes - assigned
        : currentTotal > 0
          ? Math.round((adjustment.minutes * current) / currentTotal)
          : 0;
    assigned += minutes;
    plans.set(date, {
      date,
      minutes,
      source: `Weekly correction: ${adjustment.note || 'manually replaced total'}`,
      corrected: true,
    });
  });
  dates.filter((date) => !eligibleDates.includes(date)).forEach((date) => {
    plans.set(date, { date, minutes: 0, source: 'Weekly correction', corrected: true });
  });
}

function buildWorkerPlans(year: FiscalYear, worker: Worker, activeEnd: string | undefined): Map<string, DailyPlan> {
  const plans = new Map<string, DailyPlan>();
  for (const date of datesBetween(year.startDate, year.endDate)) {
    const resolvedEnd = activeEnd && worker.activeEnd ? (activeEnd < worker.activeEnd ? activeEnd : worker.activeEnd) : activeEnd ?? worker.activeEnd;
    const statusEligible = worker.status === 'active' || worker.status === 'planned' || (worker.status === 'ended' && Boolean(resolvedEnd));
    const active = statusEligible && isWithin(date, worker.activeStart, resolvedEnd);
    const baseline = active ? baselineMinutesForDate(year, worker, date) : { minutes: 0, source: 'Outside active employment dates' };
    plans.set(date, { date, ...baseline, corrected: false });
  }
  const adjustments = year.adjustments.filter((adjustment) => adjustment.workerId === worker.id);
  adjustments.filter((adjustment) => adjustment.scope === 'week').forEach((adjustment) => distributeWeeklyAdjustment(plans, adjustment, year));
  adjustments.filter((adjustment) => adjustment.scope === 'day').forEach((adjustment) => {
    if (!isWithin(adjustment.date, year.startDate, year.endDate)) return;
    plans.set(adjustment.date, {
      date: adjustment.date,
      minutes: adjustment.minutes,
      source: `Daily correction: ${adjustment.note || 'manually replaced hours'}`,
      corrected: true,
    });
  });
  return plans;
}

function dailyOutsideConsumption(worker: Worker, date: string, eligible: boolean): number {
  if (!eligible) return 0;
  return worker.outsideJobs.reduce((total, job) => {
    if (!isWithin(date, job.startDate, job.endDate)) return total;
    return total + Math.round((job.averageWeeklyMinutes * job.hourlyRateCents) / 60 / 7);
  }, 0);
}

function departureForWorker(scenario: ForecastScenario | undefined, worker: Worker): string | undefined {
  const scenarioEnd = scenario?.departureOverrides.find((departure) => departure.workerId === worker.id)?.endDate;
  if (scenarioEnd && worker.activeEnd) return scenarioEnd < worker.activeEnd ? scenarioEnd : worker.activeEnd;
  return scenarioEnd ?? worker.activeEnd;
}

function calculateWorkerRows(
  year: FiscalYear,
  worker: Worker,
  asOfDate: string,
  scenario: ForecastScenario | undefined,
): DailyLedgerRow[] {
  const plans = buildWorkerPlans(year, worker, departureForWorker(scenario, worker));
  const rows: DailyLedgerRow[] = [];
  let remainingAward = worker.workStudy?.awardCents ?? 0;
  for (const date of datesBetween(year.startDate, year.endDate)) {
    const plan = plans.get(date);
    if (!plan) continue;
    const period = periodForDate(year, date);
    const eligible = Boolean(worker.workStudy && period && isWorkStudyEligiblePeriod(period));
    const outsideConsumption = Math.min(remainingAward, dailyOutsideConsumption(worker, date, eligible));
    remainingAward -= outsideConsumption;
    const gross = Math.round((plan.minutes * worker.hourlyRateCents) / 60);
    const covered = eligible ? Math.min(gross, remainingAward) : 0;
    remainingAward -= covered;
    rows.push({
      date,
      weekStart: mondayOfWeek(date),
      workerId: worker.id,
      workerName: worker.name,
      state: plan.corrected ? 'corrected' : date <= asOfDate ? 'assumed-worked' : 'planned',
      minutes: plan.minutes,
      grossWagesCents: gross,
      outsideJobConsumptionCents: outsideConsumption,
      workStudyCoveredCents: covered,
      cpdCostCents: gross - covered,
      source: plan.source,
    });
    if (worker.workStudy?.officialBalance?.asOfDate === date) {
      remainingAward = worker.workStudy.officialBalance.remainingCents;
    }
  }
  return rows;
}

function calculatePlannedHireRows(year: FiscalYear, hire: PlannedHire, asOfDate: string): DailyLedgerRow[] {
  const rows: DailyLedgerRow[] = [];
  let remainingAward = hire.workStudyAwardCents ?? 0;
  const weekdayMinutes = Math.round(hire.averageWeeklyMinutes / 5);
  for (const date of datesBetween(year.startDate, year.endDate)) {
    if (!isWithin(date, hire.startDate, hire.endDate) || weekday(date) === 0 || weekday(date) === 6) continue;
    const period = periodForDate(year, date);
    const fullClosure = year.closures.some(
      (closure) => closure.date === date && closure.startMinute === undefined && closure.endMinute === undefined,
    );
    const minutes = fullClosure ? 0 : weekdayMinutes;
    const gross = Math.round((minutes * hire.hourlyRateCents) / 60);
    const covered = period && isWorkStudyEligiblePeriod(period) ? Math.min(gross, remainingAward) : 0;
    remainingAward -= covered;
    rows.push({
      date,
      weekStart: mondayOfWeek(date),
      workerId: hire.id,
      workerName: hire.label,
      state: 'scenario',
      minutes,
      grossWagesCents: gross,
      outsideJobConsumptionCents: 0,
      workStudyCoveredCents: covered,
      cpdCostCents: gross - covered,
      source: fullClosure ? 'Scenario hire, suppressed by closure' : 'Scenario planned hire',
    });
  }
  return rows;
}

export function calculateForecast(year: FiscalYear, requestedAsOfDate: string, scenarioId: string | null = null): ForecastResult {
  const asOfDate = clampDate(requestedAsOfDate, year.startDate, year.endDate);
  const scenario = scenarioId ? year.scenarios.find((candidate) => candidate.id === scenarioId) : undefined;
  const warnings: string[] = [];
  const daily = year.workers.flatMap((worker) => calculateWorkerRows(year, worker, asOfDate, scenario));
  if (scenario) daily.push(...scenario.plannedHires.flatMap((hire) => calculatePlannedHireRows(year, hire, asOfDate)));
  if (year.budgetCents === 0) warnings.push('Enter the fiscal-year budget to calculate remaining headroom.');
  if (year.workers.length === 0) warnings.push('Add at least one worker to create a staffing forecast.');

  const weeklyMap = new Map<string, WeeklyForecastRow>();
  daily.forEach((row) => {
    const current = weeklyMap.get(row.weekStart) ?? {
      weekStart: row.weekStart,
      weekEnd: addDays(row.weekStart, 6),
      state: row.state === 'scenario' ? 'scenario' : row.date <= asOfDate ? 'assumed-worked' : 'planned',
      hours: 0,
      grossWagesCents: 0,
      outsideJobConsumptionCents: 0,
      workStudyCoveredCents: 0,
      cpdCostCents: 0,
    };
    current.hours += row.minutes / 60;
    current.grossWagesCents += row.grossWagesCents;
    current.outsideJobConsumptionCents += row.outsideJobConsumptionCents;
    current.workStudyCoveredCents += row.workStudyCoveredCents;
    current.cpdCostCents += row.cpdCostCents;
    if (current.state !== 'scenario') {
      const crossesSeam = current.weekStart <= asOfDate && current.weekEnd > asOfDate;
      current.state = crossesSeam ? 'mixed' : current.weekEnd <= asOfDate ? 'assumed-worked' : 'planned';
    }
    weeklyMap.set(row.weekStart, current);
  });
  const weekly = Array.from(weeklyMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const totals = daily.reduce(
    (result, row) => {
      result.hours += row.minutes / 60;
      result.grossWagesCents += row.grossWagesCents;
      result.outsideJobConsumptionCents += row.outsideJobConsumptionCents;
      result.workStudyCoveredCents += row.workStudyCoveredCents;
      result.cpdCostCents += row.cpdCostCents;
      return result;
    },
    { hours: 0, grossWagesCents: 0, outsideJobConsumptionCents: 0, workStudyCoveredCents: 0, cpdCostCents: 0 },
  );
  return {
    asOfDate,
    scenarioId: scenario?.id ?? null,
    daily,
    weekly,
    totals: { ...totals, remainingBudgetCents: year.budgetCents - totals.cpdCostCents },
    warnings,
  };
}
