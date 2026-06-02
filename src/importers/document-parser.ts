import path from 'node:path';

export interface ParseDocumentInput {
  filePath: string;
  content: string;
  defaultTags?: string[];
}

export interface ParsedDocument {
  title: string;
  content: string;
  summary: string;
  tags: string[];
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)));
}

function parseTags(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''));
  }
  return trimmed.split(',').map((tag) => tag.trim());
}

function extractFrontmatter(content: string): { title: string | null; tags: string[]; content: string } {
  if (!content.startsWith('---')) return { title: null, tags: [], content };
  const end = content.indexOf('\n---', 3);
  if (end < 0) return { title: null, tags: [], content };
  const frontmatter = content.slice(3, end).trim();
  const body = content.slice(end + 4).replace(/^\r?\n/, '');
  let title: string | null = null;
  const tags: string[] = [];
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'title') title = value.replace(/^['"]|['"]$/g, '');
    if (key === 'tags') tags.push(...parseTags(value));
  }
  return { title, tags, content: body };
}

function markdownTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1]?.trim() ?? null : null;
}

function fallbackTitle(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function summaryFromContent(content: string): string {
  const text = content.replace(/^#\s+.+$/gm, '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 240);
}

export function parseDocument(input: ParseDocumentInput): ParsedDocument {
  const extracted = extractFrontmatter(input.content.replace(/\r\n/g, '\n'));
  const title = extracted.title ?? markdownTitle(extracted.content) ?? fallbackTitle(input.filePath);
  const tags = normalizeTags([...(extracted.tags), ...(input.defaultTags ?? [])]);
  return {
    title,
    content: extracted.content.trim(),
    summary: summaryFromContent(extracted.content),
    tags
  };
}
