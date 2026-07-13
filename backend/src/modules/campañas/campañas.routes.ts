import { Router } from 'express';
import { z } from 'zod';
import { campanasService } from './campañas.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const campanasRouter = Router();
campanasRouter.use(authMiddleware);

const campanaSchema = z.object({
  marcaId: z.number().int().positive(),
  numero: z.number().int().positive(),
  nombre: z.string().optional(),
  fechaInicio: z.string().refine(s => !isNaN(Date.parse(s)), 'Fecha inválida'),
  fechaFinVigencia: z.string().refine(s => !isNaN(Date.parse(s)), 'Fecha inválida'),
  fechaPedidoMarca: z.string().optional(),
});

const campanaUpdateSchema = z.object({
  numero: z.number().int().positive().optional(),
  nombre: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFinVigencia: z.string().optional(),
  fechaPedidoMarca: z.string().optional(),
  estado: z.enum(['abierta', 'cerrada', 'cancelada']).optional(),
});

campanasRouter.get('/', async (req, res) => {
  try {
    const { marcaId, estado } = req.query;
    const campanas = await campanasService.listar(
      marcaId ? Number(marcaId) : undefined,
      estado as string | undefined,
    );
    res.json(campanas);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

campanasRouter.get('/:id', async (req, res) => {
  try {
    const c = await campanasService.obtener(Number(req.params.id));
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

campanasRouter.post('/', validate(campanaSchema), async (req, res) => {
  try {
    const c = await campanasService.crear(req.body);
    res.status(201).json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

campanasRouter.put('/:id', validate(campanaUpdateSchema), async (req, res) => {
  try {
    const c = await campanasService.actualizar(Number(req.params.id), req.body);
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

campanasRouter.post('/:id/cerrar', async (req, res) => {
  try {
    const c = await campanasService.cerrar(Number(req.params.id));
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

campanasRouter.post('/copiar-precios', async (req, res) => {
  try {
    const { origenCampanaId, destinoCampanaId } = req.body;
    const result = await campanasService.copiarPrecios(origenCampanaId, destinoCampanaId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});