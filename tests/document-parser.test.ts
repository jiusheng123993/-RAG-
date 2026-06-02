import { describe, expect, it } from 'vitest';
import { parseDocument } from '../src/importers/document-parser.js';

describe('document parser', () => {
  it('从 Markdown frontmatter、一级标题和正文解析内容', () => {
    const parsed = parseDocument({
      filePath: 'E:/docs/guide.md',
      content: '---\ntitle: Front Title\ntags: [Alpha, beta]\n---\n# Markdown Title\n正文内容',
      defaultTags: ['Project']
    });
    expect(parsed.title).toBe('Front Title');
    expect(parsed.content).toBe('# Markdown Title\n正文内容');
    expect(parsed.tags).toEqual(['alpha', 'beta', 'project']);
    expect(parsed.summary).toBe('正文内容');
  });

  it('Markdown 没有 frontmatter title 时使用一级标题', () => {
    const parsed = parseDocument({ filePath: 'E:/docs/guide.md', content: '# 一级标题\n正文内容' });
    expect(parsed.title).toBe('一级标题');
  });

  it('纯文本标题回退到文件名并裁剪摘要', () => {
    const parsed = parseDocument({ filePath: 'E:/docs/notes.txt', content: '第一行\n第二行' });
    expect(parsed.title).toBe('notes');
    expect(parsed.summary).toBe('第一行 第二行');
  });
});
