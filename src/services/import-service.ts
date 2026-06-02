import fs from 'node:fs';
import path from 'node:path';
import { collectImportCandidates, type SkippedImportPath } from '../importers/import-policy.js';
import { parseDocument } from '../importers/document-parser.js';
import type { MemoryRecord } from '../types/memory.js';
import type { SqliteAdapter } from '../storage/sqlite-adapter.js';
import type { ProjectResolver } from './project-resolver.js';
import { sha256 } from '../utils/hash.js';

interface ImportInput {
  workspacePath: string;
  paths: string[];
  include?: string[];
  exclude?: string[];
  tags?: string[];
  maxFileBytes?: number;
}

interface ListImportBatchesInput {
  workspacePath: string;
  limit?: number;
  offset?: number;
}

export interface PreviewCandidate {
  filePath: string;
  size: number;
  title: string;
  summary: string;
  tags: string[];
  contentHash: string;
}

export interface SkippedImportItem extends SkippedImportPath {
  contentHash?: string;
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit) return 20;
  return Math.min(Math.max(limit, 1), 100);
}

function assertImportInput(input: ImportInput): void {
  if (input.workspacePath.trim().length === 0) throw new Error('workspacePath must not be empty');
  if (input.paths.length === 0) throw new Error('paths must not be empty');
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)));
}

function previewCandidate(filePath: string, size: number, tags: string[]): PreviewCandidate {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseDocument({ filePath, content, defaultTags: tags });
  return {
    filePath,
    size,
    title: parsed.title,
    summary: parsed.summary,
    tags: parsed.tags,
    contentHash: sha256(parsed.summary || parsed.content)
  };
}

export function createImportService(adapter: SqliteAdapter, resolver: ProjectResolver) {
  return {
    async previewKnowledgeImport(input: ImportInput) {
      assertImportInput(input);
      const tags = normalizeTags(input.tags);
      const collected = collectImportCandidates({ paths: input.paths, include: input.include, exclude: input.exclude, maxFileBytes: input.maxFileBytes });
      const candidates = collected.candidates.map((candidate) => previewCandidate(candidate.filePath, candidate.size, tags));
      return {
        ok: true as const,
        totalFiles: candidates.length,
        skippedCount: collected.skipped.length,
        candidates,
        skippedItems: collected.skipped
      };
    },

    async importKnowledgeFiles(input: ImportInput) {
      assertImportInput(input);
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const tags = normalizeTags(input.tags);
      const collected = collectImportCandidates({ paths: input.paths, include: input.include, exclude: input.exclude, maxFileBytes: input.maxFileBytes });
      const importedItems: MemoryRecord[] = [];
      const skippedItems: SkippedImportItem[] = [...collected.skipped];
      const failedItems: SkippedImportPath[] = [];
      const rootPath = path.resolve(input.paths[0] ?? input.workspacePath);
      const batchItems: Array<{ memoryId: string | null; filePath: string; status: 'imported' | 'skipped' | 'failed'; reason: string | null; contentHash: string | null }> = [];

      for (const candidate of collected.candidates) {
        try {
          const content = fs.readFileSync(candidate.filePath, 'utf8');
          const parsed = parseDocument({ filePath: candidate.filePath, content, defaultTags: tags });
          if (parsed.content.trim().length === 0) {
            skippedItems.push({ filePath: candidate.filePath, reason: 'empty_content' });
            batchItems.push({ memoryId: null, filePath: candidate.filePath, status: 'skipped', reason: 'empty_content', contentHash: null });
            continue;
          }
          const contentHash = sha256(parsed.summary || parsed.content);
          const duplicates = adapter.findDuplicateMemories(project.id, contentHash, 1);
          if (duplicates.length > 0) {
            skippedItems.push({ filePath: candidate.filePath, reason: 'duplicate_content', contentHash });
            batchItems.push({ memoryId: null, filePath: candidate.filePath, status: 'skipped', reason: 'duplicate_content', contentHash });
            continue;
          }
          const memory = adapter.createMemory({
            projectId: project.id,
            type: 'document',
            title: parsed.title,
            content: parsed.content,
            summary: parsed.summary,
            source: 'import',
            sourcePath: candidate.filePath,
            contentHash,
            tags: parsed.tags,
            importance: 3
          });
          importedItems.push(memory);
          batchItems.push({ memoryId: memory.id, filePath: candidate.filePath, status: 'imported', reason: null, contentHash: memory.contentHash });
        } catch {
          failedItems.push({ filePath: candidate.filePath, reason: 'read_failed' });
          batchItems.push({ memoryId: null, filePath: candidate.filePath, status: 'failed', reason: 'read_failed', contentHash: null });
        }
      }

      const status = failedItems.length > 0 ? 'partial' : 'completed';
      const finalBatch = adapter.createImportBatch({
        projectId: project.id,
        rootPath,
        status,
        totalFiles: collected.candidates.length,
        importedCount: importedItems.length,
        skippedCount: skippedItems.length,
        failedCount: failedItems.length,
        options: { include: input.include ?? [], exclude: input.exclude ?? [], tags, maxFileBytes: input.maxFileBytes ?? null }
      });
      for (const item of collected.skipped) {
        adapter.createImportItem({ batchId: finalBatch.id, memoryId: null, filePath: item.filePath, status: 'skipped', reason: item.reason, contentHash: null });
      }
      for (const item of batchItems) {
        adapter.createImportItem({ batchId: finalBatch.id, ...item });
      }
      return {
        ok: true as const,
        batchId: finalBatch.id,
        totalFiles: collected.candidates.length,
        importedCount: importedItems.length,
        skippedCount: skippedItems.length,
        failedCount: failedItems.length,
        importedItems,
        skippedItems,
        failedItems
      };
    },

    async listImportBatches(input: ListImportBatchesInput) {
      const resolved = await resolver.resolve(input.workspacePath);
      const project = adapter.upsertProject(resolved);
      const output = adapter.listImportBatches(project.id, normalizeLimit(input.limit), input.offset ?? 0);
      return { ok: true as const, items: output.items, total: output.total };
    }
  };
}
