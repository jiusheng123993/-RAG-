import type { MemoryRecord, MemoryStatus, MemoryType } from '../types/memory.js';
import type { SqliteAdapter } from '../storage/sqlite-adapter.js';
import type { ProjectResolver } from './project-resolver.js';

interface SearchInput {
  workspacePath: string;
  query: string;
  types?: MemoryType[];
  tags?: string[];
  source?: string;
  status?: MemoryStatus;
  minImportance?: number;
  updatedAfter?: string;
  updatedBefore?: string;
  includeArchived?: boolean;
  limit?: number;
}

interface RelatedInput {
  workspacePath: string;
  memoryId: string;
  limit?: number;
}

type SearchResult = Omit<MemoryRecord, 'content'> & { content: string; score: number; matchedFields: string[] };

function normalizeLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 10, 1), 50);
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  const normalized = Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)));
  return normalized.length > 0 ? normalized : undefined;
}

function trimContent(content: string): string {
  if (content.length <= 500) return content;
  return `${content.slice(0, 500)}…`;
}

function includesText(value: string | null, terms: string[]): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function matchedFields(memory: MemoryRecord, query: string, filterTags?: string[]): string[] {
  const terms = query.split(/\s+/).map((term) => term.trim().toLowerCase()).filter((term) => term.length > 0);
  const fields = new Set<string>();
  if (includesText(memory.title, terms)) fields.add('title');
  if (includesText(memory.summary, terms)) fields.add('summary');
  if (includesText(memory.content, terms)) fields.add('content');
  if (includesText(memory.source, terms)) fields.add('source');
  if (includesText(memory.sourcePath, terms)) fields.add('sourcePath');
  const memoryTags = memory.tags.map((tag) => tag.toLowerCase());
  if (terms.some((term) => memoryTags.some((tag) => tag.includes(term)))) fields.add('tags');
  if (filterTags?.some((tag) => memoryTags.includes(tag))) fields.add('tags');
  return Array.from(fields);
}

function toSearchResult(memory: MemoryRecord, query: string, tags?: string[]): SearchResult {
  return {
    ...memory,
    content: trimContent(memory.content),
    score: memory.importance,
    matchedFields: matchedFields(memory, query, tags)
  };
}

export function createRetrievalService(adapter: SqliteAdapter, resolver: ProjectResolver) {
  return {
    async searchProjectMemory(input: SearchInput) {
      if (input.query.trim().length === 0) {
        return { ok: true as const, results: [] };
      }
      const tags = normalizeTags(input.tags);
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const results = adapter.searchMemories({
        projectId: project.id,
        query: input.query.trim(),
        types: input.types,
        tags,
        source: input.source,
        status: input.status,
        minImportance: input.minImportance,
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
        includeArchived: input.includeArchived,
        limit: normalizeLimit(input.limit)
      });
      return { ok: true as const, results: results.map((memory) => toSearchResult(memory, input.query, tags)) };
    },

    async findRelatedMemories(input: RelatedInput) {
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const memory = adapter.getMemory(project.id, input.memoryId);
      if (!memory) {
        return { ok: false as const, error: 'memory not found' };
      }
      const query = memory.tags.length > 0 ? memory.tags.join(' ') : memory.title;
      const results = adapter.searchMemories({
        projectId: project.id,
        query,
        tags: memory.tags,
        source: memory.source,
        includeArchived: false,
        limit: normalizeLimit((input.limit ?? 10) + 1)
      }).filter((item) => item.id !== memory.id).slice(0, normalizeLimit(input.limit));
      return { ok: true as const, results: results.map((item) => toSearchResult(item, query, memory.tags)) };
    }
  };
}
