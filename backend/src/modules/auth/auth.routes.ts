import { Router } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const registerSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const result = await authService.registrar(nombre, email, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

authRouter.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.getProfile(req.usuarioId!);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

authRouter.put('/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { monedaSimbolo, monedaDecimales, pais } = req.body;
    const config = await authService.actualizarConfig(req.usuarioId!, { monedaSimbolo, monedaDecimales, pais });
    res.json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});