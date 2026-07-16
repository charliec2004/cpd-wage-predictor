import {
  isWorkStudyEligiblePeriod,
  type AcademicPeriod,
  type FiscalYear,
  type ForecastEstimateVariant,
  type ForecastScenario,
  type HourAdjustment,
  type OfficeClosure,
  type PlannedHire,
  type PeriodEstimate,
  type PeriodEstimateProfile,
  type RecurringShift,
  type Worker,
} from '../../../shared/workspace';
import { addDays, clampDate, datesBetween, isWithin, mondayOfWeek, weekday } from './dates';

export type LedgerState = 'assumed-worked' | 'corrected' | 'scheduled' | 'estimated' | 'scenario';
export type LedgerSourceKind = 'schedule' | 'estimate' | 'correction' | 'scenario' | 'none';

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
  sourceKind: LedgerSourceKind;
}

export interface WeeklyForecastRow {
  weekStart: string;
  weekEnd: string;
  state: 'assumed-worked' | 'corrected' | 'mixed' | 'scheduled' | 'estimated' | 'scenario' | 'missing';
  hours: number;
  grossWagesCents: number;
  outsideJobConsumptionCents: number;
  workStudyCoveredCents: number;
  cpdCostCents: number;
}

export interface PeriodForecastCoverage {
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'worked' | 'worked-and-scheduled' | 'scheduled' | 'estimated' | 'scheduled-and-estimated' | 'no-staffing' | 'missing';
  sourceLabel: string;
  lowWeeklyMinutes?: number;
  expectedWeeklyMinutes?: number;
  highWeeklyMinutes?: number;
}

export type ForecastCoverageSegmentState =
  | 'assumed-worked'
  | 'corrected'
  | 'scheduled'
  | 'estimated'
  | 'assumed-and-estimated'
  | 'scheduled-and-estimated'
  | 'no-staffing'
  | 'missing';

export interface ForecastCoverageSegment {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  state: ForecastCoverageSegmentState;
  sourceLabel: string;
}

export interface ForecastResult {
  asOfDate: string;
  scenarioId: string | null;
  estimateVariant: ForecastEstimateVariant;
  daily: DailyLedgerRow[];
  weekly: WeeklyForecastRow[];
  totals: {
    hours: number;
    grossWagesCents: number;
    outsideJobConsumptionCents: number;
    workStudyCoveredCents: number;
    cpdCostCents: number;
    remainingBudgetCents: number;
    assumedWorkedHours: number;
    correctedHours: number;
    scheduledHours: number;
    estimatedHours: number;
    scenarioHours: number;
  };
  coverage: PeriodForecastCoverage[];
  coverageSegments: ForecastCoverageSegment[];
  complete: boolean;
  warnings: string[];
}

interface DailyPlan {
  date: string;
  minutes: number;
  source: string;
  corrected: boolean;
  sourceKind: LedgerSourceKind;
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

function scheduleCoversDate(schedule: Worker['schedules'][number], date: string): boolean {
  if (schedule.mode === 'recurring') {
    return schedule.recurringShifts.length > 0 || Boolean(schedule.dayOverrides?.some((override) => override.date === date));
  }
  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  return schedule.datedShifts.some((shift) => shift.date >= weekStart && shift.date <= weekEnd) ||
    Boolean(schedule.dayOverrides?.some((override) => override.date >= weekStart && override.date <= weekEnd));
}

function estimateScale(estimate: PeriodEstimate, variant: ForecastEstimateVariant): number {
  const baseWeeklyMinutes = estimate.profiles.reduce(
    (total, profile) => total + profile.weekdayMinutes.reduce((sum, minutes) => sum + minutes, 0),
    0,
  );
  if (baseWeeklyMinutes === 0) return 0;
  const target = variant === 'low'
    ? estimate.lowWeeklyMinutes
    : variant === 'high'
      ? estimate.highWeeklyMinutes
      : estimate.expectedWeeklyMinutes;
  return target / baseWeeklyMinutes;
}

function estimatedMinutesForDate(
  year: FiscalYear,
  estimate: PeriodEstimate,
  profile: PeriodEstimateProfile,
  date: string,
  variant: ForecastEstimateVariant,
): number {
  if (estimate.status === 'no-staffing') return 0;
  const baseMinutes = profile.weekdayMinutes[weekday(date)] ?? 0;
  if (baseMinutes === 0) return 0;
  const closures = year.closures.filter((closure) => closure.date === date);
  if (closures.some((closure) => closure.startMinute === undefined || closure.endMinute === undefined)) return 0;
  const standardDay = [{ startMinute: 540, endMinute: 1_020 }];
  const normalOfficeMinutes = scheduledPayableMinutes(standardDay);
  const availableOfficeMinutes = closures.length > 0 ? scheduledPayableMinutes(standardDay, closures) : normalOfficeMinutes;
  const closureRatio = normalOfficeMinutes > 0 ? availableOfficeMinutes / normalOfficeMinutes : 1;
  return Math.max(0, Math.round(baseMinutes * estimateScale(estimate, variant) * closureRatio));
}

function estimateForWorker(year: FiscalYear, period: AcademicPeriod, worker: Worker): { estimate: PeriodEstimate; profile: PeriodEstimateProfile } | undefined {
  const estimate = (year.periodEstimates ?? []).find((candidate) => candidate.periodId === period.id && candidate.status === 'estimated');
  const profile = estimate?.profiles.find((candidate) => candidate.workerId === worker.id);
  return estimate && profile ? { estimate, profile } : undefined;
}

function baselineMinutesForDate(
  year: FiscalYear,
  worker: Worker,
  date: string,
  variant: ForecastEstimateVariant,
): { minutes: number; source: string; sourceKind: LedgerSourceKind } {
  const period = periodForDate(year, date);
  if (!period) return { minutes: 0, source: 'No academic period', sourceKind: 'none' };
  const schedule = worker.schedules.find((candidate) => candidate.periodId === period.id);
  const estimateMatch = estimateForWorker(year, period, worker);
  if (!schedule || !scheduleCoversDate(schedule, date)) {
    if (estimateMatch) {
      const closures = year.closures.some((closure) => closure.date === date);
      return {
        minutes: estimatedMinutesForDate(year, estimateMatch.estimate, estimateMatch.profile, date, variant),
        source: `${period.name} estimate from ${estimateMatch.estimate.sourceLabel}${closures ? ', adjusted by closure' : ''}`,
        sourceKind: 'estimate',
      };
    }
    const explicitZero = (year.periodEstimates ?? []).find((candidate) => candidate.periodId === period.id && candidate.status === 'no-staffing');
    return explicitZero
      ? { minutes: 0, source: `${period.name}: no student staffing planned`, sourceKind: 'none' }
      : { minutes: 0, source: `No ${period.name} schedule or estimate`, sourceKind: 'none' };
  }
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
      sourceKind: 'schedule',
    };
  }
  const shifts = schedule.datedShifts.filter((shift) => shift.date === date);
  return {
    minutes: scheduledPayableMinutes(shifts, closures),
    source: closures.length > 0 ? `${period.name} weekly plan, clipped by closure` : `${period.name} weekly plan`,
    sourceKind: 'schedule',
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
      sourceKind: 'correction',
    });
  });
  dates.filter((date) => !eligibleDates.includes(date)).forEach((date) => {
    plans.set(date, { date, minutes: 0, source: 'Weekly correction', corrected: true, sourceKind: 'correction' });
  });
}

function buildWorkerPlans(
  year: FiscalYear,
  worker: Worker,
  activeEnd: string | undefined,
  variant: ForecastEstimateVariant,
): Map<string, DailyPlan> {
  const plans = new Map<string, DailyPlan>();
  for (const date of datesBetween(year.startDate, year.endDate)) {
    const resolvedEnd = activeEnd && worker.activeEnd ? (activeEnd < worker.activeEnd ? activeEnd : worker.activeEnd) : activeEnd ?? worker.activeEnd;
    const statusEligible = worker.status === 'active' || worker.status === 'planned' || (worker.status === 'ended' && Boolean(resolvedEnd));
    const active = statusEligible && isWithin(date, worker.activeStart, resolvedEnd);
    const baseline = active
      ? baselineMinutesForDate(year, worker, date, variant)
      : { minutes: 0, source: 'Outside active employment dates', sourceKind: 'none' as const };
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
      sourceKind: 'correction',
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
  variant: ForecastEstimateVariant,
): DailyLedgerRow[] {
  const plans = buildWorkerPlans(year, worker, departureForWorker(scenario, worker), variant);
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
      state: plan.corrected
        ? 'corrected'
        : plan.sourceKind === 'estimate'
          ? 'estimated'
          : date <= asOfDate
            ? 'assumed-worked'
            : 'scheduled',
      minutes: plan.minutes,
      grossWagesCents: gross,
      outsideJobConsumptionCents: outsideConsumption,
      workStudyCoveredCents: covered,
      cpdCostCents: gross - covered,
      source: plan.source,
      sourceKind: plan.sourceKind,
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
      sourceKind: 'scenario',
    });
  }
  return rows;
}

function calculateSyntheticEstimateRows(
  year: FiscalYear,
  estimate: PeriodEstimate,
  profile: PeriodEstimateProfile,
  variant: ForecastEstimateVariant,
): DailyLedgerRow[] {
  const period = year.periods.find((candidate) => candidate.id === estimate.periodId);
  if (!period || estimate.status !== 'estimated') return [];
  const rows: DailyLedgerRow[] = [];
  let remainingAward = profile.workStudyAwardCents ?? 0;
  for (const date of datesBetween(period.startDate, period.endDate)) {
    const minutes = estimatedMinutesForDate(year, estimate, profile, date, variant);
    const gross = Math.round((minutes * profile.hourlyRateCents) / 60);
    const covered = isWorkStudyEligiblePeriod(period) ? Math.min(gross, remainingAward) : 0;
    remainingAward -= covered;
    rows.push({
      date,
      weekStart: mondayOfWeek(date),
      workerId: profile.id,
      workerName: profile.label,
      state: 'estimated',
      minutes,
      grossWagesCents: gross,
      outsideJobConsumptionCents: 0,
      workStudyCoveredCents: covered,
      cpdCostCents: gross - covered,
      source: `${period.name} estimate from ${estimate.sourceLabel}`,
      sourceKind: 'estimate',
    });
  }
  return rows;
}

function daysInclusive(startDate: string, endDate: string): number {
  return Math.max(0, Math.floor((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1);
}

function dateHasExactSchedule(year: FiscalYear, period: AcademicPeriod, date: string): boolean {
  return year.workers.some((worker) => {
    if (worker.activeStart > date || (worker.activeEnd && worker.activeEnd < date)) return false;
    const schedule = worker.schedules.find((candidate) => candidate.periodId === period.id);
    return Boolean(schedule && scheduleCoversDate(schedule, date));
  });
}

function dateHasEstimateRemainder(year: FiscalYear, period: AcademicPeriod, estimate: PeriodEstimate | undefined, date: string): boolean {
  if (!estimate || estimate.status !== 'estimated') return false;
  return estimate.profiles.some((profile) => {
    if (!profile.workerId) return true;
    const worker = year.workers.find((candidate) => candidate.id === profile.workerId);
    if (!worker || worker.activeStart > date || (worker.activeEnd && worker.activeEnd < date)) return false;
    const schedule = worker.schedules.find((candidate) => candidate.periodId === period.id);
    return !schedule || !scheduleCoversDate(schedule, date);
  });
}

function dateHasCorrection(year: FiscalYear, date: string): boolean {
  return year.adjustments.some((adjustment) => adjustment.scope === 'day'
    ? adjustment.date === date
    : mondayOfWeek(adjustment.date) === mondayOfWeek(date));
}

const coverageSegmentLabels: Record<ForecastCoverageSegmentState, string> = {
  'assumed-worked': 'Hours to date based on the schedule; payroll is not independently confirmed',
  corrected: 'Hours to date include a manual correction',
  scheduled: 'Upcoming exact shifts are already entered',
  estimated: 'Hours are predicted from a saved staffing estimate',
  'assumed-and-estimated': 'Past hours combine the schedule with an estimate',
  'scheduled-and-estimated': 'Upcoming exact shifts and estimated staffing are combined',
  'no-staffing': 'Explicitly no student staffing planned',
  missing: 'No schedule or estimate has been entered',
};

export function assessForecastCoverageSegments(year: FiscalYear, asOfDate: string): ForecastCoverageSegment[] {
  const segments: ForecastCoverageSegment[] = [];
  for (const period of year.periods.filter((candidate) => daysInclusive(candidate.startDate, candidate.endDate) >= 7)) {
    const estimate = (year.periodEstimates ?? []).find((candidate) => candidate.periodId === period.id);
    for (const date of datesBetween(period.startDate, period.endDate)) {
      const exact = dateHasExactSchedule(year, period, date);
      const estimated = dateHasEstimateRemainder(year, period, estimate, date);
      const past = date <= asOfDate;
      const corrected = past && dateHasCorrection(year, date);
      let state: ForecastCoverageSegmentState;
      if (corrected) state = 'corrected';
      else if (exact && estimated) state = past ? 'assumed-and-estimated' : 'scheduled-and-estimated';
      else if (exact) state = past ? 'assumed-worked' : 'scheduled';
      else if (estimated) state = 'estimated';
      else if (estimate?.status === 'no-staffing') state = 'no-staffing';
      else state = 'missing';
      const previous = segments.at(-1);
      if (previous && previous.periodId === period.id && previous.state === state && addDays(previous.endDate, 1) === date) {
        previous.endDate = date;
      } else {
        segments.push({
          periodId: period.id,
          periodName: period.name,
          startDate: date,
          endDate: date,
          state,
          sourceLabel: coverageSegmentLabels[state],
        });
      }
    }
  }
  return segments;
}

export function assessForecastCoverage(year: FiscalYear, asOfDate: string): PeriodForecastCoverage[] {
  const segments = assessForecastCoverageSegments(year, asOfDate);
  return year.periods
    .filter((period) => daysInclusive(period.startDate, period.endDate) >= 7)
    .map((period) => {
      const estimate = (year.periodEstimates ?? []).find((candidate) => candidate.periodId === period.id);
      const periodSegments = segments.filter((segment) => segment.periodId === period.id);
      const states = new Set(periodSegments.map((segment) => segment.state));
      const hasMissing = states.has('missing');
      const hasEstimate = states.has('estimated') || states.has('assumed-and-estimated') || states.has('scheduled-and-estimated');
      const hasPastExact = states.has('assumed-worked') || states.has('corrected') || states.has('assumed-and-estimated');
      const hasFutureExact = states.has('scheduled') || states.has('scheduled-and-estimated');
      const onlyNoStaffing = states.size === 1 && states.has('no-staffing');
      let status: PeriodForecastCoverage['status'];
      let sourceLabel: string;
      if (hasMissing) {
        status = 'missing';
        sourceLabel = periodSegments.some((segment) => segment.state !== 'missing')
          ? 'Part of this period has no schedule or staffing estimate'
          : 'No schedule or staffing estimate';
      } else if (onlyNoStaffing) {
        status = 'no-staffing';
        sourceLabel = estimate?.sourceLabel ?? 'No student staffing planned';
      } else if (hasEstimate && (hasPastExact || hasFutureExact)) {
        status = 'scheduled-and-estimated';
        sourceLabel = `Exact schedules replace ${estimate?.sourceLabel ?? 'the estimate'} where entered`;
      } else if (hasEstimate) {
        status = 'estimated';
        sourceLabel = estimate?.sourceLabel ?? 'Saved staffing estimate';
      } else if (hasPastExact && hasFutureExact) {
        status = 'worked-and-scheduled';
        sourceLabel = 'Hours to date use the schedule; upcoming shifts are entered';
      } else if (hasPastExact) {
        status = 'worked';
        sourceLabel = states.has('corrected') ? 'Hours to date include corrections' : 'Hours to date come from the schedule';
      } else if (hasFutureExact) {
        status = 'scheduled';
        sourceLabel = 'Exact worker schedules';
      } else {
        status = 'missing';
        sourceLabel = 'No schedule or staffing estimate';
      }
      return {
        periodId: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status,
        sourceLabel,
        lowWeeklyMinutes: estimate?.lowWeeklyMinutes,
        expectedWeeklyMinutes: estimate?.expectedWeeklyMinutes,
        highWeeklyMinutes: estimate?.highWeeklyMinutes,
      };
    });
}

export function calculateForecast(
  year: FiscalYear,
  requestedAsOfDate: string,
  scenarioId: string | null = null,
  estimateVariant: ForecastEstimateVariant = 'expected',
): ForecastResult {
  const asOfDate = clampDate(requestedAsOfDate, year.startDate, year.endDate);
  const scenario = scenarioId ? year.scenarios.find((candidate) => candidate.id === scenarioId) : undefined;
  const warnings: string[] = [];
  const daily = year.workers.flatMap((worker) => calculateWorkerRows(year, worker, asOfDate, scenario, estimateVariant));
  const workerIds = new Set(year.workers.map((worker) => worker.id));
  daily.push(...(year.periodEstimates ?? []).flatMap((estimate) => estimate.profiles
    .filter((profile) => !profile.workerId || !workerIds.has(profile.workerId))
    .flatMap((profile) => calculateSyntheticEstimateRows(year, estimate, profile, estimateVariant))));
  if (scenario) daily.push(...scenario.plannedHires.flatMap((hire) => calculatePlannedHireRows(year, hire, asOfDate)));
  if (year.budgetCents === 0) warnings.push('Enter the fiscal-year budget to calculate remaining headroom.');
  if (year.workers.length === 0) warnings.push('Add at least one worker to create a staffing forecast.');
  const coverage = assessForecastCoverage(year, asOfDate);
  const coverageSegments = assessForecastCoverageSegments(year, asOfDate);
  const missingPeriods = coverage.filter((period) => period.status === 'missing');
  missingPeriods.forEach((period) => warnings.push(`${period.name} has no schedule or staffing estimate.`));

  const weeklyMap = new Map<string, WeeklyForecastRow>();
  const weeklySources = new Map<string, Set<LedgerSourceKind>>();
  daily.forEach((row) => {
    const current = weeklyMap.get(row.weekStart) ?? {
      weekStart: row.weekStart,
      weekEnd: addDays(row.weekStart, 6),
      state: row.state === 'scenario' ? 'scenario' : row.state === 'estimated' ? 'estimated' : row.date <= asOfDate ? 'assumed-worked' : 'scheduled',
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
    const sources = weeklySources.get(row.weekStart) ?? new Set<LedgerSourceKind>();
    if (row.minutes > 0 || row.sourceKind === 'correction') sources.add(row.sourceKind);
    weeklySources.set(row.weekStart, sources);
    weeklyMap.set(row.weekStart, current);
  });
  const weekly = Array.from(weeklyMap.values())
    .map((week) => {
      const sources = weeklySources.get(week.weekStart) ?? new Set<LedgerSourceKind>();
      const crossesSeam = week.weekStart <= asOfDate && week.weekEnd > asOfDate;
      const missing = missingPeriods.some((period) => period.startDate <= week.weekEnd && period.endDate >= week.weekStart);
      if (sources.has('scenario')) week.state = 'scenario';
      else if (sources.has('correction')) week.state = 'corrected';
      else if (sources.has('estimate')) week.state = 'estimated';
      else if (missing && week.hours === 0) week.state = 'missing';
      else week.state = crossesSeam ? 'mixed' : week.weekEnd <= asOfDate ? 'assumed-worked' : 'scheduled';
      return week;
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const totals = daily.reduce(
    (result, row) => {
      result.hours += row.minutes / 60;
      result.grossWagesCents += row.grossWagesCents;
      result.outsideJobConsumptionCents += row.outsideJobConsumptionCents;
      result.workStudyCoveredCents += row.workStudyCoveredCents;
      result.cpdCostCents += row.cpdCostCents;
      if (row.sourceKind === 'estimate') result.estimatedHours += row.minutes / 60;
      else if (row.sourceKind === 'correction') result.correctedHours += row.minutes / 60;
      else if (row.sourceKind === 'scenario') result.scenarioHours += row.minutes / 60;
      else if (row.date <= asOfDate) result.assumedWorkedHours += row.minutes / 60;
      else result.scheduledHours += row.minutes / 60;
      return result;
    },
    {
      hours: 0,
      grossWagesCents: 0,
      outsideJobConsumptionCents: 0,
      workStudyCoveredCents: 0,
      cpdCostCents: 0,
      assumedWorkedHours: 0,
      correctedHours: 0,
      scheduledHours: 0,
      estimatedHours: 0,
      scenarioHours: 0,
    },
  );
  return {
    asOfDate,
    scenarioId: scenario?.id ?? null,
    estimateVariant,
    daily,
    weekly,
    totals: { ...totals, remainingBudgetCents: year.budgetCents - totals.cpdCostCents },
    coverage,
    coverageSegments,
    complete: missingPeriods.length === 0,
    warnings,
  };
}

export interface ForecastRange {
  low: ForecastResult;
  expected: ForecastResult;
  high: ForecastResult;
  inverted: boolean;
}

export function calculateForecastRange(year: FiscalYear, requestedAsOfDate: string): ForecastRange {
  // The planning range describes uncertainty in unknown hours. Saved scenarios are
  // separate staffing alternatives and must not silently redefine these bounds.
  const low = calculateForecast(year, requestedAsOfDate, null, 'low');
  const expected = calculateForecast(year, requestedAsOfDate, null, 'expected');
  const high = calculateForecast(year, requestedAsOfDate, null, 'high');
  return {
    low,
    expected,
    high,
    inverted: low.totals.cpdCostCents > expected.totals.cpdCostCents || expected.totals.cpdCostCents > high.totals.cpdCostCents,
  };
}
