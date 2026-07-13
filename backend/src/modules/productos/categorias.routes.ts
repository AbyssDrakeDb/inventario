import { Router } from 'express';
import { z } from 'zod';
import { categoriasService } from './categorias.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const categoriasRouter = Router();
categoriasRouter.use(authMiddleware);

const catSchema = z.object({
  nombre: z.string().min(2),
  marcaId: z.number().int().positive().optional(),
});

const catUpdateSchema = z.object({
  nombre: z.string().min(2).optional(),
  marcaId: z.number().int().positive().nullable().optional(),
});

categoriasRouter.get('/', async (req, res) => {
  try {
    const marcaId = req.query.marcaId ? Number(req.query.marcaId) : undefined;
    const cats = await categoriasService.listar(marcaId);
    res.json(cats);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

categoriasRouter.get('/:id', async (req, res) => {
  try {
    const c = await categoriasService.obtener(Number(req.params.id));
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

categoriasRouter.post('/', validate(catSchema), async (req, res) => {
  try {
    const c = await categoriasService.crear(req.body);
    res.status(201).json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

categoriasRouter.put('/:id', validate(catUpdateSchema), async (req, res) => {
  try {
    const c = await categoriasService.actualizar(Number(req.params.id), req.body);
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

categoriasRouter.delete('/:id', async (req, res) => {
  try {
    await categoriasService.eliminar(Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});