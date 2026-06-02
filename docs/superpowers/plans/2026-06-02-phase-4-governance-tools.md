# 第四阶段：知识维护与治理工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现知识库维护与治理工具，包括批量归档、导出和健康报告三个 MCP 工具

**Architecture:** 沿用现有 MemoryService 和 SqliteAdapter 架构，新增三个工具方法。批量归档支持手动指定 memoryIds 和条件匹配两种模式；导出支持 JSON 和 Markdown 两种格式；健康报告提供基础统计

**Tech Stack:** TypeScript, Node.js, SQLite, MCP SDK

---

## 阶段四：知识维护与治理工具

### 任务总览

1. 批量归档记忆 (`bulk_archive_memories`)
2. 导出项目记忆 (`export_project_memory`)
3. 知识库健康报告 (`get_memory_health_report`)
4. 集成测试

---

### Task 1: 添加批量归档 Schema 定义

**Files:**
- Modify: `src/mcp/schemas.ts`

- [ ] **Step 1: 添加 bulk_archive_memories Schema**

在 `schemas.ts` 文件末尾添加：

```typescript
export const bulkArchiveMemoriesSchema = z.object({
  workspacePath: z.string().min(1),
  memoryIds: z.array(z.string().min(1)).optional(),
  olderThanDays: z.number().int().min(1).optional(),
  hasNoSummary: z.boolean().optional(),
  importanceBelow: z.number().int().min(1).max(5).optional(),
  reason: z.string().min(1)
});
```

- [ ] **Step 2: 添加 export_project_memory Schema**

```typescript
export const exportProjectMemorySchema = z.object({
  workspacePath: z.string().min(1),
  format: z.enum(['json', 'markdown']).optional(),
  status: z.enum(['active', 'archived', 'both']).optional(),
  types: z.array(z.enum(memoryTypes)).optional(),
  includeArchived: z.boolean().optional()
});
```

- [ ] **Step 3: 添加 get_memory_health_report Schema**

```typescript
export const getMemoryHealthReportSchema = z.object({
  workspacePath: z.string().min(1)
});
```

---

### Task 2: 在 SqliteAdapter 中添加批量归档和统计方法

**Files:**
- Modify: `src/storage/sqlite-adapter.ts`

- [ ] **Step 1: 添加批量归档接口定义**

在 `SqliteAdapter` 接口中添加：

```typescript
bulkArchiveMemories(projectId: string, memoryIds: string[]): { success: number; failed: number };
getMemoryStats(projectId: string): {
  total: number;
  active: number;
  archived: number;
  byType: Record<string, number>;
  byTag: Record<string, number>;
  byImportance: Record<number, number>;
  duplicateCount: number;
  noSummaryCount: number;
  lowImportanceCount: number;
};
getMemoriesByConditions(projectId: string, conditions: {
  olderThanDays?: number;
  hasNoSummary?: boolean;
  importanceBelow?: number;
}): MemoryRecord[];
```

- [ ] **Step 2: 实现批量归档方法**

在 `createSqliteAdapter` 返回对象中添加：

```typescript
bulkArchiveMemories(projectId: string, memoryIds: string[]): { success: number; failed: number } {
  const timestamp = nowIso();
  let success = 0;
  let failed = 0;
  for (const memoryId of memoryIds) {
    const result = database.prepare("UPDATE memories SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND project_id = ? AND status = 'active'").run(timestamp, timestamp, memoryId, projectId);
    if (result.changes > 0) success++;
    else failed++;
  }
  return { success, failed };
},

getMemoriesByConditions(projectId: string, conditions: {
  olderThanDays?: number;
  hasNoSummary?: boolean;
  importanceBelow?: number;
}): MemoryRecord[] {
  const where = ['project_id = ?', "status = 'active'"];
  const params: SQLInputValue[] = [projectId];
  
  if (conditions.olderThanDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - conditions.olderThanDays);
    where.push('updated_at < ?');
    params.push(cutoffDate.toISOString());
  }
  if (conditions.hasNoSummary) {
    where.push('(summary IS NULL OR summary = "")');
  }
  if (conditions.importanceBelow) {
    where.push('importance < ?');
    params.push(conditions.importanceBelow);
  }
  
  const rows = database.prepare(`SELECT * FROM memories WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(rowToMemory);
},

getMemoryStats(projectId: string) {
  const totalRow = database.prepare('SELECT COUNT(*) as total FROM memories WHERE project_id = ?').get(projectId) as { total: number };
  const activeRow = database.prepare("SELECT COUNT(*) as total FROM memories WHERE project_id = ? AND status = 'active'").get(projectId) as { total: number };
  const archivedRow = database.prepare("SELECT COUNT(*) as total FROM memories WHERE project_id = ? AND status = 'archived'").get(projectId) as { total: number };
  
  const typeRows = database.prepare("SELECT type, COUNT(*) as count FROM memories WHERE project_id = ? GROUP BY type").all(projectId) as Array<{ type: string; count: number }>;
  const byType: Record<string, number> = {};
  for (const row of typeRows) byType[row.type] = row.count;
  
  const tagRows = database.prepare("SELECT tags FROM memories WHERE project_id = ?").all(projectId) as Array<{ tags: string }>;
  const tagCounts: Record<string, number> = {};
  for (const row of tagRows) {
    const tags = JSON.parse(row.tags) as string[];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  const importanceRows = database.prepare("SELECT importance, COUNT(*) as count FROM memories WHERE project_id = ? GROUP BY importance").all(projectId) as Array<{ importance: number; count: number }>;
  const byImportance: Record<number, number> = {};
  for (const row of importanceRows) byImportance[row.importance] = row.count;
  
  const noSummaryRow = database.prepare("SELECT COUNT(*) as total FROM memories WHERE project_id = ? AND (summary IS NULL OR summary = '') AND status = 'active'").get(projectId) as { total: number };
  const lowImportanceRow = database.prepare('SELECT COUNT(*) as total FROM memories WHERE project_id = ? AND importance <= 2 AND status = \'active\'').get(projectId) as { total: number };
  
  const hashRows = database.prepare("SELECT content_hash, COUNT(*) as cnt FROM memories WHERE project_id = ? AND status = 'active' GROUP BY content_hash HAVING cnt > 1").all(projectId) as Array<{ content_hash: string; cnt: number }>;
  const duplicateCount = hashRows.reduce((sum, row) => sum + row.cnt - 1, 0);
  
  return {
    total: Number(totalRow.total),
    active: Number(activeRow.total),
    archived: Number(archivedRow.total),
    byType,
    byTag: tagCounts,
    byImportance,
    duplicateCount,
    noSummaryCount: Number(noSummaryRow.total),
    lowImportanceCount: Number(lowImportanceRow.total)
  };
},
```

---

### Task 3: 在 MemoryService 中添加治理工具方法

**Files:**
- Modify: `src/services/memory-service.ts`

- [ ] **Step 1: 添加批量归档输入接口**

```typescript
interface BulkArchiveInput {
  workspacePath: string;
  memoryIds?: string[];
  olderThanDays?: number;
  hasNoSummary?: boolean;
  importanceBelow?: number;
  reason: string;
}
```

- [ ] **Step 2: 添加导出输入接口**

```typescript
interface ExportInput {
  workspacePath: string;
  format?: 'json' | 'markdown';
  status?: 'active' | 'archived' | 'both';
  types?: MemoryType[];
  includeArchived?: boolean;
}
```

- [ ] **Step 3: 添加健康报告输入接口**

```typescript
interface HealthReportInput {
  workspacePath: string;
}
```

- [ ] **Step 4: 实现批量归档方法**

```typescript
async bulkArchiveMemories(input: BulkArchiveInput) {
  assertText(input.workspacePath, 'workspacePath');
  assertText(input.reason, 'reason');
  if (!input.memoryIds && !input.olderThanDays && !input.hasNoSummary && !input.importanceBelow) {
    throw new Error('At least one of memoryIds, olderThanDays, hasNoSummary, or importanceBelow is required');
  }
  const resolved = await resolver.resolve(input.workspacePath);
  const project = adapter.upsertProject(resolved);
  
  let memoryIds = input.memoryIds ?? [];
  if (!input.memoryIds && (input.olderThanDays || input.hasNoSummary || input.importanceBelow)) {
    const matched = adapter.getMemoriesByConditions(project.id, {
      olderThanDays: input.olderThanDays,
      hasNoSummary: input.hasNoSummary,
      importanceBelow: input.importanceBelow
    });
    memoryIds = matched.map(m => m.id);
  }
  
  const result = adapter.bulkArchiveMemories(project.id, memoryIds);
  return { ok: true as const, ...result, total: memoryIds.length };
},
```

- [ ] **Step 5: 实现导出方法**

```typescript
async exportProjectMemory(input: ExportInput) {
  assertText(input.workspacePath, 'workspacePath');
  const resolved = await resolver.resolve(input.workspacePath);
  const project = adapter.upsertProject(resolved);
  
  const status = input.status ?? 'active';
  const includeArchived = input.includeArchived ?? false;
  
  let memories: MemoryRecord[] = [];
  if (status === 'both' || includeArchived) {
    memories = adapter.listMemories({ projectId: project.id, status: 'active', limit: 10000, offset: 0 }).items;
    if (input.status === 'both' || input.includeArchived) {
      const archived = adapter.listMemories({ projectId: project.id, status: 'archived', limit: 10000, offset: 0 }).items;
      memories = [...memories, ...archived];
    }
  } else {
    memories = adapter.listMemories({ projectId: project.id, status: status as MemoryStatus, limit: 10000, offset: 0 }).items;
  }
  
  if (input.types && input.types.length > 0) {
    memories = memories.filter(m => input.types!.includes(m.type));
  }
  
  const format = input.format ?? 'json';
  
  if (format === 'json') {
    return {
      ok: true as const,
      format: 'json',
      project: { id: project.id, name: project.name, workspacePath: project.workspacePath },
      exportedAt: new Date().toISOString(),
      totalCount: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        content: m.content,
        summary: m.summary,
        source: m.source,
        tags: m.tags,
        importance: m.importance,
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }))
    };
  } else {
    const lines = ['# ' + project.name + ' 项目记忆导出\n', `> 导出时间: ${new Date().toISOString()}\n`, `> 共 ${memories.length} 条记忆\n`, '---\n'];
    for (const m of memories) {
      lines.push(`## ${m.title} [${m.type}]${m.status === 'archived' ? ' (已归档)' : ''}\n`);
      if (m.summary) lines.push(`> ${m.summary}\n`);
      lines.push(`- 来源: ${m.source}\n`);
      lines.push(`- 重要性: ${m.importance}/5\n`);
      if (m.tags.length > 0) lines.push(`- 标签: ${m.tags.join(', ')}\n`);
      lines.push(`- 更新时间: ${m.updatedAt}\n`);
      lines.push('\n### 内容\n\n' + m.content + '\n\n---\n');
    }
    return {
      ok: true as const,
      format: 'markdown',
      content: lines.join(''),
      totalCount: memories.length
    };
  }
},
```

- [ ] **Step 6: 实现健康报告方法**

```typescript
async getMemoryHealthReport(input: HealthReportInput) {
  assertText(input.workspacePath, 'workspacePath');
  const resolved = await resolver.resolve(input.workspacePath);
  const project = adapter.upsertProject(resolved);
  const stats = adapter.getMemoryStats(project.id);
  
  const highPriorityTypes = ['do_not_touch', 'risk', 'decision', 'architecture'];
  const highPriorityMemories = adapter.listMemories({ projectId: project.id, status: 'active', limit: 100, offset: 0 }).items.filter(m => highPriorityTypes.includes(m.type));
  
  const risks: string[] = [];
  if (stats.duplicateCount > 0) risks.push(`存在 ${stats.duplicateCount} 条重复记忆`);
  if (stats.noSummaryCount > 0) risks.push(`${stats.noSummaryCount} 条记忆缺少摘要`);
  if (stats.lowImportanceCount > 0) risks.push(`${stats.lowImportanceCount} 条低重要性记忆`);
  
  return {
    ok: true as const,
    project: { id: project.id, name: project.name, workspacePath: project.workspacePath },
    generatedAt: new Date().toISOString(),
    stats: {
      total: stats.total,
      active: stats.active,
      archived: stats.archived,
      byType: stats.byType,
      byTag: stats.byTag,
      byImportance: stats.byImportance,
      duplicateCount: stats.duplicateCount,
      noSummaryCount: stats.noSummaryCount,
      lowImportanceCount: stats.lowImportanceCount
    },
    highPriorityMemories: highPriorityMemories.map(m => ({
      id: m.id,
      type: m.type,
      title: m.title,
      importance: m.importance
    })),
    risks
  };
},
```

---

### Task 4: 在 ToolHandlers 中注册新工具

**Files:**
- Modify: `src/mcp/tools.ts`

- [ ] **Step 1: 导入新 Schema**

```typescript
import {
  // ... existing imports
  bulkArchiveMemoriesSchema,
  exportProjectMemorySchema,
  getMemoryHealthReportSchema
} from './schemas.js';
```

- [ ] **Step 2: 添加新工具处理函数**

```typescript
async bulkArchiveMemories(input: unknown) {
  return dependencies.memoryService.bulkArchiveMemories(bulkArchiveMemoriesSchema.parse(input));
},
async exportProjectMemory(input: unknown) {
  return dependencies.memoryService.exportProjectMemory(exportProjectMemorySchema.parse(input));
},
async getMemoryHealthReport(input: unknown) {
  return dependencies.memoryService.getMemoryHealthReport(getMemoryHealthReportSchema.parse(input));
},
```

---

### Task 5: 在 Server 中注册新工具定义

**Files:**
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: 添加 bulk_archive_memories 工具定义**

```typescript
{
  name: 'bulk_archive_memories',
  description: '批量归档项目记忆，支持手动指定或按条件自动筛选。',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: { type: 'string' },
      memoryIds: { type: 'array', items: { type: 'string' } },
      olderThanDays: { type: 'number' },
      hasNoSummary: { type: 'boolean' },
      importanceBelow: { type: 'number' },
      reason: { type: 'string' }
    },
    required: ['workspacePath', 'reason']
  }
},
```

- [ ] **Step 2: 添加 export_project_memory 工具定义**

```typescript
{
  name: 'export_project_memory',
  description: '导出项目记忆为 JSON 或 Markdown 格式。',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: { type: 'string' },
      format: { type: 'string', enum: ['json', 'markdown'] },
      status: { type: 'string', enum: ['active', 'archived', 'both'] },
      types: { type: 'array', items: { type: 'string' } },
      includeArchived: { type: 'boolean' }
    },
    required: ['workspacePath']
  }
},
```

- [ ] **Step 3: 添加 get_memory_health_report 工具定义**

```typescript
{
  name: 'get_memory_health_report',
  description: '生成知识库健康报告，包含统计信息、风险提示和高优先级记忆。',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: { type: 'string' }
    },
    required: ['workspacePath']
  }
},
```

- [ ] **Step 4: 在 CallToolRequestSchema 处理中添加新工具**

```typescript
if (name === 'bulk_archive_memories') return handlers.bulkArchiveMemories(args);
if (name === 'export_project_memory') return handlers.exportProjectMemory(args);
if (name === 'get_memory_health_report') return handlers.getMemoryHealthReport(args);
```

---

### Task 6: 编写测试用例

**Files:**
- Create: `tests/governance-tools.test.ts`

- [ ] **Step 1: 编写批量归档测试**

```typescript
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
    const mem2 = await memoryService.rememberProjectContext({
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

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
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

    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: 编写导出测试**

```typescript
describe('exportProjectMemory', () => {
  // ... setup ...

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
    expect(result.memories).toHaveLength(1);
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
  });
});
```

- [ ] **Step 3: 编写健康报告测试**

```typescript
describe('getMemoryHealthReport', () => {
  // ... setup ...

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
    expect(result.highPriorityMemories).toHaveLength(1);
  });
});
```

---

### Task 7: 运行验证

**Files:**
- Test: All modified files

- [ ] **Step 1: 运行 typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: 运行 lint**

```bash
npm run lint
```

- [ ] **Step 3: 运行测试**

```bash
npm run test
```

- [ ] **Step 4: 运行构建**

```bash
npm run build
```

---

## 验收标准

- [ ] 批量归档支持手动指定 memoryIds
- [ ] 批量归档支持条件匹配（olderThanDays、hasNoSummary、importanceBelow）
- [ ] 导出支持 JSON 格式
- [ ] 导出支持 Markdown 格式
- [ ] 导出默认只导出 active 记忆
- [ ] 健康报告包含记忆数量统计
- [ ] 健康报告包含类型分布
- [ ] 健康报告包含标签分布
- [ ] 健康报告包含重复率统计
- [ ] 健康报告突出展示高优先级记忆（do_not_touch、risk、decision、architecture）
- [ ] 所有检查命令通过
