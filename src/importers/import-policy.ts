import fs from 'node:fs';
import path from 'node:path';

export type ImportSkipReason = 'path_not_found' | 'blocked_directory' | 'blocked_file_name' | 'unsupported_extension' | 'file_too_large' | 'excluded_by_pattern' | 'not_included_by_pattern' | 'duplicate_content' | 'empty_content' | 'read_failed';

export interface ImportCandidate {
  filePath: string;
  size: number;
}

export interface SkippedImportPath {
  filePath: string;
  reason: ImportSkipReason;
}

export interface CollectImportInput {
  paths: string[];
  include?: string[];
  exclude?: string[];
  maxFileBytes?: number;
}

export interface CollectImportResult {
  candidates: ImportCandidate[];
  skipped: SkippedImportPath[];
}

const allowedExtensions = new Set(['.md', '.markdown', '.txt']);
const blockedDirectories = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', '.turbo', 'coverage']);
const blockedFileNames = new Set(['.env', '.env.local', '.env.production', '.env.development']);
const blockedExtensions = new Set(['.key', '.pem', '.p12', '.pfx', '.crt', '.cer', '.db', '.sqlite', '.sqlite3', '.zip', '.rar', '.7z', '.tar', '.gz']);
const defaultMaxFileBytes = 1024 * 1024;

function normalizePath(value: string): string {
  return path.resolve(value);
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  if (normalizedPattern.startsWith('*.')) return normalized.endsWith(normalizedPattern.slice(1));
  if (normalizedPattern.includes('*')) {
    const escaped = normalizedPattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`(^|/)${escaped}$`).test(normalized);
  }
  return normalized.endsWith(normalizedPattern);
}

function shouldSkipByPattern(filePath: string, include: string[] | undefined, exclude: string[] | undefined): ImportSkipReason | null {
  if (exclude?.some((pattern) => matchesPattern(filePath, pattern))) return 'excluded_by_pattern';
  if (include && include.length > 0 && !include.some((pattern) => matchesPattern(filePath, pattern))) return 'not_included_by_pattern';
  return null;
}

function collectFile(filePath: string, input: Required<Pick<CollectImportInput, 'maxFileBytes'>> & Pick<CollectImportInput, 'include' | 'exclude'>, result: CollectImportResult): void {
  const basename = path.basename(filePath).toLowerCase();
  const extension = path.extname(filePath).toLowerCase();
  if (blockedFileNames.has(basename) || blockedExtensions.has(extension)) {
    result.skipped.push({ filePath, reason: 'blocked_file_name' });
    return;
  }
  if (!allowedExtensions.has(extension)) {
    result.skipped.push({ filePath, reason: 'unsupported_extension' });
    return;
  }
  const patternSkip = shouldSkipByPattern(filePath, input.include, input.exclude);
  if (patternSkip) {
    result.skipped.push({ filePath, reason: patternSkip });
    return;
  }
  const stat = fs.statSync(filePath);
  if (stat.size > input.maxFileBytes) {
    result.skipped.push({ filePath, reason: 'file_too_large' });
    return;
  }
  result.candidates.push({ filePath, size: stat.size });
}

function walk(targetPath: string, input: Required<Pick<CollectImportInput, 'maxFileBytes'>> & Pick<CollectImportInput, 'include' | 'exclude'>, result: CollectImportResult): void {
  if (!fs.existsSync(targetPath)) {
    result.skipped.push({ filePath: targetPath, reason: 'path_not_found' });
    return;
  }
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const basename = path.basename(targetPath).toLowerCase();
    if (blockedDirectories.has(basename)) {
      result.skipped.push({ filePath: targetPath, reason: 'blocked_directory' });
      return;
    }
    for (const entry of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, entry), input, result);
    }
    return;
  }
  if (stat.isFile()) collectFile(targetPath, input, result);
}

export function collectImportCandidates(input: CollectImportInput): CollectImportResult {
  const result: CollectImportResult = { candidates: [], skipped: [] };
  const options = { include: input.include, exclude: input.exclude, maxFileBytes: input.maxFileBytes ?? defaultMaxFileBytes };
  for (const targetPath of input.paths.map(normalizePath)) {
    walk(targetPath, options, result);
  }
  result.candidates.sort((first, second) => first.filePath.localeCompare(second.filePath));
  return result;
}
