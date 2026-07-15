import * as React from 'react';
import { CalendarDays, ChartNoAxesCombined, GitBranch, Moon, Save, Settings, Sun, UserRound, WandSparkles } from 'lucide-react';
import type { FiscalYear, Workspace } from '../../shared/workspace';
import type { DesktopPlatform } from '../../shared/platform';
import { DesktopTitleBar } from '../components/layout/desktop-title-bar';
import { TopTabNavigation, type DesktopTab } from '../components/layout/top-tab-navigation';
import { WorkspaceShell } from '../components/layout/workspace-shell';
import { useDesktopShortcuts } from '../hooks/use-desktop-shortcuts';
import { Button } from '../components/ui/button';
import { NoticePanel } from '../components/ui/notice-panel';
import { Select } from './components/form-controls';
import { calculateForecast } from './domain/forecast';
import { todayInLosAngeles } from './domain/dates';
import { Adjustments } from './features/adjustments';
import { Overview } from './features/overview';
import { Scenarios } from './features/scenarios';
import { Schedule } from './features/schedule';
import { SettingsDialog } from './features/settings-dialog';
import { Workers } from './features/workers';
import { useTheme } from './state/use-theme';
import { useWorkspace } from './state/use-workspace';

type TabId = 'overview' | 'workers' | 'schedule' | 'adjustments' | 'scenarios';

const tabs: DesktopTab[] = [
  { id: 'overview', label: 'Overview', icon: <ChartNoAxesCombined className="h-3.5 w-3.5" /> },
  { id: 'workers', label: 'Workers', icon: <UserRound className="h-3.5 w-3.5" /> },
  { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { id: 'adjustments', label: 'Adjustments', icon: <WandSparkles className="h-3.5 w-3.5" /> },
  { id: 'scenarios', label: 'Scenarios', icon: <GitBranch className="h-3.5 w-3.5" /> },
];

function updateFiscalYear(workspace: Workspace, year: FiscalYear): Workspace {
  return { ...workspace, fiscalYears: workspace.fiscalYears.map((candidate) => candidate.id === year.id ? year : candidate) };
}

export default function App() {
  const workspaceState = useWorkspace();
  const { preference, setPreference } = useTheme();
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [asOfDate, setAsOfDate] = React.useState(todayInLosAngeles());
  const [scenarioId, setScenarioId] = React.useState<string | null>(null);
  const platform = window.cpdWagePredictor?.platform ?? ('darwin' as DesktopPlatform);

  useDesktopShortcuts({
    navigation: tabs.map((tab, index) => ({ key: String(index + 1), targetId: tab.id })),
    onNavigate: (target) => setActiveTab(target as TabId),
    onOpenSettings: () => setSettingsOpen(true),
  });

  if (workspaceState.loading || !workspaceState.workspace) {
    return <div className="flex h-screen items-center justify-center bg-background text-[13px] text-muted-foreground">Opening CPD wage plan…</div>;
  }

  const workspace = workspaceState.workspace;
  const year = workspace.fiscalYears.find((candidate) => candidate.id === workspace.activeFiscalYearId) ?? workspace.fiscalYears[0];
  if (!year) return <div className="p-8 text-[13px]">The workspace has no fiscal years.</div>;
  const forecast = calculateForecast(year, asOfDate, scenarioId);
  const updateYear = (updater: (current: FiscalYear) => FiscalYear) => {
    workspaceState.updateWorkspace((current) => {
      const active = current.fiscalYears.find((candidate) => candidate.id === current.activeFiscalYearId);
      return active ? updateFiscalYear(current, updater(active)) : current;
    });
  };

  const activeContent = {
    overview: (
      <Overview
        year={year}
        forecast={forecast}
        asOfDate={forecast.asOfDate}
        scenarioId={scenarioId}
        onAsOfDateChange={setAsOfDate}
        onScenarioChange={setScenarioId}
        onBudgetChange={(budgetCents) => updateYear((current) => ({ ...current, budgetCents }))}
        onOpenWorkers={() => setActiveTab('workers')}
        onOpenSchedule={() => setActiveTab('schedule')}
      />
    ),
    workers: <Workers year={year} onChange={(workers) => updateYear((current) => ({ ...current, workers }))} />,
    schedule: <Schedule year={year} onWorkersChange={(workers) => updateYear((current) => ({ ...current, workers }))} onClosuresChange={(closures) => updateYear((current) => ({ ...current, closures }))} onPeriodsChange={(periods) => updateYear((current) => ({ ...current, periods }))} />,
    adjustments: <Adjustments year={year} onChange={(adjustments) => updateYear((current) => ({ ...current, adjustments }))} />,
    scenarios: <Scenarios year={year} onChange={(scenarios) => updateYear((current) => ({ ...current, scenarios }))} />,
  }[activeTab];

  return (
    <>
      <WorkspaceShell
        width="fluid"
        titleBar={
          <DesktopTitleBar
            platform={platform}
            icon={<ChartNoAxesCombined className="h-4 w-4" />}
            title="CPD Wage Predictor"
            subtitle="Student wage planning"
            utilities={
              <>
                <Select
                  aria-label="Fiscal year"
                  className="h-7 min-w-32"
                  value={year.id}
                  onChange={(event) => {
                    setScenarioId(null);
                    workspaceState.updateWorkspace((current) => ({ ...current, activeFiscalYearId: event.target.value }));
                  }}
                >
                  {workspace.fiscalYears.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
                </Select>
                <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                  <Save className="h-3.5 w-3.5" />{workspaceState.saving ? 'Saving…' : 'Saved locally'}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Toggle light or dark mode" onClick={() => void setPreference(preference === 'dark' ? 'light' : 'dark')}>
                  {preference === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Open settings" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></Button>
              </>
            }
          />
        }
        navigation={<TopTabNavigation tabs={tabs} activeTab={activeTab} onActiveTabChange={(tab) => setActiveTab(tab as TabId)} />}
      >
        {(workspaceState.error || workspaceState.message) && (
          <NoticePanel
            className="mb-4"
            variant={workspaceState.error ? 'error' : 'success'}
            title={workspaceState.error ?? workspaceState.message ?? ''}
          >
            <Button size="sm" variant="outline" onClick={workspaceState.clearMessage}>Dismiss</Button>
          </NoticePanel>
        )}
        <section id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>{activeContent}</section>
      </WorkspaceShell>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={preference}
        onThemeChange={(theme) => void setPreference(theme)}
        activeYear={year}
        previewMode={workspaceState.previewMode}
        onExport={workspaceState.exportWorkspace}
        onImport={workspaceState.importWorkspace}
        onAddFiscalYear={(newYear) => {
          workspaceState.updateWorkspace((current) => ({ ...current, activeFiscalYearId: newYear.id, fiscalYears: [...current.fiscalYears, newYear] }));
          setSettingsOpen(false);
          setScenarioId(null);
        }}
      />
    </>
  );
}
