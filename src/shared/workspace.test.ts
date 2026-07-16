import { describe, expect, it } from 'vitest';
import { validateWorkspace, validateWorkspaceJson } from './workspace';
import { createInitialWorkspace } from '../renderer/src/domain/seed';

describe('workspace validation', () => {
  it('accepts the versioned initial workspace', () => {
    expect(validateWorkspace(createInitialWorkspace())).toBe(true);
  });

  it('rejects unknown schema versions and invalid imported values', () => {
    const workspace = createInitialWorkspace();
    expect(validateWorkspace({ ...workspace, schemaVersion: 99 })).toBe(false);
    expect(validateWorkspaceJson('{"schemaVersion":1,"name":"incomplete"}').ok).toBe(false);
    expect(validateWorkspaceJson('not-json').error).toMatch(/valid JSON/);
  });

  it('rejects unsafe closure intervals', () => {
    const workspace = createInitialWorkspace();
    workspace.fiscalYears[0]!.closures.push({
      id: 'bad-closure',
      name: 'Invalid',
      date: '2026-09-01',
      startMinute: 900,
      endMinute: 800,
    });
    expect(validateWorkspace(workspace)).toBe(false);
  });

  it('validates one-day schedule changes against their parent date', () => {
    const workspace = createInitialWorkspace();
    const year = workspace.fiscalYears[0]!;
    const period = year.periods.find((candidate) => candidate.type === 'fall')!;
    year.workers.push({
      id: 'worker-1',
      name: 'Jordan',
      status: 'active',
      activeStart: year.startDate,
      hourlyRateCents: 1_690,
      outsideJobs: [],
      schedules: [{
        id: 'schedule-1',
        periodId: period.id,
        mode: 'recurring',
        recurringShifts: [],
        datedShifts: [],
        dayOverrides: [{
          id: 'override-1',
          date: '2026-09-08',
          shifts: [{ id: 'shift-1', date: '2026-09-08', startMinute: 540, endMinute: 600 }],
        }],
      }],
    });
    expect(validateWorkspace(workspace)).toBe(true);
    year.workers[0]!.schedules[0]!.dayOverrides![0]!.shifts[0]!.date = '2026-09-09';
    expect(validateWorkspace(workspace)).toBe(false);
  });

  it('accepts finals ranges only when both dates stay inside the academic period', () => {
    const workspace = createInitialWorkspace();
    const fall = workspace.fiscalYears[0]!.periods.find((period) => period.type === 'fall')!;
    expect(validateWorkspace(workspace)).toBe(true);
    fall.finalsStartDate = '2026-12-07';
    fall.finalsEndDate = undefined;
    expect(validateWorkspace(workspace)).toBe(false);
    fall.finalsEndDate = '2027-01-01';
    expect(validateWorkspace(workspace)).toBe(false);
  });
});
