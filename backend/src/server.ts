import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { marcasRouter } from './modules/marcas/marcas.routes';
import { categoriasRouter } from './modules/productos/categorias.routes';
import { productosRouter } from './modules/productos/productos.routes';
import { campanasRouter } from './modules/campañas/campañas.routes';
import { preciosRouter } from './modules/precios/precios.routes';
import { clientesRouter } from './modules/clientes/clientes.routes';
import { pedidosRouter } from './modules/pedidos/pedidos.routes';
import { inventarioRouter } from './modules/inventario/inventario.routes';
import { reportesRouter } from './modules/reportes/reportes.routes';
import { authMiddleware } from './shared/middlewares/auth';
import { errorHandler } from './shared/middlewares/errorHandler';
import { exportarAExcel } from './shared/utils/excelImporter';
import { generarPDFReporte } from './shared/utils/pdfGenerator';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRouter);
app.use('/api/marcas', marcasRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/productos', productosRouter);
app.use('/api/campanas', campanasRouter);
app.use('/api/precios', preciosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/reportes', reportesRouter);

// Exportación Excel de reportes
app.post('/api/reportes/export-excel', authMiddleware, async (req, res) => {
  try {
    const { datos, columnas, titulo } = req.body;
    const buffer = await exportarAExcel(datos, columnas, titulo || 'Reporte');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(titulo || 'reporte')}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exportación PDF
app.post('/api/reportes/export-pdf', authMiddleware, async (req, res) => {
  try {
    const { datos, columnas, titulo } = req.body;
    const buffer = await generarPDFReporte(titulo || 'Reporte', columnas, datos);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(titulo || 'reporte')}.pdf"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});

export default app;