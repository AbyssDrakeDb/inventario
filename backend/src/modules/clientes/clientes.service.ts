import prisma from '../../shared/prisma/client';

export class ClientesService {
  async listar(busqueda?: string) {
    const where: any = {};
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { telefono: { contains: busqueda, mode: 'insensitive' } },
        { ciudad: { contains: busqueda, mode: 'insensitive' } },
      ];
    }
    return prisma.cliente.findMany({
      where,
      include: { _count: { select: { pedidos: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: number) {
    const c = await prisma.cliente.findUnique({
      where: { id },
      include: {
        pedidos: {
          include: { campana: { include: { marca: true } }, items: true },
          orderBy: { fecha: 'desc' },
        },
        pagos: { orderBy: { fecha: 'desc' } },
      },
    });
    if (!c) throw new Error('Cliente no encontrado');
    return c;
  }

  async crear(data: { nombre: string; telefono?: string; direccion?: string; ciudad?: string; notas?: string }) {
    return prisma.cliente.create({ data });
  }

  async actualizar(id: number, data: any) {
    await this.obtener(id);
    return prisma.cliente.update({ where: { id }, data });
  }

  async cuentasCorrientes() {
    const clientes = await prisma.cliente.findMany({
      where: { saldo: { gt: 0 } },
      orderBy: { saldo: 'desc' },
      include: {
        _count: { select: { pedidos: true } },
        pagos: { orderBy: { fecha: 'desc' }, take: 5 },
        pedidos: {
          where: { estado: 'entregado', estadoPago: { not: 'pagado' } },
          orderBy: { fecha: 'desc' },
          include: { campana: { include: { marca: true } } },
        },
      },
    });

    return clientes.map(c => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      saldo: Number(c.saldo),
      totalPedidos: c._count.pedidos,
      ultimoPago: c.pagos[0] || null,
      pedidosPendientes: c.pedidos.map(p => ({
        id: p.id,
        campana: `${p.campana?.marca?.nombre} C${p.campana?.numero}`,
        fecha: p.fecha,
        totalContado: Number(p.totalContado),
        estadoPago: p.estadoPago,
      })),
    }));
  }
}

export const clientesService = new ClientesService();