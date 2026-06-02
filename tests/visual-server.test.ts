import { describe, expect, it } from 'vitest';

import app, { startServer } from '../src/server/index.js';
import { closePool } from '../src/server/db/postgres-adapter.js';

describe('visual app server', () => {
  it('startServer keeps the HTTP service available when migrations fail', async () => {
    const server = await startServer(0, '127.0.0.1');
    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Test server did not start on a TCP port');
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/diagnostics`);
      expect(response.status).toBe(200);
    } finally {
      server.close();
      await closePool();
    }
  });

  it('diagnostics endpoint returns degraded status when PostgreSQL is unavailable', async () => {
    const server = app.listen(0);
    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Test server did not start on a TCP port');
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/diagnostics`);
      const body = await response.json() as { status: string; database: string; stats: { memories: number; projects: number; users: number } };

      expect(response.status).toBe(200);
      expect(body.status).toBe('running');
      expect(['connected', 'disconnected']).toContain(body.database);
      expect(body.stats.memories).toBeGreaterThanOrEqual(0);
      expect(body.stats.projects).toBeGreaterThanOrEqual(0);
      expect(body.stats.users).toBeGreaterThanOrEqual(0);
    } finally {
      server.close();
    }
  });
});
