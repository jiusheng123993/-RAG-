#!/usr/bin/env node

import { loadConfig } from './config.js';
import { startMcpServer } from './mcp/server.js';

const config = loadConfig();

if (process.argv.includes('--print-config')) {
  process.stdout.write(JSON.stringify(config, null, 2));
} else {
  await startMcpServer();
}
