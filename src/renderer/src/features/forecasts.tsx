import type { FiscalYear, PeriodEstimate, Workspace } from '../../../shared/workspace';
import { ForecastPlanner } from './forecast-planner';

interface ForecastsProps {
  workspace: Workspace;
  year: FiscalYear;
  onPeriodEstimatesChange: (estimates: PeriodEstimate[]) => void;
  onOpenSchedule: () => void;
}

export function Forecasts({ workspace, year, onPeriodEstimatesChange, onOpenSchedule }: ForecastsProps) {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Forecast</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Build CPD's expected projection and its lower-to-higher spending range.</p>
      </div>
      <ForecastPlanner workspace={workspace} year={year} onChange={onPeriodEstimatesChange} onOpenSchedule={onOpenSchedule} />
    </div>
  );
}
