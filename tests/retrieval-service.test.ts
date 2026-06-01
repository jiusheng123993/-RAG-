import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMemoryService } from '../src/services/memory-service.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createRetrievalService } from '../src/services/retrieval-service.js';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';

describe('retrieval service', () => {
  it('搜索 active 项目记忆', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-retrieval-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    await memoryService.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'do_not_touch',
      title: '权限边界',
      content: '权限校验不能绕过 Service',
      tags: ['auth'],
      importance: 5
    });
    const result = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '权限', limit: 10 });
    expect(result.ok).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]?.title).toBe('权限边界');
    adapter.close();
  });

  it('默认不返回已归档记忆', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-archived-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    const created = await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '旧规则', content: '需要归档', tags: [], importance: 2 });
    await memoryService.archiveProjectMemory({ workspacePath: 'E:/demo', memoryId: created.memoryId, reason: '过期' });
    const result = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '归档', limit: 10 });
    expect(result.results).toHaveLength(0);
    adapter.close();
  });

  it('支持带空格的中文多关键词查询', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-multiterm-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    await memoryService.rememberProjectContext({
      workspacePath: 'E:/demo',
      type: 'project_overview',
      title: '本地项目记忆 MCP 服务',
      content: '本项目用于让 Trae 拥有本地项目记忆',
      tags: ['trae'],
      importance: 5
    });
    const result = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: 'Trae 项目记忆', limit: 10 });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]?.title).toBe('本地项目记忆 MCP 服务');
    adapter.close();
  });

  it('隔离不同工作区记忆', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-isolated-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    await memoryService.rememberProjectContext({ workspacePath: 'E:/demo-a', type: 'architecture', title: 'A 项目', content: '唯一关键词 alpha', tags: [], importance: 3 });
    const result = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo-b', query: 'alpha', limit: 10 });
    expect(result.results).toHaveLength(0);
    adapter.close();
  });
});
