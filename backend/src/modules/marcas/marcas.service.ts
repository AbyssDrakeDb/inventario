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
}

export const marcasService = new MarcasService();