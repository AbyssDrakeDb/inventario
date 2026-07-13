import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'inventario-secret-key-change-in-production';

export interface AuthRequest extends Request {
  usuarioId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { usuarioId: number };
    req.usuarioId = decoded.usuarioId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}