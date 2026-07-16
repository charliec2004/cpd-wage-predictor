import type {
  AcademicPeriod,
  FiscalYear,
  PeriodEstimate,
  PeriodEstimateProfile,
  Workspace,
  Worker,
  WorkerSchedule,
} from '../../../shared/workspace';
import { addDays, datesBetween, mondayOfWeek, weekday } from './dates';
import { scheduledPayableMinutes } from './forecast';

export interface ComparablePeriod {
  fiscalYear: FiscalYear;
  period: AcademicPeriod;
  label: string;
  recommended: boolean;
  typicalWeeklyMinutes: number;
  workerCount: number;
}

function scheduleHasHours(schedule: WorkerSchedule): boolean {
  return schedule.recurringShifts.length > 0 || schedule.datedShifts.length > 0 || Boolean(schedule.dayOverrides?.some((override) => override.shifts.length > 0));
}

export function periodHasKnownSchedule(year: FiscalYear, periodId: string): boolean {
  const period = year.periods.find((candidate) => candidate.id === periodId);
  if (!period) return false;
  const schedules = year.workers.flatMap((worker) => worker.schedules.filter((schedule) => schedule.periodId === periodId));
  if (schedules.some((schedule) => schedule.mode === 'recurring' && scheduleHasHours(schedule))) return true;
  const weeks = [...new Set(datesBetween(period.startDate, period.endDate).map(mondayOfWeek))];
  return weeks.every((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    return schedules.some((schedule) =>
      schedule.datedShifts.some((shift) => shift.date >= weekStart && shift.date <= weekEnd) ||
      schedule.dayOverrides?.some((override) => override.date >= weekStart && override.date <= weekEnd));
  });
}

function recurringWeekdayMinutes(schedule: WorkerSchedule): PeriodEstimateProfile['weekdayMinutes'] {
  return Array.from({ length: 7 }, (_, day) => scheduledPayableMinutes(schedule.recurringShifts.filter((shift) => shift.weekday === day))) as PeriodEstimateProfile['weekdayMinutes'];
}

function weekSpecificWeekdayMinutes(schedule: WorkerSchedule, period: AcademicPeriod, sourceYear: FiscalYear): PeriodEstimateProfile['weekdayMinutes'] {
  const dates = datesBetween(period.startDate, period.endDate);
  const totals = Array<number>(7).fill(0);
  const openOccurrences = Array<number>(7).fill(0);
  for (const date of dates) {
    const day = weekday(date);
    const fullyClosed = sourceYear.closures.some((closure) => closure.date === date && closure.startMinute === undefined && closure.endMinute === undefined);
    if (fullyClosed) continue;
    openOccurrences[day] = (openOccurrences[day] ?? 0) + 1;
    const dayOverride = schedule.dayOverrides?.find((override) => override.date === date);
    const shifts = dayOverride?.shifts ?? schedule.datedShifts.filter((shift) => shift.date === date);
    totals[day] = (totals[day] ?? 0) + scheduledPayableMinutes(shifts, sourceYear.closures.filter((closure) => closure.date === date));
  }
  return totals.map((minutes, day) => Math.round(minutes / Math.max(1, openOccurrences[day] ?? 0))) as PeriodEstimateProfile['weekdayMinutes'];
}

function targetWorkerFor(sourceWorker: Worker, targetYear: FiscalYear): Worker | undefined {
  const normalizedName = sourceWorker.name.trim().toLocaleLowerCase();
  return targetYear.workers.find((worker) => worker.id === sourceWorker.id || worker.name.trim().toLocaleLowerCase() === normalizedName);
}

export function profilesFromPeriod(sourceYear: FiscalYear, sourcePeriod: AcademicPeriod, targetYear: FiscalYear): PeriodEstimateProfile[] {
  return sourceYear.workers.flatMap((sourceWorker) => {
    const schedule = sourceWorker.schedules.find((candidate) => candidate.periodId === sourcePeriod.id && scheduleHasHours(candidate));
    if (!schedule) return [];
    const weekdayMinutes = schedule.mode === 'recurring'
      ? recurringWeekdayMinutes(schedule)
      : weekSpecificWeekdayMinutes(schedule, sourcePeriod, sourceYear);
    if (weekdayMinutes.every((minutes) => minutes === 0)) return [];
    const targetWorker = targetWorkerFor(sourceWorker, targetYear);
    return [{
      id: `estimate-profile-${crypto.randomUUID()}`,
      workerId: targetWorker?.id,
      label: targetWorker?.name ?? sourceWorker.name,
      hourlyRateCents: targetWorker?.hourlyRateCents ?? sourceWorker.hourlyRateCents,
      workStudyAwardCents: targetWorker ? undefined : sourceWorker.workStudy?.awardCents,
      weekdayMinutes,
    }];
  });
}

export function profileWeeklyMinutes(profiles: PeriodEstimateProfile[]): number {
  return profiles.reduce((total, profile) => total + profile.weekdayMinutes.reduce((sum, minutes) => sum + minutes, 0), 0);
}

function activeWorkersForPeriod(year: FiscalYear, period: AcademicPeriod): Worker[] {
  return year.workers.filter((worker) =>
    ['active', 'planned'].includes(worker.status) &&
    worker.activeStart <= period.endDate &&
    (!worker.activeEnd || worker.activeEnd >= period.startDate),
  );
}

function manualProfiles(year: FiscalYear, period: AcademicPeriod, expectedWeeklyMinutes: number): PeriodEstimateProfile[] {
  const workers = activeWorkersForPeriod(year, period);
  if (workers.length === 0) {
    const perDay = Math.round(expectedWeeklyMinutes / 5);
    return [{
      id: `estimate-profile-${crypto.randomUUID()}`,
      label: 'Estimated student staffing',
      hourlyRateCents: 1_690,
      workStudyAwardCents: 300_000,
      weekdayMinutes: [0, perDay, perDay, perDay, perDay, perDay, 0],
    }];
  }
  const perWorkerDay = Math.round(expectedWeeklyMinutes / workers.length / 5);
  return workers.map((worker) => ({
    id: `estimate-profile-${crypto.randomUUID()}`,
    workerId: worker.id,
    label: worker.name,
    hourlyRateCents: worker.hourlyRateCents,
    weekdayMinutes: [0, perWorkerDay, perWorkerDay, perWorkerDay, perWorkerDay, perWorkerDay, 0],
  }));
}

export function createPeriodEstimateFromComparable(
  targetYear: FiscalYear,
  targetPeriod: AcademicPeriod,
  sourceYear: FiscalYear,
  sourcePeriod: AcademicPeriod,
): PeriodEstimate {
  const profiles = profilesFromPeriod(sourceYear, sourcePeriod, targetYear);
  const expectedWeeklyMinutes = profileWeeklyMinutes(profiles);
  return {
    id: `period-estimate-${crypto.randomUUID()}`,
    periodId: targetPeriod.id,
    status: 'estimated',
    sourceLabel: `${sourceYear.label} · ${sourcePeriod.name}`,
    sourceFiscalYearId: sourceYear.id,
    sourcePeriodId: sourcePeriod.id,
    createdAt: new Date().toISOString(),
    lowWeeklyMinutes: Math.round(expectedWeeklyMinutes * 0.85),
    expectedWeeklyMinutes,
    highWeeklyMinutes: Math.round(expectedWeeklyMinutes * 1.15),
    profiles,
    note: 'Generated from a comparable period; weekly hours remain editable.',
  };
}

export function createManualPeriodEstimate(
  year: FiscalYear,
  period: AcademicPeriod,
  expectedWeeklyMinutes = 600,
): PeriodEstimate {
  return {
    id: `period-estimate-${crypto.randomUUID()}`,
    periodId: period.id,
    status: 'estimated',
    sourceLabel: 'Manual staffing estimate',
    createdAt: new Date().toISOString(),
    lowWeeklyMinutes: Math.round(expectedWeeklyMinutes * 0.85),
    expectedWeeklyMinutes,
    highWeeklyMinutes: Math.round(expectedWeeklyMinutes * 1.15),
    profiles: manualProfiles(year, period, expectedWeeklyMinutes),
    note: 'Manual team hours are distributed across active workers for wage and work-study estimation.',
  };
}

export function createNoStaffingEstimate(period: AcademicPeriod): PeriodEstimate {
  return {
    id: `period-estimate-${crypto.randomUUID()}`,
    periodId: period.id,
    status: 'no-staffing',
    sourceLabel: 'No student staffing planned',
    createdAt: new Date().toISOString(),
    lowWeeklyMinutes: 0,
    expectedWeeklyMinutes: 0,
    highWeeklyMinutes: 0,
    profiles: [],
    note: 'This is an explicit zero-hour assumption, not missing information.',
  };
}

function comparableScore(target: AcademicPeriod, candidate: AcademicPeriod): number {
  if (target.type === candidate.type) return 0;
  if ((target.type === 'spring' && candidate.type === 'fall') || (target.type === 'fall' && candidate.type === 'spring')) return 1;
  if (target.type === 'interterm' && candidate.type === 'fall') return 2;
  if (target.type === 'winter' && candidate.type === 'fall') return 2;
  return 3;
}

export function comparablePeriods(workspace: Workspace, targetYear: FiscalYear, targetPeriod: AcademicPeriod): ComparablePeriod[] {
  const candidates = workspace.fiscalYears.flatMap((year) => year.periods
    .filter((period) =>
      !(year.id === targetYear.id && period.id === targetPeriod.id) &&
      period.startDate < targetPeriod.startDate &&
      periodHasKnownSchedule(year, period.id),
    )
    .map((period) => {
      const profiles = profilesFromPeriod(year, period, targetYear);
      return { year, period, profiles, score: comparableScore(targetPeriod, period) };
    }))
    .filter((candidate) => candidate.profiles.length > 0)
    .sort((a, b) => a.score - b.score || b.period.startDate.localeCompare(a.period.startDate));
  const recommended = candidates[0];
  return candidates.map((candidate) => ({
    fiscalYear: candidate.year,
    period: candidate.period,
    label: `${candidate.year.label} · ${candidate.period.name}`,
    recommended: candidate === recommended,
    typicalWeeklyMinutes: profileWeeklyMinutes(candidate.profiles),
    workerCount: candidate.profiles.length,
  }));
}
