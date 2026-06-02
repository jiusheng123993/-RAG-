import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

interface ImportItem {
  file_path: string;
  title: string;
  status: string;
}

router.post('/preview', authMiddleware, async (req: AuthRequest, res) => {
  const { filePaths } = req.body as { filePaths?: string[] };

  if (!Array.isArray(filePaths)) {
    return res.status(400).json({ error: 'filePaths must be an array' });
  }

  const items = filePaths.map((filePath) => ({
    file_path: filePath,
    title: path.basename(filePath).replace(/\.[^.]+$/, '') || 'Untitled',
    exists: fs.existsSync(filePath),
    status: fs.existsSync(filePath) ? 'pending' : 'missing'
  }));

  return res.json({ items });
});

router.post('/execute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { items } = req.body as { items?: ImportItem[] };

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    const batchResult = await query(
      'INSERT INTO import_batches (project_id, total_count, status) VALUES ($1, $2, $3) RETURNING *',
      [projectId, items.length, 'running']
    );
    const batchId = batchResult.rows[0].id as string;
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const content = fs.readFileSync(item.file_path, 'utf-8');
        const summary = content.slice(0, 500);

        await query(
          `INSERT INTO import_items (batch_id, file_path, title, content, summary, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [batchId, item.file_path, item.title, content, summary, 'success']
        );
        await query(
          `INSERT INTO memories (project_id, type, title, content, summary, source)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, 'imported', item.title, content, summary, item.file_path]
        );
        successCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';
        await query(
          `INSERT INTO import_items (batch_id, file_path, title, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [batchId, item.file_path, item.title, 'error', message]
        );
        errorCount += 1;
      }
    }

    await query(
      'UPDATE import_batches SET status = $1, success_count = $2, error_count = $3, completed_at = NOW() WHERE id = $4',
      [errorCount > 0 ? 'completed_with_errors' : 'completed', successCount, errorCount, batchId]
    );

    return res.json({ batchId, successCount, errorCount });
  } catch {
    return res.status(500).json({ error: 'Import failed' });
  }
});

router.get('/batches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM import_batches WHERE project_id = $1 ORDER BY created_at DESC',
      [req.params.projectId]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Failed to load import batches' });
  }
});

export default router;
