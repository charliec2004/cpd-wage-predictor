import * as React from 'react';
import { CalendarOff, Clock3, Plus, Trash2 } from 'lucide-react';
import type { AcademicPeriod, FiscalYear, OfficeClosure, RecurringShift, Worker, WorkerSchedule } from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { DatePicker } from '../../components/ui/date-picker';
import { Input } from '../../components/ui/input';
import { NoticePanel } from '../../components/ui/notice-panel';
import { Field, Select } from '../components/form-controls';
import { formatLongDate } from '../domain/dates';
import { addDays } from '../domain/dates';
import { minutesToTime, timeToMinutes } from '../lib/format';

interface ScheduleProps {
  year: FiscalYear;
  onWorkersChange: (workers: Worker[]) => void;
  onClosuresChange: (closures: OfficeClosure[]) => void;
  onPeriodsChange: (periods: AcademicPeriod[]) => void;
}

const days = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

function ensureSchedule(worker: Worker, periodId: string, mode: WorkerSchedule['mode']): WorkerSchedule {
  return worker.schedules.find((schedule) => schedule.periodId === periodId) ?? {
    id: `schedule-${crypto.randomUUID()}`,
    periodId,
    mode,
    recurringShifts: [],
    datedShifts: [],
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

export function Schedule({ year, onWorkersChange, onClosuresChange, onPeriodsChange }: ScheduleProps) {
  const [workerId, setWorkerId] = React.useState(year.workers[0]?.id ?? '');
  const [periodId, setPeriodId] = React.useState(year.periods.find((period) => period.type === 'fall')?.id ?? year.periods[0]?.id ?? '');
  const [datedDraft, setDatedDraft] = React.useState({ date: '', start: '09:00', end: '12:00' });
  const [closureDraft, setClosureDraft] = React.useState({ name: '', date: '', partial: false, start: '15:00', end: '23:59' });
  const worker = year.workers.find((candidate) => candidate.id === workerId);
  const period = year.periods.find((candidate) => candidate.id === periodId);
  const schedule = worker && period ? ensureSchedule(worker, period.id, period.scheduleMode) : null;

  React.useEffect(() => {
    if (!year.workers.some((candidate) => candidate.id === workerId)) setWorkerId(year.workers[0]?.id ?? '');
  }, [workerId, year.workers]);

  const saveSchedule = (next: WorkerSchedule) => {
    if (!worker) return;
    onWorkersChange(year.workers.map((candidate) => candidate.id === worker.id ? replaceSchedule(candidate, next) : candidate));
  };

  const setRecurringDay = (weekday: number, enabled: boolean, startMinute = 540, endMinute = 720) => {
    if (!schedule) return;
    const withoutDay = schedule.recurringShifts.filter((shift) => shift.weekday !== weekday);
    const nextShift: RecurringShift = { id: `shift-${crypto.randomUUID()}`, weekday, startMinute, endMinute };
    saveSchedule({ ...schedule, recurringShifts: enabled ? [...withoutDay, nextShift] : withoutDay });
  };

  const addDatedShift = () => {
    if (!schedule || !datedDraft.date || timeToMinutes(datedDraft.end) <= timeToMinutes(datedDraft.start)) return;
    saveSchedule({
      ...schedule,
      datedShifts: [
        ...schedule.datedShifts,
        {
          id: `dated-${crypto.randomUUID()}`,
          date: datedDraft.date,
          startMinute: timeToMinutes(datedDraft.start),
          endMinute: timeToMinutes(datedDraft.end),
        },
      ],
    });
  };

  const addClosure = () => {
    if (!closureDraft.name.trim() || !closureDraft.date) return;
    const closure: OfficeClosure = {
      id: `closure-${crypto.randomUUID()}`,
      name: closureDraft.name.trim(),
      date: closureDraft.date,
      ...(closureDraft.partial
        ? { startMinute: timeToMinutes(closureDraft.start), endMinute: timeToMinutes(closureDraft.end) }
        : {}),
    };
    onClosuresChange([...year.closures, closure]);
    setClosureDraft({ name: '', date: '', partial: false, start: '15:00', end: '23:59' });
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

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Schedule</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Exact shifts repeat in Fall and Spring; variable periods are entered by date.</p>
      </div>
      {year.workers.length === 0 ? (
        <NoticePanel variant="warning" title="Add a worker first" description="A schedule belongs to a worker and an academic period." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-900/55 p-4">
              <Field label="Worker" className="min-w-52 flex-1"><Select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{year.workers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</Select></Field>
              <Field label="Academic period" className="min-w-52 flex-1"><Select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>{year.periods.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</Select></Field>
              {period && <Badge variant="outline" className="mb-1 capitalize">{period.scheduleMode.replace('-', ' ')}</Badge>}
            </div>
            {schedule && period?.scheduleMode === 'recurring' && (
              <div>
                <div className="grid grid-cols-[minmax(140px,1fr)_140px_140px_80px] border-b border-border bg-surface-900 px-4 py-2 text-[11px] font-medium text-muted-foreground"><span>Day</span><span>Starts</span><span>Ends</span><span className="text-right">Hours</span></div>
                {days.map((day) => {
                  const shift = schedule.recurringShifts.find((candidate) => candidate.weekday === day.value);
                  const checkboxId = `schedule-${worker!.id}-${period.id}-${day.value}`;
                  return (
                    <div key={day.value} className="grid grid-cols-[minmax(140px,1fr)_140px_140px_80px] items-center border-b border-border px-4 py-2.5 last:border-b-0">
                      <div className="flex items-center gap-2"><Checkbox id={checkboxId} checked={Boolean(shift)} onCheckedChange={(checked) => setRecurringDay(day.value, checked === true)} /><label htmlFor={checkboxId} className={`text-[13px] ${shift ? 'font-medium' : 'text-muted-foreground'}`}>{day.label}</label></div>
                      <Input aria-label={`${day.label} start time`} type="time" disabled={!shift} value={shift ? minutesToTime(shift.startMinute) : '09:00'} onChange={(event) => shift && setRecurringDay(day.value, true, timeToMinutes(event.target.value), shift.endMinute)} />
                      <Input aria-label={`${day.label} end time`} type="time" disabled={!shift} value={shift ? minutesToTime(shift.endMinute) : '12:00'} onChange={(event) => shift && timeToMinutes(event.target.value) > shift.startMinute && setRecurringDay(day.value, true, shift.startMinute, timeToMinutes(event.target.value))} />
                      <span className="text-right font-mono text-[12px] text-muted-foreground">{shift ? ((shift.endMinute - shift.startMinute) / 60).toFixed(1) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {schedule && period?.scheduleMode === 'week-specific' && (
              <div className="p-4">
                <div className="grid items-end gap-3 md:grid-cols-[1fr_140px_140px_auto]">
                  <Field label="Work date"><DatePicker required min={period.startDate} max={period.endDate} value={datedDraft.date} onChange={(value) => setDatedDraft({ ...datedDraft, date: value })} aria-label="Work date" /></Field>
                  <Field label="Starts"><Input type="time" value={datedDraft.start} onChange={(event) => setDatedDraft({ ...datedDraft, start: event.target.value })} /></Field>
                  <Field label="Ends"><Input type="time" value={datedDraft.end} onChange={(event) => setDatedDraft({ ...datedDraft, end: event.target.value })} /></Field>
                  <Button onClick={addDatedShift}><Plus className="h-4 w-4" />Add shift</Button>
                </div>
                <div className="mt-4 divide-y divide-border rounded-md border border-border">
                  {schedule.datedShifts.slice().sort((a, b) => a.date.localeCompare(b.date)).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between gap-4 px-3 py-2 text-[12px]"><span className="font-mono">{shift.date}</span><span className="text-muted-foreground">{minutesToTime(shift.startMinute)}–{minutesToTime(shift.endMinute)}</span><Button variant="ghost" size="icon-sm" aria-label="Remove dated shift" onClick={() => saveSchedule({ ...schedule, datedShifts: schedule.datedShifts.filter((candidate) => candidate.id !== shift.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                  ))}
                  {schedule.datedShifts.length === 0 && <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">No shifts entered for this variable period.</p>}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4"><div className="flex items-center gap-2"><CalendarOff className="h-4 w-4 text-muted-foreground" /><h2 className="text-[14px] font-semibold">Office closures</h2></div><p className="mt-1 text-[12px] text-muted-foreground">Closures automatically suppress overlapping planned shifts.</p></div>
            <div className="space-y-3 p-4">
              <Field label="Closure name"><Input placeholder="Office closed" value={closureDraft.name} onChange={(event) => setClosureDraft({ ...closureDraft, name: event.target.value })} /></Field>
              <Field label="Date"><DatePicker required min={year.startDate} max={year.endDate} value={closureDraft.date} onChange={(value) => setClosureDraft({ ...closureDraft, date: value })} aria-label="Closure date" /></Field>
              <div className="flex items-center gap-2"><Checkbox id="partial-closure" checked={closureDraft.partial} onCheckedChange={(checked) => setClosureDraft({ ...closureDraft, partial: checked === true })} /><label htmlFor="partial-closure" className="text-[12px] font-medium">Partial-day closure</label></div>
              {closureDraft.partial && <div className="grid grid-cols-2 gap-3"><Field label="Closed from"><Input type="time" value={closureDraft.start} onChange={(event) => setClosureDraft({ ...closureDraft, start: event.target.value })} /></Field><Field label="Closed until"><Input type="time" value={closureDraft.end} onChange={(event) => setClosureDraft({ ...closureDraft, end: event.target.value })} /></Field></div>}
              <Button className="w-full" variant="outline" onClick={addClosure}><Plus className="h-4 w-4" />Add closure</Button>
            </div>
            <div className="max-h-72 overflow-y-auto border-t border-border">
              {year.closures.slice().sort((a, b) => a.date.localeCompare(b.date)).map((closure) => (
                <div key={closure.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"><Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium">{closure.name}</div><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{formatLongDate(closure.date)}{closure.startMinute !== undefined ? ` · ${minutesToTime(closure.startMinute)}–${minutesToTime(closure.endMinute ?? 1440)}` : ' · all day'}</div></div><Button variant="ghost" size="icon-sm" aria-label={`Remove ${closure.name}`} onClick={() => onClosuresChange(year.closures.filter((candidate) => candidate.id !== closure.id))}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-surface-900/55 px-4 py-3">
          <h2 className="text-[13px] font-semibold">Academic periods for {year.label}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">Changing a boundary moves the adjacent period so every fiscal date remains classified exactly once.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-[12px]">
            <thead className="bg-surface-900 text-[11px] text-muted-foreground"><tr><th className="border-b border-border px-3 py-2 font-medium">Period</th><th className="border-b border-border px-3 py-2 font-medium">Starts</th><th className="border-b border-border px-3 py-2 font-medium">Ends</th><th className="border-b border-border px-3 py-2 font-medium">Schedule style</th><th className="border-b border-border px-3 py-2 font-medium">Work-study eligible</th></tr></thead>
            <tbody>
              {year.periods.map((academicPeriod, index) => {
                const previous = year.periods[index - 1];
                const following = year.periods[index + 1];
                const eligibleId = `period-work-study-${academicPeriod.id}`;
                return (
                  <tr key={academicPeriod.id}>
                    <td className="border-b border-border px-3 py-2.5 font-medium">{academicPeriod.name}</td>
                    <td className="border-b border-border px-3 py-2.5"><DatePicker required aria-label={`${academicPeriod.name} start date`} disabled={index === 0} min={previous ? addDays(previous.startDate, 1) : year.startDate} max={academicPeriod.endDate} value={academicPeriod.startDate} onChange={(value) => changePeriodBoundary(index, 'start', value)} /></td>
                    <td className="border-b border-border px-3 py-2.5"><DatePicker required aria-label={`${academicPeriod.name} end date`} disabled={index === year.periods.length - 1} min={academicPeriod.startDate} max={following ? addDays(following.endDate, -1) : year.endDate} value={academicPeriod.endDate} onChange={(value) => changePeriodBoundary(index, 'end', value)} /></td>
                    <td className="border-b border-border px-3 py-2.5"><Select aria-label={`${academicPeriod.name} schedule style`} value={academicPeriod.scheduleMode} onChange={(event) => onPeriodsChange(year.periods.map((candidate) => candidate.id === academicPeriod.id ? { ...candidate, scheduleMode: event.target.value as AcademicPeriod['scheduleMode'] } : candidate))}><option value="recurring">Recurring weekly</option><option value="week-specific">Week-specific</option></Select></td>
                    <td className="border-b border-border px-3 py-2.5"><div className="flex items-center gap-2"><Checkbox id={eligibleId} checked={academicPeriod.workStudyEligible} onCheckedChange={(checked) => onPeriodsChange(year.periods.map((candidate) => candidate.id === academicPeriod.id ? { ...candidate, workStudyEligible: checked === true } : candidate))} /><label htmlFor={eligibleId} className="text-[12px]">{academicPeriod.workStudyEligible ? 'Eligible' : 'Not eligible'}</label></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
