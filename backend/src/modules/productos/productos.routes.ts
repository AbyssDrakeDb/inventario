import { Router } from 'express';
import { z } from 'zod';
import { productosService } from './productos.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const productosRouter = Router();
productosRouter.use(authMiddleware);

const productoSchema = z.object({
  marcaId: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  categoriaId: z.number().int().positive().optional(),
  presentacion: z.string().optional(),
  stockMinimo: z.number().int().min(0).optional(),
});

const productoUpdateSchema = z.object({
  codigo: z.string().min(1).optional(),
  nombre: z.string().min(2).optional(),
  descripcion: z.string().optional(),
  categoriaId: z.number().int().positive().nullable().optional(),
  presentacion: z.string().optional(),
  stockMinimo: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

productosRouter.get('/', async (req, res) => {
  try {
    const { marcaId, categoriaId, activo, busqueda } = req.query;
    const prods = await productosService.listar({
      marcaId: marcaId ? Number(marcaId) : undefined,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
      busqueda: busqueda as string | undefined,
    });
    res.json(prods);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productosRouter.get('/:id', async (req, res) => {
  try {
    const p = await productosService.obtener(Number(req.params.id));
    res.json(p);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

productosRouter.get('/buscar/:marcaId/:codigo', async (req, res) => {
  try {
    const p = await productosService.buscarPorCodigo(Number(req.params.marcaId), req.params.codigo);
    if (!p) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    res.json(p);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productosRouter.post('/', validate(productoSchema), async (req, res) => {
  try {
    const p = await productosService.crear(req.body);
    res.status(201).json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

productosRouter.put('/:id', validate(productoUpdateSchema), async (req, res) => {
  try {
    const p = await productosService.actualizar(Number(req.params.id), req.body);
    res.json(p);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

productosRouter.delete('/:id', async (req, res) => {
  try {
    await productosService.desactivar(Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});