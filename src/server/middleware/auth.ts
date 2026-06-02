import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loadAppConfig } from '../config.js';

const config = loadAppConfig();

interface TokenPayload {
  userId: string;
  role: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.app.jwtSecret) as TokenPayload;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}
