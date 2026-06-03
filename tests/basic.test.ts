import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createId } from '../src/utils/ids.js';
import { loadConfig } from '../src/config.js';

it('创建带前缀的 ID', () => {
  expect(createId('mem')).toMatch(/^mem_/);
});

describe('loadConfig', () => {
  it('优先使用 LOCAL_PROJECT_MEMORY_HOME', () => {
    const config = loadConfig({ LOCAL_PROJECT_MEMORY_HOME: 'E:/memory-data' });
    expect(config.dataHome).toBe(path.normalize('E:/memory-data'));
    expect(config.databasePath).toContain('memory.db');
  });
});
