import prisma from '../../shared/prisma/client';

export class CampanasService {
  async listar(marcaId?: number, estado?: string) {
    return prisma.campana.findMany({
      where: {
        ...(marcaId ? { marcaId } : {}),
        ...(estado ? { estado } : {}),
      },
      include: { marca: true },
      orderBy: [{ marcaId: 'asc' }, { numero: 'desc' }],
    });
  }

  async obtener(id: number) {
    const c = await prisma.campana.findUnique({
      where: { id },
      include: { marca: true, _count: { select: { precios: true, pedidos: true } } },
    });
    if (!c) throw new Error('Campaña no encontrada');
    return c;
  }

  async crear(data: {
    marcaId: number; numero: number; nombre?: string;
    fechaInicio: string; fechaFinVigencia: string; fechaPedidoMarca?: string;
  }) {
    return prisma.campana.create({
      data: {
        ...data,
        fechaInicio: new Date(data.fechaInicio),
        fechaFinVigencia: new Date(data.fechaFinVigencia),
        fechaPedidoMarca: data.fechaPedidoMarca ? new Date(data.fechaPedidoMarca) : undefined,
      },
      include: { marca: true },
    });
  }

  async actualizar(id: number, data: any) {
    await this.obtener(id);
    const converted: any = { ...data };
    if (data.fechaInicio) converted.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaFinVigencia) converted.fechaFinVigencia = new Date(data.fechaFinVigencia);
    if (data.fechaPedidoMarca) converted.fechaPedidoMarca = new Date(data.fechaPedidoMarca);
    return prisma.campana.update({ where: { id }, data: converted, include: { marca: true } });
  }

  async cerrar(id: number) {
    const campana = await this.obtener(id);
    if (campana.estado === 'cerrada') throw new Error('La campaña ya está cerrada');

    // Calcular sobrantes: productos recibidos vs pedidos de clientes
    const productosConStock = await prisma.precioProducto.findMany({
      where: { campanaId: id },
      include: {
        producto: true,
      },
    });

    const sobrantes: any[] = [];
    for (const pp of productosConStock) {
      const stock = await prisma.stockActual.findUnique({ where: { productoId: pp.productoId } });
      if (stock && stock.cantidad > 0) {
        // Total pedido por clientes en esta campaña (items entregados + por entregar)
        const pedidosCliente = await prisma.pedidoItem.aggregate({
          where: {
            productoId: pp.productoId,
            pedido: { campanaId: id, tipo: 'campana', estado: { not: 'cancelado' } },
          },
          _sum: { cantidad: true, cantidadRecibida: true },
        });

        const totalPedido = Number(pedidosCliente._sum.cantidad || 0);
        const totalRecibido = Number(pedidosCliente._sum.cantidadRecibida || 0);
        const sobrante = Math.max(0, totalRecibido - totalPedido);

        if (sobrante > 0) {
          sobrantes.push({
            productoId: pp.productoId,
            codigo: pp.producto.codigo,
            nombre: pp.producto.nombre,
            totalPedidoClientes: totalPedido,
            totalRecibido: totalRecibido,
            sobrante,
          });
        }
      }
    }

    // Cerrar campaña
    await prisma.campana.update({ where: { id }, data: { estado: 'cerrada' } });

    // Desactivar alertas de stock bajo para productos sobrantes
    if (sobrantes.length > 0) {
      await prisma.producto.updateMany({
        where: { id: { in: sobrantes.map(s => s.productoId) } },
        data: { alertarStockBajo: false },
      });
    }

    return {
      ok: true,
      estado: 'cerrada',
      sobrantes,
      totalSobrante: sobrantes.reduce((s: number, p: any) => s + p.sobrante, 0),
    };
  }

  async copiarPrecios(origenCampanaId: number, destinoCampanaId: number) {
    const preciosOrigen = await prisma.precioProducto.findMany({
      where: { campanaId: origenCampanaId },
    });
    if (preciosOrigen.length === 0) return { copiados: 0 };

    const data = preciosOrigen.map(p => ({
      productoId: p.productoId,
      campanaId: destinoCampanaId,
      precioContado: p.precioContado,
      precioRevendedora: p.precioRevendedora,
      precioCredito: p.precioCredito,
      precioOferta: p.precioOferta,
      esOferta: p.esOferta,
      bonificacion: p.bonificacion,
    }));

    await prisma.precioProducto.createMany({ data, skipDuplicates: true });
    return { copiados: data.length };
  }
}

export const campanasService = new CampanasService();