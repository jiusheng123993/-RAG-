import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.updated_at DESC`,
      [req.userId]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Failed to load projects' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description ?? null, req.userId]
    );

    await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [result.rows[0].id, req.userId, 'owner']
    );

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to load project' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description ?? null, req.params.id]
    );

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
