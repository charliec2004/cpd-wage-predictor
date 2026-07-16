import * as React from 'react';
import { BriefcaseBusiness, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import type { FiscalYear, Worker } from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { DialogShell } from '../../components/ui/dialog-shell';
import { DatePicker } from '../../components/ui/date-picker';
import { HourInput } from '../../components/ui/hour-input';
import { Input } from '../../components/ui/input';
import { Field, MoneyInput, Select } from '../components/form-controls';
import { formatCurrency, formatCurrencyPrecise, parseDollarInput } from '../lib/format';

interface WorkersProps {
  year: FiscalYear;
  onChange: (workers: Worker[]) => void;
}

interface WorkerDraft {
  id?: string;
  name: string;
  status: Worker['status'];
  activeStart: string;
  activeEnd: string;
  hourlyRate: string;
  hasWorkStudy: boolean;
  award: string;
  hasOfficialBalance: boolean;
  officialBalance: string;
  officialBalanceDate: string;
  hasOutsideJob: boolean;
  outsideJobName: string;
  outsideJobWage: string;
  outsideJobHours: number;
  outsideJobStart: string;
}

function blankDraft(year: FiscalYear): WorkerDraft {
  return {
    name: '',
    status: 'active',
    activeStart: year.startDate,
    activeEnd: '',
    hourlyRate: '16.90',
    hasWorkStudy: true,
    award: '3000',
    hasOfficialBalance: false,
    officialBalance: '',
    officialBalanceDate: '',
    hasOutsideJob: false,
    outsideJobName: 'Other Chapman job',
    outsideJobWage: '16.90',
    outsideJobHours: 0,
    outsideJobStart: '2026-08-24',
  };
}

function draftFromWorker(worker: Worker): WorkerDraft {
  const outside = worker.outsideJobs[0];
  return {
    id: worker.id,
    name: worker.name,
    status: worker.status,
    activeStart: worker.activeStart,
    activeEnd: worker.activeEnd ?? '',
    hourlyRate: (worker.hourlyRateCents / 100).toFixed(2),
    hasWorkStudy: Boolean(worker.workStudy),
    award: String((worker.workStudy?.awardCents ?? 300_000) / 100),
    hasOfficialBalance: Boolean(worker.workStudy?.officialBalance),
    officialBalance: worker.workStudy?.officialBalance ? String(worker.workStudy.officialBalance.remainingCents / 100) : '',
    officialBalanceDate: worker.workStudy?.officialBalance?.asOfDate ?? '',
    hasOutsideJob: Boolean(outside),
    outsideJobName: outside?.name ?? 'Other Chapman job',
    outsideJobWage: ((outside?.hourlyRateCents ?? worker.hourlyRateCents) / 100).toFixed(2),
    outsideJobHours: (outside?.averageWeeklyMinutes ?? 0) / 60,
    outsideJobStart: outside?.startDate ?? worker.activeStart,
  };
}

function workerFromDraft(draft: WorkerDraft, previous?: Worker): Worker | null {
  const hourlyRateCents = parseDollarInput(draft.hourlyRate);
  const awardCents = parseDollarInput(draft.award);
  const outsideWageCents = parseDollarInput(draft.outsideJobWage);
  if (!draft.name.trim() || !hourlyRateCents || (draft.hasWorkStudy && awardCents === null)) return null;
  const officialCents = draft.hasOfficialBalance ? parseDollarInput(draft.officialBalance) : null;
  if (draft.hasOfficialBalance && (officialCents === null || !draft.officialBalanceDate)) return null;
  return {
    id: previous?.id ?? `worker-${crypto.randomUUID()}`,
    name: draft.name.trim(),
    status: draft.status,
    activeStart: draft.activeStart,
    activeEnd: draft.activeEnd || undefined,
    hourlyRateCents,
    workStudy: draft.hasWorkStudy
      ? {
          awardCents: awardCents ?? 300_000,
          officialBalance:
            draft.hasOfficialBalance && officialCents !== null && draft.officialBalanceDate
              ? { remainingCents: officialCents, asOfDate: draft.officialBalanceDate }
              : undefined,
        }
      : undefined,
    outsideJobs:
      draft.hasWorkStudy && draft.hasOutsideJob && outsideWageCents
        ? [
            {
              id: previous?.outsideJobs[0]?.id ?? `outside-${crypto.randomUUID()}`,
              name: draft.outsideJobName.trim() || 'Other Chapman job',
              hourlyRateCents: outsideWageCents,
              averageWeeklyMinutes: Math.round(draft.outsideJobHours * 60),
              startDate: draft.outsideJobStart,
            },
          ]
        : [],
    schedules: previous?.schedules ?? [],
  };
}

export function Workers({ year, onChange }: WorkersProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<WorkerDraft>(() => blankDraft(year));
  const [validation, setValidation] = React.useState<string | null>(null);
  const [deleteWorker, setDeleteWorker] = React.useState<Worker | null>(null);

  const openNew = () => {
    setDraft(blankDraft(year));
    setValidation(null);
    setOpen(true);
  };
  const openEdit = (worker: Worker) => {
    setDraft(draftFromWorker(worker));
    setValidation(null);
    setOpen(true);
  };
  const save = () => {
    if (draft.hasOfficialBalance && (!draft.officialBalance.trim() || parseDollarInput(draft.officialBalance) === null || !draft.officialBalanceDate)) {
      setValidation('Enter the known remaining balance and the date it was reported.');
      return;
    }
    const previous = year.workers.find((worker) => worker.id === draft.id);
    const worker = workerFromDraft(draft, previous);
    if (!worker) {
      setValidation('Enter a worker name, valid hourly wage, and work-study award.');
      return;
    }
    onChange(previous ? year.workers.map((candidate) => candidate.id === previous.id ? worker : candidate) : [...year.workers, worker]);
    setOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Workers</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Wages, employment dates, work-study awards, and estimated outside-job depletion.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />Add worker</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-left text-[12px]">
          <thead className="bg-surface-900 text-[11px] text-muted-foreground">
            <tr>
              <th className="border-b border-border px-3 py-2 font-medium">Worker</th>
              <th className="border-b border-border px-3 py-2 font-medium">Status</th>
              <th className="border-b border-border px-3 py-2 font-medium">Employment dates</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">Wage</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">Work-study award</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">Outside job / week</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {year.workers.map((worker) => {
              const outsideWeekly = worker.outsideJobs.reduce(
                (sum, job) => sum + Math.round((job.averageWeeklyMinutes * job.hourlyRateCents) / 60),
                0,
              );
              return (
                <tr key={worker.id} className="hover:bg-surface-900/55">
                  <td className="border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-900"><UserRound className="h-3.5 w-3.5 text-muted-foreground" /></div><span className="font-medium">{worker.name}</span></div>
                  </td>
                  <td className="border-b border-border px-3 py-2.5"><Badge variant="outline" className="capitalize">{worker.status}</Badge></td>
                  <td className="border-b border-border px-3 py-2.5 font-mono text-[11px]">{worker.activeStart} → {worker.activeEnd ?? 'ongoing'}</td>
                  <td className="border-b border-border px-3 py-2.5 text-right font-mono">{formatCurrencyPrecise(worker.hourlyRateCents)}/hr</td>
                  <td className="border-b border-border px-3 py-2.5 text-right font-mono">{worker.workStudy ? formatCurrency(worker.workStudy.awardCents) : 'None'}</td>
                  <td className="border-b border-border px-3 py-2.5 text-right font-mono">{outsideWeekly ? formatCurrency(outsideWeekly) : '—'}</td>
                  <td className="border-b border-border px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${worker.name}`} onClick={() => openEdit(worker)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${worker.name}`} onClick={() => setDeleteWorker(worker)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {year.workers.length === 0 && (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-900"><BriefcaseBusiness className="h-5 w-5 text-muted-foreground" /></div>
            <h2 className="mt-3 text-[14px] font-semibold">No workers in {year.label}</h2>
            <p className="mt-1 max-w-sm text-[12px] leading-5 text-muted-foreground">Add a worker with their wage and work-study details. Their schedule determines the forecast.</p>
            <Button className="mt-4" size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5" />Add first worker</Button>
          </div>
        )}
      </div>

      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? 'Edit worker' : 'Add worker'}
        description="Store only the information CPD needs for wage forecasting."
        widthClassName="max-w-2xl"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save worker</Button></>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Worker name"><Input autoFocus value={draft.name} maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Worker['status'] })}><option value="active">Active</option><option value="planned">Planned</option><option value="paused">Paused</option><option value="ended">Ended</option></Select></Field>
          <Field label="Active start"><DatePicker required min={year.startDate} max={year.endDate} value={draft.activeStart} onChange={(value) => setDraft({ ...draft, activeStart: value })} aria-label="Active start" /></Field>
          <Field label="Active end" hint="Leave blank if unknown."><DatePicker min={draft.activeStart} max={year.endDate} value={draft.activeEnd} onChange={(value) => setDraft({ ...draft, activeEnd: value })} placeholder="No end date" aria-label="Active end" /></Field>
          <Field label="Hourly wage"><MoneyInput value={draft.hourlyRate} onValueChange={(value) => setDraft((current) => ({ ...current, hourlyRate: value }))} /></Field>
          <div className="flex items-center gap-2 pt-6"><Checkbox id="work-study" checked={draft.hasWorkStudy} onCheckedChange={(checked) => setDraft({ ...draft, hasWorkStudy: checked === true })} /><label htmlFor="work-study" className="text-[13px] font-medium">Has work-study</label></div>
        </div>
        {draft.hasWorkStudy && (
          <div className="mt-5 rounded-lg border border-border bg-surface-900/55 p-4">
            <div className="grid items-end gap-4 md:grid-cols-2">
              <Field label="Starting award"><MoneyInput value={draft.award} onValueChange={(value) => setDraft((current) => ({ ...current, award: value }))} /></Field>
              <div className="pb-1">
                <div className="flex items-center gap-2"><Checkbox id="known-balance" checked={draft.hasOfficialBalance} onCheckedChange={(checked) => setDraft({ ...draft, hasOfficialBalance: checked === true, officialBalance: checked === true ? draft.officialBalance : '', officialBalanceDate: checked === true ? draft.officialBalanceDate : '' })} /><label htmlFor="known-balance" className="text-[13px] font-medium">I have a current remaining balance</label></div>
                <p className="ml-6 mt-1 text-[11px] leading-4 text-muted-foreground">For a worker added or updated after their award has already been used.</p>
              </div>
            </div>
            {draft.hasOfficialBalance && (
              <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <Field label="Current remaining balance"><MoneyInput placeholder="Enter balance" value={draft.officialBalance} onValueChange={(value) => setDraft((current) => ({ ...current, officialBalance: value }))} /></Field>
                <Field label="Balance reported on"><DatePicker required min={year.startDate} max={year.endDate} value={draft.officialBalanceDate} onChange={(value) => setDraft({ ...draft, officialBalanceDate: value })} aria-label="Balance reported on" /></Field>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2"><Checkbox id="outside-job" checked={draft.hasOutsideJob} onCheckedChange={(checked) => setDraft({ ...draft, hasOutsideJob: checked === true })} /><label htmlFor="outside-job" className="text-[13px] font-medium">Estimate another job that uses the same award</label></div>
            {draft.hasOutsideJob && (
              <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-4">
                <Field label="Other job"><Input value={draft.outsideJobName} onChange={(event) => setDraft({ ...draft, outsideJobName: event.target.value })} /></Field>
                <Field label="Other hourly wage"><MoneyInput value={draft.outsideJobWage} onValueChange={(value) => setDraft((current) => ({ ...current, outsideJobWage: value }))} /></Field>
                <Field label="Average hours / week"><HourInput value={draft.outsideJobHours} min={0} max={40} onValueChange={(value) => setDraft({ ...draft, outsideJobHours: value })} /></Field>
                <Field label="Estimate begins"><DatePicker required min={year.startDate} max={year.endDate} value={draft.outsideJobStart} onChange={(value) => setDraft({ ...draft, outsideJobStart: value })} aria-label="Estimate begins" /></Field>
              </div>
            )}
          </div>
        )}
        {validation && <p className="mt-3 text-[12px] text-destructive">{validation}</p>}
      </DialogShell>

      <ConfirmDialog
        open={Boolean(deleteWorker)}
        onOpenChange={(next) => !next && setDeleteWorker(null)}
        title="Delete worker?"
        description={deleteWorker ? `${deleteWorker.name}, their schedules, and their forecast contribution will be removed from this fiscal year.` : ''}
        confirmLabel="Delete worker"
        confirmVariant="destructive"
        onConfirm={() => {
          if (deleteWorker) onChange(year.workers.filter((worker) => worker.id !== deleteWorker.id));
          setDeleteWorker(null);
        }}
      />
    </div>
  );
}
