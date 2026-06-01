import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ResolvedProjectInput } from '../types/project.js';
import { sha256 } from '../utils/hash.js';
import { normalizeWorkspacePath } from '../utils/paths.js';

const execFileAsync = promisify(execFile);

export interface ProjectResolver {
  resolve(workspacePath: string): Promise<ResolvedProjectInput>;
}

async function readGitValue(workspacePath: string, args: string[]): Promise<string | null> {
  try {
    const result = await execFileAsync('git', args, { cwd: workspacePath, windowsHide: true });
    const value = result.stdout.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function createProjectResolver(): ProjectResolver {
  return {
    async resolve(workspacePath: string): Promise<ResolvedProjectInput> {
      const normalizedPath = normalizeWorkspacePath(workspacePath);
      const gitRemote = await readGitValue(normalizedPath, ['config', '--get', 'remote.origin.url']);
      const gitBranch = await readGitValue(normalizedPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
      const fingerprintSource = gitRemote ? `${normalizedPath}|${gitRemote}|${gitBranch ?? ''}` : normalizedPath;

      return {
        name: path.basename(normalizedPath),
        workspacePath: normalizedPath,
        gitRemote,
        gitBranch,
        fingerprint: sha256(fingerprintSource)
      };
    }
  };
}
