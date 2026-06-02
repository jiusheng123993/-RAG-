import { spawn } from 'node:child_process';
import { resolveLaunchMode } from './launcher.js';

const projectRoot = process.cwd();
const mode = resolveLaunchMode({ projectRoot });

function run(command: string, args: string[]) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

if (mode === 'electron') {
  run('electron', ['.']);
} else {
  console.warn('Electron binary is unavailable. Falling back to web mode.');
  run('node', ['dist/server/index.js']);
}
