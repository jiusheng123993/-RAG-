import type { MemoryStatus, MemoryType } from '../types/memory.js';
import type { SqliteAdapter } from '../storage/sqlite-adapter.js';
import type { ProjectResolver } from './project-resolver.js';

interface RememberInput {
  workspacePath: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string | null;
  tags?: string[];
  importance?: number;
  source?: string;
}

interface ArchiveInput {
  workspacePath: string;
  memoryId: string;
  reason: string;
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
        tags: input.tags ?? [],
        importance: input.importance ?? 3
      });
      return { ok: true as const, memoryId: memory.id, projectId: project.id };
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
