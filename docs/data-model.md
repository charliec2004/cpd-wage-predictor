# CPD Wage Predictor Data Model

Status: conceptual schema; storage technology not yet selected

## 1. Modeling rules

- IDs are stable UUIDs and never derived from names.
- Dates use ISO `YYYY-MM-DD` calendar dates.
- Money uses integer cents.
- Hours use integer minutes internally; decimal hours are presentation/import values.
- Timestamps use ISO 8601 UTC and are reserved for audit/import metadata.
- Every stored object includes a schema version or belongs to a versioned workspace.
- Actual data, plan data, and scenario data remain distinguishable.
- Deletion of referenced operational records is normally soft deletion or archival.

## 2. Aggregate hierarchy

```text
Workspace
├── organization settings
├── person directory
├── import mappings
├── fiscal years[]
│   ├── settings and budget revisions
│   ├── calendar periods and date rules
│   ├── employments and wage rates
│   ├── funding awards and outside usage
│   ├── recurring schedules
│   ├── week/day overrides
│   ├── actual and accrued entries
│   ├── scenarios and scenario events
│   └── import/audit records
└── backups and schema metadata
```

## 3. Workspace

```ts
interface Workspace {
  id: string;
  schemaVersion: number;
  name: string;
  timezone: 'America/Los_Angeles';
  createdAt: string;
  updatedAt: string;
  settings: WorkspaceSettings;
  people: Person[];
  fiscalYears: FiscalYear[];
  importMappings: ImportMapping[];
  auditEvents: AuditEvent[];
}
```

`WorkspaceSettings` includes display preferences, automatic backup location/retention, default week start, currency, and privacy options. It must not contain hidden calculation policy that should vary by fiscal year.

## 4. Person and employment

```ts
interface Person {
  id: string;
  displayName: string;
  preferredName?: string;
  externalReference?: string;
  archived: boolean;
}

interface Employment {
  id: string;
  fiscalYearId: string;
  personId?: string;
  displayLabel: string;
  kind: 'named-worker' | 'planned-position';
  status: 'candidate' | 'planned' | 'onboarding' | 'active' | 'paused' | 'ended' | 'canceled';
  activeStart?: string;
  activeEnd?: string;
  role?: string;
  expectedGraduation?: string;
  departureReason?: string;
  wageRates: WageRate[];
  notes?: string;
  archived: boolean;
}

interface WageRate {
  id: string;
  effectiveDate: string;
  centsPerHour: number;
  source: 'confirmed' | 'planned' | 'scenario';
  note?: string;
}
```

A planned position can later be linked to a `Person`. The conversion preserves the planned-position ID as forecast provenance.

Employment status has explicit calculation meaning; it is not merely a label:

| Status | Baseline hours eligible? | Scenario hours eligible? |
| --- | --- | --- |
| candidate | No | Only through an explicit scenario event |
| planned | Yes, from the planned start/end dates | Yes |
| onboarding | Yes, including separately identified training time | Yes |
| active | Yes | Yes |
| paused | No during the pause interval | Only if a scenario explicitly ends the pause |
| ended | No after `activeEnd` | Only if a scenario explicitly changes the end date |
| canceled | No | No |

Missing required employment dates or wage rates make affected forecast rows non-computable; they do not silently become zero dollars.

## 5. Fiscal year

```ts
interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'closing' | 'closed' | 'archived';
  displayWeekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  asOfDateOverride?: string;
  budget: BudgetPlan;
  policy: FiscalPolicy;
  calendar: FiscalCalendar;
  employments: Employment[];
  fundingAwards: FundingAward[];
  schedules: ScheduleDefinition[];
  overrides: ScheduleOverride[];
  payPeriods: PayPeriod[];
  actualEntries: ActualEntry[];
  actualAllocations: ActualAllocation[];
  scenarios: Scenario[];
  forecastSnapshots: ForecastSnapshot[];
  importBatches: ImportBatch[];
}
```

The initial invariant is June 1 through May 31, but dates are stored explicitly so the file remains understandable and migrations can validate them.

## 6. Budget and fiscal policy

```ts
interface BudgetPlan {
  originalBudgetCents: number;
  contingencyCents?: number;
  revisions: BudgetRevision[];
  costCenters?: CostCenter[];
}

interface CostCenter {
  id: string;
  label: string;
  budgetCents?: number;
  archived: boolean;
}

interface BudgetRevision {
  id: string;
  effectiveDate: string;
  approvedAt?: string;
  recordedAt: string;
  supersedesRevisionId?: string;
  deltaCents: number;
  reason: string;
  confirmed: boolean;
}

interface FiscalPolicy {
  standardOfficeHours: WeeklyOfficeHours;
  workStudy: WorkStudyPolicy;
  studentWeeklyHourLimitMinutes: number;
  complianceWeekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  costBasis: 'gross-wages' | 'department-charge';
  employerBurdenBasisPoints?: number;
  payrollRounding: PayrollRoundingPolicy;
  missingActualsBehavior: 'warn-and-estimate-separately' | 'block-official-total';
}

interface WeeklyOfficeHours {
  weekdays: Array<{
    weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    intervals: OfficeInterval[];
  }>;
}

interface WorkStudyPolicy {
  defaultGrossEarningCapCents?: number;
  includedAwardStatuses: Array<'assumed' | 'offered' | 'accepted' | 'confirmed'>;
  excludedPeriodTypes: AcademicPeriodType[];
  sameDayAllocationOrder: 'outside-first' | 'cpd-first' | 'proportional' | 'manual';
  confirmation: 'confirmed' | 'needs-review';
}

interface PayrollRoundingPolicy {
  calculationUnit: 'daily-worker' | 'weekly-worker' | 'pay-period-worker' | 'transaction';
  method: 'half-up' | 'half-even' | 'floor' | 'ceiling' | 'payroll-authoritative';
  minuteIncrement?: number;
  currencyIncrementCents: number;
  confirmation: 'confirmed' | 'needs-review';
}
```

Budget revisions are additive audit records. The current authorized budget is original plus confirmed revisions. `effectiveDate` describes financial truth; `recordedAt` describes when the app learned it. That distinction lets a saved forecast reproduce the information available at the time.

## 7. Calendar

```ts
interface FiscalCalendar {
  periods: AcademicPeriod[];
  officeRules: OfficeRule[];
  events: CalendarEvent[];
}

interface AcademicPeriod {
  id: string;
  name: string;
  type: AcademicPeriodType;
  startDate: string;
  endDate: string;
  defaultScheduleMode: 'recurring' | 'week-specific' | 'none';
  defaultStaffingBasisPoints: number;
  source?: SourceReference;
  confirmation: 'confirmed' | 'needs-review';
}

type AcademicPeriodType =
  | 'summer'
  | 'fall-instruction'
  | 'fall-finals-transition'
  | 'winter-transition'
  | 'interterm'
  | 'interterm-spring-transition'
  | 'spring-instruction'
  | 'spring-finals-transition'
  | 'post-spring-fy-close'
  | 'unclassified'
  | 'custom';

interface OfficeRule {
  id: string;
  startDate: string;
  endDate: string;
  weekdays?: number[];
  availability: 'normal' | 'reduced' | 'closed' | 'special-open';
  intervals: OfficeInterval[];
  priority: number;
  createdAt: string;
  reason: string;
  source?: SourceReference;
  confirmation: 'confirmed' | 'needs-review';
}

interface OfficeInterval {
  startMinute: number;
  endMinute: number;
}

interface CalendarEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  staffingEffect: 'none' | 'reduced' | 'elevated' | 'manual';
  suggestedBasisPoints?: number;
  note?: string;
}

interface SourceReference {
  label: string;
  url?: string;
  accessedAt?: string;
  confidence: 'published' | 'derived' | 'user-entered';
}
```

`defaultStaffingBasisPoints` is an assumption for creating or adjusting plans, not an automatic multiplier on confirmed individual schedules unless the user invokes that operation.

Academic periods must cover every date in the fiscal year exactly once; transition dates may use an explicit `unclassified` period. Breaks and closures are overlays rather than overlapping periods. Office-rule resolution is deterministic: higher priority wins, then narrower date range, then newer creation time. An unresolved tie is a blocking validation error. Multiple intervals support split office days; an empty interval list on `closed` means closed all day. Overnight intervals are not supported in the first release.

## 8. Schedule definitions

```ts
interface ScheduleDefinition {
  id: string;
  employmentId: string;
  academicPeriodId: string;
  mode: 'recurring' | 'week-specific' | 'none';
  effectiveStart: string;
  effectiveEnd: string;
  recurringShifts?: RecurringShift[];
  weeklyPlans?: WeeklyPlan[];
  certainty: 'committed' | 'planned';
}

interface RecurringShift {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

interface WeeklyPlan {
  weekAnchorDate: string;
  shifts: DatedShift[];
}

interface DatedShift {
  id: string;
  date: string;
  startMinute?: number;
  endMinute?: number;
  minutes?: number;
  note?: string;
}
```

A shift uses either start/end time or a direct minute total. Direct totals support payroll data or roles where time-of-day is not relevant.

## 9. Overrides

```ts
interface ScheduleOverride {
  id: string;
  fiscalYearId: string;
  employmentIds: string[];
  startDate: string;
  endDate: string;
  scope: 'day' | 'week' | 'range';
  operation: 'replace' | 'add' | 'subtract' | 'clear';
  shifts?: DatedShift[];
  minutes?: number;
  reason: OverrideReason;
  bypassOfficeClosure: boolean;
  certainty: 'committed' | 'planned';
  scenarioId?: string;
  priority: number;
  createdAt: string;
  note?: string;
}
```

An override never mutates its source recurring template. Reverting or deleting it reveals the lower-precedence source again. Overlapping overrides resolve by source layer, explicit priority, narrower scope, and creation time; an exact unresolved tie blocks calculation.

## 10. Pay periods and actuals

```ts
interface PayPeriod {
  id: string;
  fiscalYearId: string;
  startDate: string;
  endDate: string;
  payDate?: string;
  source: 'configured' | 'imported';
}

interface ActualValue<T> {
  value: T;
  authority: 'payroll-posted' | 'timesheet-approved' | 'supervisor-accrued' | 'manual-estimate';
  sourceRecordId?: string;
}

interface ActualEntry {
  id: string;
  employmentId: string;
  workDate?: string;
  payPeriodId?: string;
  minutes?: ActualValue<number>;
  grossWagesCents?: ActualValue<number>;
  workStudyGrossConsumedCents?: ActualValue<number>;
  departmentOffsetCents?: ActualValue<number>;
  departmentChargeCents?: ActualValue<number>;
  earningType: 'regular' | 'training' | 'paid-sick' | 'premium' | 'adjustment' | 'other';
  state: 'posted' | 'accrued' | 'estimated-past';
  source: 'manual' | 'paste' | 'csv' | 'xlsx' | 'adjustment';
  importBatchId?: string;
  externalRowKey?: string;
  sourceFingerprint: string;
  lifecycle: 'active' | 'superseded' | 'reversed';
  supersedesEntryId?: string;
  reversesEntryId?: string;
  note?: string;
}

interface ActualAllocation {
  id: string;
  actualEntryId: string;
  workDate?: string;
  minutes?: number;
  grossWagesCents?: number;
  workStudyGrossConsumedCents?: number;
  departmentOffsetCents?: number;
  departmentChargeCents?: number;
  allocationMethod: 'source-provided' | 'proportional-to-accrual' | 'proportional-to-schedule' | 'manual' | 'unallocated';
  note?: string;
}
```

At least one component is required. Each component carries its own authority because a row can contain posted gross wages but only estimated work-study allocation. A dollar-only pay-period entry remains in an explicit unallocated bucket until a stated allocation method is chosen; it never silently becomes daily hours. Imports deduplicate by external source ID when available and otherwise by a documented composite fingerprint. Corrections create supersession or reversal chains rather than mutating posted history.

## 11. Funding awards

```ts
interface FundingAward {
  id: string;
  employmentId: string;
  kind: 'federal-work-study' | 'other';
  academicYearLabel: string;
  grossEarningCapCents: number;
  status: 'assumed' | 'offered' | 'accepted' | 'confirmed' | 'canceled';
  eligibilityStart: string;
  eligibilityEnd: string;
  lastConfirmedDate?: string;
  knownGrossConsumedAllJobsCents: number;
  outsideUseAssumptions: OutsideUseAssumption[];
  allocationRule: FundingAllocationRule;
}

interface OutsideUseAssumption {
  id: string;
  startDate: string;
  endDate: string;
  expectedCents: number;
  lowCents?: number;
  highCents?: number;
  expectedMinutes?: number;
  lowMinutes?: number;
  highMinutes?: number;
  timing: 'on-start' | 'evenly-by-day' | 'evenly-by-week' | 'manual';
  scenarioId?: string;
  note?: string;
}

interface FundingAllocationRule {
  departmentOffsetBasisPoints: number;
  eligibleWageBasis: 'gross-wages' | 'configured-charge';
}
```

Work-study has two different monetary dimensions that must never share a field: eligible gross earnings consume the student's award cap, while the offset percentage determines how much of that gross reduces CPD's departmental cost. `departmentOffsetBasisPoints` must be confirmed with CPD. Ten thousand basis points means each eligible award dollar reduces CPD cost dollar-for-dollar. Outside-job minutes are stored separately from outside award consumption so combined weekly-hour compliance can be checked when CPD can obtain the information.

## 12. Scenarios

```ts
interface Scenario {
  id: string;
  name: string;
  role: 'plausible-low' | 'expected' | 'prudent-high' | 'custom';
  description?: string;
  parentScenarioId?: string;
  isBaseline: boolean;
  createdAt: string;
  events: ScenarioEvent[];
}

type ScenarioEvent =
  | PlannedHireEvent
  | DepartureEvent
  | ScheduleChangeEvent
  | WageChangeEvent
  | FundingChangeEvent
  | OutsideUseChangeEvent
  | ExtraHoursEvent
  | StaffingMultiplierEvent;
```

Events store deltas and dates plus explicit priority, creation time, and scope metadata. Promoting an event into baseline creates or changes the corresponding baseline record and records the provenance. Conflicts that remain tied after precedence rules are blocking errors, not silent last-write-wins behavior.

## 13. Forecast snapshots

```ts
interface ForecastSnapshot {
  id: string;
  fiscalYearId: string;
  scenarioId: string;
  asOfDate: string;
  createdAt: string;
  engineVersion: string;
  sourceRevisionHash: string;
  sourceRecordIds: string[];
  totals: ForecastSnapshotTotals;
  dailyRows?: DailyLedgerRow[];
}

interface ForecastSnapshotTotals {
  grossWagesCents?: number;
  workStudyGrossConsumedCents?: number;
  departmentOffsetCents?: number;
  cpdFundedCents?: number;
  authorizedBudgetCents: number;
  projectedBalanceCents?: number;
  nonComputableRowCount: number;
}
```

Changing the as-of date with today's edited data is a historical recomputation, not reproduction. Only an immutable snapshot, or a complete source revision history identified by `sourceRevisionHash`, can reproduce what CPD knew at an earlier time.

## 14. Derived daily ledger

The engine produces ephemeral or cached rows; they are never the only copy of source data.

```ts
interface DailyLedgerRow {
  fiscalYearId: string;
  scenarioId: string;
  date: string;
  employmentId: string;
  sourceState: 'posted' | 'accrued' | 'missing' | 'committed' | 'planned' | 'scenario';
  sourceRecordIds: string[];
  scheduledMinutes: number;
  payableMinutes: number;
  wageRateCentsPerHour?: number;
  grossWagesCents?: number;
  workStudyEligibleCents: number;
  workStudyGrossConsumedCents: number;
  departmentOffsetCents: number;
  employerBurdenCents: number;
  cpdFundedCents?: number;
  warnings: LedgerWarning[];
}
```

Weekly, period, pay-period, worker, scenario, and annual totals aggregate these rows. Missing wage or required accounting policy produces a non-computable row and blocks an official total rather than substituting zero.

## 15. Import and audit

```ts
interface ImportBatch {
  id: string;
  fiscalYearId: string;
  kind: 'actuals' | 'workers' | 'calendar' | 'budget';
  filename?: string;
  checksum?: string;
  importedAt: string;
  rowCount: number;
  acceptedRows: number;
  rejectedRows: number;
  mappingId?: string;
  status: 'previewed' | 'applied' | 'reverted';
}

interface AuditEvent {
  id: string;
  timestamp: string;
  fiscalYearId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  reason?: string;
}
```

The audit log is operational provenance, not employee surveillance. Routine keystrokes and view activity are not logged.

## 16. Validation invariants

- Fiscal years may not overlap within one workspace unless an explicit future requirement permits it.
- Each date belongs to exactly one fiscal year or none.
- Employment active end cannot precede active start.
- Wage rates for one employment cannot share the same effective date.
- Shifts cannot have negative duration or cross dates implicitly.
- Office-rule, override, and scenario precedence must resolve uniquely.
- Posted actual IDs/import keys/fingerprints must be deduplicated, and corrections preserve their chain.
- Work-study gross consumed cannot exceed eligible gross wages or remaining gross earning cap.
- Department offset cannot exceed the configured share of gross award consumption.
- Paid and non-hour earning types must not be inferred from ordinary schedule hours.
- Missing effective wage or unconfirmed rounding policy blocks official forecast dollars.
- Future schedules outside employment dates produce errors.
- Future schedules during closure produce warnings or require explicit bypass.
- Closed years reject ordinary changes.
- Derived ledger rows must be reproducible from saved sources and engine version; earlier claims require an immutable snapshot or equivalent source revision.
