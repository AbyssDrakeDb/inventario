import { Router } from 'express';
import { reportesService } from './reportes.service';
import { authMiddleware } from '../../shared/middlewares/auth';

export const reportesRouter = Router();
reportesRouter.use(authMiddleware);

reportesRouter.get('/dashboard', async (_req, res) => {
  try {
    const data = await reportesService.dashboard();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportesRouter.get('/ventas-campana/:campanaId', async (req, res) => {
  try {
    const data = await reportesService.ventasPorCampana(Number(req.params.campanaId));
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportesRouter.get('/ventas-marca/:marcaId', async (req, res) => {
  try {
    const data = await reportesService.ventasPorMarca(Number(req.params.marcaId));
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportesRouter.get('/faltantes/:campanaId', async (req, res) => {
  try {
    const data = await reportesService.faltantesPorCampana(Number(req.params.campanaId));
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportesRouter.get('/top-productos', async (req, res) => {
  try {
    const { marcaId, limit } = req.query;
    const data = await reportesService.topProductos(
      marcaId ? Number(marcaId) : undefined,
      limit ? Number(limit) : 10,
    );
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

reportesRouter.get('/stock-valorizado', async (_req, res) => {
  try {
    const data = await reportesService.stockValorizado();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});