import { Router } from 'express';
import { toolDefinitions } from '../../mcp/server.js';
import { query } from '../db/postgres-adapter.js';

const router = Router();

async function countTable(table: string) {
  try {
    const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
    return Number(result.rows[0].count);
  } catch {
    return 0;
  }
}

router.get('/', async (_req, res) => {
  const database = await query('SELECT 1 as ok').then(() => 'connected').catch(() => 'disconnected');

  return res.json({
    version: '0.2.0',
    status: 'running',
    database,
    stats: {
      memories: await countTable('memories'),
      projects: await countTable('projects'),
      users: await countTable('users')
    },
    mcp: {
      enabled: true,
      tools: toolDefinitions.length,
      toolDefinitions: toolDefinitions.map((tool) => ({
        name: tool.name,
        description: tool.description,
        required: tool.inputSchema.required ?? []
      }))
    }
  });
});

export default router;
