import * as React from 'react';
import { CalendarCheck2, CalendarRange, Plus, Trash2 } from 'lucide-react';
import type { FiscalYear, HourAdjustment } from '../../../shared/workspace';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DatePicker } from '../../components/ui/date-picker';
import { HourInput } from '../../components/ui/hour-input';
import { Input } from '../../components/ui/input';
import { NoticePanel } from '../../components/ui/notice-panel';
import { Field, Select } from '../components/form-controls';
import { formatLongDate, mondayOfWeek } from '../domain/dates';

interface AdjustmentsProps {
  year: FiscalYear;
  onChange: (adjustments: HourAdjustment[]) => void;
  openRequest?: { key: number; workerId: string; date: string } | null;
}

export function Adjustments({ year, onChange, openRequest }: AdjustmentsProps) {
  const [scope, setScope] = React.useState<'day' | 'week'>('day');
  const [workerId, setWorkerId] = React.useState(year.workers[0]?.id ?? '');
  const [date, setDate] = React.useState('');
  const [hours, setHours] = React.useState(0);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!openRequest) return;
    setScope('day');
    setWorkerId(openRequest.workerId);
    setDate(openRequest.date);
    setHours(0);
    setNote('');
  }, [openRequest]);

  const add = () => {
    if (!workerId || !date) return;
    onChange([
      ...year.adjustments,
      {
        id: `adjustment-${crypto.randomUUID()}`,
        workerId,
        scope,
        date: scope === 'week' ? mondayOfWeek(date) : date,
        minutes: Math.round(hours * 60),
        note: note.trim(),
      },
    ]);
    setDate('');
    setHours(0);
    setNote('');
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Changes</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Schedules are assumed worked. Record only what happened differently.</p>
      </div>
      <NoticePanel
        variant="info"
        title="No confirmation required"
        description="If everyone worked as scheduled, do nothing. A correction changes only that day or week and preserves the repeating schedule."
      />
      {year.workers.length === 0 ? (
        <NoticePanel variant="warning" title="Add a worker before recording adjustments" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-900 p-1">
              <Button variant={scope === 'day' ? 'secondary' : 'ghost'} onClick={() => setScope('day')}><CalendarCheck2 className="h-4 w-4" />Daily correction</Button>
              <Button variant={scope === 'week' ? 'secondary' : 'ghost'} onClick={() => setScope('week')}><CalendarRange className="h-4 w-4" />Weekly total</Button>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Worker"><Select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{year.workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</Select></Field>
              <Field label={scope === 'day' ? 'Work date' : 'Any date in the week'} hint={scope === 'week' ? 'The replacement applies to the Monday–Sunday week.' : undefined}><DatePicker required min={year.startDate} max={year.endDate} value={date} onChange={setDate} aria-label={scope === 'day' ? 'Work date' : 'Any date in the week'} /></Field>
              <Field label={scope === 'day' ? 'Paid hours that day' : 'Paid hours that week'} hint="Enter hours after unpaid meal breaks."><HourInput value={hours} min={0} max={scope === 'day' ? 24 : 168} onValueChange={setHours} /></Field>
              <Field label="Reason or note"><Input maxLength={500} placeholder="Sick, event coverage, stayed late…" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
              <Button className="w-full" onClick={add}><Plus className="h-4 w-4" />Save {scope === 'day' ? 'daily correction' : 'weekly total'}</Button>
            </div>
          </section>
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border bg-surface-900/55 px-4 py-3"><h2 className="text-[13px] font-semibold">Recorded changes</h2></div>
            <table className="w-full min-w-[620px] border-collapse text-left text-[12px]">
              <thead className="bg-surface-900 text-[11px] text-muted-foreground"><tr><th className="border-b border-border px-3 py-2 font-medium">Worker</th><th className="border-b border-border px-3 py-2 font-medium">Scope</th><th className="border-b border-border px-3 py-2 font-medium">Date</th><th className="border-b border-border px-3 py-2 text-right font-medium">Replacement hours</th><th className="border-b border-border px-3 py-2 font-medium">Note</th><th className="border-b border-border px-3 py-2" /></tr></thead>
              <tbody>{year.adjustments.slice().sort((a, b) => b.date.localeCompare(a.date)).map((adjustment) => (
                <tr key={adjustment.id} className="hover:bg-surface-900/50"><td className="border-b border-border px-3 py-2.5 font-medium">{year.workers.find((worker) => worker.id === adjustment.workerId)?.name ?? 'Unknown worker'}</td><td className="border-b border-border px-3 py-2.5"><Badge variant="outline" className="capitalize">{adjustment.scope}</Badge></td><td className="border-b border-border px-3 py-2.5 font-mono text-[11px]">{adjustment.scope === 'week' ? `Week of ${formatLongDate(adjustment.date)}` : formatLongDate(adjustment.date)}</td><td className="border-b border-border px-3 py-2.5 text-right font-mono">{(adjustment.minutes / 60).toFixed(2)}</td><td className="max-w-48 truncate border-b border-border px-3 py-2.5 text-muted-foreground">{adjustment.note || '—'}</td><td className="border-b border-border px-3 py-2.5 text-right"><Button variant="ghost" size="icon-sm" aria-label="Delete adjustment" onClick={() => onChange(year.adjustments.filter((candidate) => candidate.id !== adjustment.id))}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>
              ))}</tbody>
            </table>
            {year.adjustments.length === 0 && <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">No corrections. Scheduled hours are being used.</div>}
          </section>
        </div>
      )}
    </div>
  );
}
