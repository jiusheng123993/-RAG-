import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveLaunchMode } from '../src/server/launcher.js';

const createdRoots: string[] = [];

function createRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lpm-launcher-'));
  createdRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of createdRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('resolveLaunchMode', () => {
  it('falls back to web when Electron binary is not installed', () => {
    const root = createRoot();
    expect(resolveLaunchMode({ projectRoot: root })).toBe('web');
  });

  it('uses electron when path.txt and executable exist', () => {
    const root = createRoot();
    const electronRoot = path.join(root, 'node_modules', 'electron');
    fs.mkdirSync(path.join(electronRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(electronRoot, 'path.txt'), 'electron.exe');
    fs.writeFileSync(path.join(electronRoot, 'dist', 'electron.exe'), '');

    expect(resolveLaunchMode({ projectRoot: root })).toBe('electron');
  });
});
