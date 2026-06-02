import path from 'node:path';

export interface ServerProcessCommandInput {
  isPackaged: boolean;
  dirname: string;
  cwd: string;
  execPath: string;
}

export interface ServerProcessCommand {
  command: string;
  args: string[];
  cwd: string;
}

export function createServerProcessCommand(input: ServerProcessCommandInput): ServerProcessCommand {
  const serverEntry = input.isPackaged
    ? path.join(input.dirname, '../dist/server/index.js')
    : path.join(input.cwd, 'dist/server/index.js');

  return {
    command: input.execPath,
    args: [serverEntry],
    cwd: input.cwd,
  };
}
