import { Router } from 'express';
import { z } from 'zod';
import { inventarioService } from './inventario.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const inventarioRouter = Router();
inventarioRouter.use(authMiddleware);

const movimientoSchema = z.object({
  productoId: z.number().int().positive(),
  tipo: z.enum(['entrada', 'salida', 'devolucion_cliente', 'devolucion_marca', 'ajuste']),
  cantidad: z.number().int().positive(),
  costoUnitario: z.number().positive().optional(),
  motivo: z.string().optional(),
  pedidoId: z.number().int().positive().optional(),
  campanaId: z.number().int().positive().optional(),
});

const ajusteSchema = z.object({
  productoId: z.number().int().positive(),
  nuevaCantidad: z.number().int().min(0),
  motivo: z.string().optional(),
});

inventarioRouter.get('/stock', async (req, res) => {
  try {
    const { marcaId, categoriaId, alerta } = req.query;
    const stock = await inventarioService.getStock({
      marcaId: marcaId ? Number(marcaId) : undefined,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      alerta: alerta === 'true',
    });
    res.json(stock);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

inventarioRouter.get('/stock/:productoId', async (req, res) => {
  try {
    const stock = await inventarioService.getStockPorProducto(Number(req.params.productoId));
    res.json(stock);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

inventarioRouter.get('/alertas', async (_req, res) => {
  try {
    const alertas = await inventarioService.getAlertas();
    res.json(alertas);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

inventarioRouter.get('/movimientos', async (req, res) => {
  try {
    const { productoId, tipo, campanaId, fechaDesde, fechaHasta, limit, offset } = req.query;
    const result = await inventarioService.getMovimientos({
      productoId: productoId ? Number(productoId) : undefined,
      tipo: tipo as string | undefined,
      campanaId: campanaId ? Number(campanaId) : undefined,
      fechaDesde: fechaDesde as string | undefined,
      fechaHasta: fechaHasta as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

inventarioRouter.post('/movimientos', validate(movimientoSchema), async (req, res) => {
  try {
    const m = await inventarioService.registrarMovimiento(req.body);
    res.status(201).json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

inventarioRouter.post('/ajustar', validate(ajusteSchema), async (req, res) => {
  try {
    const m = await inventarioService.ajustarStock(
      req.body.productoId,
      req.body.nuevaCantidad,
      req.body.motivo,
    );
    res.status(201).json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});