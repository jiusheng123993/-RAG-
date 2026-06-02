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

  it('支持标签、来源、重要级别和状态过滤', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-filter-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '高优先级缓存规则', content: '缓存 key 必须包含租户维度', source: 'handoff', tags: ['Cache', 'Tenant'], importance: 5 });
    await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '低优先级缓存说明', content: '缓存 key 命名建议', source: 'note', tags: ['cache'], importance: 2 });
    const result = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '缓存', tags: ['cache', 'tenant'], source: 'handoff', status: 'active', minImportance: 4, limit: 10 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('高优先级缓存规则');
    expect(result.results[0]?.matchedFields).toContain('content');
    expect(result.results[0]?.matchedFields).toContain('tags');
    adapter.close();
  });

  it('默认裁剪搜索内容并可显式包含归档记忆', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-trim-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    const created = await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'known_issue', title: '历史构建问题', content: `构建失败 ${'x'.repeat(800)}`, tags: ['build'], importance: 3 });
    await memoryService.archiveProjectMemory({ workspacePath: 'E:/demo', memoryId: created.memoryId, reason: '已解决' });
    const hidden = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '构建失败', limit: 10 });
    const visible = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '构建失败', includeArchived: true, limit: 10 });
    expect(hidden.results).toHaveLength(0);
    expect(visible.results).toHaveLength(1);
    expect(visible.results[0]?.content.length).toBeLessThan(520);
    expect(visible.results[0]?.status).toBe('archived');
    adapter.close();
  });

  it('支持按更新时间范围过滤', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-time-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    const created = await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '时间过滤规则', content: '阶段三检索增强时间过滤', tags: [], importance: 3 });
    const detail = await memoryService.getMemoryDetail({ workspacePath: 'E:/demo', memoryId: created.memoryId });
    if (!detail.ok) throw new Error(detail.error);
    const before = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '阶段三', updatedBefore: '2000-01-01T00:00:00.000Z', limit: 10 });
    const after = await retrievalService.searchProjectMemory({ workspacePath: 'E:/demo', query: '阶段三', updatedAfter: detail.memory.updatedAt, limit: 10 });
    expect(before.results).toHaveLength(0);
    expect(after.results).toHaveLength(1);
    adapter.close();
  });

  it('支持查找相关记忆', async () => {
    const adapter = createSqliteAdapter(path.join(os.tmpdir(), `local-project-memory-related-${Date.now()}-${Math.random()}.db`));
    adapter.initialize();
    const resolver = createProjectResolver();
    const memoryService = createMemoryService(adapter, resolver);
    const retrievalService = createRetrievalService(adapter, resolver);
    const source = await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'architecture', title: '检索架构', content: '检索服务负责排序', source: 'spec', tags: ['retrieval'], importance: 5 });
    await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'decision', title: '检索排序决策', content: '相关记忆应优先匹配标签', source: 'spec', tags: ['retrieval', 'ranking'], importance: 4 });
    await memoryService.rememberProjectContext({ workspacePath: 'E:/demo', type: 'risk', title: '无关风险', content: '数据库迁移风险', source: 'note', tags: ['database'], importance: 4 });
    const result = await retrievalService.findRelatedMemories({ workspacePath: 'E:/demo', memoryId: source.memoryId, limit: 10 });
    if (!result.ok) throw new Error(result.error);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('检索排序决策');
    expect(result.results[0]?.matchedFields).toContain('tags');
    adapter.close();
  });
});
