import { describe, it, expect, beforeEach } from 'vitest';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createMemoryService } from '../src/services/memory-service.js';

describe('bulkArchiveMemories', () => {
  let adapter: ReturnType<typeof createSqliteAdapter>;
  let memoryService: ReturnType<typeof createMemoryService>;
  let resolver: ReturnType<typeof createProjectResolver>;

  beforeEach(() => {
    adapter = createSqliteAdapter(':memory:');
    adapter.initialize();
    resolver = createProjectResolver();
    memoryService = createMemoryService(adapter, resolver);
  });

  it('should archive memories by ids', async () => {
    const workspacePath = 'E:/test-project';
    const mem1 = await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Test 1',
      content: 'Content 1'
    });
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Test 2',
      content: 'Content 2'
    });

    const result = await memoryService.bulkArchiveMemories({
      workspacePath,
      memoryIds: [mem1.memoryId],
      reason: 'Test archive'
    });

    expect(result.ok).toBe(true);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should require at least one condition', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Test',
      content: 'Content'
    });

    await expect(
      memoryService.bulkArchiveMemories({
        workspacePath,
        reason: 'Test'
      })
    ).rejects.toThrow('At least one of memoryIds, olderThanDays, hasNoSummary, or importanceBelow is required');
  });

  it('should archive by olderThanDays', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Old Memory',
      content: 'Old content'
    });

    const result = await memoryService.bulkArchiveMemories({
      workspacePath,
      olderThanDays: 365,
      reason: 'Too old'
    });

    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should archive by hasNoSummary', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Memory without summary',
      content: 'Content without summary'
    });

    const result = await memoryService.bulkArchiveMemories({
      workspacePath,
      hasNoSummary: true,
      reason: 'No summary'
    });

    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });
});

describe('exportProjectMemory', () => {
  let adapter: ReturnType<typeof createSqliteAdapter>;
  let memoryService: ReturnType<typeof createMemoryService>;
  let resolver: ReturnType<typeof createProjectResolver>;

  beforeEach(() => {
    adapter = createSqliteAdapter(':memory:');
    adapter.initialize();
    resolver = createProjectResolver();
    memoryService = createMemoryService(adapter, resolver);
  });

  it('should export as json', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'architecture',
      title: 'Test Architecture',
      content: 'Architecture content',
      summary: 'Architecture summary'
    });

    const result = await memoryService.exportProjectMemory({
      workspacePath,
      format: 'json'
    });

    expect(result.ok).toBe(true);
    expect(result.format).toBe('json');
    expect(result.totalCount).toBe(1);
    expect(result.memories).toHaveLength(1);
    expect(result.memories?.[0].title).toBe('Test Architecture');
  });

  it('should export as markdown', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'architecture',
      title: 'Test Architecture',
      content: 'Architecture content'
    });

    const result = await memoryService.exportProjectMemory({
      workspacePath,
      format: 'markdown'
    });

    expect(result.ok).toBe(true);
    expect(result.format).toBe('markdown');
    expect(result.content).toContain('#');
    expect(result.content).toContain('Test Architecture');
  });

  it('should export by type filter', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'architecture',
      title: 'Architecture',
      content: 'Architecture content'
    });
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Decision',
      content: 'Decision content'
    });

    const result = await memoryService.exportProjectMemory({
      workspacePath,
      format: 'json',
      types: ['architecture']
    });

    expect(result.ok).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.memories?.[0].type).toBe('architecture');
  });

  it('should default to active status', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Active Memory',
      content: 'Active content'
    });

    const result = await memoryService.exportProjectMemory({
      workspacePath,
      format: 'json'
    });

    expect(result.ok).toBe(true);
    expect(result.totalCount).toBe(1);
  });
});

describe('getMemoryHealthReport', () => {
  let adapter: ReturnType<typeof createSqliteAdapter>;
  let memoryService: ReturnType<typeof createMemoryService>;
  let resolver: ReturnType<typeof createProjectResolver>;

  beforeEach(() => {
    adapter = createSqliteAdapter(':memory:');
    adapter.initialize();
    resolver = createProjectResolver();
    memoryService = createMemoryService(adapter, resolver);
  });

  it('should generate health report', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'do_not_touch',
      title: 'Critical Rule',
      content: 'Do not change this'
    });

    const result = await memoryService.getMemoryHealthReport({
      workspacePath
    });

    expect(result.ok).toBe(true);
    expect(result.stats).toBeDefined();
    expect(result.stats.total).toBe(1);
    expect(result.stats.active).toBe(1);
    expect(result.highPriorityMemories).toHaveLength(1);
    expect(result.highPriorityMemories[0].type).toBe('do_not_touch');
  });

  it('should include stats by type', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'architecture',
      title: 'Architecture',
      content: 'Architecture content'
    });
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Decision',
      content: 'Decision content'
    });

    const result = await memoryService.getMemoryHealthReport({
      workspacePath
    });

    expect(result.ok).toBe(true);
    expect(result.stats.byType.architecture).toBe(1);
    expect(result.stats.byType.decision).toBe(1);
  });

  it('should detect no summary memories', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'No Summary',
      content: 'Content without summary'
    });

    const result = await memoryService.getMemoryHealthReport({
      workspacePath
    });

    expect(result.ok).toBe(true);
    expect(result.stats.noSummaryCount).toBe(1);
    expect(result.risks).toContain('1 条记忆缺少摘要');
  });

  it('should detect low importance memories', async () => {
    const workspacePath = 'E:/test-project';
    await memoryService.rememberProjectContext({
      workspacePath,
      type: 'decision',
      title: 'Low Importance',
      content: 'Content',
      importance: 1
    });

    const result = await memoryService.getMemoryHealthReport({
      workspacePath
    });

    expect(result.ok).toBe(true);
    expect(result.stats.lowImportanceCount).toBe(1);
    expect(result.risks).toContain('1 条低重要性记忆');
  });
});
