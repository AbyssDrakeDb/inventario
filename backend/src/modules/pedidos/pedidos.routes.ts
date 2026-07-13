import { Router } from 'express';
import { z } from 'zod';
import { pedidosService } from './pedidos.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const pedidosRouter = Router();
pedidosRouter.use(authMiddleware);

const pedidoItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
});

const pedidoSchema = z.object({
  clienteId: z.number().int().positive(),
  campanaId: z.number().int().positive(),
  items: z.array(pedidoItemSchema).min(1, 'Debe tener al menos un ítem'),
});

const estadoSchema = z.object({
  estado: z.enum(['borrador', 'confirmado', 'enviado_a_marca', 'parcial', 'recibido', 'entregado', 'cancelado']),
});

pedidosRouter.get('/', async (req, res) => {
  try {
    const { clienteId, campanaId, estado } = req.query;
    const pedidos = await pedidosService.listar({
      clienteId: clienteId ? Number(clienteId) : undefined,
      campanaId: campanaId ? Number(campanaId) : undefined,
      estado: estado as string | undefined,
    });
    res.json(pedidos);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

pedidosRouter.get('/:id', async (req, res) => {
  try {
    const p = await pedidosService.obtener(Number(req.params.id));
    res.json(p);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

pedidosRouter.post('/', validate(pedidoSchema), async (req, res) => {
  try {
    const p = await pedidosService.crear(req.body);
    res.status(201).json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

pedidosRouter.patch('/:id/estado', validate(estadoSchema), async (req, res) => {
  try {
    const p = await pedidosService.actualizarEstado(Number(req.params.id), req.body.estado);
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

pedidosRouter.post('/:id/cancelar', async (req, res) => {
  try {
    const p = await pedidosService.cancelar(Number(req.params.id));
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Recepción de mercadería desde la marca (ANTES que rutas :id)
pedidosRouter.post('/recibir-marca', async (req, res) => {
  try {
    const { campanaId, items } = req.body;
    if (!campanaId || !items?.length) {
      res.status(400).json({ error: 'campanaId e items requeridos' });
      return;
    }
    const result = await pedidosService.recibirDeMarca(campanaId, items);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Abono general contra cliente (sin pedido específico)
const abonoGeneralSchema = z.object({
  clienteId: z.number().int().positive(),
  monto: z.number().positive(),
  notas: z.string().optional(),
});

pedidosRouter.post('/abono-general', validate(abonoGeneralSchema), async (req, res) => {
  try {
    const result = await pedidosService.registrarAbonoGeneral(req.body.clienteId, req.body.monto, req.body.notas);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Venta directa (sin campaña)
const ventaDirectaSchema = z.object({
  clienteId: z.number().int().positive(),
  items: z.array(z.object({
    productoId: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    precioUnitario: z.number().positive(),
  })).min(1),
  pago: z.object({
    tipo: z.enum(['completo', 'parcial', 'credito']),
    monto: z.number().min(0),
    notas: z.string().optional(),
    cuotas: z.number().int().min(1).optional(),
  }).optional(),
});

pedidosRouter.post('/venta-directa', validate(ventaDirectaSchema), async (req, res) => {
  try {
    const result = await pedidosService.crearVentaDirecta(req.body);
    res.status(201).json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Entrega a cliente (descuenta stock)
pedidosRouter.post('/:id/entregar', async (req, res) => {
  try {
    const p = await pedidosService.entregar(Number(req.params.id));
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Registrar pago al entregar el pedido
const pagoSchema = z.object({
  tipo: z.enum(['completo', 'parcial', 'credito']),
  monto: z.number().min(0),
  notas: z.string().optional(),
  cuotas: z.number().int().min(1).optional(),
});

pedidosRouter.post('/:id/entregar-con-pago', validate(pagoSchema), async (req, res) => {
  try {
    const result = await pedidosService.entregarConPago(Number(req.params.id), req.body);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Registrar abono posterior contra pedido
const abonoSchema = z.object({
  monto: z.number().positive(),
  notas: z.string().optional(),
});

pedidosRouter.post('/:id/abono', validate(abonoSchema), async (req, res) => {
  try {
    const result = await pedidosService.registrarAbono(Number(req.params.id), req.body.monto, req.body.notas);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});