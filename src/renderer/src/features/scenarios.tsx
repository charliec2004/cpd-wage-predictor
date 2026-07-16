import * as React from 'react';
import { ArrowRight, GitBranch, Plus, Trash2, UserPlus } from 'lucide-react';
import type { FiscalYear, ForecastScenario, PeriodEstimate, Workspace } from '../../../shared/workspace';
import { ActionSelect } from '../../components/ui/action-select';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DatePicker } from '../../components/ui/date-picker';
import { Checkbox } from '../../components/ui/checkbox';
import { DialogShell } from '../../components/ui/dialog-shell';
import { HourInput } from '../../components/ui/hour-input';
import { Input } from '../../components/ui/input';
import { Field, MoneyInput, Select } from '../components/form-controls';
import { calculateForecast } from '../domain/forecast';
import { todayInLosAngeles } from '../domain/dates';
import { formatCurrency, formatCurrencyPrecise, parseDollarInput } from '../lib/format';
import { ForecastPlanner } from './forecast-planner';

interface ScenariosProps {
  workspace: Workspace;
  year: FiscalYear;
  scenarioId: string | null;
  onScenarioChange: (scenarioId: string | null) => void;
  onChange: (scenarios: ForecastScenario[]) => void;
  onPeriodEstimatesChange: (estimates: PeriodEstimate[]) => void;
  onOpenSchedule: () => void;
  createRequestKey?: number;
}

export function Scenarios({ workspace, year, scenarioId, onScenarioChange, onChange, onPeriodEstimatesChange, onOpenSchedule, createRequestKey = 0 }: ScenariosProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState('');
  const [hire, setHire] = React.useState({ label: '', startDate: '', wage: '16.90', weeklyHours: 10, hasWorkStudy: true, award: '3000' });
  const [departure, setDeparture] = React.useState({ workerId: year.workers[0]?.id ?? '', endDate: '' });
  const selectableScenarios = year.scenarios.filter((scenario) => scenario.role !== 'expected');
  const selected = selectableScenarios.find((scenario) => scenario.id === scenarioId);
  const baseline = React.useMemo(() => calculateForecast(year, todayInLosAngeles(), null, 'expected'), [year]);
  const scenarioForecast = React.useMemo(
    () => selected ? calculateForecast(year, todayInLosAngeles(), selected.id, 'expected') : baseline,
    [baseline, selected, year],
  );

  React.useEffect(() => {
    if (createRequestKey > 0) setCreateOpen(true);
  }, [createRequestKey]);

  const addScenario = () => {
    if (!scenarioName.trim()) return;
    const scenario: ForecastScenario = {
      id: `scenario-${crypto.randomUUID()}`,
      name: scenarioName.trim(),
      description: '',
      role: 'custom',
      plannedHires: [],
      departureOverrides: [],
    };
    onChange([...year.scenarios, scenario]);
    onScenarioChange(scenario.id);
    setScenarioName('');
    setCreateOpen(false);
  };

  const updateSelected = (next: ForecastScenario) => onChange(year.scenarios.map((scenario) => scenario.id === next.id ? next : scenario));

  const addHire = () => {
    if (!selected || !hire.label.trim() || !hire.startDate) return;
    const wage = parseDollarInput(hire.wage);
    const award = parseDollarInput(hire.award);
    if (!wage) return;
    updateSelected({
      ...selected,
      plannedHires: [
        ...selected.plannedHires,
        {
          id: `hire-${crypto.randomUUID()}`,
          label: hire.label.trim(),
          startDate: hire.startDate,
          hourlyRateCents: wage,
          averageWeeklyMinutes: Math.round(hire.weeklyHours * 60),
          workStudyAwardCents: hire.hasWorkStudy ? award ?? 300_000 : undefined,
        },
      ],
    });
    setHire({ label: '', startDate: '', wage: '16.90', weeklyHours: 10, hasWorkStudy: true, award: '3000' });
  };

  const addDeparture = () => {
    if (!selected || !departure.workerId || !departure.endDate) return;
    const remaining = selected.departureOverrides.filter((item) => item.workerId !== departure.workerId);
    updateSelected({ ...selected, departureOverrides: [...remaining, { id: `departure-${crypto.randomUUID()}`, ...departure }] });
    setDeparture({ ...departure, endDate: '' });
  };

  const delta = scenarioForecast.totals.cpdCostCents - baseline.totals.cpdCostCents;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Forecasts</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Build the expected forecast, then test staffing alternatives.</p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Viewing scenario" className="w-56">
            <ActionSelect
              ariaLabel="Viewing scenario"
              value={selected?.id ?? ''}
              options={[
                { value: '', label: 'Expected forecast', description: 'Shared schedules and expected estimates' },
                ...selectableScenarios.map((scenario) => ({ value: scenario.id, label: scenario.name, description: 'Expected forecast with staffing changes' })),
              ]}
              onValueChange={(value) => onScenarioChange(value || null)}
              actionLabel="Add scenario"
              onAction={() => setCreateOpen(true)}
              menuClassName="w-64"
            />
          </Field>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add scenario</Button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card" aria-label="Active forecast">
        <div className="flex flex-wrap items-center justify-between gap-5 px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <h2 className="truncate text-[14px] font-semibold">{selected?.name ?? 'Expected forecast'}</h2>
              <Badge variant="outline">{selected ? 'Alternative' : 'Base'}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {selected
                ? `Starts from Expected, then applies ${selected.plannedHires.length} planned hire${selected.plannedHires.length === 1 ? '' : 's'} and ${selected.departureOverrides.length} earlier departure${selected.departureOverrides.length === 1 ? '' : 's'}.`
                : 'The shared foundation: current workers, schedules, closures, work-study, and expected period estimates.'}
            </p>
          </div>
          {selected ? (
            <div className="grid shrink-0 grid-cols-[auto_auto_auto] items-center gap-4">
              <div><div className="text-[10px] text-muted-foreground">Expected</div><div className="mt-0.5 font-mono text-[16px] font-semibold">{formatCurrency(baseline.totals.cpdCostCents)}</div></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-right"><div className="text-[10px] text-muted-foreground">{selected.name}</div><div className="mt-0.5 font-mono text-[16px] font-semibold">{formatCurrency(scenarioForecast.totals.cpdCostCents)}</div><div className={`mt-0.5 text-[10px] ${delta > 0 ? 'text-warning-700 dark:text-warning-300' : 'text-muted-foreground'}`}>{delta >= 0 ? '+' : ''}{formatCurrency(delta)}</div></div>
            </div>
          ) : (
            <div className="shrink-0 text-right"><div className="text-[10px] text-muted-foreground">Expected CPD cost</div><div className="mt-0.5 font-mono text-[18px] font-semibold">{formatCurrency(baseline.totals.cpdCostCents)}</div></div>
          )}
        </div>
      </section>

      {selected && (
        <>
          <div className="pt-1"><h2 className="text-[15px] font-semibold">Scenario changes</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Only these changes differ from the Expected forecast.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-muted-foreground" /><h2 className="text-[13px] font-semibold">Planned hires</h2></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Position label"><Input placeholder="Spring front desk hire" value={hire.label} onChange={(event) => setHire({ ...hire, label: event.target.value })} /></Field>
                <Field label="Expected start"><DatePicker required min={year.startDate} max={year.endDate} value={hire.startDate} onChange={(value) => setHire({ ...hire, startDate: value })} aria-label="Expected start" /></Field>
                <Field label="Hourly wage"><MoneyInput value={hire.wage} onValueChange={(value) => setHire((current) => ({ ...current, wage: value }))} /></Field>
                <Field label="Average hours / week"><HourInput value={hire.weeklyHours} min={0} max={40} onValueChange={(value) => setHire({ ...hire, weeklyHours: value })} /></Field>
              </div>
              <div className="mt-3 flex items-center gap-2"><Checkbox id="scenario-hire-ws" checked={hire.hasWorkStudy} onCheckedChange={(checked) => setHire({ ...hire, hasWorkStudy: checked === true })} /><label htmlFor="scenario-hire-ws" className="text-[12px] font-medium">Assume work-study</label>{hire.hasWorkStudy && <MoneyInput aria-label="Work-study award" className="w-28" value={hire.award} onValueChange={(value) => setHire((current) => ({ ...current, award: value }))} />}</div>
              <Button className="mt-4 w-full" variant="outline" onClick={addHire}><Plus className="h-4 w-4" />Add planned hire</Button>
              {selected.plannedHires.length > 0 && <div className="mt-4 divide-y divide-border border-t border-border">{selected.plannedHires.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div><div className="text-[12px] font-medium">{item.label}</div><div className="font-mono text-[10px] text-muted-foreground">{item.startDate} · {(item.averageWeeklyMinutes / 60).toFixed(1)}h/week · {formatCurrencyPrecise(item.hourlyRateCents)}/hr</div></div><Button variant="ghost" size="icon-sm" aria-label="Remove planned hire" onClick={() => updateSelected({ ...selected, plannedHires: selected.plannedHires.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
            </section>
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-[13px] font-semibold">Earlier departures</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">End an existing worker's forecast earlier in this scenario only.</p>
              <div className="mt-4 space-y-3">
                <Field label="Worker"><Select value={departure.workerId} onChange={(event) => setDeparture({ ...departure, workerId: event.target.value })}><option value="">Select worker</option>{year.workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</Select></Field>
                <Field label="Scenario end date"><DatePicker required min={year.startDate} max={year.endDate} value={departure.endDate} onChange={(value) => setDeparture({ ...departure, endDate: value })} aria-label="Scenario end date" /></Field>
                <Button className="w-full" variant="outline" onClick={addDeparture}><Plus className="h-4 w-4" />Set scenario departure</Button>
              </div>
              {selected.departureOverrides.length > 0 && <div className="mt-4 divide-y divide-border border-t border-border">{selected.departureOverrides.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div><div className="text-[12px] font-medium">{year.workers.find((worker) => worker.id === item.workerId)?.name ?? 'Unknown worker'}</div><div className="font-mono text-[10px] text-muted-foreground">Ends {item.endDate}</div></div><Button variant="ghost" size="icon-sm" aria-label="Remove scenario departure" onClick={() => updateSelected({ ...selected, departureOverrides: selected.departureOverrides.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
            </section>
          </div>
        </>
      )}

      <div className="pt-2"><h2 className="text-[15px] font-semibold">Expected forecast foundation</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Shared by Expected and every saved scenario.</p></div>
      <ForecastPlanner workspace={workspace} year={year} onChange={onPeriodEstimatesChange} onOpenSchedule={onOpenSchedule} />
      <DialogShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add scenario"
        description="Create an alternative that starts from the Expected forecast. You can then add hypothetical hires and departures."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={addScenario} disabled={!scenarioName.trim()}><Plus className="h-4 w-4" />Add scenario</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Scenario name"><Input autoFocus placeholder="Spring hiring later" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></Field>
          <p className="text-[11px] leading-4 text-muted-foreground">The scenario inherits the Expected forecast. Only the hires and departures you add will differ.</p>
        </div>
      </DialogShell>
    </div>
  );
}
