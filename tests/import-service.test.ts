import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createImportService } from '../src/services/import-service.js';
import { createMemoryService } from '../src/services/memory-service.js';
import { createProjectResolver } from '../src/services/project-resolver.js';
import { createSqliteAdapter } from '../src/storage/sqlite-adapter.js';

function setup(name: string) {
  const root = path.join(os.tmpdir(), `local-project-memory-import-service-${name}-${Date.now()}-${Math.random()}`);
  fs.mkdirSync(root, { recursive: true });
  const adapter = createSqliteAdapter(path.join(root, 'memory.db'));
  adapter.initialize();
  const resolver = createProjectResolver();
  return { root, adapter, importService: createImportService(adapter, resolver), memoryService: createMemoryService(adapter, resolver) };
}

describe('import service', () => {
  it('dry-run 只预览候选文件不写入记忆和批次', async () => {
    const { root, adapter, importService, memoryService } = setup('preview');
    fs.writeFileSync(path.join(root, 'guide.md'), '# 导入标题\n导入内容', 'utf8');
    const preview = await importService.previewKnowledgeImport({ workspacePath: root, paths: [path.join(root, 'guide.md')], tags: ['Docs'] });
    const memories = await memoryService.listProjectMemories({ workspacePath: root, limit: 10 });
    const batches = await importService.listImportBatches({ workspacePath: root });
    expect(preview.ok).toBe(true);
    expect(preview.totalFiles).toBe(1);
    expect(preview.candidates[0]?.title).toBe('导入标题');
    expect(preview.candidates[0]?.tags).toEqual(['docs']);
    expect(memories.total).toBe(0);
    expect(batches.total).toBe(0);
    adapter.close();
  });

  it('导入 Markdown 和文本文件并记录批次统计', async () => {
    const { root, adapter, importService, memoryService } = setup('import');
    fs.writeFileSync(path.join(root, 'guide.md'), '# 指南\n正文', 'utf8');
    fs.writeFileSync(path.join(root, 'notes.txt'), '文本知识', 'utf8');
    fs.writeFileSync(path.join(root, '.env'), 'SECRET=1', 'utf8');
    const result = await importService.importKnowledgeFiles({ workspacePath: root, paths: [root], tags: ['Knowledge'] });
    const memories = await memoryService.listProjectMemories({ workspacePath: root, limit: 10 });
    const batches = await importService.listImportBatches({ workspacePath: root });
    expect(result.ok).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    expect(memories.total).toBe(2);
    expect(memories.items.map((item) => item.sourcePath).sort()).toEqual([path.join(root, 'guide.md'), path.join(root, 'notes.txt')].sort());
    expect(batches.total).toBe(1);
    expect(batches.items[0]?.importedCount).toBe(2);
    adapter.close();
  });

  it('重复内容不会重复导入', async () => {
    const { root, adapter, importService, memoryService } = setup('duplicate');
    fs.writeFileSync(path.join(root, 'first.md'), '# A\n相同内容', 'utf8');
    fs.writeFileSync(path.join(root, 'second.md'), '# B\n相同内容', 'utf8');
    const first = await importService.importKnowledgeFiles({ workspacePath: root, paths: [path.join(root, 'first.md')] });
    const second = await importService.importKnowledgeFiles({ workspacePath: root, paths: [path.join(root, 'second.md')] });
    const memories = await memoryService.listProjectMemories({ workspacePath: root, limit: 10 });
    expect(first.importedCount).toBe(1);
    expect(second.importedCount).toBe(0);
    expect(second.skippedItems[0]?.reason).toBe('duplicate_content');
    expect(memories.total).toBe(1);
    adapter.close();
  });

  it('空文件不会导入为记忆', async () => {
    const { root, adapter, importService, memoryService } = setup('empty');
    fs.writeFileSync(path.join(root, 'empty.md'), '   ', 'utf8');
    const result = await importService.importKnowledgeFiles({ workspacePath: root, paths: [path.join(root, 'empty.md')] });
    const memories = await memoryService.listProjectMemories({ workspacePath: root, limit: 10 });
    expect(result.importedCount).toBe(0);
    expect(result.skippedItems[0]?.reason).toBe('empty_content');
    expect(memories.total).toBe(0);
    adapter.close();
  });
});
