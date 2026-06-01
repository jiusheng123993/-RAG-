import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';

function databasePath(name: string): string {
  return path.join(os.tmpdir(), `local-project-memory-${name}-${Date.now()}-${Math.random()}.db`);
}

describe('sqlite adapter', () => {
  it('初始化表结构并 upsert 项目', () => {
    const adapter = createSqliteAdapter(databasePath('project'));
    adapter.initialize();
    const project = adapter.upsertProject({
      name: 'demo',
      workspacePath: 'E:/demo',
      gitRemote: null,
      gitBranch: null,
      fingerprint: 'fingerprint-demo'
    });
    expect(project.id).toMatch(/^proj_/);
    expect(project.name).toBe('demo');
    expect(project.fingerprint).toBe('fingerprint-demo');
    adapter.close();
  });

  it('创建记忆并按项目返回', () => {
    const adapter = createSqliteAdapter(databasePath('memory'));
    adapter.initialize();
    const project = adapter.upsertProject({
      name: 'demo',
      workspacePath: 'E:/demo',
      gitRemote: null,
      gitBranch: null,
      fingerprint: 'fingerprint-memory'
    });
    const memory = adapter.createMemory({
      projectId: project.id,
      type: 'architecture',
      title: '分层架构',
      content: 'Controller Service Repository',
      summary: null,
      source: 'test',
      tags: ['architecture'],
      importance: 4
    });
    const items = adapter.listMemories({ projectId: project.id, status: 'active', limit: 10, offset: 0 });
    expect(memory.id).toMatch(/^mem_/);
    expect(items.total).toBe(1);
    expect(items.items[0]?.title).toBe('分层架构');
    adapter.close();
  });
});
