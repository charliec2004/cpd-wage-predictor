import * as React from 'react';
import { ArrowRight, GitBranch, Plus, Trash2, UserPlus } from 'lucide-react';
import type { FiscalYear, ForecastScenario } from '../../../shared/workspace';
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

interface ScenariosProps {
  year: FiscalYear;
  onChange: (scenarios: ForecastScenario[]) => void;
  createRequestKey?: number;
  onScenarioCreated?: (scenarioId: string) => void;
}

const scenarioRoleLabels: Record<ForecastScenario['role'], string> = {
  custom: 'Custom',
  'plausible-low': 'Lower spending',
  expected: 'Most likely',
  'prudent-high': 'Higher spending',
};

export function Scenarios({ year, onChange, createRequestKey = 0, onScenarioCreated }: ScenariosProps) {
  const [selectedId, setSelectedId] = React.useState(year.scenarios[0]?.id ?? '');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState('');
  const [role, setRole] = React.useState<ForecastScenario['role']>('custom');
  const [hire, setHire] = React.useState({ label: '', startDate: '', wage: '16.90', weeklyHours: 10, hasWorkStudy: true, award: '3000' });
  const [departure, setDeparture] = React.useState({ workerId: year.workers[0]?.id ?? '', endDate: '' });
  const selected = year.scenarios.find((scenario) => scenario.id === selectedId);
  const baseline = React.useMemo(() => calculateForecast(year, todayInLosAngeles()), [year]);
  const scenarioForecast = React.useMemo(() => selected ? calculateForecast(year, todayInLosAngeles(), selected.id) : baseline, [baseline, selected, year]);

  React.useEffect(() => {
    if (!year.scenarios.some((scenario) => scenario.id === selectedId)) setSelectedId(year.scenarios[0]?.id ?? '');
  }, [selectedId, year.scenarios]);

  React.useEffect(() => {
    if (createRequestKey > 0) setCreateOpen(true);
  }, [createRequestKey]);

  const addScenario = () => {
    if (!scenarioName.trim()) return;
    const scenario: ForecastScenario = {
      id: `scenario-${crypto.randomUUID()}`,
      name: scenarioName.trim(),
      description: '',
      role,
      plannedHires: [],
      departureOverrides: [],
    };
    onChange([...year.scenarios, scenario]);
    setSelectedId(scenario.id);
    onScenarioCreated?.(scenario.id);
    setScenarioName('');
    setRole('custom');
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Scenarios</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Save alternative hires and departures without changing the main operating plan.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add scenario</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4"><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" /><h2 className="text-[13px] font-semibold">Saved scenarios</h2></div></div>
          <div className="divide-y divide-border">
            {year.scenarios.map((scenario) => (
              <button key={scenario.id} type="button" onClick={() => setSelectedId(scenario.id)} className={`w-full px-4 py-3 text-left transition-colors ${scenario.id === selectedId ? 'bg-accent text-foreground' : 'hover:bg-surface-900/60'}`}><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{scenario.name}</span><Badge variant="outline">{scenarioRoleLabels[scenario.role]}</Badge></div><div className="mt-1 text-[11px] text-muted-foreground">{scenario.plannedHires.length} hires · {scenario.departureOverrides.length} departures</div></button>
            ))}
          </div>
        </aside>
        {selected ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-card">
              <div className="grid items-center gap-4 p-4 md:grid-cols-[1fr_auto_1fr]">
                <div><div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Main plan CPD cost</div><div className="mt-1 font-mono text-[22px] font-semibold">{formatCurrency(baseline.totals.cpdCostCents)}</div></div>
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
                <div className="md:text-right"><div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{selected.name} CPD cost</div><div className="mt-1 font-mono text-[22px] font-semibold">{formatCurrency(scenarioForecast.totals.cpdCostCents)}</div><div className={`mt-1 text-[11px] ${delta > 0 ? 'text-warning-700 dark:text-warning-300' : 'text-muted-foreground'}`}>{delta >= 0 ? '+' : ''}{formatCurrency(delta)} versus main plan</div></div>
              </div>
            </section>
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
          </div>
        ) : <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-muted-foreground">Create a scenario to begin.</div>}
      </div>
      <DialogShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add scenario"
        description="Create a saved alternative to the main staffing plan. You can add projected hires and departures next."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={addScenario} disabled={!scenarioName.trim()}><Plus className="h-4 w-4" />Add scenario</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Scenario name"><Input autoFocus placeholder="Spring hiring later" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></Field>
          <Field label="Scenario type" hint="Choose where this plan sits compared with the main forecast.">
            <Select value={role} onChange={(event) => setRole(event.target.value as ForecastScenario['role'])}>
              <option value="custom">Custom alternative</option>
              <option value="plausible-low">Lower spending</option>
              <option value="expected">Most likely</option>
              <option value="prudent-high">Higher spending</option>
            </Select>
          </Field>
        </div>
      </DialogShell>
    </div>
  );
}
