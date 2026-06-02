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

  it('读取并更新项目记忆详情', async () => {
    const { adapter, service } = createService('detail-update');
    const created = await service.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'architecture',
      title: '原始标题',
      content: '原始内容',
      tags: [' Architecture ', 'architecture', ''],
      importance: 3,
      sourcePath: 'docs/old.md'
    });
    const detail = await service.getMemoryDetail({ workspacePath: 'E:/demo', memoryId: created.memoryId });
    const updated = await service.updateProjectMemory({
      workspacePath: 'E:/demo',
      memoryId: created.memoryId,
      title: '更新标题',
      content: '更新后的知识库治理内容',
      tags: ['Governance', 'governance'],
      importance: 5,
      sourcePath: 'docs/new.md'
    });
    const updatedDetail = await service.getMemoryDetail({ workspacePath: 'E:/demo', memoryId: created.memoryId });
    if (!detail.ok) throw new Error(detail.error);
    if (!updated.ok) throw new Error(updated.error);
    if (!updatedDetail.ok) throw new Error(updatedDetail.error);
    expect(detail.memory.sourcePath).toBe('docs/old.md');
    expect(detail.memory.tags).toEqual(['architecture']);
    expect(updated.memory.title).toBe('更新标题');
    expect(updatedDetail.memory.content).toBe('更新后的知识库治理内容');
    expect(updatedDetail.memory.tags).toEqual(['governance']);
    adapter.close();
  });

  it('拒绝空更新和非法重要级别', async () => {
    const { adapter, service } = createService('invalid-update');
    const created = await service.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '风险', content: '内容' });
    await expect(service.updateProjectMemory({ workspacePath: 'E:/demo', memoryId: created.memoryId })).rejects.toThrow('update must include at least one field');
    await expect(service.updateProjectMemory({ workspacePath: 'E:/demo', memoryId: created.memoryId, importance: 6 })).rejects.toThrow('importance must be between 1 and 5');
    adapter.close();
  });

  it('详情读取和更新不能跨项目', async () => {
    const { adapter, service } = createService('isolation');
    const created = await service.rememberProjectContext({ workspacePath: 'E:/first', type: 'decision', title: '隔离规则', content: '只属于 first' });
    const detail = await service.getMemoryDetail({ workspacePath: 'E:/second', memoryId: created.memoryId });
    const updated = await service.updateProjectMemory({ workspacePath: 'E:/second', memoryId: created.memoryId, title: '越权更新' });
    if (detail.ok) throw new Error('detail should not be found');
    if (updated.ok) throw new Error('update should not succeed');
    expect(detail.error).toBe('memory_not_found');
    expect(updated.error).toBe('memory_not_found');
    adapter.close();
  });

  it('检测当前项目内重复记忆', async () => {
    const { adapter, service } = createService('duplicates');
    await service.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '规则 A', content: '重复知识' });
    await service.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '规则 B', content: '重复知识' });
    await service.rememberProjectContext({ workspacePath: 'E:/other', type: 'decision', title: '规则 C', content: '重复知识' });
    const duplicates = await service.detectDuplicateMemories({ workspacePath: 'E:/demo', content: '重复知识', limit: 10 });
    if (!duplicates.ok) throw new Error(duplicates.error);
    expect(duplicates.items.map((item) => item.title)).toEqual(['规则 B', '规则 A']);
    adapter.close();
  });
});
