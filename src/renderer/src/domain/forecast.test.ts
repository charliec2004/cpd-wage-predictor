import { describe, expect, it } from 'vitest';
import type { FiscalYear, Worker, WorkerSchedule } from '../../../shared/workspace';
import { assessForecastCoverageSegments, calculateForecast, calculateForecastRange, scheduledPayableMinutes } from './forecast';
import { createFiscalYear2026, createInitialWorkspace, createNextFiscalYearTemplate, normalizeWorkspaceRules } from './seed';
import { datesBetween } from './dates';
import { createNoStaffingEstimate, createPeriodEstimateFromComparable, periodHasKnownSchedule } from './period-estimates';

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
  it('deducts one 30-minute unpaid break from continuous shifts longer than five hours', () => {
    expect(scheduledPayableMinutes([{ startMinute: 480, endMinute: 780 }])).toBe(300);
    expect(scheduledPayableMinutes([{ startMinute: 480, endMinute: 781 }])).toBe(271);
    expect(scheduledPayableMinutes([{ startMinute: 480, endMinute: 720 }, { startMinute: 720, endMinute: 1020 }])).toBe(510);
    expect(scheduledPayableMinutes([{ startMinute: 480, endMinute: 720 }, { startMinute: 750, endMinute: 1020 }])).toBe(510);
    expect(scheduledPayableMinutes([{ startMinute: 480, endMinute: 720 }, { startMinute: 735, endMinute: 1020 }])).toBe(495);
  });

  it('does not deduct a second meal break when a closure already creates a 30-minute gap', () => {
    const shift = [{ startMinute: 480, endMinute: 1020 }];
    expect(scheduledPayableMinutes(shift, [{ id: 'break', name: 'Closed', date: '2026-09-01', startMinute: 720, endMinute: 750 }])).toBe(510);
    expect(scheduledPayableMinutes(shift, [{ id: 'short', name: 'Closed', date: '2026-09-01', startMinute: 720, endMinute: 735 }])).toBe(495);
  });

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

  it('makes every non-Summer period work-study eligible', () => {
    const year = createFiscalYear2026();
    expect(year.periods.filter((period) => period.type === 'summer').every((period) => !period.workStudyEligible)).toBe(true);
    expect(year.periods.filter((period) => period.type !== 'summer').every((period) => period.workStudyEligible)).toBe(true);

    year.closures = [];
    const winter = year.periods.find((period) => period.type === 'winter')!;
    year.workers = [worker(year, { workStudy: { awardCents: 10_000 }, schedules: [recurring(winter.id, [[1, 540, 600]])] })];
    const winterMonday = datesBetween(winter.startDate, winter.endDate).find((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1)!;
    const winterRow = calculateForecast(year, winterMonday).daily.find((row) => row.date === winterMonday)!;
    expect(winterRow.workStudyCoveredCents).toBe(1_600);
    expect(winterRow.cpdCostCents).toBe(0);
  });

  it('migrates legacy transition eligibility and keeps the pre-Summer fiscal close eligible', () => {
    const workspace = createInitialWorkspace();
    const year = workspace.fiscalYears[0]!;
    const winter = year.periods.find((period) => period.type === 'winter')!;
    winter.workStudyEligible = false;
    const close = year.periods.at(-1)!;
    close.name = 'Post-Spring / FY close';
    close.type = 'transition';
    close.workStudyEligible = false;

    const normalized = normalizeWorkspaceRules(workspace).fiscalYears[0]!;
    expect(normalized.periods.find((period) => period.type === 'winter')?.workStudyEligible).toBe(true);
    expect(normalized.periods.at(-1)).toMatchObject({ name: 'Spring/Summer transition', type: 'transition', workStudyEligible: true });
  });

  it('uses Chapman FY 2026–27 semester, finals, transition, and winter-closure dates', () => {
    const year = createFiscalYear2026();
    expect(year.periods).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Summer 2026', startDate: '2026-06-01', endDate: '2026-08-22', type: 'summer' }),
      expect.objectContaining({ name: 'Fall 2026', startDate: '2026-08-24', endDate: '2026-12-12', finalsStartDate: '2026-12-07', finalsEndDate: '2026-12-12' }),
      expect.objectContaining({ name: 'Interterm 2027', startDate: '2027-01-04', endDate: '2027-01-30' }),
      expect.objectContaining({ name: 'Spring 2027', startDate: '2027-02-01', endDate: '2027-05-22', finalsStartDate: '2027-05-17', finalsEndDate: '2027-05-22' }),
      expect.objectContaining({ name: 'Spring/Summer transition', startDate: '2027-05-23', endDate: '2027-05-31', type: 'transition', workStudyEligible: true }),
    ]));
    expect(year.closures.filter((closure) => closure.name === 'Winter closure').map((closure) => closure.date)).toEqual([
      '2026-12-24',
      '2026-12-25',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ]);
  });

  it('carries fiscal calendar and finals configuration into the next-year template', () => {
    const current = createFiscalYear2026();
    const next = createNextFiscalYearTemplate(current);
    const nextFall = next.periods.find((period) => period.type === 'fall')!;
    const nextSummer = next.periods.find((period) => period.type === 'summer')!;

    expect(next.label).toBe('FY 2027–28');
    expect(nextFall).toMatchObject({
      startDate: '2027-08-24',
      finalsStartDate: '2027-12-07',
      finalsEndDate: '2027-12-12',
      workStudyEligible: true,
    });
    expect(nextSummer.workStudyEligible).toBe(false);
    expect(next.closures).toHaveLength(0);
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

  it('applies a one-day schedule change without rewriting the repeating schedule', () => {
    const year = createFiscalYear2026();
    year.closures = [];
    const fall = year.periods.find((period) => period.type === 'fall')!;
    const schedule = recurring(fall.id, [[2, 540, 720]]);
    schedule.dayOverrides = [
      {
        id: 'day-override',
        date: '2026-09-08',
        shifts: [{ id: 'short-shift', date: '2026-09-08', startMinute: 600, endMinute: 660 }],
      },
      { id: 'day-off', date: '2026-09-15', shifts: [] },
    ];
    year.workers = [worker(year, { schedules: [schedule] })];

    const result = calculateForecast(year, '2026-09-01');
    expect(result.daily.find((row) => row.date === '2026-09-08')).toMatchObject({ minutes: 60, source: 'Fall 2026 day change' });
    expect(result.daily.find((row) => row.date === '2026-09-15')?.minutes).toBe(0);
    expect(result.daily.find((row) => row.date === '2026-09-22')?.minutes).toBe(180);
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

  it('keeps unknown periods visibly missing instead of treating them as a zero-dollar forecast', () => {
    const year = createFiscalYear2026();
    const fall = year.periods.find((period) => period.type === 'fall')!;
    year.closures = [];
    year.workers = [worker(year, { schedules: [recurring(fall.id, [[1, 540, 660]])] })];

    const result = calculateForecast(year, '2026-07-15');
    expect(result.complete).toBe(false);
    expect(result.coverage.find((period) => period.periodId === fall.id)?.status).toBe('scheduled');
    expect(result.coverage.find((period) => period.name === 'Spring 2027')?.status).toBe('missing');
    expect(result.warnings).toContain('Spring 2027 has no schedule or staffing estimate.');
  });

  it('creates a lower/expected/higher Spring estimate from Fall and lets an exact schedule replace it', () => {
    const year = createFiscalYear2026();
    const fall = year.periods.find((period) => period.type === 'fall')!;
    const spring = year.periods.find((period) => period.type === 'spring')!;
    year.closures = [];
    year.workers = [worker(year, {
      workStudy: { awardCents: 300_000 },
      schedules: [recurring(fall.id, [[1, 540, 660], [3, 540, 720]])],
    })];
    year.periodEstimates = [createPeriodEstimateFromComparable(year, spring, year, fall)];

    const range = calculateForecastRange(year, '2026-07-15');
    expect(range.low.totals.cpdCostCents).toBeLessThanOrEqual(range.expected.totals.cpdCostCents);
    expect(range.expected.totals.cpdCostCents).toBeLessThanOrEqual(range.high.totals.cpdCostCents);
    expect(range.expected.coverage.find((period) => period.periodId === spring.id)?.status).toBe('estimated');
    expect(range.expected.daily.some((row) => row.sourceKind === 'estimate' && row.date >= spring.startDate && row.date <= spring.endDate)).toBe(true);

    year.workers[0]!.schedules.push(recurring(spring.id, [[1, 600, 720]]));
    const exact = calculateForecast(year, '2026-07-15');
    const springMonday = datesBetween(spring.startDate, spring.endDate).find((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1)!;
    expect(exact.daily.find((row) => row.date === springMonday)).toMatchObject({ minutes: 120, sourceKind: 'schedule', state: 'scheduled' });
  });

  it('keeps saved staffing scenarios separate from the planning range', () => {
    const year = createFiscalYear2026();
    year.workers = [];
    year.scenarios.push({
      id: 'scenario-high-hiring',
      name: 'Hire more students',
      description: '',
      role: 'prudent-high',
      plannedHires: [{
        id: 'hire-1',
        label: 'Spring hire',
        startDate: '2027-02-01',
        hourlyRateCents: 1_690,
        averageWeeklyMinutes: 600,
      }],
      departureOverrides: [],
    });

    const range = calculateForecastRange(year, '2026-07-15');
    const scenario = calculateForecast(year, '2026-07-15', 'scenario-high-hiring', 'expected');

    expect(range.low.totals.cpdCostCents).toBe(0);
    expect(range.expected.totals.cpdCostCents).toBe(0);
    expect(range.high.totals.cpdCostCents).toBe(0);
    expect(scenario.totals.cpdCostCents).toBeGreaterThan(0);
  });

  it('splits current-period source coverage into dated past, corrected, and future ranges', () => {
    const year = createFiscalYear2026();
    const summer = year.periods.find((period) => period.type === 'summer')!;
    year.workers = [worker(year, { schedules: [recurring(summer.id, [[1, 540, 660]])] })];
    year.adjustments = [{ id: 'actual', workerId: 'worker-1', scope: 'day', date: '2026-07-14', minutes: 60, note: 'Actual hours' }];
    const segments = assessForecastCoverageSegments(year, '2026-07-15').filter((segment) => segment.periodId === summer.id);

    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({ endDate: '2026-07-13', state: 'assumed-worked' }),
      expect.objectContaining({ startDate: '2026-07-14', endDate: '2026-07-14', state: 'corrected' }),
      expect.objectContaining({ startDate: '2026-07-15', endDate: '2026-07-15', state: 'assumed-worked' }),
      expect.objectContaining({ startDate: '2026-07-16', endDate: summer.endDate, state: 'scheduled' }),
    ]));
  });

  it('distinguishes an explicit no-staffing decision from missing information', () => {
    const year = createFiscalYear2026();
    const spring = year.periods.find((period) => period.type === 'spring')!;
    year.periodEstimates = [createNoStaffingEstimate(spring)];
    const result = calculateForecast(year, '2026-07-15');
    expect(result.coverage.find((period) => period.periodId === spring.id)?.status).toBe('no-staffing');
    expect(result.warnings).not.toContain('Spring 2027 has no schedule or staffing estimate.');
  });

  it('does not recommend an incomplete week-specific period as a forecast source', () => {
    const year = createFiscalYear2026();
    const summer = year.periods.find((period) => period.type === 'summer')!;
    year.workers = [worker(year, {
      schedules: [{
        id: 'partial-summer',
        periodId: summer.id,
        mode: 'week-specific',
        recurringShifts: [],
        datedShifts: [{ id: 'one-shift', date: summer.startDate, startMinute: 540, endMinute: 660 }],
      }],
    })];
    expect(periodHasKnownSchedule(year, summer.id)).toBe(false);
  });

  it('classifies every fiscal date into exactly one seed period', () => {
    const year = createFiscalYear2026();
    for (const date of datesBetween(year.startDate, year.endDate)) {
      const matches = year.periods.filter((period) => date >= period.startDate && date <= period.endDate);
      expect(matches, date).toHaveLength(1);
    }
  });
});
