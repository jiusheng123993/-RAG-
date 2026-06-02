import { describe, it, expect, beforeEach } from 'vitest';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createMemoryService } from '../src/services/memory-service.js';

describe('getServiceDiagnostics', () => {
  let adapter: ReturnType<typeof createSqliteAdapter>;
  let memoryService: ReturnType<typeof createMemoryService>;
  let resolver: ReturnType<typeof createProjectResolver>;

  beforeEach(() => {
    adapter = createSqliteAdapter(':memory:');
    adapter.initialize();
    resolver = createProjectResolver();
    memoryService = createMemoryService(adapter, resolver);
  });

  it('should return diagnostics', async () => {
    const result = await memoryService.getServiceDiagnostics({});

    expect(result.ok).toBe(true);
    expect(result.version).toBe('0.1.0');
    expect(result.database).toBeDefined();
    expect(result.fts5).toBeDefined();
    expect(result.tables).toBeDefined();
    expect(result.mcpTools.count).toBe(16);
  });

  it('should include project info when workspacePath provided', async () => {
    const result = await memoryService.getServiceDiagnostics({
      workspacePath: 'E:/test-project'
    });

    expect(result.project).toBeDefined();
    expect(result.project?.workspacePath).toBe('E:/test-project');
  });

  it('should include mcp tool names when workspacePath provided', async () => {
    const result = await memoryService.getServiceDiagnostics({
      workspacePath: 'E:/test-project'
    });

    expect(result.mcpTools.names).toHaveLength(17);
    expect(result.mcpTools.names).toContain('get_service_diagnostics');
  });
});

describe('SqliteAdapter diagnostics', () => {
  let adapter: ReturnType<typeof createSqliteAdapter>;

  beforeEach(() => {
    adapter = createSqliteAdapter(':memory:');
    adapter.initialize();
  });

  it('should check database health', () => {
    const health = adapter.checkDatabaseHealth();
    expect(health.ok).toBe(true);
  });

  it('should check FTS5 availability', () => {
    const fts5 = adapter.checkFts5Available();
    expect(fts5).toBe(true);
  });

  it('should get table info', () => {
    const info = adapter.getTableInfo();
    expect(info.memories).toBe(0);
    expect(info.projects).toBe(0);
    expect(info.handoffs).toBe(0);
    expect(info.importBatches).toBe(0);
  });

  it('should report database error when closed', () => {
    adapter.close();
    const health = adapter.checkDatabaseHealth();
    expect(health.ok).toBe(false);
  });
});
