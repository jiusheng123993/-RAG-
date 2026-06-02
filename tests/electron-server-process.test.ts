import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createServerProcessCommand } from '../electron/server-process.js';

describe('createServerProcessCommand', () => {
  it('uses the provided Node executable and development server entry', () => {
    const command = createServerProcessCommand({
      isPackaged: false,
      dirname: 'E:/app/dist-electron',
      cwd: 'E:/workspace/local-project-memory',
      execPath: 'C:/Program Files/nodejs/node.exe',
    });

    expect(command.command).toBe('C:/Program Files/nodejs/node.exe');
    expect(command.args).toEqual([path.join('E:/workspace/local-project-memory', 'dist/server/index.js')]);
    expect(command.cwd).toBe('E:/workspace/local-project-memory');
  });
});
