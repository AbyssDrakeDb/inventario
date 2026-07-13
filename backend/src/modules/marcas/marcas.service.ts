import prisma from '../../shared/prisma/client';

export class MarcasService {
  async listar() {
    return prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
  }

  async obtener(id: number) {
    const marca = await prisma.marca.findUnique({ where: { id } });
    if (!marca) throw new Error('Marca no encontrada');
    return marca;
  }

  async crear(data: { nombre: string; slug: string; color?: string }) {
    return prisma.marca.create({ data });
  }

  async actualizar(id: number, data: { nombre?: string; slug?: string; color?: string; activa?: boolean }) {
    await this.obtener(id);
    return prisma.marca.update({ where: { id }, data });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    return prisma.marca.update({ where: { id }, data: { activa: false } });
  }

  async nextCode(id: number) {
    const marca = await this.obtener(id);
    const prefijo = marca.codigoPrefijo || '';
    const ultimo = await prisma.producto.findFirst({
      where: { marcaId: id, codigo: { startsWith: prefijo } },
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    });
    let sig = 1;
    if (ultimo) {
      const n = parseInt(ultimo.codigo.replace(prefijo, ''), 10);
      if (!isNaN(n)) sig = n + 1;
    }
    return { prefijo, codigo: `${prefijo}${String(sig).padStart(3, '0')}`, siguiente: sig };
  }
}

export const marcasService = new MarcasService();