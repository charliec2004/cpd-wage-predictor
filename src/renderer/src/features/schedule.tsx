import * as React from 'react';
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Repeat2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  isWorkStudyEligiblePeriod,
  type AcademicPeriod,
  type DatedShift,
  type FiscalYear,
  type OfficeClosure,
  type RecurringShift,
  type ScheduleDayOverride,
  type Worker,
  type WorkerSchedule,
} from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { DatePicker } from '../../components/ui/date-picker';
import { DialogShell } from '../../components/ui/dialog-shell';
import { Input } from '../../components/ui/input';
import { NoticePanel } from '../../components/ui/notice-panel';
import { TimePicker } from '../../components/ui/time-picker';
import { Field, Select } from '../components/form-controls';
import { calculateForecast, scheduledPayableMinutes } from '../domain/forecast';
import {
  addDays,
  clampDate,
  formatDateRange,
  formatLongDate,
  formatShortDate,
  isWithin,
  mondayOfWeek,
  todayInLosAngeles,
  weekday,
} from '../domain/dates';
import { formatCurrency, formatTime12Hour } from '../lib/format';

interface ScheduleProps {
  year: FiscalYear;
  onWorkersChange: (workers: Worker[]) => void;
  onClosuresChange: (closures: OfficeClosure[]) => void;
  onPeriodsChange: (periods: AcademicPeriod[]) => void;
  onOpenChanges: (workerId: string, date: string) => void;
  viewRequest?: { key: number; view: ScheduleView } | null;
}

type ScheduleView = 'week' | 'repeating' | 'calendar';

interface ShiftDraft {
  id: string;
  startMinute: number;
  endMinute: number;
}

interface DayEditDraft {
  workerId: string;
  date: string;
  shifts: ShiftDraft[];
  hasExistingOverride: boolean;
}

const days = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

function ensureSchedule(worker: Worker, periodId: string, mode: WorkerSchedule['mode']): WorkerSchedule {
  const existing = worker.schedules.find((schedule) => schedule.periodId === periodId);
  return existing
    ? { ...existing, dayOverrides: existing.dayOverrides ?? [] }
    : {
        id: `schedule-${crypto.randomUUID()}`,
        periodId,
        mode,
        recurringShifts: [],
        datedShifts: [],
        dayOverrides: [],
      };
}

function replaceSchedule(worker: Worker, schedule: WorkerSchedule): Worker {
  const exists = worker.schedules.some((candidate) => candidate.periodId === schedule.periodId);
  return {
    ...worker,
    schedules: exists
      ? worker.schedules.map((candidate) => candidate.periodId === schedule.periodId ? schedule : candidate)
      : [...worker.schedules, schedule],
  };
}

function periodForDate(year: FiscalYear, date: string): AcademicPeriod | undefined {
  return year.periods.find((period) => isWithin(date, period.startDate, period.endDate));
}

function shiftsForDate(worker: Worker, period: AcademicPeriod, date: string): DatedShift[] {
  const schedule = worker.schedules.find((candidate) => candidate.periodId === period.id);
  if (!schedule) return [];
  if (schedule.mode === 'week-specific') return schedule.datedShifts.filter((shift) => shift.date === date);
  const override = schedule.dayOverrides?.find((candidate) => candidate.date === date);
  if (override) return override.shifts;
  return schedule.recurringShifts
    .filter((shift) => shift.weekday === weekday(date))
    .map((shift) => ({ id: shift.id, date, startMinute: shift.startMinute, endMinute: shift.endMinute }));
}

function shiftDrafts(shifts: DatedShift[]): ShiftDraft[] {
  return shifts.map((shift) => ({ id: shift.id, startMinute: shift.startMinute, endMinute: shift.endMinute }));
}

function validShiftDrafts(shifts: ShiftDraft[]): boolean {
  return shifts.every((shift) => shift.endMinute > shift.startMinute);
}

function WeekSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-border pl-4 first:border-l-0 first:pl-0">
      <div className="text-[9px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-[13px] font-semibold">{value}</div>
    </div>
  );
}

export function Schedule({ year, onWorkersChange, onClosuresChange, onPeriodsChange, onOpenChanges, viewRequest }: ScheduleProps) {
  const today = todayInLosAngeles();
  const [view, setView] = React.useState<ScheduleView>('week');
  const [weekStart, setWeekStart] = React.useState(() => mondayOfWeek(clampDate(today, year.startDate, year.endDate)));
  const [workerId, setWorkerId] = React.useState(year.workers[0]?.id ?? '');
  const recurringPeriods = year.periods.filter((period) => period.scheduleMode === 'recurring');
  const [periodId, setPeriodId] = React.useState(recurringPeriods[0]?.id ?? year.periods[0]?.id ?? '');
  const [dayEdit, setDayEdit] = React.useState<DayEditDraft | null>(null);
  const [dayValidation, setDayValidation] = React.useState<string | null>(null);
  const [closureDraft, setClosureDraft] = React.useState({ name: '', date: '', partial: false, startMinute: 900, endMinute: 1439 });

  const weekDates = React.useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEnd = weekDates[6] ?? weekStart;
  const forecast = React.useMemo(() => calculateForecast(year, today), [today, year]);
  const weekRows = forecast.daily.filter((row) => row.date >= weekStart && row.date <= weekEnd);
  const weekTotals = weekRows.reduce(
    (totals, row) => ({
      minutes: totals.minutes + row.minutes,
      gross: totals.gross + row.grossWagesCents,
      workStudy: totals.workStudy + row.workStudyCoveredCents,
      cpd: totals.cpd + row.cpdCostCents,
    }),
    { minutes: 0, gross: 0, workStudy: 0, cpd: 0 },
  );
  const visiblePeriods = year.periods.filter((period) => weekDates.some((date) => isWithin(date, period.startDate, period.endDate)));
  const weekContextLabels = visiblePeriods.map((item) => {
    const finalsStart = item.finalsStartDate;
    const finalsEnd = item.finalsEndDate;
    const includesFinals = Boolean(finalsStart && finalsEnd && weekDates.some((date) => isWithin(date, finalsStart, finalsEnd)));
    return includesFinals ? `${item.name} finals` : item.name;
  });
  const worker = year.workers.find((candidate) => candidate.id === workerId);
  const period = year.periods.find((candidate) => candidate.id === periodId);
  const schedule = worker && period ? ensureSchedule(worker, period.id, period.scheduleMode) : null;

  React.useEffect(() => {
    if (!year.workers.some((candidate) => candidate.id === workerId)) setWorkerId(year.workers[0]?.id ?? '');
  }, [workerId, year.workers]);

  React.useEffect(() => {
    setWeekStart(mondayOfWeek(clampDate(today, year.startDate, year.endDate)));
  }, [today, year.id, year.startDate, year.endDate]);

  React.useEffect(() => {
    if (viewRequest) setView(viewRequest.view);
  }, [viewRequest]);

  const saveSchedule = (targetWorkerId: string, next: WorkerSchedule) => {
    onWorkersChange(year.workers.map((candidate) => candidate.id === targetWorkerId ? replaceSchedule(candidate, next) : candidate));
  };

  const setRecurringDay = (day: number, enabled: boolean, startMinute = 540, endMinute = 720) => {
    if (!schedule || !worker) return;
    const withoutDay = schedule.recurringShifts.filter((shift) => shift.weekday !== day);
    const nextShift: RecurringShift = { id: `shift-${crypto.randomUUID()}`, weekday: day, startMinute, endMinute };
    saveSchedule(worker.id, { ...schedule, recurringShifts: enabled ? [...withoutDay, nextShift] : withoutDay });
  };

  const openDayEditor = (targetWorker: Worker, date: string) => {
    if (!isWithin(date, year.startDate, year.endDate)) return;
    const targetPeriod = periodForDate(year, date);
    if (!targetPeriod) return;
    const targetSchedule = ensureSchedule(targetWorker, targetPeriod.id, targetPeriod.scheduleMode);
    const existingOverride = targetSchedule.dayOverrides?.find((override) => override.date === date);
    setDayEdit({
      workerId: targetWorker.id,
      date,
      shifts: shiftDrafts(shiftsForDate(targetWorker, targetPeriod, date)),
      hasExistingOverride: Boolean(existingOverride),
    });
    setDayValidation(null);
  };

  const saveDayEdit = () => {
    if (!dayEdit || !validShiftDrafts(dayEdit.shifts)) {
      setDayValidation('Every shift must end after it starts.');
      return;
    }
    const targetWorker = year.workers.find((candidate) => candidate.id === dayEdit.workerId);
    const targetPeriod = periodForDate(year, dayEdit.date);
    if (!targetWorker || !targetPeriod) return;
    const targetSchedule = ensureSchedule(targetWorker, targetPeriod.id, targetPeriod.scheduleMode);
    const shifts: DatedShift[] = dayEdit.shifts.map((shift) => ({
      id: shift.id || `dated-${crypto.randomUUID()}`,
      date: dayEdit.date,
      startMinute: shift.startMinute,
      endMinute: shift.endMinute,
    }));
    if (targetSchedule.mode === 'recurring') {
      const override: ScheduleDayOverride = { id: `day-${crypto.randomUUID()}`, date: dayEdit.date, shifts };
      saveSchedule(targetWorker.id, {
        ...targetSchedule,
        dayOverrides: [...(targetSchedule.dayOverrides ?? []).filter((candidate) => candidate.date !== dayEdit.date), override],
      });
    } else {
      saveSchedule(targetWorker.id, {
        ...targetSchedule,
        datedShifts: [...targetSchedule.datedShifts.filter((shift) => shift.date !== dayEdit.date), ...shifts],
      });
    }
    setDayEdit(null);
  };

  const restoreRepeatingDay = () => {
    if (!dayEdit) return;
    const targetWorker = year.workers.find((candidate) => candidate.id === dayEdit.workerId);
    const targetPeriod = periodForDate(year, dayEdit.date);
    if (!targetWorker || !targetPeriod) return;
    const targetSchedule = ensureSchedule(targetWorker, targetPeriod.id, targetPeriod.scheduleMode);
    saveSchedule(targetWorker.id, {
      ...targetSchedule,
      dayOverrides: (targetSchedule.dayOverrides ?? []).filter((candidate) => candidate.date !== dayEdit.date),
    });
    setDayEdit(null);
  };

  const editRepeatingFromDay = () => {
    if (!dayEdit) return;
    const targetPeriod = periodForDate(year, dayEdit.date);
    setWorkerId(dayEdit.workerId);
    if (targetPeriod) setPeriodId(targetPeriod.id);
    setView('repeating');
    setDayEdit(null);
  };

  const addClosure = () => {
    if (!closureDraft.name.trim() || !closureDraft.date) return;
    const closure: OfficeClosure = {
      id: `closure-${crypto.randomUUID()}`,
      name: closureDraft.name.trim(),
      date: closureDraft.date,
      ...(closureDraft.partial
        ? { startMinute: closureDraft.startMinute, endMinute: closureDraft.endMinute }
        : {}),
    };
    onClosuresChange([...year.closures, closure]);
    setClosureDraft({ name: '', date: '', partial: false, startMinute: 900, endMinute: 1439 });
  };

  const changePeriodBoundary = (index: number, edge: 'start' | 'end', value: string) => {
    const next = year.periods.map((item) => ({ ...item }));
    const target = next[index];
    if (!target) return;
    if (edge === 'start') {
      target.startDate = value;
      const previous = next[index - 1];
      if (previous) previous.endDate = addDays(value, -1);
    } else {
      target.endDate = value;
      const following = next[index + 1];
      if (following) following.startDate = addDays(value, 1);
    }
    onPeriodsChange(next);
  };

  const changeFinalsRange = (periodToChange: AcademicPeriod, edge: 'start' | 'end', value: string) => {
    onPeriodsChange(year.periods.map((candidate) => {
      if (candidate.id !== periodToChange.id) return candidate;
      if (!value) return { ...candidate, finalsStartDate: undefined, finalsEndDate: undefined };
      if (edge === 'start') {
        return {
          ...candidate,
          finalsStartDate: value,
          finalsEndDate: candidate.finalsEndDate && candidate.finalsEndDate >= value ? candidate.finalsEndDate : candidate.endDate,
        };
      }
      return { ...candidate, finalsStartDate: candidate.finalsStartDate ?? value, finalsEndDate: value };
    }));
  };

  const dayEditWorker = dayEdit ? year.workers.find((candidate) => candidate.id === dayEdit.workerId) : undefined;
  const dayEditPeriod = dayEdit ? periodForDate(year, dayEdit.date) : undefined;
  const dayEditPast = Boolean(dayEdit && dayEdit.date < today);
  const dayEditClosure = dayEdit ? year.closures.find((closure) => closure.date === dayEdit.date) : undefined;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Plan exact shifts by week without changing recorded history.</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface-900 p-1" aria-label="Schedule view">
          <Button size="sm" variant={view === 'week' ? 'secondary' : 'ghost'} onClick={() => setView('week')}><CalendarDays className="h-3.5 w-3.5" />Week plan</Button>
          <Button size="sm" variant={view === 'repeating' ? 'secondary' : 'ghost'} onClick={() => setView('repeating')}><Repeat2 className="h-3.5 w-3.5" />Repeating</Button>
          <Button size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} onClick={() => setView('calendar')}><CalendarOff className="h-3.5 w-3.5" />Fiscal year setup</Button>
        </div>
      </div>

      {view !== 'calendar' && year.workers.length === 0 ? (
        <NoticePanel variant="warning" title="Add a worker first" description="Each shift belongs to a worker and an academic period." />
      ) : view === 'week' ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Previous week" disabled={addDays(weekStart, -1) < year.startDate} onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="min-w-48 text-center">
                <div className="font-mono text-[13px] font-semibold">{formatDateRange(weekStart, weekEnd)}</div>
                <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  {weekContextLabels.map((label) => <span key={label}>{label}</span>).reduce<React.ReactNode[]>((parts, item, index) => index === 0 ? [item] : [...parts, <span key={`dot-${index}`}>·</span>, item], [])}
                </div>
              </div>
              <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={addDays(weekStart, 7) > year.endDate} onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(mondayOfWeek(clampDate(today, year.startDate, year.endDate)))}>Today</Button>
            </div>
            <div className="grid min-w-[430px] grid-cols-4 gap-4">
              <WeekSummary label="Hours" value={`${(weekTotals.minutes / 60).toFixed(1)}h`} />
              <WeekSummary label="Gross wages" value={formatCurrency(weekTotals.gross)} />
              <WeekSummary label="Work-study" value={formatCurrency(weekTotals.workStudy)} />
              <WeekSummary label="CPD budget" value={formatCurrency(weekTotals.cpd)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[180px_repeat(7,minmax(120px,1fr))] border-b border-border bg-surface-900/65">
                <div className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Worker</div>
                {weekDates.map((date, index) => {
                  const closure = year.closures.find((item) => item.date === date);
                  const inYear = isWithin(date, year.startDate, year.endDate);
                  const isToday = date === today;
                  return (
                    <div key={date} className={`border-l border-border px-3 py-2.5 ${isToday ? 'bg-[hsl(var(--action-primary)/0.1)]' : ''} ${!inYear ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{days[index]?.short}</span>{isToday && <Badge className="border-[hsl(var(--action-primary-border)/0.45)] bg-[hsl(var(--action-primary)/0.12)] text-[hsl(var(--success-accent))]">Today</Badge>}</div>
                      <div className="mt-1 font-mono text-[12px] font-semibold">{formatShortDate(date)}</div>
                      {closure && <div className="mt-1 truncate text-[9px] text-warning-700 dark:text-warning-300">{closure.name}</div>}
                    </div>
                  );
                })}
              </div>

              {year.workers.map((item) => {
                const workerRows = weekRows.filter((row) => row.workerId === item.id);
                const workerMinutes = workerRows.reduce((total, row) => total + row.minutes, 0);
                return (
                  <div key={item.id} className="grid min-h-[92px] grid-cols-[180px_repeat(7,minmax(120px,1fr))] border-b border-border last:border-b-0">
                    <div className="px-4 py-3">
                      <div className="truncate text-[12px] font-semibold">{item.name}</div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{(workerMinutes / 60).toFixed(1)}h this week</div>
                      {item.status !== 'active' && <Badge variant="outline" className="mt-2 capitalize">{item.status}</Badge>}
                    </div>
                    {weekDates.map((date) => {
                      const inYear = isWithin(date, year.startDate, year.endDate);
                      const datePeriod = periodForDate(year, date);
                      const shifts = datePeriod ? shiftsForDate(item, datePeriod, date) : [];
                      const row = workerRows.find((candidate) => candidate.date === date);
                      const dateSchedule = datePeriod ? item.schedules.find((candidate) => candidate.periodId === datePeriod.id) : undefined;
                      const changedDay = Boolean(dateSchedule?.dayOverrides?.some((override) => override.date === date));
                      const corrected = row?.state === 'corrected';
                      return (
                        <button
                          key={date}
                          type="button"
                          disabled={!inYear}
                          onClick={() => openDayEditor(item, date)}
                          className="group border-l border-border px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-default disabled:opacity-35"
                        >
                          {shifts.length > 0 ? shifts.map((shift) => <div key={shift.id} className="font-mono text-[10px] font-medium">{formatTime12Hour(shift.startMinute)}–{formatTime12Hour(shift.endMinute)}</div>) : <div className="text-[11px] text-muted-foreground">No shift</div>}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">{row && row.minutes > 0 ? `${(row.minutes / 60).toFixed(1)}h` : '—'}</span>
                            {(changedDay || corrected) && <span className="text-[9px] font-medium text-[hsl(var(--success-accent))]">{corrected ? 'Corrected' : 'Changed'}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-900/35 px-4 py-2.5 text-[10px] text-muted-foreground">
            <span>Select a day to change its exact shifts. Past days open the Changes workflow.</span>
            <span>Hours to date come from the schedule unless corrected in Changes.</span>
          </div>
        </section>
      ) : view === 'repeating' ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-900/55 p-4">
            <Field label="Worker" className="min-w-52 flex-1"><Select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{year.workers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</Select></Field>
            <Field label="Repeating period" className="min-w-52 flex-1"><Select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>{recurringPeriods.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {formatDateRange(candidate.startDate, candidate.endDate)}</option>)}</Select></Field>
            {period && <Badge variant="outline" className="mb-1">Repeats weekly</Badge>}
          </div>
          {schedule && period?.scheduleMode === 'recurring' ? (
            <div>
              <div className="border-b border-border px-4 py-3 text-[11px] text-muted-foreground">Changes here apply every week in {period.name}. To change only one date, use Week plan.</div>
              <div className="grid grid-cols-[minmax(140px,1fr)_160px_160px_90px] border-b border-border bg-surface-900 px-4 py-2 text-[11px] font-medium text-muted-foreground"><span>Day</span><span>Starts</span><span>Ends</span><span className="text-right">Hours</span></div>
              {days.map((day) => {
                const shift = schedule.recurringShifts.find((candidate) => candidate.weekday === day.value);
                const checkboxId = `schedule-${worker!.id}-${period.id}-${day.value}`;
                return (
                  <div key={day.value} className="grid grid-cols-[minmax(140px,1fr)_160px_160px_90px] items-center border-b border-border px-4 py-2.5 last:border-b-0">
                    <div className="flex items-center gap-2"><Checkbox id={checkboxId} checked={Boolean(shift)} onCheckedChange={(checked) => setRecurringDay(day.value, checked === true)} /><label htmlFor={checkboxId} className={`text-[13px] ${shift ? 'font-medium' : 'text-muted-foreground'}`}>{day.label}</label></div>
                    <TimePicker aria-label={`${day.label} start time`} disabled={!shift} value={shift?.startMinute ?? 540} onValueChange={(value) => shift && value < shift.endMinute && setRecurringDay(day.value, true, value, shift.endMinute)} />
                    <TimePicker aria-label={`${day.label} end time`} disabled={!shift} value={shift?.endMinute ?? 720} onValueChange={(value) => shift && value > shift.startMinute && setRecurringDay(day.value, true, shift.startMinute, value)} />
                    <span className="text-right font-mono text-[12px] text-muted-foreground">{shift ? `${(scheduledPayableMinutes([shift]) / 60).toFixed(1)} paid` : '—'}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className="px-6 py-16 text-center text-[12px] text-muted-foreground">Choose a period that repeats weekly.</div>}
        </section>
      ) : (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border bg-surface-900/55 px-4 py-3">
              <h2 className="text-[13px] font-semibold">Fiscal-year calendar for {year.label}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Set Summer and semester boundaries here. Finals are visual context only and never reduce scheduled hours automatically.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-[12px]">
                <thead className="bg-surface-900 text-[11px] text-muted-foreground"><tr><th className="border-b border-border px-3 py-2 font-medium">Period</th><th className="border-b border-border px-3 py-2 font-medium">Starts</th><th className="border-b border-border px-3 py-2 font-medium">Ends</th><th className="border-b border-border px-3 py-2 font-medium">Finals dates · visual only</th><th className="border-b border-border px-3 py-2 font-medium">Schedule entry</th><th className="border-b border-border px-3 py-2 font-medium">Work-study</th></tr></thead>
                <tbody>
                  {year.periods.map((academicPeriod, index) => {
                    const previous = year.periods[index - 1];
                    const following = year.periods[index + 1];
                    const canHaveFinals = academicPeriod.type === 'fall' || academicPeriod.type === 'spring';
                    const workStudyAvailable = isWorkStudyEligiblePeriod(academicPeriod);
                    return (
                      <tr key={academicPeriod.id}>
                        <td className="border-b border-border px-3 py-2.5"><div className="font-medium">{academicPeriod.name}</div><div className="mt-0.5 text-[10px] capitalize text-muted-foreground">{academicPeriod.type}</div></td>
                        <td className="border-b border-border px-3 py-2.5"><DatePicker required aria-label={`${academicPeriod.name} start date`} disabled={index === 0} min={previous ? addDays(previous.startDate, 1) : year.startDate} max={academicPeriod.endDate} value={academicPeriod.startDate} onChange={(value) => changePeriodBoundary(index, 'start', value)} /></td>
                        <td className="border-b border-border px-3 py-2.5"><DatePicker required aria-label={`${academicPeriod.name} end date`} disabled={index === year.periods.length - 1} min={academicPeriod.startDate} max={following ? addDays(following.endDate, -1) : year.endDate} value={academicPeriod.endDate} onChange={(value) => changePeriodBoundary(index, 'end', value)} /></td>
                        <td className="border-b border-border px-3 py-2.5">
                          {canHaveFinals ? (
                            <div className="grid grid-cols-2 gap-2">
                              <DatePicker aria-label={`${academicPeriod.name} finals start`} min={academicPeriod.startDate} max={academicPeriod.finalsEndDate ?? academicPeriod.endDate} value={academicPeriod.finalsStartDate ?? ''} onChange={(value) => changeFinalsRange(academicPeriod, 'start', value)} placeholder="Starts" />
                              <DatePicker aria-label={`${academicPeriod.name} finals end`} disabled={!academicPeriod.finalsStartDate} min={academicPeriod.finalsStartDate ?? academicPeriod.startDate} max={academicPeriod.endDate} value={academicPeriod.finalsEndDate ?? ''} onChange={(value) => changeFinalsRange(academicPeriod, 'end', value)} placeholder="Ends" />
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="border-b border-border px-3 py-2.5"><Select aria-label={`${academicPeriod.name} schedule style`} value={academicPeriod.scheduleMode} onChange={(event) => onPeriodsChange(year.periods.map((candidate) => candidate.id === academicPeriod.id ? { ...candidate, scheduleMode: event.target.value as AcademicPeriod['scheduleMode'] } : candidate))}><option value="recurring">Repeats weekly</option><option value="week-specific">Plan week by week</option></Select></td>
                        <td className="border-b border-border px-3 py-2.5"><div className={`flex items-center gap-2 font-medium ${workStudyAvailable ? '' : 'text-muted-foreground'}`}><span className={`h-2 w-2 rounded-full ${workStudyAvailable ? 'bg-surface-400' : 'border border-surface-500'}`} />{workStudyAvailable ? 'Available' : 'Not available · Summer'}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><div className="flex items-center gap-2"><CalendarOff className="h-4 w-4 text-muted-foreground" /><h2 className="text-[14px] font-semibold">Non-working days & early closures</h2></div><p className="mt-1 text-[12px] text-muted-foreground">These dates remove overlapping scheduled hours from the forecast. Use an all-day closure or enter only the hours CPD is closed.</p></div>
            <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-3 border-b border-border p-4 lg:border-b-0 lg:border-r">
                <Field label="Closure name"><Input placeholder="Office closed" value={closureDraft.name} onChange={(event) => setClosureDraft({ ...closureDraft, name: event.target.value })} /></Field>
                <Field label="Date"><DatePicker required min={year.startDate} max={year.endDate} value={closureDraft.date} onChange={(value) => setClosureDraft({ ...closureDraft, date: value })} aria-label="Closure date" /></Field>
                <div className="flex items-center gap-2"><Checkbox id="partial-closure" checked={closureDraft.partial} onCheckedChange={(checked) => setClosureDraft({ ...closureDraft, partial: checked === true })} /><label htmlFor="partial-closure" className="text-[12px] font-medium">Early or partial closure</label></div>
                {closureDraft.partial && <div className="grid grid-cols-2 gap-3"><Field label="Closed from"><TimePicker aria-label="Closure start time" value={closureDraft.startMinute} onValueChange={(value) => setClosureDraft({ ...closureDraft, startMinute: value })} /></Field><Field label="Closed until"><TimePicker aria-label="Closure end time" value={closureDraft.endMinute} onValueChange={(value) => setClosureDraft({ ...closureDraft, endMinute: value })} /></Field></div>}
                <Button className="w-full" variant="outline" onClick={addClosure}><Plus className="h-4 w-4" />Add closure</Button>
              </div>
              <div className="max-h-72 overflow-y-auto">
              {year.closures.slice().sort((a, b) => a.date.localeCompare(b.date)).map((closure) => (
                <div key={closure.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"><Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium">{closure.name}</div><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{formatLongDate(closure.date)}{closure.startMinute !== undefined ? ` · ${formatTime12Hour(closure.startMinute)}–${formatTime12Hour(closure.endMinute ?? 1440)}` : ' · all day'}</div></div><Button variant="ghost" size="icon-sm" aria-label={`Remove ${closure.name}`} onClick={() => onClosuresChange(year.closures.filter((candidate) => candidate.id !== closure.id))}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <DialogShell
        open={Boolean(dayEdit)}
        onClose={() => setDayEdit(null)}
        title={dayEdit && dayEditWorker ? `${dayEditWorker.name} · ${formatLongDate(dayEdit.date)}` : 'Edit day'}
        description={dayEditPeriod ? `${dayEditPeriod.name} · ${dayEditPeriod.scheduleMode === 'recurring' ? 'normally repeats weekly' : 'planned one week at a time'}` : undefined}
        widthClassName="max-w-lg"
        footer={dayEditPast ? (
          <><Button variant="outline" onClick={() => setDayEdit(null)}>Cancel</Button><Button onClick={() => { if (dayEdit) onOpenChanges(dayEdit.workerId, dayEdit.date); setDayEdit(null); }}>Open Changes</Button></>
        ) : (
          <><Button variant="outline" onClick={() => setDayEdit(null)}>Cancel</Button><Button onClick={saveDayEdit}>Save this day</Button></>
        )}
      >
        {dayEditPast ? (
          <NoticePanel
            variant="info"
            title="Past schedules are preserved"
            description="This day is already treated as worked according to its schedule. Use Changes to record what actually differed without altering the repeating plan."
          />
        ) : dayEdit ? (
          <div className="space-y-4">
            {dayEditPeriod?.scheduleMode === 'recurring' && (
              <div className="rounded-lg border border-border bg-surface-900/55 p-3">
                <div className="text-[12px] font-semibold">Change only this date</div>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Saving here leaves every other week unchanged.</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={editRepeatingFromDay}><Repeat2 className="h-3.5 w-3.5" />Edit the repeating schedule instead</Button>
              </div>
            )}
            {dayEditClosure && <NoticePanel variant="warning" title={dayEditClosure.name} description="The forecast will remove any part of these shifts that overlaps the office closure." />}
            <div className="space-y-2">
              {dayEdit.shifts.map((shift, index) => (
                <div key={shift.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <Field label={index === 0 ? 'Starts' : undefined}><TimePicker aria-label={`Shift ${index + 1} start time`} value={shift.startMinute} onValueChange={(value) => setDayEdit({ ...dayEdit, shifts: dayEdit.shifts.map((candidate) => candidate.id === shift.id ? { ...candidate, startMinute: value } : candidate) })} /></Field>
                  <Field label={index === 0 ? 'Ends' : undefined}><TimePicker aria-label={`Shift ${index + 1} end time`} value={shift.endMinute} onValueChange={(value) => setDayEdit({ ...dayEdit, shifts: dayEdit.shifts.map((candidate) => candidate.id === shift.id ? { ...candidate, endMinute: value } : candidate) })} /></Field>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove shift" onClick={() => setDayEdit({ ...dayEdit, shifts: dayEdit.shifts.filter((candidate) => candidate.id !== shift.id) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {dayEdit.shifts.length === 0 && <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">No work scheduled for this date.</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDayEdit({ ...dayEdit, shifts: [...dayEdit.shifts, { id: `draft-${crypto.randomUUID()}`, startMinute: 540, endMinute: 720 }] })}><Plus className="h-3.5 w-3.5" />Add shift</Button>
              {dayEditPeriod?.scheduleMode === 'recurring' && dayEdit.hasExistingOverride && <Button variant="ghost" size="sm" onClick={restoreRepeatingDay}><RotateCcw className="h-3.5 w-3.5" />Use repeating schedule</Button>}
            </div>
            {dayValidation && <p className="text-[12px] text-destructive">{dayValidation}</p>}
          </div>
        ) : null}
      </DialogShell>
    </div>
  );
}
