import { Router } from 'express';
import { z } from 'zod';
import { clientesService } from './clientes.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';

export const clientesRouter = Router();
clientesRouter.use(authMiddleware);

const clienteSchema = z.object({
  nombre: z.string().min(2),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  notas: z.string().optional(),
});

const clienteUpdateSchema = z.object({
  nombre: z.string().min(2).optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  notas: z.string().optional(),
});

clientesRouter.get('/', async (req, res) => {
  try {
    const busqueda = req.query.busqueda as string | undefined;
    const clientes = await clientesService.listar(busqueda);
    res.json(clientes);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

clientesRouter.get('/cuentas-corrientes', async (_req, res) => {
  try {
    const data = await clientesService.cuentasCorrientes();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

clientesRouter.get('/:id', async (req, res) => {
  try {
    const c = await clientesService.obtener(Number(req.params.id));
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

clientesRouter.post('/', validate(clienteSchema), async (req, res) => {
  try {
    const c = await clientesService.crear(req.body);
    res.status(201).json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

clientesRouter.put('/:id', validate(clienteUpdateSchema), async (req, res) => {
  try {
    const c = await clientesService.actualizar(Number(req.params.id), req.body);
    res.json(c);
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});