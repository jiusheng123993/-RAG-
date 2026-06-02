import fs from 'node:fs';
import path from 'node:path';

export type LaunchMode = 'electron' | 'web';

export interface ResolveLaunchModeInput {
  projectRoot: string;
}

export function resolveLaunchMode(input: ResolveLaunchModeInput): LaunchMode {
  const electronPathFile = path.join(input.projectRoot, 'node_modules', 'electron', 'path.txt');
  if (!fs.existsSync(electronPathFile)) {
    return 'web';
  }

  const executableName = fs.readFileSync(electronPathFile, 'utf-8').trim();
  const executablePath = path.join(input.projectRoot, 'node_modules', 'electron', 'dist', executableName);
  return fs.existsSync(executablePath) ? 'electron' : 'web';
}
