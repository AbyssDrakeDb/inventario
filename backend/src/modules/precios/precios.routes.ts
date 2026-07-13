import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { preciosService } from './precios.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';
import { importarCatalogoDesdeExcel } from '../../shared/utils/excelImporter';
import prisma from '../../shared/prisma/client';

export const preciosRouter = Router();
preciosRouter.use(authMiddleware);
const upload = multer({ dest: path.join(__dirname, '..', '..', '..', 'uploads') });

const precioSchema = z.object({
  productoId: z.number().int().positive(),
  campanaId: z.number().int().positive(),
  precioContado: z.number().positive('Precio contado debe ser positivo'),
  precioRevendedora: z.number().positive('Precio revendedora debe ser positivo'),
  precioCredito: z.number().positive().optional(),
  precioOferta: z.number().positive().optional(),
  esOferta: z.boolean().optional(),
  bonificacion: z.number().positive().optional(),
});

const precioBatchSchema = z.object({
  items: z.array(precioSchema).min(1),
});

preciosRouter.get('/campana/:campanaId', async (req, res) => {
  try {
    const precios = await preciosService.listarPorCampana(Number(req.params.campanaId));
    res.json(precios);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

preciosRouter.get('/revista/:campanaId', async (req, res) => {
  try {
    const revista = await preciosService.getRevista(Number(req.params.campanaId));
    res.json(revista);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

preciosRouter.get('/:id', async (req, res) => {
  try {
    const p = await preciosService.obtener(Number(req.params.id));
    res.json(p);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

preciosRouter.post('/', validate(precioSchema), async (req, res) => {
  try {
    const p = await preciosService.upsert(req.body);
    res.status(201).json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

preciosRouter.post('/batch', validate(precioBatchSchema), async (req, res) => {
  try {
    const results = await preciosService.upsertBatch(req.body.items);
    res.status(201).json(results);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

preciosRouter.delete('/:id', async (req, res) => {
  try {
    await preciosService.eliminar(Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

// Importación masiva de catálogo desde Excel
preciosRouter.post('/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo Excel requerido' });
      return;
    }
    const campanaId = Number(req.body.campanaId);
    if (!campanaId) {
      res.status(400).json({ error: 'campanaId es requerido' });
      return;
    }

    // Inferir marcaId desde la campaña (evita pedirlo por separado)
    const campana = await prisma.campana.findUnique({ where: { id: campanaId }, select: { marcaId: true, marca: { select: { nombre: true } } } });
    if (!campana) {
      res.status(404).json({ error: 'Campaña no encontrada' });
      return;
    }

    const result = await importarCatalogoDesdeExcel(req.file.path, campana.marcaId, campanaId);
    res.json({ ...result, marca: campana.marca.nombre });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});