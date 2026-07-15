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
});
