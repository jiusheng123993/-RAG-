import { spawn } from 'node:child_process';
import path from 'node:path';
import { resolveLaunchMode } from './launcher.js';

const projectRoot = process.cwd();
const mode = resolveLaunchMode({ projectRoot });

function run(command: string, args: string[], useShell = false) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: useShell,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

if (mode === 'electron') {
  const electronPath = path.join(projectRoot, 'node_modules', 'electron', 'dist', 'win32-x64', 'electron.exe');
  run(electronPath, ['.'], true);
} else {
  console.warn('Electron binary is unavailable. Falling back to web mode.');
  run('node', ['dist/server/index.js']);
}
