import prisma from '../../shared/prisma/client';

export class CategoriasService {
  async listar(marcaId?: number) {
    return prisma.categoria.findMany({
      where: marcaId ? { marcaId } : undefined,
      include: { marca: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: number) {
    const c = await prisma.categoria.findUnique({ where: { id }, include: { marca: true } });
    if (!c) throw new Error('Categoría no encontrada');
    return c;
  }

  async crear(data: { nombre: string; marcaId?: number }) {
    return prisma.categoria.create({ data, include: { marca: true } });
  }

  async actualizar(id: number, data: { nombre?: string; marcaId?: number }) {
    await this.obtener(id);
    return prisma.categoria.update({ where: { id }, data, include: { marca: true } });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    return prisma.categoria.delete({ where: { id } });
  }
}

export const categoriasService = new CategoriasService();