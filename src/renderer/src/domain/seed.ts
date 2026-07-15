import { WORKSPACE_SCHEMA_VERSION, type FiscalYear, type Workspace } from '../../../shared/workspace';

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createFiscalYear2026(): FiscalYear {
  return {
    id: id('fy'),
    label: 'FY 2026–27',
    startDate: '2026-06-01',
    endDate: '2027-05-31',
    status: 'active',
    budgetCents: 0,
    periods: [
      {
        id: 'period-summer-2026',
        name: 'Summer 2026',
        type: 'summer',
        startDate: '2026-06-01',
        endDate: '2026-08-23',
        scheduleMode: 'week-specific',
        workStudyEligible: false,
      },
      {
        id: 'period-fall-2026',
        name: 'Fall 2026',
        type: 'fall',
        startDate: '2026-08-24',
        endDate: '2026-12-12',
        scheduleMode: 'recurring',
        workStudyEligible: true,
      },
      {
        id: 'period-winter-2026',
        name: 'Winter transition',
        type: 'winter',
        startDate: '2026-12-13',
        endDate: '2027-01-03',
        scheduleMode: 'week-specific',
        workStudyEligible: false,
      },
      {
        id: 'period-interterm-2027',
        name: 'Interterm 2027',
        type: 'interterm',
        startDate: '2027-01-04',
        endDate: '2027-01-30',
        scheduleMode: 'week-specific',
        workStudyEligible: true,
      },
      {
        id: 'period-transition-2027',
        name: 'Interterm/Spring transition',
        type: 'transition',
        startDate: '2027-01-31',
        endDate: '2027-01-31',
        scheduleMode: 'week-specific',
        workStudyEligible: false,
      },
      {
        id: 'period-spring-2027',
        name: 'Spring 2027',
        type: 'spring',
        startDate: '2027-02-01',
        endDate: '2027-05-22',
        scheduleMode: 'recurring',
        workStudyEligible: true,
      },
      {
        id: 'period-close-2027',
        name: 'Post-Spring / FY close',
        type: 'transition',
        startDate: '2027-05-23',
        endDate: '2027-05-31',
        scheduleMode: 'week-specific',
        workStudyEligible: false,
      },
    ],
    closures: [
      { id: 'closure-juneteenth-2026', name: 'Juneteenth', date: '2026-06-19' },
      { id: 'closure-independence-1-2026', name: 'Independence Day closure', date: '2026-07-03' },
      { id: 'closure-independence-2-2026', name: 'Extended Independence Day closure', date: '2026-07-06' },
      { id: 'closure-labor-2026', name: 'Labor Day', date: '2026-09-07' },
      { id: 'closure-thanksgiving-2026', name: 'Thanksgiving', date: '2026-11-26' },
      { id: 'closure-thanksgiving-friday-2026', name: 'Thanksgiving Friday', date: '2026-11-27' },
      { id: 'closure-christmas-eve-2026', name: 'Winter closure', date: '2026-12-24' },
      { id: 'closure-christmas-2026', name: 'Winter closure', date: '2026-12-25' },
      { id: 'closure-new-year-eve-2026', name: 'Winter closure', date: '2026-12-31' },
      { id: 'closure-new-year-2027', name: 'Winter closure', date: '2027-01-01' },
      { id: 'closure-mlk-2027', name: 'Martin Luther King Jr. Day', date: '2027-01-18' },
      { id: 'closure-cesar-2027', name: 'César Chávez Day observed', date: '2027-03-26' },
      { id: 'closure-memorial-2027', name: 'Memorial Day', date: '2027-05-31' },
    ],
    workers: [],
    adjustments: [],
    scenarios: [
      {
        id: 'scenario-expected',
        name: 'Expected',
        description: 'The current best estimate of future staffing.',
        role: 'expected',
        plannedHires: [],
        departureOverrides: [],
      },
    ],
  };
}

export function createInitialWorkspace(): Workspace {
  const now = new Date().toISOString();
  const fiscalYear = createFiscalYear2026();
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    id: id('workspace'),
    name: 'CPD Student Wage Plan',
    createdAt: now,
    updatedAt: now,
    activeFiscalYearId: fiscalYear.id,
    fiscalYears: [fiscalYear],
  };
}

function shiftCalendarYear(date: string, years: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCFullYear(parsed.getUTCFullYear() + years);
  return parsed.toISOString().slice(0, 10);
}

export function createNextFiscalYearTemplate(current: FiscalYear): FiscalYear {
  const startYear = Number(current.startDate.slice(0, 4)) + 1;
  const periodIds = new Map<string, string>();
  const periods = current.periods.map((period) => {
    const nextId = `period-${crypto.randomUUID()}`;
    periodIds.set(period.id, nextId);
    return {
      ...period,
      id: nextId,
      startDate: shiftCalendarYear(period.startDate, 1),
      endDate: shiftCalendarYear(period.endDate, 1),
    };
  });
  return {
    id: id('fy'),
    label: `FY ${startYear}–${String(startYear + 1).slice(-2)}`,
    startDate: shiftCalendarYear(current.startDate, 1),
    endDate: shiftCalendarYear(current.endDate, 1),
    status: 'planning',
    budgetCents: current.budgetCents,
    periods,
    closures: [],
    workers: [],
    adjustments: [],
    scenarios: [
      {
        id: `scenario-${crypto.randomUUID()}`,
        name: 'Expected',
        description: 'The current best estimate of future staffing.',
        role: 'expected',
        plannedHires: [],
        departureOverrides: [],
      },
    ],
  };
}
