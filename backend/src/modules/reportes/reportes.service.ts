import prisma from '../../shared/prisma/client';
import { inventarioService } from '../inventario/inventario.service';

export class ReportesService {
  async ventasPorCampana(campanaId: number) {
    const pedidos = await prisma.pedido.findMany({
      where: { campanaId, estado: { not: 'cancelado' } },
      include: {
        items: { include: { producto: true } },
        cliente: true,
      },
    });

    const totalContado = pedidos.reduce((sum, p) => sum + Number(p.totalContado), 0);
    const totalRevendedora = pedidos.reduce((sum, p) => sum + Number(p.totalRevendedora), 0);
    const gananciaTotal = totalContado - totalRevendedora;

    const porProducto = new Map<number, { codigo: string; nombre: string; cantidad: number; contado: number; revendedora: number }>();
    for (const pedido of pedidos) {
      for (const item of pedido.items) {
        const existente = porProducto.get(item.productoId) || {
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
          cantidad: 0,
          contado: 0,
          revendedora: 0,
        };
        existente.cantidad += item.cantidad;
        existente.contado += Number(item.subtotalContado);
        existente.revendedora += Number(item.subtotalRevendedora);
        porProducto.set(item.productoId, existente);
      }
    }

    const productos = Array.from(porProducto.values()).map(p => ({
      ...p,
      ganancia: p.contado - p.revendedora,
      margen: p.contado > 0 ? ((p.contado - p.revendedora) / p.contado * 100).toFixed(1) : '0',
    })).sort((a, b) => b.cantidad - a.cantidad);

    return {
      campanaId,
      pedidosCount: pedidos.length,
      totalContado,
      totalRevendedora,
      gananciaTotal,
      margenPromedio: totalContado > 0 ? ((gananciaTotal / totalContado) * 100).toFixed(1) : '0',
      productos,
    };
  }

  async ventasPorMarca(marcaId: number) {
    const campanas = await prisma.campana.findMany({ where: { marcaId } });
    const resultados = [];
    for (const c of campanas) {
      resultados.push(await this.ventasPorCampana(c.id));
    }
    return {
      marcaId,
      campanas: resultados,
      totalContado: resultados.reduce((s, r) => s + r.totalContado, 0),
      totalRevendedora: resultados.reduce((s, r) => s + r.totalRevendedora, 0),
      gananciaTotal: resultados.reduce((s, r) => s + r.gananciaTotal, 0),
    };
  }

  async faltantesPorCampana(campanaId: number) {
    const items = await prisma.pedidoItem.findMany({
      where: {
        pedido: { campanaId },
        cantidadFaltante: { gt: 0 },
      },
      include: {
        producto: true,
        pedido: { include: { cliente: true } },
      },
    });

    return items.map(i => ({
      productoId: i.productoId,
      codigo: i.producto.codigo,
      nombre: i.producto.nombre,
      pedidoId: i.pedidoId,
      cliente: i.pedido.cliente.nombre,
      cantidadPedida: i.cantidad,
      cantidadFaltante: i.cantidadFaltante,
    }));
  }

  async topProductos(marcaId?: number, limit: number = 10) {
    const wherePedido: any = { estado: { not: 'cancelado' } };
    if (marcaId) wherePedido.campana = { marcaId };

    const items = await prisma.pedidoItem.groupBy({
      by: ['productoId'],
      where: { pedido: wherePedido },
      _sum: { cantidad: true, subtotalContado: true, subtotalRevendedora: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit,
    });

    const productoIds = items.map(i => i.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      include: { marca: true },
    });
    const prodMap = new Map(productos.map(p => [p.id, p]));

    return items.map(i => {
      const p = prodMap.get(i.productoId)!;
      const contado = Number(i._sum.subtotalContado || 0);
      const revendedora = Number(i._sum.subtotalRevendedora || 0);
      return {
        productoId: i.productoId,
        codigo: p.codigo,
        nombre: p.nombre,
        marca: p.marca.nombre,
        cantidadVendida: i._sum.cantidad || 0,
        totalContado: contado,
        ganancia: contado - revendedora,
      };
    });
  }

  async stockValorizado() {
    const stock = await prisma.stockActual.findMany({
      where: { cantidad: { gt: 0 } },
      include: { producto: { include: { marca: true } } },
    });

    const preciosRecientes = await prisma.precioProducto.findMany({
      where: { productoId: { in: stock.map(s => s.productoId) } },
      orderBy: { campanaId: 'desc' },
    });

    const ultimoPrecioMap = new Map<number, number>();
    for (const p of preciosRecientes) {
      if (!ultimoPrecioMap.has(p.productoId)) {
        ultimoPrecioMap.set(p.productoId, Number(p.precioRevendedora));
      }
    }

    const items = stock.map(s => {
      const costoUnit = ultimoPrecioMap.get(s.productoId) || 0;
      return {
        productoId: s.productoId,
        codigo: s.producto.codigo,
        nombre: s.producto.nombre,
        marca: s.producto.marca.nombre,
        cantidad: s.cantidad,
        costoUnitario: costoUnit,
        valorTotal: costoUnit * s.cantidad,
      };
    });

    const valorTotal = items.reduce((s, i) => s + i.valorTotal, 0);
    return { items, valorTotal };
  }

  async dashboard() {
    const [campanasActivas, pedidosPendientes, alertas, stockTotal, deudaTotal] = await Promise.all([
      prisma.campana.count({ where: { estado: 'abierta' } }),
      prisma.pedido.count({ where: { estado: { in: ['confirmado', 'enviado_a_marca', 'parcial', 'recibido'] } } }),
      inventarioService.getAlertas(),
      prisma.stockActual.aggregate({ _sum: { cantidad: true } }),
      prisma.cliente.aggregate({
        where: { saldo: { gt: 0 } },
        _sum: { saldo: true },
      }),
    ]);

    // Ventas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const pedidosMes = await prisma.pedido.aggregate({
      where: { fecha: { gte: inicioMes }, estado: { not: 'cancelado' } },
      _sum: { totalContado: true, totalRevendedora: true, ganancia: true },
    });

    return {
      campanasActivas,
      pedidosPendientes,
      alertasCount: alertas.length,
      stockTotal: stockTotal._sum.cantidad || 0,
      deudaPendiente: Number(deudaTotal._sum.saldo || 0),
      ventasMes: {
        totalContado: Number(pedidosMes._sum.totalContado || 0),
        totalRevendedora: Number(pedidosMes._sum.totalRevendedora || 0),
        ganancia: Number(pedidosMes._sum.ganancia || 0),
      },
      alertas: alertas.slice(0, 5),
    };
  }
}

export const reportesService = new ReportesService();