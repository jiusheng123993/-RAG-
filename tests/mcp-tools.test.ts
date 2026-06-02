import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createToolHandlers } from '../src/mcp/tools.js';
import { createMemoryService } from '../src/services/memory-service.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createRetrievalService } from '../src/services/retrieval-service.js';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';

function createHandlers() {
  const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-mcp-${Date.now()}-${Math.random()}.db`));
  adapter.initialize();
  const resolver = createProjectResolver();
  return {
    adapter,
    handlers: createToolHandlers({
      memoryService: createMemoryService(adapter, resolver),
      retrievalService: createRetrievalService(adapter, resolver)
    })
  };
}

describe('mcp tool handlers', () => {
  it('通过 handler 写入并搜索项目记忆', async () => {
    const { adapter, handlers } = createHandlers();
    const remembered = await handlers.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'architecture',
      title: '模块边界',
      content: 'MCP layer must not access database directly',
      tags: ['architecture'],
      importance: 4
    });
    expect(remembered.ok).toBe(true);
    const searched = await handlers.searchProjectMemory({ workspacePath: 'E:/demo', query: 'database', limit: 10 });
    expect(searched.ok).toBe(true);
    expect(searched.results.length).toBe(1);
    adapter.close();
  });

  it('通过 handler 读取、更新并检测重复记忆', async () => {
    const { adapter, handlers } = createHandlers();
    const first = await handlers.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '规则 A', content: '重复内容', sourcePath: 'docs/a.md' });
    await handlers.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '规则 B', content: '重复内容', sourcePath: 'docs/b.md' });
    const detail = await handlers.getMemoryDetail({ workspacePath: 'E:/demo', memoryId: first.memoryId });
    const updated = await handlers.updateProjectMemory({ workspacePath: 'E:/demo', memoryId: first.memoryId, title: '规则 A 更新', tags: ['Decision', 'decision'] });
    const duplicates = await handlers.detectDuplicateMemories({ workspacePath: 'E:/demo', content: '重复内容' });
    if (!detail.ok) throw new Error(detail.error);
    if (!updated.ok) throw new Error(updated.error);
    if (!duplicates.ok) throw new Error(duplicates.error);
    expect(detail.memory.sourcePath).toBe('docs/a.md');
    expect(updated.memory.tags).toEqual(['decision']);
    expect(duplicates.items).toHaveLength(2);
    adapter.close();
  });

  it('拒绝非法参数', async () => {
    const { adapter, handlers } = createHandlers();
    await expect(handlers.rememberProjectContext({ workspacePath: 'E:/demo', type: 'unknown', title: 'x', content: 'x' })).rejects.toThrow();
    await expect(handlers.updateProjectMemory({ workspacePath: 'E:/demo', memoryId: 'mem_x', importance: 6 })).rejects.toThrow();
    adapter.close();
  });
});
