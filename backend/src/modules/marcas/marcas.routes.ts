import { Router } from 'express';
import { z } from 'zod';
import { marcasService } from './marcas.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const marcasRouter = Router();
marcasRouter.use(authMiddleware);

const marcaSchema = z.object({
  nombre: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug debe ser alfanumérico con guiones'),
  color: z.string().optional(),
});

const marcaUpdateSchema = z.object({
  nombre: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug inválido').optional(),
  color: z.string().optional(),
  activa: z.boolean().optional(),
});

marcasRouter.get('/', async (_req, res) => {
  try {
    const marcas = await marcasService.listar();
    res.json(marcas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

marcasRouter.get('/:id', async (req, res) => {
  try {
    const marca = await marcasService.obtener(Number(req.params.id));
    res.json(marca);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

marcasRouter.post('/', validate(marcaSchema), async (req, res) => {
  try {
    const marca = await marcasService.crear(req.body);
    res.status(201).json(marca);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

marcasRouter.put('/:id', validate(marcaUpdateSchema), async (req, res) => {
  try {
    const marca = await marcasService.actualizar(Number(req.params.id), req.body);
    res.json(marca);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

marcasRouter.delete('/:id', async (req, res) => {
  try {
    await marcasService.desactivar(Number(req.params.id));
    res.json({ ok: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});