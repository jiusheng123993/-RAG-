import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { type, status, limit = '50', offset = '0' } = req.query;
    const params: unknown[] = [projectId];
    let sql = 'SELECT * FROM memories WHERE project_id = $1';

    if (typeof type === 'string' && type.length > 0) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }

    if (typeof status === 'string' && status.length > 0) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    params.push(Number(limit), Number(offset));
    sql += ` ORDER BY updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Failed to load memories' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { type, title, content, summary, tags, importance, source } = req.body as {
      type?: string;
      title?: string;
      content?: string;
      summary?: string;
      tags?: string[];
      importance?: number;
      source?: string;
    };

    if (!type || !title || !content) {
      return res.status(400).json({ error: 'Type, title and content are required' });
    }

    const result = await query(
      `INSERT INTO memories (project_id, type, title, content, summary, tags, importance, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [projectId, type, title, content, summary ?? null, tags ?? [], importance ?? 3, source ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to create memory' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM memories WHERE project_id = $1 AND id = $2', [req.params.projectId, req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to load memory' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, title, content, summary, tags, importance, status } = req.body as {
      type?: string;
      title?: string;
      content?: string;
      summary?: string;
      tags?: string[];
      importance?: number;
      status?: string;
    };

    if (!type || !title || !content) {
      return res.status(400).json({ error: 'Type, title and content are required' });
    }

    const result = await query(
      `UPDATE memories SET type = $1, title = $2, content = $3, summary = $4, tags = $5,
       importance = $6, status = $7, updated_at = NOW() WHERE project_id = $8 AND id = $9 RETURNING *`,
      [type, title, content, summary ?? null, tags ?? [], importance ?? 3, status ?? 'active', req.params.projectId, req.params.id]
    );

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to update memory' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM memories WHERE project_id = $1 AND id = $2', [req.params.projectId, req.params.id]);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Failed to delete memory' });
  }
});

export default router;
