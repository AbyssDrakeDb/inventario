import prisma from '../../shared/prisma/client';

export class InventarioService {
  async getStock(params: { marcaId?: number; categoriaId?: number; alerta?: boolean }) {
    const whereProducto: any = { activo: true };
    if (params.marcaId) whereProducto.marcaId = params.marcaId;
    if (params.categoriaId) whereProducto.categoriaId = params.categoriaId;

    const productos = await prisma.producto.findMany({
      where: whereProducto,
      include: {
        marca: true,
        categoria: true,
        stockActual: true,
      },
      orderBy: [{ marcaId: 'asc' }, { codigo: 'asc' }],
    });

    let result = productos.map(p => ({
      productoId: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      marca: p.marca.nombre,
      categoria: p.categoria?.nombre,
      presentacion: p.presentacion,
      stockMinimo: p.stockMinimo,
      stockActual: p.stockActual?.cantidad || 0,
      stockComprometido: p.stockActual?.comprometida || 0,
      stockDisponible: (p.stockActual?.cantidad || 0) - (p.stockActual?.comprometida || 0),
    }));

    if (params.alerta) {
      result = result.filter(p => p.stockDisponible <= p.stockMinimo);
    }

    return result;
  }

  async getStockPorProducto(productoId: number) {
    const p = await prisma.producto.findUnique({
      where: { id: productoId },
      include: { marca: true, stockActual: true },
    });
    if (!p) throw new Error('Producto no encontrado');

    return {
      productoId: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      marca: p.marca.nombre,
      stockMinimo: p.stockMinimo,
      stockActual: p.stockActual?.cantidad || 0,
      stockComprometido: p.stockActual?.comprometida || 0,
      stockDisponible: (p.stockActual?.cantidad || 0) - (p.stockActual?.comprometida || 0),
    };
  }

  async getMovimientos(params: {
    productoId?: number; tipo?: string; campanaId?: number;
    fechaDesde?: string; fechaHasta?: string; limit?: number; offset?: number;
  }) {
    const where: any = {};
    if (params.productoId) where.productoId = params.productoId;
    if (params.tipo) where.tipo = params.tipo;
    if (params.campanaId) where.campanaId = params.campanaId;
    if (params.fechaDesde || params.fechaHasta) {
      where.fecha = {};
      if (params.fechaDesde) where.fecha.gte = new Date(params.fechaDesde);
      if (params.fechaHasta) where.fecha.lte = new Date(params.fechaHasta);
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        include: { producto: { include: { marca: true } }, campana: true, pedido: true },
        orderBy: { fecha: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      prisma.movimientoInventario.count({ where }),
    ]);

    return { movimientos, total };
  }

  async registrarMovimiento(data: {
    productoId: number; tipo: string; cantidad: number;
    costoUnitario?: number; motivo?: string; pedidoId?: number; campanaId?: number;
  }) {
    const tiposStock = {
      'entrada': 1,
      'devolucion_cliente': 1,
      'salida': -1,
      'devolucion_marca': -1,
      'ajuste': 0,
    };

    const factor = (tiposStock as any)[data.tipo];
    if (factor === undefined) throw new Error(`Tipo de movimiento inválido: ${data.tipo}`);

    return prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoInventario.create({ data });

      await tx.stockActual.upsert({
        where: { productoId: data.productoId },
        create: {
          productoId: data.productoId,
          cantidad: Math.max(0, factor * data.cantidad),
          comprometida: 0,
        },
        update: factor !== 0
          ? { cantidad: { increment: factor * data.cantidad } }
          : { cantidad: data.cantidad },
      });

      return movimiento;
    });
  }

  async ajustarStock(productoId: number, nuevaCantidad: number, motivo?: string) {
    const stockActual = await prisma.stockActual.findUnique({ where: { productoId } });
    const cantidadActual = stockActual?.cantidad || 0;
    const diferencia = nuevaCantidad - cantidadActual;

    return this.registrarMovimiento({
      productoId,
      tipo: 'ajuste',
      cantidad: nuevaCantidad,
      motivo: motivo || `Ajuste manual: ${diferencia > 0 ? '+' : ''}${diferencia} unidades`,
    });
  }

  async getAlertas() {
    const stock = await this.getStock({ alerta: true });
    return stock.filter(p => p.stockDisponible <= p.stockMinimo);
  }
}

export const inventarioService = new InventarioService();