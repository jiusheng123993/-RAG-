import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadAppConfig } from '../config.js';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const config = loadAppConfig();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body as { email?: string; username?: string; password?: string };

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, role',
      [email, username, passwordHash]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '23505') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0] as { id: string; email: string; username: string; password_hash: string; role: string };
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.app.jwtSecret, { expiresIn: '7d' });

    return res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch {
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, email, username, role FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Failed to load current user' });
  }
});

export default router;
