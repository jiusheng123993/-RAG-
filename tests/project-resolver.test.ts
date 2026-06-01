import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { normalizeWorkspacePath } from '../src/utils/paths.js';

function tempWorkspace(name: string): string {
  return path.join(os.tmpdir(), `local-project-memory-${name}`);
}

describe('normalizeWorkspacePath', () => {
  it('归一化路径分隔符并解析绝对路径', () => {
    const normalized = normalizeWorkspacePath('E:/example/project');
    expect(normalized.toLowerCase()).toContain('e:');
    expect(normalized).not.toContain('\\\\');
  });
});

describe('project resolver', () => {
  it('从非 Git 工作区路径解析项目身份', async () => {
    const resolver = createProjectResolver();
    const workspacePath = tempWorkspace('plain');
    const result = await resolver.resolve(workspacePath);
    expect(result.name).toBe(path.basename(workspacePath));
    expect(result.workspacePath).toBe(normalizeWorkspacePath(workspacePath));
    expect(result.gitRemote).toBeNull();
    expect(result.gitBranch).toBeNull();
    expect(result.fingerprint).toHaveLength(64);
  });

  it('同一个工作区保持稳定指纹', async () => {
    const resolver = createProjectResolver();
    const workspacePath = tempWorkspace('stable');
    const first = await resolver.resolve(workspacePath);
    const second = await resolver.resolve(workspacePath);
    expect(first.fingerprint).toBe(second.fingerprint);
  });
});
