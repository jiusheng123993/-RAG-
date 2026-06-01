import type { MemoryType } from '../types/memory.js';
import type { SqliteAdapter } from '../storage/sqlite-adapter.js';
import type { ProjectResolver } from './project-resolver.js';

export function createRetrievalService(adapter: SqliteAdapter, resolver: ProjectResolver) {
  return {
    async searchProjectMemory(input: { workspacePath: string; query: string; types?: MemoryType[]; limit?: number }) {
      if (input.query.trim().length === 0) {
        return { ok: true as const, results: [] };
      }
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const results = adapter.searchMemories({
        projectId: project.id,
        query: input.query.trim(),
        types: input.types,
        limit: Math.min(Math.max(input.limit ?? 10, 1), 50)
      });
      return { ok: true as const, results: results.map((memory) => ({ ...memory, score: 1 })) };
    }
  };
}
