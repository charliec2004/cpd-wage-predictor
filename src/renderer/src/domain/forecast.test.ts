import { describe, expect, it } from 'vitest';
import type { FiscalYear, Worker, WorkerSchedule } from '../../../shared/workspace';
import { calculateForecast } from './forecast';
import { createFiscalYear2026 } from './seed';
import { datesBetween } from './dates';

function recurring(periodId: string, shifts: Array<[number, number, number]>): WorkerSchedule {
  return {
    id: `schedule-${periodId}`,
    periodId,
    mode: 'recurring',
    recurringShifts: shifts.map(([weekday, startMinute, endMinute], index) => ({
      id: `shift-${periodId}-${index}`,
      weekday,
      startMinute,
      endMinute,
    })),
    datedShifts: [],
  };
}

function worker(year: FiscalYear, overrides: Partial<Worker> = {}): Worker {
  return {
    id: 'worker-1',
    name: 'Test Worker',
    status: 'active',
    activeStart: year.startDate,
    hourlyRateCents: 1_600,
    outsideJobs: [],
    schedules: [],
    ...overrides,
  };
}

describe('calculateForecast', () => {
  it('makes Summer CPD-funded and applies Fall work-study dollar-for-dollar until exhaustion', () => {
    const year = createFiscalYear2026();
    year.closures = [];
    const summer = year.periods.find((period) => period.type === 'summer')!;
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.workers = [
      worker(year, {
        workStudy: { awardCents: 1_600 },
        schedules: [recurring(summer.id, [[1, 540, 660]]), recurring(fall.id, [[1, 540, 660]])],
      }),
    ];

    const result = calculateForecast(year, '2026-06-01');
    const summerRow = result.daily.find((row) => row.date === '2026-06-01')!;
    const fallRow = result.daily.find((row) => row.date === '2026-08-24')!;
    expect(summerRow.grossWagesCents).toBe(3_200);
    expect(summerRow.workStudyCoveredCents).toBe(0);
    expect(summerRow.cpdCostCents).toBe(3_200);
    expect(fallRow.workStudyCoveredCents).toBe(1_600);
    expect(fallRow.cpdCostCents).toBe(1_600);
  });

  it('depletes the award from estimated outside-job earnings before CPD earnings', () => {
    const year = createFiscalYear2026();
    year.closures = [];
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.workers = [
      worker(year, {
        workStudy: { awardCents: 2_000 },
        outsideJobs: [
          {
            id: 'outside-1',
            name: 'Other job',
            hourlyRateCents: 1_400,
            averageWeeklyMinutes: 300,
            startDate: fall.startDate,
          },
        ],
        schedules: [recurring(fall.id, [[1, 540, 600]])],
      }),
    ];

    const row = calculateForecast(year, fall.startDate).daily.find((candidate) => candidate.date === fall.startDate)!;
    expect(row.outsideJobConsumptionCents).toBe(1_000);
    expect(row.grossWagesCents).toBe(1_600);
    expect(row.workStudyCoveredCents).toBe(1_000);
    expect(row.cpdCostCents).toBe(600);
  });

  it('clips full and partial closures before calculating planned wages', () => {
    const year = createFiscalYear2026();
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.closures = [
      { id: 'full', name: 'Full closure', date: '2026-09-07' },
      { id: 'partial', name: 'Partial closure', date: '2026-09-08', startMinute: 600, endMinute: 660 },
    ];
    year.workers = [worker(year, { schedules: [recurring(fall.id, [[1, 540, 720], [2, 540, 720]])] })];
    const result = calculateForecast(year, '2026-09-01');
    expect(result.daily.find((row) => row.date === '2026-09-07')?.minutes).toBe(0);
    expect(result.daily.find((row) => row.date === '2026-09-08')?.minutes).toBe(120);
  });

  it('lets daily corrections override the closure-clipped schedule without changing future shifts', () => {
    const year = createFiscalYear2026();
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.closures = [{ id: 'partial', name: 'Partial closure', date: '2026-09-08', startMinute: 600, endMinute: 720 }];
    year.workers = [worker(year, { schedules: [recurring(fall.id, [[2, 540, 720]])] })];
    year.adjustments = [
      { id: 'day-correction', workerId: 'worker-1', scope: 'day', date: '2026-09-08', minutes: 60, note: 'Worked remotely' },
    ];
    const result = calculateForecast(year, '2026-09-09');
    expect(result.daily.find((row) => row.date === '2026-09-08')).toMatchObject({ minutes: 60, state: 'corrected' });
    expect(result.daily.find((row) => row.date === '2026-09-15')?.minutes).toBe(180);
  });

  it('supports a separate weekly-total replacement workflow', () => {
    const year = createFiscalYear2026();
    year.closures = [];
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.workers = [worker(year, { schedules: [recurring(fall.id, [[1, 540, 600], [2, 540, 600]])] })];
    year.adjustments = [
      { id: 'week-correction', workerId: 'worker-1', scope: 'week', date: '2026-09-07', minutes: 300, note: 'Event week' },
    ];
    const result = calculateForecast(year, '2026-09-13');
    const correctedWeek = result.daily.filter((row) => row.weekStart === '2026-09-07');
    expect(correctedWeek.reduce((total, row) => total + row.minutes, 0)).toBe(300);
    expect(correctedWeek.filter((row) => row.state === 'corrected')).toHaveLength(7);
  });

  it('uses an official balance as an end-of-day recalibration for subsequent estimates', () => {
    const year = createFiscalYear2026();
    year.closures = [];
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.workers = [
      worker(year, {
        workStudy: { awardCents: 100_000, officialBalance: { remainingCents: 0, asOfDate: '2026-08-24' } },
        schedules: [recurring(fall.id, [[1, 540, 600], [2, 540, 600]])],
      }),
    ];
    const result = calculateForecast(year, '2026-08-25');
    expect(result.daily.find((row) => row.date === '2026-08-24')?.workStudyCoveredCents).toBe(1_600);
    expect(result.daily.find((row) => row.date === '2026-08-25')?.cpdCostCents).toBe(1_600);
  });

  it('adds saved scenario hires without changing the main plan', () => {
    const year = createFiscalYear2026();
    year.workers = [];
    year.scenarios[0]!.plannedHires = [
      {
        id: 'hire-1',
        label: 'Spring hire',
        startDate: '2027-02-01',
        hourlyRateCents: 1_600,
        averageWeeklyMinutes: 600,
      },
    ];
    const baseline = calculateForecast(year, '2026-07-15');
    const scenario = calculateForecast(year, '2026-07-15', year.scenarios[0]!.id);
    expect(baseline.totals.cpdCostCents).toBe(0);
    expect(scenario.totals.cpdCostCents).toBeGreaterThan(0);
    expect(year.workers).toHaveLength(0);
  });

  it('classifies every fiscal date into exactly one seed period', () => {
    const year = createFiscalYear2026();
    for (const date of datesBetween(year.startDate, year.endDate)) {
      const matches = year.periods.filter((period) => date >= period.startDate && date <= period.endDate);
      expect(matches, date).toHaveLength(1);
    }
  });
});
