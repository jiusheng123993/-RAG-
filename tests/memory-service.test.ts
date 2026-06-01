import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMemoryService } from '../src/services/memory-service.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';

function createService(name: string) {
  const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-service-${name}-${Date.now()}-${Math.random()}.db`));
  adapter.initialize();
  return { adapter, service: createMemoryService(adapter, createProjectResolver()) };
}

describe('memory service', () => {
  it('写入项目记忆', async () => {
    const { adapter, service } = createService('remember');
    const result = await service.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'architecture',
      title: '分层架构',
      content: 'Controller Service Repository',
      tags: ['architecture'],
      importance: 4
    });
    expect(result.ok).toBe(true);
    expect(result.memoryId).toMatch(/^mem_/);
    adapter.close();
  });

  it('归档项目记忆', async () => {
    const { adapter, service } = createService('archive');
    const created = await service.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'risk',
      title: '旧风险',
      content: '这个风险已经过期',
      tags: [],
      importance: 2
    });
    const archived = await service.archiveProjectMemory({ workspacePath: 'E:/demo', memoryId: created.memoryId, reason: '旧规则废弃' });
    expect(archived.ok).toBe(true);
    expect(archived.status).toBe('archived');
    adapter.close();
  });

  it('拒绝空标题和空内容', async () => {
    const { adapter, service } = createService('invalid');
    await expect(service.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: ' ', content: '内容' })).rejects.toThrow('title must not be empty');
    await expect(service.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '标题', content: ' ' })).rejects.toThrow('content must not be empty');
    adapter.close();
  });

  it('写入交接记录', async () => {
    const { adapter, service } = createService('handoff');
    const result = await service.recordHandoffNote({
      workspacePath: 'E:/demo',
      taskTitle: '实现模块',
      changedFiles: ['src/a.ts'],
      changedModules: ['memory'],
      summary: '完成实现',
      verification: '测试通过',
      risks: '无',
      nextSteps: '继续验证'
    });
    expect(result.ok).toBe(true);
    expect(result.handoffId).toMatch(/^handoff_/);
    adapter.close();
  });
});
