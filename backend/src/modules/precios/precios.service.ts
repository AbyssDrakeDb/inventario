import prisma from '../../shared/prisma/client';

export class PreciosService {
  async listarPorCampana(campanaId: number) {
    return prisma.precioProducto.findMany({
      where: { campanaId },
      include: {
        producto: {
          include: { marca: true, categoria: true },
        },
      },
      orderBy: { producto: { codigo: 'asc' } },
    });
  }

  async obtener(id: number) {
    const p = await prisma.precioProducto.findUnique({
      where: { id },
      include: { producto: { include: { marca: true } }, campana: { include: { marca: true } } },
    });
    if (!p) throw new Error('Precio no encontrado');
    return p;
  }

  async upsert(data: {
    productoId: number; campanaId: number; precioContado: number;
    precioRevendedora: number; precioCredito?: number; precioOferta?: number;
    esOferta?: boolean; bonificacion?: number;
  }) {
    return prisma.precioProducto.upsert({
      where: { productoId_campanaId: { productoId: data.productoId, campanaId: data.campanaId } },
      create: data,
      update: data,
      include: { producto: true, campana: true },
    });
  }

  async upsertBatch(items: Array<{
    productoId: number; campanaId: number; precioContado: number;
    precioRevendedora: number; precioCredito?: number; precioOferta?: number;
    esOferta?: boolean; bonificacion?: number;
  }>) {
    const results = [];
    for (const item of items) {
      results.push(await this.upsert(item));
    }
    return results;
  }

  async eliminar(id: number) {
    await this.obtener(id);
    return prisma.precioProducto.delete({ where: { id } });
  }

  async getRevista(campanaId: number) {
    const precios = await this.listarPorCampana(campanaId);
    return precios.map(p => ({
      id: p.id,
      productoId: p.productoId,
      codigo: p.producto.codigo,
      nombre: p.producto.nombre,
      marca: p.producto.marca.nombre,
      categoria: p.producto.categoria?.nombre,
      presentacion: p.producto.presentacion,
      precioContado: Number(p.precioContado),
      precioRevendedora: Number(p.precioRevendedora),
      precioCredito: p.precioCredito ? Number(p.precioCredito) : null,
      precioOferta: p.precioOferta ? Number(p.precioOferta) : null,
      esOferta: p.esOferta,
      gananciaUnitaria: Number(p.precioContado) - Number(p.precioRevendedora),
      margenPorcentaje: Number(p.precioRevendedora) > 0
        ? ((Number(p.precioContado) - Number(p.precioRevendedora)) / Number(p.precioContado) * 100).toFixed(1)
        : '0.0',
    }));
  }
}

export const preciosService = new PreciosService();