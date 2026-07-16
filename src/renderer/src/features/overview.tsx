import * as React from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CalendarRange, Check, CircleDollarSign, Clock3, GitBranch, Pencil, WalletCards } from 'lucide-react';
import { isWorkStudyEligiblePeriod, type FiscalYear } from '../../../shared/workspace';
import { ActionSelect } from '../../components/ui/action-select';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DatePicker } from '../../components/ui/date-picker';
import type { ForecastCoverageSegment, ForecastRange, ForecastResult, WeeklyForecastRow } from '../domain/forecast';
import { addDays, formatDateRange, formatLongDate, formatShortDate, parseIsoDate } from '../domain/dates';
import { formatCurrency, formatCurrencyPrecise } from '../lib/format';
import { Field, MoneyInput } from '../components/form-controls';
import { budgetHealth, type BudgetHealth } from '../domain/budget-health';

interface OverviewProps {
  year: FiscalYear;
  forecast: ForecastResult;
  forecastRange: ForecastRange;
  asOfDate: string;
  scenarioId: string | null;
  onAsOfDateChange: (date: string) => void;
  onScenarioChange: (scenarioId: string | null) => void;
  onBudgetChange: (budgetCents: number) => void;
  onOpenWorkers: () => void;
  onOpenSchedule: () => void;
  onOpenYearSetup: () => void;
  onOpenForecasts: () => void;
  onAddScenario: () => void;
}

function stateBadge(row: WeeklyForecastRow) {
  if (row.state === 'assumed-worked') return <Badge variant="outline">Hours to date</Badge>;
  if (row.state === 'corrected') return <Badge variant="outline">Corrected hours</Badge>;
  if (row.state === 'mixed') return <Badge className="border-warning-500/40 bg-warning-500/10 text-warning-700 dark:text-warning-300">This week</Badge>;
  if (row.state === 'estimated') return <Badge className="border-dashed border-surface-500 bg-transparent text-foreground">Estimated</Badge>;
  if (row.state === 'missing') return <Badge variant="outline" className="border-dashed">Not forecast</Badge>;
  if (row.state === 'scenario') return <Badge className="border-dashed">Scenario</Badge>;
  return <Badge variant="secondary">Scheduled</Badge>;
}

function Step({ number, title, detail, complete, children }: { number: number; title: string; detail: string; complete: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-5 py-5">
      <div
        className={complete
          ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--action-primary))] text-[hsl(var(--action-primary-foreground))]'
          : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[11px] font-semibold text-muted-foreground'}
        aria-label={complete ? `${title} complete` : `Step ${number}`}
      >
        {complete ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">{detail}</div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function SetupPath({ year, budgetDraft, setBudgetDraft, commitBudget, onOpenWorkers, onOpenSchedule }: {
  year: FiscalYear;
  budgetDraft: string;
  setBudgetDraft: (value: string) => void;
  commitBudget: (value?: string) => void;
  onOpenWorkers: () => void;
  onOpenSchedule: () => void;
}) {
  const shiftCount = year.workers.reduce(
    (total, worker) => total + worker.schedules.reduce((sum, schedule) => sum + schedule.recurringShifts.length + schedule.datedShifts.length, 0),
    0,
  );
  const hasBudget = year.budgetCents > 0;
  const hasWorkers = year.workers.length > 0;
  const hasSchedule = shiftCount > 0;

  return (
    <section className="mt-8" aria-labelledby="setup-heading">
      <div className="mb-3">
        <h2 id="setup-heading" className="text-[15px] font-semibold">Set up this fiscal year</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">Three inputs are needed before there is a forecast.</p>
      </div>
      <div className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-3 md:divide-x md:divide-border">
        <Step number={1} title="Budget" detail={hasBudget ? formatCurrency(year.budgetCents) : 'Enter the annual student-wage budget.'} complete={hasBudget}>
          <div className="flex max-w-64 gap-2">
            <MoneyInput
              aria-label="Student-worker budget"
              placeholder="Enter amount"
              value={budgetDraft}
              onValueChange={(value) => {
                setBudgetDraft(value);
                commitBudget(value);
              }}
            />
            {!hasBudget && <Button size="sm" onClick={() => commitBudget()}>Set</Button>}
          </div>
        </Step>
        <Step number={2} title="Workers" detail={hasWorkers ? `${year.workers.length} added` : 'Add wages and work-study details.'} complete={hasWorkers}>
          <Button variant={hasBudget && !hasWorkers ? 'default' : 'outline'} size="sm" onClick={onOpenWorkers}>
            {hasWorkers ? 'Review workers' : 'Add workers'}<ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Step>
        <Step number={3} title="Schedules" detail={hasSchedule ? `${shiftCount} shift${shiftCount === 1 ? '' : 's'} scheduled` : 'Add recurring or week-specific shifts.'} complete={hasSchedule}>
          <Button variant={hasWorkers && !hasSchedule ? 'default' : 'outline'} size="sm" onClick={onOpenSchedule} disabled={!hasWorkers}>
            {hasSchedule ? 'Review schedule' : 'Build schedule'}<ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Step>
      </div>
    </section>
  );
}

function daysInclusive(startDate: string, endDate: string): number {
  return Math.max(0, Math.floor((parseIsoDate(endDate).getTime() - parseIsoDate(startDate).getTime()) / 86_400_000) + 1);
}

function FiscalContext({ year, asOfDate, onOpenYearSetup }: { year: FiscalYear; asOfDate: string; onOpenYearSetup: () => void }) {
  const currentPeriod = year.periods.find((period) => asOfDate >= period.startDate && asOfDate <= period.endDate);
  const nextPeriod = year.periods.find((period) => period.startDate > asOfDate);
  const nextClosure = year.closures.find((closure) => closure.date >= asOfDate);
  const remainingDays = daysInclusive(asOfDate, year.endDate);
  const visiblePeriods = year.periods.filter((period) => daysInclusive(period.startDate, period.endDate) >= 7);
  const currentUsesWorkStudy = currentPeriod ? isWorkStudyEligiblePeriod(currentPeriod) : false;
  const currentIsFinals = Boolean(currentPeriod?.finalsStartDate && currentPeriod.finalsEndDate && asOfDate >= currentPeriod.finalsStartDate && asOfDate <= currentPeriod.finalsEndDate);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="fiscal-calendar-heading">
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><CalendarRange className="h-4 w-4" />As of {formatShortDate(asOfDate)}</div>
          <div className="mt-3 text-[20px] font-semibold tracking-tight">{currentPeriod ? `${currentPeriod.name}${currentIsFinals ? ' · Finals' : ''}` : 'Outside this fiscal year'}</div>
          {currentPeriod && <div className="mt-1 font-mono text-[12px] text-muted-foreground">{formatDateRange(currentPeriod.startDate, currentPeriod.endDate)}</div>}
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
            <div><div className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground">Work-study</div><div className={`mt-1 text-[12px] font-semibold ${currentUsesWorkStudy ? '' : 'text-muted-foreground'}`}>{currentUsesWorkStudy ? 'Available now' : 'Not available · Summer'}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground">FY remaining</div><div className="mt-1 font-mono text-[12px] font-semibold">{remainingDays} days</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground">Next period</div><div className="mt-1 text-[12px] font-semibold">{nextPeriod ? `${nextPeriod.name} · ${formatShortDate(nextPeriod.startDate)}` : 'Fiscal-year close'}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground">Next closure</div><div className="mt-1 text-[12px] font-semibold">{nextClosure ? `${formatShortDate(nextClosure.date)} · ${nextClosure.name}` : 'None remaining'}</div></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id="fiscal-calendar-heading" className="text-[14px] font-semibold">How this year is modeled</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Only Summer is outside work-study. Finals dates are visual context and do not change hours.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenYearSetup}>Configure year<ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-[minmax(160px,1.15fr)_minmax(150px,1fr)_minmax(150px,1fr)] border-b border-border bg-surface-900 px-5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            <span>Academic period</span><span>Schedule entry</span><span>Wage coverage</span>
          </div>
          <div className="divide-y divide-border">
            {visiblePeriods.map((period) => {
              const current = period.id === currentPeriod?.id;
              const workStudyAvailable = isWorkStudyEligiblePeriod(period);
              return (
                <div key={period.id} className={`grid grid-cols-[minmax(160px,1.15fr)_minmax(150px,1fr)_minmax(150px,1fr)] items-center gap-3 px-5 py-2.5 text-[11px] ${current ? 'bg-[hsl(var(--action-primary)/0.08)]' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="truncate text-[12px] font-semibold">{period.name}</span>{current && <Badge className="border-[hsl(var(--action-primary-border)/0.45)] bg-[hsl(var(--action-primary)/0.12)] text-[hsl(var(--success-accent))]">Current</Badge>}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{formatDateRange(period.startDate, period.endDate)}</div>
                    {period.finalsStartDate && period.finalsEndDate && <div className="mt-0.5 text-[9px] text-muted-foreground">Finals · {formatDateRange(period.finalsStartDate, period.finalsEndDate)}</div>}
                  </div>
                  <div className="text-muted-foreground">{period.scheduleMode === 'recurring' ? 'Repeats each week' : 'Enter week by week'}</div>
                  <div className={`flex items-center gap-2 font-medium ${workStudyAvailable ? '' : 'text-muted-foreground'}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${workStudyAvailable ? 'bg-surface-400' : 'border border-surface-500'}`} />
                    {workStudyAvailable ? 'Work-study available' : 'Not available · Summer'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border px-5 py-2.5 text-[10px] text-muted-foreground">Office closures remove overlapping scheduled hours automatically.</div>
        </div>
      </div>
    </section>
  );
}

const coverageBarClass: Record<ForecastCoverageSegment['state'], string> = {
  'assumed-worked': 'timeline-worked',
  corrected: 'timeline-worked',
  scheduled: 'timeline-scheduled',
  estimated: 'timeline-estimated',
  'assumed-and-estimated': 'timeline-worked-estimated',
  'scheduled-and-estimated': 'timeline-scheduled-estimated',
  'no-staffing': 'timeline-no-staffing',
  missing: 'timeline-missing',
};

function ForecastRunway({ year, forecast }: { year: FiscalYear; forecast: ForecastResult }) {
  const { asOfDate, coverageSegments, totals } = forecast;
  const start = parseIsoDate(year.startDate).getTime();
  const endExclusive = parseIsoDate(addDays(year.endDate, 1)).getTime();
  const duration = endExclusive - start;
  const seam = Math.min(100, Math.max(0, ((parseIsoDate(addDays(asOfDate, 1)).getTime() - start) / duration) * 100));
  const firstMonth = parseIsoDate(year.startDate);
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
    const nextMonth = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index + 1, 1));
    const visibleStart = Math.max(start, monthStart.getTime());
    const visibleEnd = Math.min(endExclusive, nextMonth.getTime());
    return {
      label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(monthStart),
      left: ((visibleStart - start) / duration) * 100,
      width: (Math.max(0, visibleEnd - visibleStart) / duration) * 100,
    };
  }).filter((month) => month.width > 0);
  const hoursToDate = totals.assumedWorkedHours + totals.correctedHours;
  const missingPeriods = forecast.coverage.filter((period) => period.status === 'missing').length;
  const hasNoStaffing = coverageSegments.some((segment) => segment.state === 'no-staffing');
  return (
    <section className="border-t border-border px-5 py-4" aria-label="Forecast coverage by date">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[13px] font-semibold">Forecast coverage by date</h2>
        <div className="font-mono text-[10px] text-muted-foreground">As of {formatLongDate(asOfDate)}</div>
      </div>
      <div className="relative h-4">
        {months.map((month) => <div key={month.label} className="absolute text-center font-mono text-[10px] text-muted-foreground" style={{ left: `${month.left}%`, width: `${month.width}%` }}>{month.label}</div>)}
      </div>
      <div className="relative mt-1.5 h-[18px] overflow-hidden rounded bg-surface-800" aria-label="Calendar timeline showing how each fiscal-year date is forecast">
        {coverageSegments.map((segment) => {
          const left = Math.max(0, ((parseIsoDate(segment.startDate).getTime() - start) / duration) * 100);
          const right = Math.min(100, ((parseIsoDate(addDays(segment.endDate, 1)).getTime() - start) / duration) * 100);
          return <div key={`${segment.periodId}-${segment.startDate}-${segment.state}`} title={`${segment.periodName} · ${formatDateRange(segment.startDate, segment.endDate)} · ${segment.sourceLabel}`} className={`absolute inset-y-0 ${coverageBarClass[segment.state]}`} style={{ left: `${left}%`, width: `${Math.max(0.5, right - left)}%` }} />;
        })}
        <div className="absolute inset-y-0 w-0.5 bg-foreground shadow-[0_0_0_1px_hsl(var(--background)/0.55)]" title={`Forecast boundary after ${formatLongDate(asOfDate)}`} style={{ left: `${seam}%` }} />
      </div>
      <div className="mt-3 grid gap-y-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-border">
        <div className="min-w-0 lg:pr-4">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground"><span className="timeline-worked h-2.5 w-4 shrink-0 rounded-[2px]" />Hours to date</div><div className="shrink-0 font-mono text-[13px] font-semibold">{hoursToDate.toFixed(1)}h</div></div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">Past schedule{totals.correctedHours > 0 ? ` · ${totals.correctedHours.toFixed(1)}h corrected` : ''}</div>
        </div>
        <div className="min-w-0 lg:px-4">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground"><span className="timeline-scheduled h-2.5 w-4 shrink-0 rounded-[2px]" />Scheduled future</div><div className="shrink-0 font-mono text-[13px] font-semibold">{totals.scheduledHours.toFixed(1)}h</div></div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">Future dates with exact shifts</div>
        </div>
        <div className="min-w-0 lg:px-4">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground"><span className="timeline-estimated h-2.5 w-4 shrink-0 rounded-[2px]" />Estimated future</div><div className="shrink-0 font-mono text-[13px] font-semibold">{totals.estimatedHours.toFixed(1)}h</div></div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">Striped · predicted hours</div>
        </div>
        <div className="min-w-0 lg:pl-4">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground"><span className="timeline-missing h-2.5 w-4 shrink-0 rounded-[2px]" />Not forecast</div><div className="shrink-0 font-mono text-[13px] font-semibold">{missingPeriods === 0 ? 'None' : `${missingPeriods} period${missingPeriods === 1 ? '' : 's'}`}</div></div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">{missingPeriods === 0 ? 'Every date is covered' : 'Striped · needs a plan'}</div>
        </div>
      </div>
      {hasNoStaffing && <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="timeline-no-staffing h-2.5 w-4 shrink-0 rounded-[2px]" />Gray dates explicitly have no student staffing.</div>}
      {totals.scenarioHours > 0 && <p className="mt-2 text-[10px] text-muted-foreground">This scenario also adds {totals.scenarioHours.toFixed(1)} hypothetical hours.</p>}
      <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">Hours to date come from the schedule unless corrected in Changes; they are not independently confirmed against payroll.</p>
    </section>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 whitespace-nowrap font-mono text-[14px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

const budgetHealthPresentation: Record<BudgetHealth, { text: string; bar: string }> = {
  healthy: { text: 'text-[hsl(var(--success-accent))]', bar: 'bg-[hsl(var(--action-primary))]' },
  watch: { text: 'text-warning-700 dark:text-warning-300', bar: 'bg-warning-500' },
  critical: { text: 'text-destructive', bar: 'bg-destructive' },
  unknown: { text: 'text-muted-foreground', bar: 'bg-surface-500' },
};

export function Overview({ year, forecast, forecastRange, asOfDate, scenarioId, onAsOfDateChange, onScenarioChange, onBudgetChange, onOpenWorkers, onOpenSchedule, onOpenYearSetup, onOpenForecasts, onAddScenario }: OverviewProps) {
  const [budgetDraft, setBudgetDraft] = React.useState(year.budgetCents === 0 ? '' : String(year.budgetCents / 100));
  const [budgetEditing, setBudgetEditing] = React.useState(false);
  React.useEffect(() => setBudgetDraft(year.budgetCents === 0 ? '' : String(year.budgetCents / 100)), [year.id, year.budgetCents]);
  const commitBudget = (value = budgetDraft) => {
    const parsed = Number(value.replaceAll(',', '').replace('$', '').trim());
    if (Number.isFinite(parsed) && parsed >= 0) onBudgetChange(Math.round(parsed * 100));
    else setBudgetDraft(year.budgetCents === 0 ? '' : String(year.budgetCents / 100));
  };
  const hasSchedule = year.workers.some((worker) => worker.schedules.some((schedule) => schedule.recurringShifts.length > 0 || schedule.datedShifts.length > 0));
  const ready = year.budgetCents > 0 && year.workers.length > 0 && hasSchedule;
  const spendRatio = year.budgetCents > 0 ? (forecast.totals.cpdCostCents / year.budgetCents) * 100 : 0;
  const progressWidth = Math.min(100, Math.max(0, spendRatio));
  const overBudget = forecast.totals.remainingBudgetCents < 0;
  const overallBudgetHealth = budgetHealth(forecast.totals.remainingBudgetCents, year.budgetCents);
  const overallHealthPresentation = forecast.complete
    ? budgetHealthPresentation[overallBudgetHealth]
    : { text: 'text-muted-foreground', bar: 'bg-surface-500' };
  const selectedScenario = year.scenarios.find((scenario) => scenario.id === scenarioId);
  let runningBalance = year.budgetCents;
  let incompleteToDate = false;
  const rows = forecast.weekly.map((row) => {
    runningBalance -= row.cpdCostCents;
    if (row.state === 'missing') incompleteToDate = true;
    return { ...row, runningBalance, incompleteToDate };
  });
  const missingPeriods = forecast.coverage.filter((period) => period.status === 'missing');
  const hasPlanningRange = forecastRange.low.totals.cpdCostCents !== forecastRange.high.totals.cpdCostCents;

  return (
    <div className="mx-auto max-w-[1180px] animate-fade-in pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{year.label}</div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Budget outlook</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Scenario" className="w-40">
            <ActionSelect
              ariaLabel="Scenario"
              value={scenarioId ?? ''}
              options={[
                { value: '', label: 'Expected forecast', description: 'Schedules plus expected estimates' },
                ...year.scenarios.filter((scenario) => scenario.role !== 'expected').map((scenario) => ({ value: scenario.id, label: scenario.name, description: 'Expected forecast with staffing changes' })),
              ]}
              onValueChange={(value) => onScenarioChange(value || null)}
              actionLabel="Add scenario"
              onAction={onAddScenario}
              menuClassName="w-60"
            />
          </Field>
          <Field label="As of" className="w-40">
            <DatePicker required min={year.startDate} max={year.endDate} value={asOfDate} onChange={onAsOfDateChange} aria-label="As of" />
          </Field>
        </div>
      </div>

      {!ready ? (
        <>
          <SetupPath year={year} budgetDraft={budgetDraft} setBudgetDraft={setBudgetDraft} commitBudget={commitBudget} onOpenWorkers={onOpenWorkers} onOpenSchedule={onOpenSchedule} />
          <FiscalContext year={year} asOfDate={asOfDate} onOpenYearSetup={onOpenYearSetup} />
        </>
      ) : (
        <>
          {selectedScenario && (
            <div className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Badge className="border-[hsl(var(--action-primary-border)/0.45)] bg-[hsl(var(--action-primary)/0.12)] text-[hsl(var(--success-accent))]">Scenario</Badge>
              <span>{selectedScenario.description || selectedScenario.name}</span>
            </div>
          )}

          {missingPeriods.length > 0 && (
            <section className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3" aria-label="Incomplete forecast">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-700 dark:text-warning-300" />
                <div>
                  <div className="text-[12px] font-semibold">Forecast incomplete</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{missingPeriods.map((period) => period.name).join(', ')} {missingPeriods.length === 1 ? 'has' : 'have'} no schedule or staffing estimate. Missing periods are not counted as $0.</div>
                </div>
              </div>
              <Button size="sm" onClick={onOpenForecasts}><GitBranch className="h-3.5 w-3.5" />Complete forecast</Button>
            </section>
          )}

          <section className="mt-5 overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="budget-status-heading">
            <div className="px-5 py-5">
              <div className="grid gap-5 md:grid-cols-[1.2fr_1fr_1fr] md:gap-0 md:divide-x md:divide-border">
                <div className="min-w-0 md:pr-6">
                  <h2 id="budget-status-heading" className="text-[11px] font-medium text-muted-foreground">{forecast.complete ? 'Expected CPD cost' : 'Entered CPD projection'}</h2>
                  <div className={`mt-1 font-mono text-[30px] font-semibold tracking-tight tabular-nums ${overBudget ? 'text-destructive' : ''}`}>{formatCurrency(forecast.totals.cpdCostCents)}</div>
                </div>
                <div className="min-w-0 md:px-6">
                  {budgetEditing ? (
                    <Field label="Annual budget" className="max-w-44 text-left">
                      <MoneyInput
                        autoFocus
                        aria-label="Student-worker budget"
                        className="h-9 text-right font-mono tabular-nums"
                        value={budgetDraft}
                        onFocus={(event) => event.currentTarget.select()}
                        onBlur={() => setBudgetEditing(false)}
                        onValueChange={(value) => {
                          setBudgetDraft(value);
                          commitBudget(value);
                        }}
                      />
                    </Field>
                  ) : (
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground">Annual budget</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="font-mono text-[24px] font-semibold tracking-tight tabular-nums">{formatCurrency(year.budgetCents)}</div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit annual budget" onClick={() => setBudgetEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="min-w-0 md:pl-6">
                  <div className="text-[11px] font-medium text-muted-foreground">{forecast.complete ? 'Remaining at the end of the fiscal year' : 'Partial balance'}</div>
                  <div className={`mt-1 font-mono text-[24px] font-semibold tracking-tight tabular-nums ${overallHealthPresentation.text}`}>{formatCurrency(forecast.totals.remainingBudgetCents)}</div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-800">
                <div className={`h-full rounded-full ${overallHealthPresentation.bar}`} style={{ width: `${progressWidth}%` }} />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>{spendRatio.toFixed(1)}% used</span><span>{formatCurrency(year.budgetCents)} total</span></div>
              <div className="mt-4 grid grid-cols-2 gap-y-4 border-t border-border pt-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
                <div className="min-w-0 sm:pr-5"><SummaryItem label="Gross wages" value={formatCurrency(forecast.totals.grossWagesCents)} icon={<CircleDollarSign className="h-3.5 w-3.5" />} /></div>
                <div className="min-w-0 sm:px-5"><SummaryItem label="Work-study covers" value={formatCurrency(forecast.totals.workStudyCoveredCents)} icon={<WalletCards className="h-3.5 w-3.5" />} /></div>
                <div className="min-w-0 sm:px-5"><SummaryItem label="Planning range" value={hasPlanningRange ? `${formatCurrency(forecastRange.low.totals.cpdCostCents)} – ${formatCurrency(forecastRange.high.totals.cpdCostCents)}` : 'Not set'} icon={<GitBranch className="h-3.5 w-3.5" />} /></div>
                <div className="min-w-0 sm:pl-5"><SummaryItem label="Total hours" value={forecast.totals.hours.toFixed(1)} icon={<Clock3 className="h-3.5 w-3.5" />} /></div>
              </div>
            </div>
            <ForecastRunway year={year} forecast={forecast} />
          </section>

          {overBudget && <div className="mt-3 flex items-center gap-2 text-[12px] text-destructive"><AlertTriangle className="h-4 w-4" /><span>This plan is {formatCurrency(Math.abs(forecast.totals.remainingBudgetCents))} over budget.</span></div>}

          <section className="mt-6" aria-labelledby="weekly-forecast-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div><h2 id="weekly-forecast-heading" className="text-[15px] font-semibold">Weekly forecast</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{rows.length} weeks</p></div>
              <Button variant="outline" size="sm" onClick={onOpenSchedule}><CalendarDays className="h-3.5 w-3.5" />Edit schedule</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
                <thead className="bg-surface-900 text-[11px] text-muted-foreground"><tr>
                  <th className="border-b border-border px-3 py-2 font-medium">Week</th><th className="border-b border-border px-3 py-2 font-medium">State</th><th className="border-b border-border px-3 py-2 text-right font-medium">Hours</th><th className="border-b border-border px-3 py-2 text-right font-medium">Gross wages</th><th className="border-b border-border px-3 py-2 text-right font-medium">Work-study</th><th className="border-b border-border px-3 py-2 text-right font-medium">CPD cost</th><th className="border-b border-border px-3 py-2 text-right font-medium">Balance</th>
                </tr></thead>
                <tbody>{rows.map((row) => (
                  <tr key={row.weekStart} className={row.state === 'mixed' ? 'bg-warning-500/[0.07]' : 'hover:bg-surface-900/55'}>
                    <td className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11px] tabular-nums">{formatDateRange(row.weekStart, row.weekEnd)}</td>
                    <td className="border-b border-border px-3 py-2">{stateBadge(row)}</td>
                    <td className="border-b border-border px-3 py-2 text-right font-mono tabular-nums">{row.state === 'missing' ? '—' : row.hours.toFixed(1)}</td>
                    <td className="border-b border-border px-3 py-2 text-right font-mono tabular-nums">{row.state === 'missing' ? '—' : formatCurrencyPrecise(row.grossWagesCents)}</td>
                    <td className="border-b border-border px-3 py-2 text-right font-mono tabular-nums">{row.state === 'missing' ? '—' : formatCurrencyPrecise(row.workStudyCoveredCents)}</td>
                    <td className="border-b border-border px-3 py-2 text-right font-mono font-medium tabular-nums">{row.state === 'missing' ? 'Not forecast' : formatCurrencyPrecise(row.cpdCostCents)}</td>
                    <td className={`border-b border-border px-3 py-2 text-right font-mono font-medium tabular-nums ${row.incompleteToDate ? 'text-muted-foreground' : budgetHealthPresentation[budgetHealth(row.runningBalance, year.budgetCents)].text}`}>{row.incompleteToDate ? 'Incomplete' : formatCurrencyPrecise(row.runningBalance)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
