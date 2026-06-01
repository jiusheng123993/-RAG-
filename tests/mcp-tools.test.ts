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

  it('拒绝非法参数', async () => {
    const { adapter, handlers } = createHandlers();
    await expect(handlers.rememberProjectContext({ workspacePath: 'E:/demo', type: 'unknown', title: 'x', content: 'x' })).rejects.toThrow();
    adapter.close();
  });
});
