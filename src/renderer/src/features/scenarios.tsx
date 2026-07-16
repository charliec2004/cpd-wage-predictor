import * as React from 'react';
import { ArrowRight, GitBranch, Plus, Trash2, UserPlus } from 'lucide-react';
import type { FiscalYear, ForecastScenario } from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { DatePicker } from '../../components/ui/date-picker';
import { DialogShell } from '../../components/ui/dialog-shell';
import { HourInput } from '../../components/ui/hour-input';
import { Input } from '../../components/ui/input';
import { Field, MoneyInput, Select } from '../components/form-controls';
import { formatLongDate, todayInLosAngeles } from '../domain/dates';
import { calculateForecast } from '../domain/forecast';
import { formatCurrency, formatCurrencyPrecise, parseDollarInput } from '../lib/format';

interface ScenariosProps {
  year: FiscalYear;
  scenarioId: string | null;
  onScenarioChange: (scenarioId: string | null) => void;
  onChange: (scenarios: ForecastScenario[]) => void;
  onOpenForecast: () => void;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

export function Scenarios({ year, scenarioId, onScenarioChange, onChange, onOpenForecast, createOpen, onCreateOpenChange }: ScenariosProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
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
  const trimmedName = scenarioName.trim();
  const duplicateName = selectableScenarios.some((scenario) => scenario.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase());

  const addScenario = () => {
    if (!trimmedName || duplicateName) return;
    const scenario: ForecastScenario = {
      id: `scenario-${crypto.randomUUID()}`,
      name: trimmedName,
      description: '',
      role: 'custom',
      plannedHires: [],
      departureOverrides: [],
    };
    onChange([...year.scenarios, scenario]);
    onScenarioChange(scenario.id);
    setScenarioName('');
    onCreateOpenChange(false);
  };

  const deleteScenario = () => {
    if (!selected) return;
    onChange(year.scenarios.filter((scenario) => scenario.id !== selected.id));
    onScenarioChange(null);
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
          <h1 className="text-[18px] font-semibold tracking-tight">Scenarios</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Test staffing changes without changing CPD's expected forecast.</p>
        </div>
        <Button onClick={() => onCreateOpenChange(true)}><Plus className="h-4 w-4" />Add scenario</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Saved scenarios">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-[12px] font-semibold">Saved scenarios</div>
            <div className="font-mono text-[11px] text-muted-foreground">{selectableScenarios.length}</div>
          </div>
          {selectableScenarios.length > 0 ? (
            <div className="divide-y divide-border">
              {selectableScenarios.map((scenario) => {
                const active = scenario.id === selected?.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => onScenarioChange(scenario.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${active ? 'bg-accent text-foreground' : 'hover:bg-surface-900/55'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-semibold">{scenario.name}</span>
                      {active && <Badge variant="outline">Selected</Badge>}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{scenario.plannedHires.length} hire{scenario.plannedHires.length === 1 ? '' : 's'} · {scenario.departureOverrides.length} departure{scenario.departureOverrides.length === 1 ? '' : 's'}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-[11px] leading-4 text-muted-foreground">No saved scenarios yet.</div>
          )}
          <div className="border-t border-border bg-surface-900/35 px-4 py-2.5 text-[10px] leading-4 text-muted-foreground">Expected is the shared forecast, not a deletable scenario.</div>
        </aside>

        <div className="min-w-0 space-y-4">
          {selected ? (
            <>
              <section className="rounded-lg border border-border bg-card" aria-label="Selected scenario">
                <div className="flex flex-wrap items-center justify-between gap-5 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" /><h2 className="truncate text-[14px] font-semibold">{selected.name}</h2><Badge variant="outline">Alternative</Badge></div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Expected forecast plus {selected.plannedHires.length} planned hire{selected.plannedHires.length === 1 ? '' : 's'} and {selected.departureOverrides.length} earlier departure{selected.departureOverrides.length === 1 ? '' : 's'}.</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="grid grid-cols-[auto_auto_auto] items-center gap-4">
                      <div><div className="text-[10px] text-muted-foreground">Expected</div><div className="mt-0.5 font-mono text-[16px] font-semibold">{formatCurrency(baseline.totals.cpdCostCents)}</div></div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="text-right"><div className="text-[10px] text-muted-foreground">This scenario</div><div className="mt-0.5 font-mono text-[16px] font-semibold">{formatCurrency(scenarioForecast.totals.cpdCostCents)}</div><div className={`mt-0.5 text-[10px] ${delta > 0 ? 'text-warning-700 dark:text-warning-300' : 'text-muted-foreground'}`}>{delta >= 0 ? '+' : ''}{formatCurrency(delta)}</div></div>
                    </div>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                  </div>
                </div>
              </section>

              <div><h2 className="text-[15px] font-semibold">Scenario changes</h2><p className="mt-0.5 text-[11px] text-muted-foreground">These changes apply only to {selected.name}.</p></div>
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
                  {selected.plannedHires.length > 0 && <div className="mt-4 divide-y divide-border border-t border-border">{selected.plannedHires.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div><div className="text-[12px] font-medium">{item.label}</div><div className="font-mono text-[10px] text-muted-foreground">{formatLongDate(item.startDate)} · {(item.averageWeeklyMinutes / 60).toFixed(1)}h/week · {formatCurrencyPrecise(item.hourlyRateCents)}/hr</div></div><Button variant="ghost" size="icon-sm" aria-label="Remove planned hire" onClick={() => updateSelected({ ...selected, plannedHires: selected.plannedHires.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
                </section>
                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-[13px] font-semibold">Earlier departures</h2>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">End an existing worker's forecast earlier in this scenario only.</p>
                  <div className="mt-4 space-y-3">
                    <Field label="Worker"><Select value={departure.workerId} onChange={(event) => setDeparture({ ...departure, workerId: event.target.value })}><option value="">Select worker</option>{year.workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</Select></Field>
                    <Field label="Scenario end date"><DatePicker required min={year.startDate} max={year.endDate} value={departure.endDate} onChange={(value) => setDeparture({ ...departure, endDate: value })} aria-label="Scenario end date" /></Field>
                    <Button className="w-full" variant="outline" onClick={addDeparture}><Plus className="h-4 w-4" />Set scenario departure</Button>
                  </div>
                  {selected.departureOverrides.length > 0 && <div className="mt-4 divide-y divide-border border-t border-border">{selected.departureOverrides.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5"><div><div className="text-[12px] font-medium">{year.workers.find((worker) => worker.id === item.workerId)?.name ?? 'Unknown worker'}</div><div className="font-mono text-[10px] text-muted-foreground">Ends {formatLongDate(item.endDate)}</div></div><Button variant="ghost" size="icon-sm" aria-label="Remove scenario departure" onClick={() => updateSelected({ ...selected, departureOverrides: selected.departureOverrides.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
                </section>
              </div>
            </>
          ) : (
            <section className="flex min-h-72 items-center justify-center rounded-lg border border-border bg-card px-8 text-center">
              <div className="max-w-sm"><GitBranch className="mx-auto h-5 w-5 text-muted-foreground" /><h2 className="mt-3 text-[14px] font-semibold">Expected forecast is the starting point</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Select a saved scenario to manage its changes, or add a scenario to test a different staffing outcome.</p><div className="mt-4 flex justify-center gap-2"><Button variant="outline" size="sm" onClick={onOpenForecast}>Open forecast</Button><Button size="sm" onClick={() => onCreateOpenChange(true)}><Plus className="h-3.5 w-3.5" />Add scenario</Button></div></div>
            </section>
          )}
        </div>
      </div>

      <DialogShell
        open={createOpen}
        onClose={() => onCreateOpenChange(false)}
        title="Add scenario"
        description="Create an alternative that starts from the Expected forecast. Add hypothetical hires and departures after saving it."
        footer={<><Button variant="outline" onClick={() => onCreateOpenChange(false)}>Cancel</Button><Button onClick={addScenario} disabled={!trimmedName || duplicateName}><Plus className="h-4 w-4" />Add scenario</Button></>}
      >
        <div className="space-y-2">
          <Field label="Scenario name"><Input autoFocus placeholder="Spring hiring later" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></Field>
          {duplicateName && <p className="text-[11px] text-destructive">A scenario with this name already exists.</p>}
          {!duplicateName && <p className="text-[11px] leading-4 text-muted-foreground">Only this scenario's hires and departures will differ from Expected.</p>}
        </div>
      </DialogShell>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={selected ? `Delete ${selected.name}?` : 'Delete scenario?'}
        description="Its planned hires and departures will be removed. The Expected forecast, workers, schedules, and estimates will stay unchanged."
        confirmLabel="Delete scenario"
        confirmVariant="destructive"
        onConfirm={deleteScenario}
      />
    </div>
  );
}
