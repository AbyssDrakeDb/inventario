import prisma from '../../shared/prisma/client';

export class ProductosService {
  async listar(params: { marcaId?: number; categoriaId?: number; activo?: boolean; busqueda?: string }) {
    const where: any = {};
    if (params.marcaId) where.marcaId = params.marcaId;
    if (params.categoriaId) where.categoriaId = params.categoriaId;
    if (params.activo !== undefined) where.activo = params.activo;
    if (params.busqueda) {
      where.OR = [
        { codigo: { contains: params.busqueda, mode: 'insensitive' } },
        { nombre: { contains: params.busqueda, mode: 'insensitive' } },
      ];
    }
    return prisma.producto.findMany({
      where,
      include: { marca: true, categoria: true, stockActual: true },
      orderBy: [{ marcaId: 'asc' }, { codigo: 'asc' }],
    });
  }

  async obtener(id: number) {
    const p = await prisma.producto.findUnique({
      where: { id },
      include: { marca: true, categoria: true, stockActual: true },
    });
    if (!p) throw new Error('Producto no encontrado');
    return p;
  }

  async buscarPorCodigo(marcaId: number, codigo: string) {
    return prisma.producto.findUnique({
      where: { marcaId_codigo: { marcaId, codigo } },
      include: { marca: true, categoria: true, stockActual: true },
    });
  }

  async crear(data: {
    marcaId: number; codigo: string; nombre: string; descripcion?: string;
    categoriaId?: number; presentacion?: string; stockMinimo?: number;
  }) {
    const existente = await prisma.producto.findUnique({
      where: { marcaId_codigo: { marcaId: data.marcaId, codigo: data.codigo } },
    });
    if (existente) throw new Error(`El código "${data.codigo}" ya existe en esta marca`);
    return prisma.producto.create({ data, include: { marca: true, categoria: true } });
  }

  async actualizar(id: number, data: any) {
    const actual = await this.obtener(id);
    if (data.codigo && data.codigo !== actual.codigo) {
      const existente = await prisma.producto.findUnique({
        where: { marcaId_codigo: { marcaId: actual.marcaId, codigo: data.codigo } },
      });
      if (existente) throw new Error(`El código "${data.codigo}" ya existe en esta marca`);
    }
    return prisma.producto.update({ where: { id }, data, include: { marca: true, categoria: true, stockActual: true } });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    return prisma.producto.update({ where: { id }, data: { activo: false } });
  }
}

export const productosService = new ProductosService();