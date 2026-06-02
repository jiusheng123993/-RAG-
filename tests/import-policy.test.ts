import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectImportCandidates } from '../src/importers/import-policy.js';

function tempRoot(name: string): string {
  const root = path.join(os.tmpdir(), `local-project-memory-import-policy-${name}-${Date.now()}-${Math.random()}`);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

describe('import policy', () => {
  it('只收集允许的 Markdown 和文本文件并跳过敏感路径', () => {
    const root = tempRoot('allowed');
    fs.writeFileSync(path.join(root, 'README.md'), '# 标题\n内容', 'utf8');
    fs.writeFileSync(path.join(root, 'notes.txt'), '文本内容', 'utf8');
    fs.writeFileSync(path.join(root, '.env'), 'SECRET=1', 'utf8');
    fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules', 'pkg.md'), '# should skip', 'utf8');
    fs.writeFileSync(path.join(root, 'image.png'), 'binary', 'utf8');
    const result = collectImportCandidates({ paths: [root] });
    expect(result.candidates.map((item) => path.basename(item.filePath)).sort()).toEqual(['README.md', 'notes.txt']);
    expect(result.skipped.some((item) => item.filePath.endsWith('.env') && item.reason === 'blocked_file_name')).toBe(true);
    expect(result.skipped.some((item) => item.filePath.includes('node_modules') && item.reason === 'blocked_directory')).toBe(true);
    expect(result.skipped.some((item) => item.filePath.endsWith('image.png') && item.reason === 'unsupported_extension')).toBe(true);
  });

  it('按 include 和 exclude 规则过滤候选文件', () => {
    const root = tempRoot('patterns');
    fs.writeFileSync(path.join(root, 'keep.md'), '# keep', 'utf8');
    fs.writeFileSync(path.join(root, 'skip.txt'), 'skip', 'utf8');
    const result = collectImportCandidates({ paths: [root], include: ['*.md'], exclude: ['keep.md'] });
    expect(result.candidates).toHaveLength(0);
    expect(result.skipped.map((item) => item.reason)).toContain('excluded_by_pattern');
  });

  it('跳过超过大小限制的文件', () => {
    const root = tempRoot('size');
    fs.writeFileSync(path.join(root, 'large.md'), '1234567890', 'utf8');
    const result = collectImportCandidates({ paths: [root], maxFileBytes: 5 });
    expect(result.candidates).toHaveLength(0);
    expect(result.skipped[0]?.reason).toBe('file_too_large');
  });
});
