import cors from 'cors';
import express from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { loadAppConfig } from './config.js';
import { runMigrations } from './db/migrations.js';
import authRoutes from './routes/auth.js';
import diagnosticRoutes from './routes/diagnostics.js';
import importRoutes from './routes/import.js';
import memoryRoutes from './routes/memories.js';
import projectRoutes from './routes/projects.js';

const config = loadAppConfig();
const app = express();

app.use(cors({ origin: config.app.corsOrigins, credentials: true }));
app.use(express.json({ limit: '20mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/memories', memoryRoutes);
app.use('/api/projects/:projectId/import', importRoutes);
app.use('/api/diagnostics', diagnosticRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const rendererDir = path.join(process.cwd(), 'dist', 'renderer');
app.use(express.static(rendererDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(rendererDir, 'index.html'));
});

export async function startServer(port = config.app.port, host = config.app.host): Promise<Server> {
  try {
    await runMigrations();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    console.warn(`Database migrations skipped: ${message}`);
  }

  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
      resolve(server);
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown server startup error';
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  });
}

export default app;
