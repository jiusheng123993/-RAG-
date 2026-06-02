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
