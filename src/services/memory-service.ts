import type { MemoryRecord, MemoryStatus, MemoryType } from '../types/memory.js';
import type { SqliteAdapter } from '../storage/sqlite-adapter.js';
import type { ProjectResolver } from './project-resolver.js';
import { sha256 } from '../utils/hash.js';

interface RememberInput {
  workspacePath: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string | null;
  tags?: string[];
  importance?: number;
  source?: string;
  sourcePath?: string | null;
}

interface ArchiveInput {
  workspacePath: string;
  memoryId: string;
  reason: string;
}

interface DetailInput {
  workspacePath: string;
  memoryId: string;
}

interface UpdateInput {
  workspacePath: string;
  memoryId: string;
  type?: MemoryType;
  title?: string;
  content?: string;
  summary?: string | null;
  tags?: string[];
  importance?: number;
  source?: string;
  sourcePath?: string | null;
}

interface DuplicateInput {
  workspacePath: string;
  memoryId?: string;
  content?: string;
  limit?: number;
}

interface ListInput {
  workspacePath: string;
  type?: MemoryType;
  status?: MemoryStatus;
  limit?: number;
  offset?: number;
}

interface HandoffInput {
  workspacePath: string;
  taskTitle: string;
  changedFiles: string[];
  changedModules: string[];
  summary: string;
  verification: string;
  risks: string;
  nextSteps: string;
}

interface BulkArchiveInput {
  workspacePath: string;
  memoryIds?: string[];
  olderThanDays?: number;
  hasNoSummary?: boolean;
  importanceBelow?: number;
  reason: string;
}

interface ExportInput {
  workspacePath: string;
  format?: 'json' | 'markdown';
  status?: 'active' | 'archived' | 'both';
  types?: MemoryType[];
  includeArchived?: boolean;
}

interface HealthReportInput {
  workspacePath: string;
}

interface DiagnosticsInput {
  workspacePath?: string;
}

function assertText(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit) return 20;
  return Math.min(Math.max(limit, 1), 100);
}

function normalizeImportance(importance: number | undefined): number | undefined {
  if (importance === undefined) return undefined;
  if (!Number.isInteger(importance) || importance < 1 || importance > 5) {
    throw new Error('importance must be between 1 and 5');
  }
  return importance;
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)));
}

function hasUpdate(input: UpdateInput): boolean {
  return input.type !== undefined || input.title !== undefined || input.content !== undefined || input.summary !== undefined || input.tags !== undefined || input.importance !== undefined || input.source !== undefined || input.sourcePath !== undefined;
}

export function createMemoryService(adapter: SqliteAdapter, resolver: ProjectResolver) {
  return {
    async rememberProjectContext(input: RememberInput) {
      assertText(input.workspacePath, 'workspacePath');
      assertText(input.title, 'title');
      assertText(input.content, 'content');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memory = adapter.createMemory({
        projectId: project.id,
        type: input.type,
        title: input.title.trim(),
        content: input.content.trim(),
        summary: input.summary ?? null,
        source: input.source ?? 'mcp',
        sourcePath: input.sourcePath ?? null,
        tags: normalizeTags(input.tags) ?? [],
        importance: normalizeImportance(input.importance) ?? 3
      });
      return { ok: true as const, memoryId: memory.id, projectId: project.id };
    },

    async getMemoryDetail(input: DetailInput): Promise<{ ok: true; memory: MemoryRecord } | { ok: false; error: 'memory_not_found' }> {
      assertText(input.workspacePath, 'workspacePath');
      assertText(input.memoryId, 'memoryId');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memory = adapter.getMemory(project.id, input.memoryId);
      if (!memory) return { ok: false as const, error: 'memory_not_found' };
      return { ok: true as const, memory };
    },

    async updateProjectMemory(input: UpdateInput): Promise<{ ok: true; memory: MemoryRecord } | { ok: false; error: 'memory_not_found' }> {
      assertText(input.workspacePath, 'workspacePath');
      assertText(input.memoryId, 'memoryId');
      if (!hasUpdate(input)) throw new Error('update must include at least one field');
      if (input.title !== undefined) assertText(input.title, 'title');
      if (input.content !== undefined) assertText(input.content, 'content');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memory = adapter.updateMemory(project.id, input.memoryId, {
        type: input.type,
        title: input.title?.trim(),
        content: input.content?.trim(),
        summary: input.summary,
        source: input.source,
        sourcePath: input.sourcePath,
        tags: normalizeTags(input.tags),
        importance: normalizeImportance(input.importance)
      });
      if (!memory) return { ok: false as const, error: 'memory_not_found' };
      return { ok: true as const, memory };
    },

    async detectDuplicateMemories(input: DuplicateInput) {
      assertText(input.workspacePath, 'workspacePath');
      if (!input.memoryId && !input.content) throw new Error('memoryId or content is required');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const contentHash = input.content ? sha256(input.content.trim()) : adapter.getMemory(project.id, input.memoryId ?? '')?.contentHash;
      if (!contentHash) return { ok: false as const, error: 'memory_not_found' };
      const items = adapter.findDuplicateMemories(project.id, contentHash, normalizeLimit(input.limit));
      return { ok: true as const, contentHash, items };
    },

    async listProjectMemories(input: ListInput) {
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const output = adapter.listMemories({
        projectId: project.id,
        type: input.type,
        status: input.status ?? 'active',
        limit: normalizeLimit(input.limit),
        offset: input.offset ?? 0
      });
      return { ok: true as const, items: output.items, total: output.total };
    },

    async archiveProjectMemory(input: ArchiveInput) {
      assertText(input.reason, 'reason');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memory = adapter.archiveMemory(project.id, input.memoryId);
      if (!memory) return { ok: false as const, error: 'memory_not_found' };
      return { ok: true as const, memoryId: memory.id, status: memory.status };
    },

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

    async exportProjectMemory(input: ExportInput) {
      assertText(input.workspacePath, 'workspacePath');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);

      const status = input.status ?? 'active';
      const includeArchived = input.includeArchived ?? false;

      let memories: MemoryRecord[];
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

    async getServiceDiagnostics(input: DiagnosticsInput) {
      const health = adapter.checkDatabaseHealth();
      const fts5Available = adapter.checkFts5Available();
      const tableInfo = adapter.getTableInfo();

      const result: {
        ok: boolean;
        version: string;
        dataHome: string;
        databasePath: string;
        database: { ok: boolean; error?: string };
        fts5: { available: boolean };
        tables: { memories: number; projects: number; handoffs: number; importBatches: number };
        mcpTools: { count: number; names: string[] };
        project?: { id: string; name: string; workspacePath: string };
      } = {
        ok: health.ok,
        version: '0.1.0',
        dataHome: '',
        databasePath: '',
        database: { ok: health.ok, error: health.error },
        fts5: { available: fts5Available },
        tables: tableInfo,
        mcpTools: { count: 16, names: [] }
      };

      if (input.workspacePath) {
        try {
          const resolved = await resolver.resolve(input.workspacePath);
          const project = adapter.upsertProject(resolved);
          result.dataHome = project.workspacePath;
          result.databasePath = project.workspacePath;
          result.project = { id: project.id, name: project.name, workspacePath: project.workspacePath };
          result.mcpTools.names = [
            'remember_project_context', 'search_project_memory', 'find_related_memories',
            'get_memory_detail', 'update_project_memory', 'detect_duplicate_memories',
            'preview_knowledge_import', 'import_knowledge_files', 'list_import_batches',
            'get_project_brief', 'record_handoff_note', 'list_project_memories',
            'archive_project_memory', 'bulk_archive_memories', 'export_project_memory',
            'get_memory_health_report', 'get_service_diagnostics'
          ];
        } catch {
          // ignore project resolution errors
        }
      }

      return result;
    },

    async recordHandoffNote(input: HandoffInput) {
      assertText(input.taskTitle, 'taskTitle');
      assertText(input.summary, 'summary');
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const handoff = adapter.createHandoffNote({
        projectId: project.id,
        taskTitle: input.taskTitle,
        changedFiles: input.changedFiles,
        changedModules: input.changedModules,
        summary: input.summary,
        verification: input.verification,
        risks: input.risks,
        nextSteps: input.nextSteps
      });
      adapter.createMemory({
        projectId: project.id,
        type: 'handoff',
        title: input.taskTitle,
        content: input.summary,
        summary: input.verification,
        source: 'handoff',
        sourcePath: null,
        tags: ['handoff'],
        importance: 4
      });
      return { ok: true as const, handoffId: handoff.id };
    },

    async getProjectBrief(input: { workspacePath: string; includeRecentHandoffs?: boolean; limit?: number }) {
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memories = adapter.listMemories({ projectId: project.id, status: 'active', limit: normalizeLimit(input.limit), offset: 0 }).items;
      const recentHandoffs = input.includeRecentHandoffs === false ? [] : adapter.listRecentHandoffs(project.id, 10);
      return { ok: true as const, project, brief: { memories, recentHandoffs } };
    }
  };
}
