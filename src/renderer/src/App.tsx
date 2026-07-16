import * as React from 'react';
import { CalendarDays, ChartNoAxesCombined, GitBranch, Moon, Save, Settings, Sun, UserRound, WandSparkles } from 'lucide-react';
import type { FiscalYear, Workspace } from '../../shared/workspace';
import type { DesktopPlatform } from '../../shared/platform';
import { DesktopTitleBar } from '../components/layout/desktop-title-bar';
import { TopTabNavigation, type DesktopTab } from '../components/layout/top-tab-navigation';
import { WorkspaceShell } from '../components/layout/workspace-shell';
import { useDesktopShortcuts } from '../hooks/use-desktop-shortcuts';
import { Button } from '../components/ui/button';
import { ActionSelect } from '../components/ui/action-select';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { NoticePanel } from '../components/ui/notice-panel';
import { calculateForecast } from './domain/forecast';
import { todayInLosAngeles } from './domain/dates';
import { createNextFiscalYearTemplate } from './domain/seed';
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
  { id: 'overview', label: 'Outlook', icon: <ChartNoAxesCombined className="h-3.5 w-3.5" /> },
  { id: 'workers', label: 'Workers', icon: <UserRound className="h-3.5 w-3.5" /> },
  { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { id: 'adjustments', label: 'Changes', icon: <WandSparkles className="h-3.5 w-3.5" /> },
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
  const [addFiscalYearOpen, setAddFiscalYearOpen] = React.useState(false);
  const [scenarioCreateRequest, setScenarioCreateRequest] = React.useState(0);
  const [changeOpenRequest, setChangeOpenRequest] = React.useState<{ key: number; workerId: string; date: string } | null>(null);
  const [scheduleViewRequest, setScheduleViewRequest] = React.useState<{ key: number; view: 'week' | 'repeating' | 'calendar' } | null>(null);
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
  const latestYear = [...workspace.fiscalYears].sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? year;
  const nextStartYear = Number(latestYear.startDate.slice(0, 4)) + 1;
  const nextFiscalYearLabel = `FY ${nextStartYear}–${String(nextStartYear + 1).slice(-2)}`;
  const forecast = calculateForecast(year, asOfDate, scenarioId);
  const updateYear = (updater: (current: FiscalYear) => FiscalYear) => {
    workspaceState.updateWorkspace((current) => {
      const active = current.fiscalYears.find((candidate) => candidate.id === current.activeFiscalYearId);
      return active ? updateFiscalYear(current, updater(active)) : current;
    });
  };
  const addFiscalYear = (newYear: FiscalYear) => {
    workspaceState.updateWorkspace((current) => ({
      ...current,
      activeFiscalYearId: newYear.id,
      fiscalYears: [...current.fiscalYears, newYear],
    }));
    setSettingsOpen(false);
    setScenarioId(null);
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
        onOpenSchedule={() => { setScheduleViewRequest({ key: Date.now(), view: 'week' }); setActiveTab('schedule'); }}
        onOpenYearSetup={() => { setScheduleViewRequest({ key: Date.now(), view: 'calendar' }); setActiveTab('schedule'); }}
        onAddScenario={() => {
          setActiveTab('scenarios');
          setScenarioCreateRequest((request) => request + 1);
        }}
      />
    ),
    workers: <Workers year={year} onChange={(workers) => updateYear((current) => ({ ...current, workers }))} />,
    schedule: <Schedule year={year} viewRequest={scheduleViewRequest} onWorkersChange={(workers) => updateYear((current) => ({ ...current, workers }))} onClosuresChange={(closures) => updateYear((current) => ({ ...current, closures }))} onPeriodsChange={(periods) => updateYear((current) => ({ ...current, periods }))} onOpenChanges={(workerId, date) => { setChangeOpenRequest({ key: Date.now(), workerId, date }); setActiveTab('adjustments'); }} />,
    adjustments: <Adjustments year={year} openRequest={changeOpenRequest} onChange={(adjustments) => updateYear((current) => ({ ...current, adjustments }))} />,
    scenarios: (
      <Scenarios
        year={year}
        createRequestKey={scenarioCreateRequest}
        onScenarioCreated={setScenarioId}
        onChange={(scenarios) => updateYear((current) => ({ ...current, scenarios }))}
      />
    ),
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
                <ActionSelect
                  ariaLabel="Fiscal year"
                  className="h-7 min-w-32"
                  menuClassName="w-60"
                  value={year.id}
                  options={workspace.fiscalYears.map((candidate) => ({
                    value: candidate.id,
                    label: candidate.label,
                    description: candidate.status === 'active' ? 'Active year' : candidate.status === 'closed' ? 'Past year' : 'Planning',
                  }))}
                  onValueChange={(value) => {
                    setScenarioId(null);
                    workspaceState.updateWorkspace((current) => ({ ...current, activeFiscalYearId: value }));
                  }}
                  actionLabel="Add fiscal year"
                  onAction={() => setAddFiscalYearOpen(true)}
                />
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
        latestYear={latestYear}
        previewMode={workspaceState.previewMode}
        onExport={workspaceState.exportWorkspace}
        onImport={workspaceState.importWorkspace}
        onAddFiscalYear={addFiscalYear}
      />
      <ConfirmDialog
        open={addFiscalYearOpen}
        onOpenChange={setAddFiscalYearOpen}
        title={`Add ${nextFiscalYearLabel}?`}
        description={`Period dates and budget will carry forward from ${latestYear.label}. Workers, scenarios, adjustments, and closures will start fresh.`}
        confirmLabel="Add fiscal year"
        onConfirm={() => addFiscalYear(createNextFiscalYearTemplate(latestYear))}
      />
    </>
  );
}
