import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sha256 } from '../src/utils/hash.js';
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
      sourcePath: 'docs/architecture.md',
      tags: ['architecture'],
      importance: 4
    });
    const items = adapter.listMemories({ projectId: project.id, status: 'active', limit: 10, offset: 0 });
    expect(memory.id).toMatch(/^mem_/);
    expect(memory.sourcePath).toBe('docs/architecture.md');
    expect(memory.contentHash).toBe(sha256('Controller Service Repository'));
    expect(items.total).toBe(1);
    expect(items.items[0]?.title).toBe('分层架构');
    adapter.close();
  });

  it('按项目读取和更新记忆并同步搜索索引', () => {
    const adapter = createSqliteAdapter(databasePath('update'));
    adapter.initialize();
    const project = adapter.upsertProject({
      name: 'demo',
      workspacePath: 'E:/demo',
      gitRemote: null,
      gitBranch: null,
      fingerprint: 'fingerprint-update'
    });
    const memory = adapter.createMemory({
      projectId: project.id,
      type: 'architecture',
      title: '旧标题',
      content: '旧内容',
      summary: null,
      source: 'test',
      sourcePath: null,
      tags: ['old'],
      importance: 2
    });
    const updated = adapter.updateMemory(project.id, memory.id, {
      title: '新标题',
      content: '新的可搜索内容',
      summary: '新摘要',
      sourcePath: 'docs/new.md',
      tags: ['new'],
      importance: 5
    });
    const detail = adapter.getMemory(project.id, memory.id);
    const results = adapter.searchMemories({ projectId: project.id, query: '可搜索', limit: 10 });
    expect(updated?.title).toBe('新标题');
    expect(updated?.contentHash).toBe(sha256('新的可搜索内容'));
    expect(detail?.sourcePath).toBe('docs/new.md');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(memory.id);
    adapter.close();
  });

  it('重复内容检测限制在当前项目内', () => {
    const adapter = createSqliteAdapter(databasePath('duplicates'));
    adapter.initialize();
    const firstProject = adapter.upsertProject({ name: 'first', workspacePath: 'E:/first', gitRemote: null, gitBranch: null, fingerprint: 'fingerprint-first' });
    const secondProject = adapter.upsertProject({ name: 'second', workspacePath: 'E:/second', gitRemote: null, gitBranch: null, fingerprint: 'fingerprint-second' });
    adapter.createMemory({ projectId: firstProject.id, type: 'decision', title: '规则 A', content: '相同内容', summary: null, source: 'test', sourcePath: null, tags: [], importance: 3 });
    adapter.createMemory({ projectId: firstProject.id, type: 'decision', title: '规则 B', content: '相同内容', summary: null, source: 'test', sourcePath: null, tags: [], importance: 3 });
    adapter.createMemory({ projectId: secondProject.id, type: 'decision', title: '规则 C', content: '相同内容', summary: null, source: 'test', sourcePath: null, tags: [], importance: 3 });
    const duplicates = adapter.findDuplicateMemories(firstProject.id, sha256('相同内容'), 10);
    expect(duplicates.map((item) => item.title)).toEqual(['规则 B', '规则 A']);
    adapter.close();
  });
});
