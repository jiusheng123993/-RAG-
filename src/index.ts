#!/usr/bin/env node

import fs from 'node:fs';
import { loadConfig } from './config.js';
import { startMcpServer } from './mcp/server.js';
import { startHttpMcpServer } from './mcp/http-server.js';
import { createSqliteAdapter } from './storage/sqlite-adapter.js';
import { toolDefinitions } from './mcp/server.js';

const config = loadConfig();
const args = process.argv.slice(2);

if (args.includes('--http')) {
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 3107;
  await startHttpMcpServer(port);
} else if (args.includes('--print-config')) {
  process.stdout.write(JSON.stringify(config, null, 2));
} else if (args.includes('--doctor')) {
  await runDoctor();
} else if (args.includes('--migrate-status')) {
  await runMigrateStatus();
} else {
  await startMcpServer();
}

async function runDoctor() {
  const diagnosis = {
    version: '0.1.0',
    dataHome: config.dataHome,
    databasePath: config.databasePath,
    databaseExists: false,
    databaseStatus: 'unknown',
    fts5Available: false,
    mcpToolsCount: toolDefinitions.length,
    mcpTools: toolDefinitions.map(t => t.name)
  };

  try {
    diagnosis.databaseExists = fs.existsSync(config.databasePath);

    if (diagnosis.databaseExists) {
      const adapter = createSqliteAdapter(config.databasePath);
      adapter.initialize();

      diagnosis.databaseStatus = 'ok';

      try {
        adapter.getMemoryStats('test');
        diagnosis.fts5Available = true;
      } catch {
        diagnosis.fts5Available = false;
      }

      adapter.close();
    } else {
      diagnosis.databaseStatus = 'not initialized - run the service once to create database';
    }
  } catch (error) {
    diagnosis.databaseStatus = `error: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  process.stdout.write(JSON.stringify(diagnosis, null, 2));
}

async function runMigrateStatus() {
  const status = {
    databasePath: config.databasePath,
    databaseExists: false,
    migrations: [] as string[]
  };

  try {
    status.databaseExists = fs.existsSync(config.databasePath);

    if (status.databaseExists) {
      const adapter = createSqliteAdapter(config.databasePath);
      adapter.initialize();
      status.migrations = ['all applied'];
      adapter.close();
    } else {
      status.migrations = ['database not initialized'];
    }
  } catch (error) {
    status.migrations = [`error: ${error instanceof Error ? error.message : 'unknown'}`];
  }

  process.stdout.write(JSON.stringify(status, null, 2));
}
