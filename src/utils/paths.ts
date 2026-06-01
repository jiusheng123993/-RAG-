import path from 'node:path';

export function normalizeWorkspacePath(workspacePath: string): string {
  const resolved = path.resolve(workspacePath.trim());
  return resolved.replaceAll('\\', '/');
}
