import * as React from 'react';
import { ArchiveRestore, Database, Download, Laptop, Moon, Plus, Sun } from 'lucide-react';
import type { FiscalYear, ThemePreference } from '../../../shared/workspace';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { DialogShell } from '../../components/ui/dialog-shell';
import { NoticePanel } from '../../components/ui/notice-panel';
import { createNextFiscalYearTemplate } from '../domain/seed';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  latestYear: FiscalYear;
  previewMode: boolean;
  onAddFiscalYear: (year: FiscalYear) => void;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
}

export function SettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
  latestYear,
  previewMode,
  onAddFiscalYear,
  onExport,
  onImport,
}: SettingsDialogProps) {
  const [confirmExport, setConfirmExport] = React.useState(false);
  const [confirmImport, setConfirmImport] = React.useState(false);
  const [confirmYear, setConfirmYear] = React.useState(false);
  return (
    <>
      <DialogShell
        open={open}
        onClose={onClose}
        title="Application settings"
        description="Theme, workspace continuity, and fiscal-year setup."
        widthClassName="max-w-xl"
      >
        <div className="space-y-5">
          <section>
            <h3 className="text-[12px] font-semibold">Appearance</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button variant={theme === 'system' ? 'secondary' : 'outline'} onClick={() => onThemeChange('system')}><Laptop className="h-4 w-4" />System</Button>
              <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => onThemeChange('light')}><Sun className="h-4 w-4" />Light</Button>
              <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => onThemeChange('dark')}><Moon className="h-4 w-4" />Dark</Button>
            </div>
          </section>
          <section className="border-t border-border pt-4">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground" /><h3 className="text-[12px] font-semibold">Workspace and backups</h3></div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">The desktop app encrypts its live workspace and ten automatic local backups with the operating system. Portable exports are readable files intended for controlled CPD storage.</p>
            {previewMode && <NoticePanel className="mt-3" variant="warning" title="Browser preview mode" description="Native encryption, file dialogs, export, and import require the Electron app." />}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={previewMode} onClick={() => { onClose(); setConfirmExport(true); }}><Download className="h-4 w-4" />Export workspace</Button>
              <Button variant="outline" disabled={previewMode} onClick={() => { onClose(); setConfirmImport(true); }}><ArchiveRestore className="h-4 w-4" />Import workspace</Button>
            </div>
          </section>
          <section className="border-t border-border pt-4">
            <h3 className="text-[12px] font-semibold">Fiscal years</h3>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Create the year after {latestYear.label}, carrying forward its period structure and budget. Closures and workers stay empty for deliberate review.</p>
            <Button className="mt-3 w-full" variant="outline" onClick={() => { onClose(); setConfirmYear(true); }}><Plus className="h-4 w-4" />Create next fiscal year</Button>
          </section>
        </div>
      </DialogShell>
      <ConfirmDialog
        open={confirmExport}
        onOpenChange={setConfirmExport}
        title="Export readable workspace?"
        description="The portable JSON export can contain worker names, wages, and work-study assumptions. Store it only in an approved CPD location."
        confirmLabel="Choose export location"
        onConfirm={onExport}
      />
      <ConfirmDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        title="Replace the current workspace?"
        description="The selected workspace will replace the data currently open after it passes validation. An automatic local backup preserves the current saved version."
        confirmLabel="Choose workspace file"
        onConfirm={onImport}
      />
      <ConfirmDialog
        open={confirmYear}
        onOpenChange={setConfirmYear}
        title="Create the next fiscal year?"
        description="Academic period structure and budget will be copied forward. Workers, scenarios, corrections, and closures will start empty."
        confirmLabel="Create fiscal year"
        onConfirm={() => onAddFiscalYear(createNextFiscalYearTemplate(latestYear))}
      />
    </>
  );
}
