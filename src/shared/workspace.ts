export const WORKSPACE_SCHEMA_VERSION = 1;
export const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;

export type FiscalYearStatus = 'planning' | 'active' | 'closed';
export type ScheduleMode = 'recurring' | 'week-specific';
export type WorkerStatus = 'planned' | 'active' | 'paused' | 'ended';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Workspace {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeFiscalYearId: string;
  fiscalYears: FiscalYear[];
}

export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  budgetCents: number;
  periods: AcademicPeriod[];
  closures: OfficeClosure[];
  workers: Worker[];
  adjustments: HourAdjustment[];
  scenarios: ForecastScenario[];
}

export interface AcademicPeriod {
  id: string;
  name: string;
  type: 'summer' | 'fall' | 'winter' | 'interterm' | 'spring' | 'transition';
  startDate: string;
  endDate: string;
  scheduleMode: ScheduleMode;
  workStudyEligible: boolean;
}

export interface OfficeClosure {
  id: string;
  name: string;
  date: string;
  startMinute?: number;
  endMinute?: number;
}

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  activeStart: string;
  activeEnd?: string;
  hourlyRateCents: number;
  workStudy?: WorkStudyAward;
  outsideJobs: OutsideJob[];
  schedules: WorkerSchedule[];
}

export interface WorkStudyAward {
  awardCents: number;
  officialBalance?: {
    remainingCents: number;
    asOfDate: string;
  };
}

export interface OutsideJob {
  id: string;
  name: string;
  hourlyRateCents: number;
  averageWeeklyMinutes: number;
  startDate: string;
  endDate?: string;
}

export interface WorkerSchedule {
  id: string;
  periodId: string;
  mode: ScheduleMode;
  recurringShifts: RecurringShift[];
  datedShifts: DatedShift[];
}

export interface RecurringShift {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface DatedShift {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
}

export interface HourAdjustment {
  id: string;
  workerId: string;
  scope: 'day' | 'week';
  date: string;
  minutes: number;
  note: string;
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  role: 'expected' | 'plausible-low' | 'prudent-high' | 'custom';
  plannedHires: PlannedHire[];
  departureOverrides: DepartureOverride[];
}

export interface PlannedHire {
  id: string;
  label: string;
  startDate: string;
  endDate?: string;
  hourlyRateCents: number;
  averageWeeklyMinutes: number;
  workStudyAwardCents?: number;
}

export interface DepartureOverride {
  id: string;
  workerId: string;
  endDate: string;
}

export interface StorageResult<T = undefined> {
  ok: boolean;
  value?: T;
  error?: string;
  canceled?: boolean;
}

export interface DesktopApi {
  platform: 'darwin' | 'win32' | 'linux';
  loadWorkspace: () => Promise<StorageResult<Workspace | null>>;
  saveWorkspace: (workspace: Workspace) => Promise<StorageResult>;
  exportWorkspace: (workspace: Workspace) => Promise<StorageResult<string>>;
  importWorkspace: () => Promise<StorageResult<Workspace>>;
  getTheme: () => Promise<ThemePreference>;
  setTheme: (theme: ThemePreference) => Promise<StorageResult>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, max = 200): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isOptionalString(value: unknown, max = 500): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= max);
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function isInteger(value: unknown, min = 0, max = 1_000_000_000_000): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isArrayOf<T>(value: unknown, max: number, validator: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length <= max && value.every(validator);
}

function isPeriod(value: unknown): value is AcademicPeriod {
  if (!isRecord(value)) return false;
  return (
    isString(value.id, 100) &&
    isString(value.name, 100) &&
    ['summer', 'fall', 'winter', 'interterm', 'spring', 'transition'].includes(String(value.type)) &&
    isDate(value.startDate) &&
    isDate(value.endDate) &&
    ['recurring', 'week-specific'].includes(String(value.scheduleMode)) &&
    typeof value.workStudyEligible === 'boolean'
  );
}

function isClosure(value: unknown): value is OfficeClosure {
  if (!isRecord(value)) return false;
  const intervalValid =
    (value.startMinute === undefined && value.endMinute === undefined) ||
    (isInteger(value.startMinute, 0, 1439) && isInteger(value.endMinute, 1, 1440) && value.startMinute < value.endMinute);
  return isString(value.id, 100) && isString(value.name, 150) && isDate(value.date) && intervalValid;
}

function isRecurringShift(value: unknown): value is RecurringShift {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isInteger(value.weekday, 0, 6) &&
    isInteger(value.startMinute, 0, 1439) &&
    isInteger(value.endMinute, 1, 1440) &&
    value.startMinute < value.endMinute
  );
}

function isDatedShift(value: unknown): value is DatedShift {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isDate(value.date) &&
    isInteger(value.startMinute, 0, 1439) &&
    isInteger(value.endMinute, 1, 1440) &&
    value.startMinute < value.endMinute
  );
}

function isSchedule(value: unknown): value is WorkerSchedule {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.periodId, 100) &&
    ['recurring', 'week-specific'].includes(String(value.mode)) &&
    isArrayOf(value.recurringShifts, 100, isRecurringShift) &&
    isArrayOf(value.datedShifts, 500, isDatedShift)
  );
}

function isOutsideJob(value: unknown): value is OutsideJob {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.name, 150) &&
    isInteger(value.hourlyRateCents, 1, 1_000_000) &&
    isInteger(value.averageWeeklyMinutes, 0, 20_160) &&
    isDate(value.startDate) &&
    (value.endDate === undefined || isDate(value.endDate))
  );
}

function isWorkStudy(value: unknown): value is WorkStudyAward {
  if (!isRecord(value) || !isInteger(value.awardCents, 0, 10_000_000)) return false;
  if (value.officialBalance === undefined) return true;
  return (
    isRecord(value.officialBalance) &&
    isInteger(value.officialBalance.remainingCents, 0, 10_000_000) &&
    isDate(value.officialBalance.asOfDate)
  );
}

function isWorker(value: unknown): value is Worker {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.name, 150) &&
    ['planned', 'active', 'paused', 'ended'].includes(String(value.status)) &&
    isDate(value.activeStart) &&
    (value.activeEnd === undefined || isDate(value.activeEnd)) &&
    isInteger(value.hourlyRateCents, 1, 1_000_000) &&
    (value.workStudy === undefined || isWorkStudy(value.workStudy)) &&
    isArrayOf(value.outsideJobs, 20, isOutsideJob) &&
    isArrayOf(value.schedules, 50, isSchedule)
  );
}

function isAdjustment(value: unknown): value is HourAdjustment {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.workerId, 100) &&
    ['day', 'week'].includes(String(value.scope)) &&
    isDate(value.date) &&
    isInteger(value.minutes, 0, 20_160) &&
    typeof value.note === 'string' && value.note.length <= 500
  );
}

function isPlannedHire(value: unknown): value is PlannedHire {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.label, 150) &&
    isDate(value.startDate) &&
    (value.endDate === undefined || isDate(value.endDate)) &&
    isInteger(value.hourlyRateCents, 1, 1_000_000) &&
    isInteger(value.averageWeeklyMinutes, 0, 20_160) &&
    (value.workStudyAwardCents === undefined || isInteger(value.workStudyAwardCents, 0, 10_000_000))
  );
}

function isDeparture(value: unknown): value is DepartureOverride {
  return isRecord(value) && isString(value.id, 100) && isString(value.workerId, 100) && isDate(value.endDate);
}

function isScenario(value: unknown): value is ForecastScenario {
  return (
    isRecord(value) &&
    isString(value.id, 100) &&
    isString(value.name, 150) &&
    typeof value.description === 'string' &&
    value.description.length <= 1000 &&
    ['expected', 'plausible-low', 'prudent-high', 'custom'].includes(String(value.role)) &&
    isArrayOf(value.plannedHires, 100, isPlannedHire) &&
    isArrayOf(value.departureOverrides, 100, isDeparture)
  );
}

function isFiscalYear(value: unknown): value is FiscalYear {
  if (
    !isRecord(value) ||
    !isString(value.id, 100) ||
    !isString(value.label, 50) ||
    !isDate(value.startDate) ||
    !isDate(value.endDate) ||
    !['planning', 'active', 'closed'].includes(String(value.status)) ||
    !isInteger(value.budgetCents, 0) ||
    !isArrayOf(value.periods, 100, isPeriod) ||
    !isArrayOf(value.closures, 1000, isClosure) ||
    !isArrayOf(value.workers, 1000, isWorker) ||
    !isArrayOf(value.adjustments, 20_000, isAdjustment) ||
    !isArrayOf(value.scenarios, 100, isScenario)
  ) return false;
  const year = value as unknown as FiscalYear;
  if (year.startDate > year.endDate || year.periods.length === 0) return false;
  const periods = year.periods.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (periods[0]?.startDate !== year.startDate || periods.at(-1)?.endDate !== year.endDate) return false;
  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index];
    if (!period || period.startDate > period.endDate || period.startDate < year.startDate || period.endDate > year.endDate) return false;
    const next = periods[index + 1];
    if (next) {
      const expectedNext = new Date(`${period.endDate}T00:00:00.000Z`);
      expectedNext.setUTCDate(expectedNext.getUTCDate() + 1);
      if (next.startDate !== expectedNext.toISOString().slice(0, 10)) return false;
    }
  }
  if (year.closures.some((closure) => closure.date < year.startDate || closure.date > year.endDate)) return false;
  const periodIds = new Set(year.periods.map((period) => period.id));
  const workerIds = new Set(year.workers.map((worker) => worker.id));
  if (
    year.workers.some(
      (worker) =>
        worker.activeStart < year.startDate ||
        worker.activeStart > year.endDate ||
        (worker.activeEnd !== undefined && (worker.activeEnd < worker.activeStart || worker.activeEnd > year.endDate)) ||
        worker.schedules.some((schedule) => !periodIds.has(schedule.periodId)),
    )
  ) return false;
  if (year.adjustments.some((adjustment) => !workerIds.has(adjustment.workerId) || adjustment.date < year.startDate || adjustment.date > year.endDate)) return false;
  if (
    year.scenarios.some(
      (scenario) =>
        scenario.plannedHires.some((hire) => hire.startDate < year.startDate || hire.startDate > year.endDate || (hire.endDate !== undefined && hire.endDate < hire.startDate)) ||
        scenario.departureOverrides.some((departure) => !workerIds.has(departure.workerId) || departure.endDate < year.startDate || departure.endDate > year.endDate),
    )
  ) return false;
  return true;
}

export function validateWorkspace(value: unknown): value is Workspace {
  if (!(
    isRecord(value) &&
    value.schemaVersion === WORKSPACE_SCHEMA_VERSION &&
    isString(value.id, 100) &&
    isString(value.name, 150) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    isString(value.activeFiscalYearId, 100) &&
    isArrayOf(value.fiscalYears, 100, isFiscalYear) &&
    value.fiscalYears.some((year) => year.id === value.activeFiscalYearId)
  )) return false;
  const years = value.fiscalYears.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  return years.every((year, index) => index === 0 || Boolean(years[index - 1] && years[index - 1]!.endDate < year.startDate));
}

export function validateWorkspaceJson(json: string): StorageResult<Workspace> {
  if (new TextEncoder().encode(json).byteLength > MAX_WORKSPACE_BYTES) {
    return { ok: false, error: 'The workspace file is larger than the 5 MB safety limit.' };
  }
  try {
    const value: unknown = JSON.parse(json);
    return validateWorkspace(value)
      ? { ok: true, value }
      : { ok: false, error: 'The selected file is not a valid CPD Wage Predictor workspace.' };
  } catch {
    return { ok: false, error: 'The selected file does not contain valid JSON.' };
  }
}
