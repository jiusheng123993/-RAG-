import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';
import path from 'node:path';
import type { ImportBatchRecord, ImportBatchStatus, ImportItemRecord, ImportItemStatus } from '../types/import.js';
import type { HandoffNoteRecord, MemoryRecord, MemoryStatus, MemoryType } from '../types/memory.js';
import type { ProjectIdentity, ResolvedProjectInput } from '../types/project.js';
import { createId } from '../utils/ids.js';
import { nowIso } from '../utils/time.js';
import { sha256 } from '../utils/hash.js';
import { migrations } from './migrations.js';

interface MemoryInsertInput {
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  summary: string | null;
  source: string;
  sourcePath?: string | null;
  contentHash?: string | null;
  tags: string[];
  importance: number;
}

interface MemoryUpdateInput {
  type?: MemoryType;
  title?: string;
  content?: string;
  summary?: string | null;
  source?: string;
  sourcePath?: string | null;
  tags?: string[];
  importance?: number;
}

interface MemoryListInput {
  projectId: string;
  status: MemoryStatus;
  type?: MemoryType;
  limit: number;
  offset: number;
}

interface MemorySearchInput {
  projectId: string;
  query: string;
  types?: MemoryType[];
  tags?: string[];
  source?: string;
  status?: MemoryStatus;
  minImportance?: number;
  updatedAfter?: string;
  updatedBefore?: string;
  includeArchived?: boolean;
  limit: number;
}

interface HandoffInsertInput {
  projectId: string;
  taskTitle: string;
  changedFiles: string[];
  changedModules: string[];
  summary: string;
  verification: string;
  risks: string;
  nextSteps: string;
}

interface ImportBatchInsertInput {
  projectId: string;
  rootPath: string;
  status: ImportBatchStatus;
  totalFiles: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  options: Record<string, unknown>;
}

interface ImportItemInsertInput {
  batchId: string;
  memoryId: string | null;
  filePath: string;
  status: ImportItemStatus;
  reason: string | null;
  contentHash: string | null;
}

interface ImportBatchListOutput {
  items: ImportBatchRecord[];
  total: number;
}

interface MemoryListOutput {
  items: MemoryRecord[];
  total: number;
}

interface MemoryStats {
  total: number;
  active: number;
  archived: number;
  byType: Record<string, number>;
  byTag: Record<string, number>;
  byImportance: Record<number, number>;
  duplicateCount: number;
  noSummaryCount: number;
  lowImportanceCount: number;
}

interface MemoryConditions {
  olderThanDays?: number;
  hasNoSummary?: boolean;
  importanceBelow?: number;
}

export interface SqliteAdapter {
  initialize(): void;
  upsertProject(input: ResolvedProjectInput): ProjectIdentity;
  createMemory(input: MemoryInsertInput): MemoryRecord;
  getMemory(projectId: string, memoryId: string): MemoryRecord | null;
  updateMemory(projectId: string, memoryId: string, input: MemoryUpdateInput): MemoryRecord | null;
  findDuplicateMemories(projectId: string, contentHash: string, limit: number): MemoryRecord[];
  listMemories(input: MemoryListInput): MemoryListOutput;
  archiveMemory(projectId: string, memoryId: string): MemoryRecord | null;
  bulkArchiveMemories(projectId: string, memoryIds: string[]): { success: number; failed: number };
  getMemoriesByConditions(projectId: string, conditions: MemoryConditions): MemoryRecord[];
  getMemoryStats(projectId: string): MemoryStats;
  createHandoffNote(input: HandoffInsertInput): HandoffNoteRecord;
  listRecentHandoffs(projectId: string, limit: number): HandoffNoteRecord[];
  createImportBatch(input: ImportBatchInsertInput): ImportBatchRecord;
  createImportItem(input: ImportItemInsertInput): ImportItemRecord;
  listImportBatches(projectId: string, limit: number, offset: number): ImportBatchListOutput;
  searchMemories(input: MemorySearchInput): MemoryRecord[];
  close(): void;
}

function rowToProject(row: Record<string, unknown>): ProjectIdentity {
  return {
    id: String(row.id),
    name: String(row.name),
    workspacePath: String(row.workspace_path),
    gitRemote: row.git_remote === null ? null : String(row.git_remote),
    gitBranch: row.git_branch === null ? null : String(row.git_branch),
    fingerprint: String(row.fingerprint),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastAccessedAt: String(row.last_accessed_at)
  };
}

function rowToMemory(row: Record<string, unknown>): MemoryRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    type: row.type as MemoryType,
    title: String(row.title),
    content: String(row.content),
    summary: row.summary === null ? null : String(row.summary),
    source: String(row.source),
    sourcePath: row.source_path === null || row.source_path === undefined ? null : String(row.source_path),
    contentHash: row.content_hash === null || row.content_hash === undefined ? null : String(row.content_hash),
    tags: JSON.parse(String(row.tags)) as string[],
    status: row.status as MemoryStatus,
    importance: Number(row.importance),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    archivedAt: row.archived_at === null ? null : String(row.archived_at)
  };
}

function rowToHandoff(row: Record<string, unknown>): HandoffNoteRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    taskTitle: String(row.task_title),
    changedFiles: JSON.parse(String(row.changed_files)) as string[],
    changedModules: JSON.parse(String(row.changed_modules)) as string[],
    summary: String(row.summary),
    verification: String(row.verification),
    risks: String(row.risks),
    nextSteps: String(row.next_steps),
    createdAt: String(row.created_at)
  };
}

function rowToImportBatch(row: Record<string, unknown>): ImportBatchRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    rootPath: String(row.root_path),
    status: row.status as ImportBatchStatus,
    totalFiles: Number(row.total_files),
    importedCount: Number(row.imported_count),
    skippedCount: Number(row.skipped_count),
    failedCount: Number(row.failed_count),
    options: JSON.parse(String(row.options)) as Record<string, unknown>,
    createdAt: String(row.created_at)
  };
}

function rowToImportItem(row: Record<string, unknown>): ImportItemRecord {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    memoryId: row.memory_id === null ? null : String(row.memory_id),
    filePath: String(row.file_path),
    status: row.status as ImportItemStatus,
    reason: row.reason === null ? null : String(row.reason),
    contentHash: row.content_hash === null ? null : String(row.content_hash),
    createdAt: String(row.created_at)
  };
}

function addColumnIfMissing(database: DatabaseSync, tableName: string, columnName: string, definition: string): void {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!rows.some((row) => row.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function refreshFts(database: DatabaseSync, memory: MemoryRecord): void {
  const tags = JSON.stringify(memory.tags);
  database.prepare('DELETE FROM memory_fts WHERE memory_id = ?').run(memory.id);
  database.prepare('INSERT INTO memory_fts (memory_id, project_id, title, content, summary, tags) VALUES (?, ?, ?, ?, ?, ?)').run(memory.id, memory.projectId, memory.title, memory.content, memory.summary ?? '', tags);
}

export function createSqliteAdapter(databasePath: string): SqliteAdapter {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);

  return {
    initialize(): void {
      database.exec('PRAGMA foreign_keys = ON');
      for (const migration of migrations) {
        database.exec(migration);
        if (migration.startsWith('CREATE TABLE IF NOT EXISTS memories')) {
          addColumnIfMissing(database, 'memories', 'source_path', 'TEXT');
          addColumnIfMissing(database, 'memories', 'content_hash', 'TEXT');
        }
      }
      addColumnIfMissing(database, 'memories', 'source_path', 'TEXT');
      addColumnIfMissing(database, 'memories', 'content_hash', 'TEXT');
    },

    upsertProject(input: ResolvedProjectInput): ProjectIdentity {
      const existing = database.prepare('SELECT * FROM projects WHERE fingerprint = ?').get(input.fingerprint) as Record<string, unknown> | undefined;
      const timestamp = nowIso();
      if (existing) {
        database.prepare('UPDATE projects SET name = ?, workspace_path = ?, git_remote = ?, git_branch = ?, updated_at = ?, last_accessed_at = ? WHERE fingerprint = ?').run(
          input.name,
          input.workspacePath,
          input.gitRemote,
          input.gitBranch,
          timestamp,
          timestamp,
          input.fingerprint
        );
        return rowToProject(database.prepare('SELECT * FROM projects WHERE fingerprint = ?').get(input.fingerprint) as Record<string, unknown>);
      }

      const id = createId('proj');
      database.prepare('INSERT INTO projects (id, name, workspace_path, git_remote, git_branch, fingerprint, created_at, updated_at, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        input.name,
        input.workspacePath,
        input.gitRemote,
        input.gitBranch,
        input.fingerprint,
        timestamp,
        timestamp,
        timestamp
      );
      return rowToProject(database.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>);
    },

    createMemory(input: MemoryInsertInput): MemoryRecord {
      const id = createId('mem');
      const timestamp = nowIso();
      const tags = JSON.stringify(input.tags);
      const contentHash = input.contentHash ?? sha256(input.content);
      database.prepare("INSERT INTO memories (id, project_id, type, title, content, summary, source, source_path, content_hash, tags, status, importance, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NULL)").run(
        id,
        input.projectId,
        input.type,
        input.title,
        input.content,
        input.summary,
        input.source,
        input.sourcePath ?? null,
        contentHash,
        tags,
        input.importance,
        timestamp,
        timestamp
      );
      const memory = rowToMemory(database.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Record<string, unknown>);
      refreshFts(database, memory);
      return memory;
    },

    getMemory(projectId: string, memoryId: string): MemoryRecord | null {
      const row = database.prepare('SELECT * FROM memories WHERE id = ? AND project_id = ?').get(memoryId, projectId) as Record<string, unknown> | undefined;
      return row ? rowToMemory(row) : null;
    },

    updateMemory(projectId: string, memoryId: string, input: MemoryUpdateInput): MemoryRecord | null {
      const existing = this.getMemory(projectId, memoryId);
      if (!existing) return null;
      const next = {
        type: input.type ?? existing.type,
        title: input.title ?? existing.title,
        content: input.content ?? existing.content,
        summary: input.summary === undefined ? existing.summary : input.summary,
        source: input.source ?? existing.source,
        sourcePath: input.sourcePath === undefined ? existing.sourcePath : input.sourcePath,
        tags: input.tags ?? existing.tags,
        importance: input.importance ?? existing.importance
      };
      const timestamp = nowIso();
      const tags = JSON.stringify(next.tags);
      const contentHash = sha256(next.content);
      database.prepare('UPDATE memories SET type = ?, title = ?, content = ?, summary = ?, source = ?, source_path = ?, content_hash = ?, tags = ?, importance = ?, updated_at = ? WHERE id = ? AND project_id = ?').run(
        next.type,
        next.title,
        next.content,
        next.summary,
        next.source,
        next.sourcePath,
        contentHash,
        tags,
        next.importance,
        timestamp,
        memoryId,
        projectId
      );
      const memory = this.getMemory(projectId, memoryId);
      if (memory) refreshFts(database, memory);
      return memory;
    },

    findDuplicateMemories(projectId: string, contentHash: string, limit: number): MemoryRecord[] {
      const rows = database.prepare('SELECT * FROM memories WHERE project_id = ? AND content_hash = ? AND status = \'active\' ORDER BY updated_at DESC LIMIT ?').all(projectId, contentHash, limit) as Record<string, unknown>[];
      return rows.map(rowToMemory);
    },

    listMemories(input: MemoryListInput): MemoryListOutput {
      const where = input.type ? 'project_id = ? AND status = ? AND type = ?' : 'project_id = ? AND status = ?';
      const params = input.type ? [input.projectId, input.status, input.type] : [input.projectId, input.status];
      const totalRow = database.prepare(`SELECT COUNT(*) AS total FROM memories WHERE ${where}`).get(...params) as { total: number };
      const rows = database.prepare(`SELECT * FROM memories WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...params, input.limit, input.offset) as Record<string, unknown>[];
      return { total: Number(totalRow.total), items: rows.map(rowToMemory) };
    },

    archiveMemory(projectId: string, memoryId: string): MemoryRecord | null {
      const timestamp = nowIso();
      database.prepare("UPDATE memories SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND project_id = ?").run(timestamp, timestamp, memoryId, projectId);
      const row = database.prepare('SELECT * FROM memories WHERE id = ? AND project_id = ?').get(memoryId, projectId) as Record<string, unknown> | undefined;
      return row ? rowToMemory(row) : null;
    },

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

    getMemoriesByConditions(projectId: string, conditions: MemoryConditions): MemoryRecord[] {
      const where = ["project_id = ?", "status = 'active'"];
      const params: SQLInputValue[] = [projectId];

      if (conditions.olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - conditions.olderThanDays);
        where.push('updated_at < ?');
        params.push(cutoffDate.toISOString());
      }
      if (conditions.hasNoSummary) {
        where.push("(summary IS NULL OR summary = '')");
      }
      if (conditions.importanceBelow) {
        where.push('importance < ?');
        params.push(conditions.importanceBelow);
      }

      const rows = database.prepare(`SELECT * FROM memories WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).all(...params) as Record<string, unknown>[];
      return rows.map(rowToMemory);
    },

    getMemoryStats(projectId: string): MemoryStats {
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
      const lowImportanceRow = database.prepare("SELECT COUNT(*) as total FROM memories WHERE project_id = ? AND importance <= 2 AND status = 'active'").get(projectId) as { total: number };

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

    createHandoffNote(input: HandoffInsertInput): HandoffNoteRecord {
      const id = createId('handoff');
      const timestamp = nowIso();
      database.prepare('INSERT INTO handoff_notes (id, project_id, task_title, changed_files, changed_modules, summary, verification, risks, next_steps, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        input.projectId,
        input.taskTitle,
        JSON.stringify(input.changedFiles),
        JSON.stringify(input.changedModules),
        input.summary,
        input.verification,
        input.risks,
        input.nextSteps,
        timestamp
      );
      return rowToHandoff(database.prepare('SELECT * FROM handoff_notes WHERE id = ?').get(id) as Record<string, unknown>);
    },

    listRecentHandoffs(projectId: string, limit: number): HandoffNoteRecord[] {
      const rows = database.prepare('SELECT * FROM handoff_notes WHERE project_id = ? ORDER BY created_at DESC LIMIT ?').all(projectId, limit) as Record<string, unknown>[];
      return rows.map(rowToHandoff);
    },

    createImportBatch(input: ImportBatchInsertInput): ImportBatchRecord {
      const id = createId('import');
      const timestamp = nowIso();
      database.prepare('INSERT INTO import_batches (id, project_id, root_path, status, total_files, imported_count, skipped_count, failed_count, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        input.projectId,
        input.rootPath,
        input.status,
        input.totalFiles,
        input.importedCount,
        input.skippedCount,
        input.failedCount,
        JSON.stringify(input.options),
        timestamp
      );
      return rowToImportBatch(database.prepare('SELECT * FROM import_batches WHERE id = ?').get(id) as Record<string, unknown>);
    },

    createImportItem(input: ImportItemInsertInput): ImportItemRecord {
      const id = createId('import_item');
      const timestamp = nowIso();
      database.prepare('INSERT INTO import_items (id, batch_id, memory_id, file_path, status, reason, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        input.batchId,
        input.memoryId,
        input.filePath,
        input.status,
        input.reason,
        input.contentHash,
        timestamp
      );
      return rowToImportItem(database.prepare('SELECT * FROM import_items WHERE id = ?').get(id) as Record<string, unknown>);
    },

    listImportBatches(projectId: string, limit: number, offset: number): ImportBatchListOutput {
      const totalRow = database.prepare('SELECT COUNT(*) AS total FROM import_batches WHERE project_id = ?').get(projectId) as { total: number };
      const rows = database.prepare('SELECT * FROM import_batches WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(projectId, limit, offset) as Record<string, unknown>[];
      return { total: Number(totalRow.total), items: rows.map(rowToImportBatch) };
    },

    searchMemories(input: MemorySearchInput): MemoryRecord[] {
      const terms = input.query.split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 0);
      const params: SQLInputValue[] = [input.projectId];
      const where = ['memories.project_id = ?'];
      if (!input.includeArchived) {
        where.push(input.status ? 'memories.status = ?' : "memories.status = 'active'");
        if (input.status) params.push(input.status);
      } else if (input.status) {
        where.push('memories.status = ?');
        params.push(input.status);
      }
      if (input.types && input.types.length > 0) {
        where.push(`memories.type IN (${input.types.map(() => '?').join(',')})`);
        params.push(...input.types);
      }
      if (input.source) {
        where.push('memories.source = ?');
        params.push(input.source);
      }
      if (input.minImportance !== undefined) {
        where.push('memories.importance >= ?');
        params.push(input.minImportance);
      }
      if (input.updatedAfter) {
        where.push('memories.updated_at >= ?');
        params.push(input.updatedAfter);
      }
      if (input.updatedBefore) {
        where.push('memories.updated_at <= ?');
        params.push(input.updatedBefore);
      }
      if (input.tags && input.tags.length > 0) {
        for (const tag of input.tags) {
          where.push('memories.tags LIKE ?');
          params.push(`%"${tag}"%`);
        }
      }
      if (terms.length > 0) {
        const likeClauses = terms.map(() => '(memories.title LIKE ? OR memories.content LIKE ? OR memories.summary LIKE ? OR memories.tags LIKE ? OR memories.source LIKE ? OR memories.source_path LIKE ?)');
        const likeParams = terms.flatMap((term) => {
          const likeTerm = `%${term}%`;
          return [likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm];
        });
        where.push(`(${likeClauses.join(' AND ')} OR memories.id IN (SELECT memory_id FROM memory_fts WHERE project_id = ? AND memory_fts MATCH ?))`);
        params.push(...likeParams, input.projectId, input.query);
      }
      const rows = database.prepare(`SELECT DISTINCT memories.* FROM memories WHERE ${where.join(' AND ')} ORDER BY memories.importance DESC, memories.updated_at DESC LIMIT ?`).all(...params, input.limit) as Record<string, unknown>[];
      return rows.map(rowToMemory);
    },

    close(): void {
      database.close();
    }
  };
}
