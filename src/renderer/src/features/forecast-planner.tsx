import * as React from 'react';
import { ArrowRight, CalendarCheck2, CircleDashed, Pencil, Sparkles } from 'lucide-react';
import type { AcademicPeriod, FiscalYear, PeriodEstimate, Workspace } from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DialogShell } from '../../components/ui/dialog-shell';
import { HourInput } from '../../components/ui/hour-input';
import { Field, Select } from '../components/form-controls';
import { assessForecastCoverage, assessForecastCoverageSegments, type ForecastCoverageSegment, type PeriodForecastCoverage } from '../domain/forecast';
import {
  comparablePeriods,
  createManualPeriodEstimate,
  createNoStaffingEstimate,
  createPeriodEstimateFromComparable,
} from '../domain/period-estimates';
import { formatShortDate, todayInLosAngeles } from '../domain/dates';

interface ForecastPlannerProps {
  workspace: Workspace;
  year: FiscalYear;
  onChange: (estimates: PeriodEstimate[]) => void;
  onOpenSchedule: () => void;
}

const statusPresentation: Record<PeriodForecastCoverage['status'], { label: string; detail: string; className: string }> = {
  worked: { label: 'Hours to date', detail: 'Based on the schedule, with any corrections already applied.', className: 'border-surface-500/60 bg-surface-800 text-foreground' },
  'worked-and-scheduled': { label: 'To date + scheduled', detail: 'Earlier hours are included; upcoming shifts are entered.', className: 'border-surface-500/60 bg-surface-800 text-foreground' },
  scheduled: { label: 'Scheduled', detail: 'Exact upcoming shifts are already entered.', className: 'border-surface-500/60 bg-surface-800 text-foreground' },
  estimated: { label: 'Estimated', detail: 'Hours are predicted because exact shifts are not entered yet.', className: 'border-dashed border-surface-500 bg-transparent text-foreground' },
  'scheduled-and-estimated': { label: 'Partly scheduled', detail: 'Exact shifts are used where entered; an estimate fills the rest.', className: 'border-dashed border-surface-400 bg-surface-800/40 text-foreground' },
  'no-staffing': { label: 'No staffing', detail: 'An explicit zero-hour decision.', className: 'border-border bg-transparent text-muted-foreground' },
  missing: { label: 'Not forecast', detail: 'No schedule or estimate yet; the annual forecast is incomplete.', className: 'border-dashed border-warning-500/70 bg-transparent text-warning-700 dark:text-warning-300' },
};

const segmentLabels: Record<ForecastCoverageSegment['state'], string> = {
  'assumed-worked': 'Hours to date',
  corrected: 'Corrected hours',
  scheduled: 'Scheduled',
  estimated: 'Estimated',
  'assumed-and-estimated': 'Past estimate',
  'scheduled-and-estimated': 'Scheduled + estimated',
  'no-staffing': 'No staffing',
  missing: 'Not forecast',
};

function replaceEstimate(estimates: PeriodEstimate[], estimate: PeriodEstimate): PeriodEstimate[] {
  return [...estimates.filter((candidate) => candidate.periodId !== estimate.periodId), estimate];
}

function sourceKey(fiscalYearId: string, periodId: string): string {
  return `${fiscalYearId}::${periodId}`;
}

function activeWorkerCount(year: FiscalYear, period: AcademicPeriod): number {
  return year.workers.filter((worker) =>
    ['active', 'planned'].includes(worker.status) &&
    worker.activeStart <= period.endDate &&
    (!worker.activeEnd || worker.activeEnd >= period.startDate),
  ).length;
}

export function ForecastPlanner({ workspace, year, onChange, onOpenSchedule }: ForecastPlannerProps) {
  const coverage = React.useMemo(() => assessForecastCoverage(year, todayInLosAngeles()), [year]);
  const coverageSegments = React.useMemo(() => assessForecastCoverageSegments(year, todayInLosAngeles()), [year]);
  const completeCount = coverage.filter((period) => period.status !== 'missing').length;
  const [openPeriodId, setOpenPeriodId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<PeriodEstimate | null>(null);
  const [selectedSource, setSelectedSource] = React.useState('manual');
  const period = year.periods.find((candidate) => candidate.id === openPeriodId);
  const comparable = React.useMemo(() => period ? comparablePeriods(workspace, year, period) : [], [period, workspace, year]);
  const validationError = draft && draft.status === 'estimated' && (
    draft.expectedWeeklyMinutes <= 0 ||
    draft.lowWeeklyMinutes > draft.expectedWeeklyMinutes ||
    draft.expectedWeeklyMinutes > draft.highWeeklyMinutes
  ) ? 'Enter a nonzero range where lower ≤ expected ≤ higher.' : null;
  const maximumTeamHours = Math.max(40, (draft?.profiles.length ?? 1) * 40);

  const startEditing = (nextPeriod: AcademicPeriod) => {
    const existing = year.periodEstimates.find((estimate) => estimate.periodId === nextPeriod.id);
    const options = comparablePeriods(workspace, year, nextPeriod);
    if (existing) {
      setDraft(existing);
      setSelectedSource(existing.sourceFiscalYearId && existing.sourcePeriodId ? sourceKey(existing.sourceFiscalYearId, existing.sourcePeriodId) : 'manual');
    } else if (options[0]) {
      setDraft(createPeriodEstimateFromComparable(year, nextPeriod, options[0].fiscalYear, options[0].period));
      setSelectedSource(sourceKey(options[0].fiscalYear.id, options[0].period.id));
    } else {
      setDraft(createManualPeriodEstimate(year, nextPeriod, Math.max(600, activeWorkerCount(year, nextPeriod) * 600)));
      setSelectedSource('manual');
    }
    setOpenPeriodId(nextPeriod.id);
  };

  const changeSource = (value: string) => {
    if (!period) return;
    setSelectedSource(value);
    if (value === 'manual') {
      setDraft(createManualPeriodEstimate(year, period, Math.max(600, activeWorkerCount(year, period) * 600)));
      return;
    }
    const option = comparable.find((candidate) => sourceKey(candidate.fiscalYear.id, candidate.period.id) === value);
    if (option) setDraft(createPeriodEstimateFromComparable(year, period, option.fiscalYear, option.period));
  };

  const saveDraft = () => {
    if (!draft || validationError) return;
    onChange(replaceEstimate(year.periodEstimates, draft));
    setOpenPeriodId(null);
  };

  const markNoStaffing = () => {
    if (!period) return;
    onChange(replaceEstimate(year.periodEstimates, createNoStaffingEstimate(period)));
    setOpenPeriodId(null);
  };

  const removeEstimate = () => {
    if (!period) return;
    onChange(year.periodEstimates.filter((estimate) => estimate.periodId !== period.id));
    setOpenPeriodId(null);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="forecast-coverage-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2"><CalendarCheck2 className="h-4 w-4 text-muted-foreground" /><h2 id="forecast-coverage-heading" className="text-[14px] font-semibold">Fiscal-year coverage</h2></div>
          <p className="mt-1 text-[11px] text-muted-foreground">See what is already included, what is scheduled next, and which periods still need an estimate.</p>
        </div>
        <div className="text-right"><div className="font-mono text-[15px] font-semibold">{completeCount}/{coverage.length}</div><div className="text-[10px] text-muted-foreground">periods covered</div></div>
      </div>
      <div className="grid grid-cols-[minmax(170px,1fr)_145px_minmax(220px,1.25fr)_130px] border-b border-border bg-surface-900 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <span>Period and dates</span><span>Source state</span><span>Basis</span><span className="text-right">Action</span>
      </div>
      <div className="divide-y divide-border">
        {coverage.map((item) => {
          const academicPeriod = year.periods.find((candidate) => candidate.id === item.periodId)!;
          const presentation = statusPresentation[item.status];
          const itemSegments = coverageSegments.filter((segment) => segment.periodId === item.periodId);
          const hasSavedEstimate = year.periodEstimates.some((estimate) => estimate.periodId === item.periodId);
          const canEstimate = hasSavedEstimate || (item.status !== 'worked' && item.status !== 'worked-and-scheduled' && item.status !== 'scheduled');
          return (
            <div key={item.periodId} className="grid grid-cols-[minmax(170px,1fr)_145px_minmax(220px,1.25fr)_130px] items-center gap-3 px-4 py-3">
              <div><div className="text-[12px] font-semibold">{item.name}</div><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{formatShortDate(item.startDate)}–{formatShortDate(item.endDate)}</div></div>
              <div><Badge className={presentation.className}>{presentation.label}</Badge></div>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium">{item.sourceLabel}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{item.status === 'estimated' || item.status === 'scheduled-and-estimated' ? `${((item.lowWeeklyMinutes ?? 0) / 60).toFixed(1)}–${((item.highWeeklyMinutes ?? 0) / 60).toFixed(1)}h/week · ${((item.expectedWeeklyMinutes ?? 0) / 60).toFixed(1)} expected` : presentation.detail}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[9px] text-muted-foreground">
                  {itemSegments.slice(0, 4).map((segment) => <span key={`${segment.startDate}-${segment.state}`}>{formatShortDate(segment.startDate)}–{formatShortDate(segment.endDate)} · {segmentLabels[segment.state]}</span>)}
                  {itemSegments.length > 4 && <span>+{itemSegments.length - 4} more ranges</span>}
                </div>
              </div>
              <div className="text-right">
                {canEstimate ? <Button variant={item.status === 'missing' ? 'default' : 'outline'} size="sm" onClick={() => startEditing(academicPeriod)}>{item.status === 'missing' ? <Sparkles className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{item.status === 'missing' ? 'Plan period' : 'Edit'}</Button> : <Button variant="ghost" size="sm" onClick={onOpenSchedule}>Schedule<ArrowRight className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface-900/35 px-4 py-2.5 text-[10px] text-muted-foreground"><CircleDashed className="h-3.5 w-3.5" />Hours to date use the schedule unless corrected in Changes. Upcoming exact shifts replace estimates as they are entered.</div>

      <DialogShell
        open={Boolean(period && draft)}
        onClose={() => setOpenPeriodId(null)}
        title={period ? `Plan ${period.name}` : 'Plan period'}
        description={period ? `${formatShortDate(period.startDate)}–${formatShortDate(period.endDate)} · This estimate fills only dates without an exact schedule.` : undefined}
        widthClassName="max-w-2xl"
        footerClassName="justify-between"
        footer={
          <>
            <div className="flex items-center gap-2">
              {year.periodEstimates.some((estimate) => estimate.periodId === period?.id) && <Button variant="ghost" onClick={removeEstimate}>Remove estimate</Button>}
              <Button variant="outline" onClick={markNoStaffing}>No staffing planned</Button>
            </div>
            <div className="flex items-center gap-2"><Button variant="outline" onClick={() => setOpenPeriodId(null)}>Cancel</Button><Button onClick={saveDraft} disabled={Boolean(validationError)}>Save estimate</Button></div>
          </>
        }
      >
        {period && draft && (
          <div className="space-y-5">
            <Field label="Start from" hint="This copies a staffing pattern once. Later schedule changes do not silently rewrite the estimate.">
              <Select value={selectedSource} onChange={(event) => changeSource(event.target.value)}>
                {comparable.map((candidate) => <option key={sourceKey(candidate.fiscalYear.id, candidate.period.id)} value={sourceKey(candidate.fiscalYear.id, candidate.period.id)}>{candidate.label}{candidate.recommended ? ' · Recommended' : ''} · {(candidate.typicalWeeklyMinutes / 60).toFixed(1)}h/week</option>)}
                <option value="manual">Enter a manual team estimate</option>
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Lower spending" hint="Paid team hours / normal week"><HourInput value={draft.lowWeeklyMinutes / 60} min={0} max={maximumTeamHours} onValueChange={(hours) => setDraft({ ...draft, lowWeeklyMinutes: Math.round(hours * 60) })} /></Field>
              <Field label="Expected" hint="Best current estimate"><HourInput value={draft.expectedWeeklyMinutes / 60} min={0} max={maximumTeamHours} onValueChange={(hours) => setDraft({ ...draft, expectedWeeklyMinutes: Math.round(hours * 60) })} /></Field>
              <Field label="Higher spending" hint="Paid team hours / normal week"><HourInput value={draft.highWeeklyMinutes / 60} min={0} max={maximumTeamHours} onValueChange={(hours) => setDraft({ ...draft, highWeeklyMinutes: Math.round(hours * 60) })} /></Field>
            </div>
            {validationError && <div className="text-[11px] text-destructive">{validationError}</div>}
            <div className="border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
              <div className="font-medium text-foreground">What will happen</div>
              <p className="mt-1">The source pattern is saved as a snapshot, scaled to these weekly totals, and applied across {period.name}. Full and early closures reduce estimated hours. Work-study is calculated per linked worker and continues depleting from earlier periods.</p>
              <p className="mt-1">When exact shifts are entered, they take precedence. The estimate remains only for still-unknown workers or weeks.</p>
            </div>
          </div>
        )}
      </DialogShell>
    </section>
  );
}
