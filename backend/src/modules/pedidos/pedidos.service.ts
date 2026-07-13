import prisma from '../../shared/prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

export class PedidosService {
  async listar(params: { clienteId?: number; campanaId?: number; estado?: string }) {
    const where: any = {};
    if (params.clienteId) where.clienteId = params.clienteId;
    if (params.campanaId) where.campanaId = params.campanaId;
    if (params.estado) {
      const estados = params.estado.split(',').filter(Boolean);
      where.estado = estados.length === 1 ? estados[0] : { in: estados };
    }

    return prisma.pedido.findMany({
      where,
      include: {
        cliente: true,
        campana: { include: { marca: true } },
        items: { include: { producto: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async obtener(id: number) {
    const p = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        campana: { include: { marca: true } },
        items: {
          include: { producto: { include: { marca: true } } },
        },
      },
    });
    if (!p) throw new Error('Pedido no encontrado');
    return p;
  }

  async crear(data: {
    clienteId: number;
    campanaId: number;
    items: Array<{
      productoId: number;
      cantidad: number;
    }>;
  }) {
    // Validar que la campaña existe y está abierta
    const campana = await prisma.campana.findUnique({ where: { id: data.campanaId } });
    if (!campana) throw new Error('Campaña no encontrada');
    if (campana.estado !== 'abierta') throw new Error('La campaña no está abierta');

    // Obtener precios de la campaña para cada producto
    const precios = await prisma.precioProducto.findMany({
      where: {
        campanaId: data.campanaId,
        productoId: { in: data.items.map(i => i.productoId) },
      },
    });

    const precioMap = new Map(precios.map(p => [p.productoId, p]));

    let totalContado = 0;
    let totalRevendedora = 0;

    const itemsData = data.items.map(item => {
      const precio = precioMap.get(item.productoId);
      if (!precio) throw new Error(`Producto ${item.productoId} sin precio en esta campaña`);

      const subtotalContado = Number(precio.precioContado) * item.cantidad;
      const subtotalRevendedora = Number(precio.precioRevendedora) * item.cantidad;

      totalContado += subtotalContado;
      totalRevendedora += subtotalRevendedora;

      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioContadoUnit: precio.precioContado,
        precioRevendedoraUnit: precio.precioRevendedora,
        subtotalContado,
        subtotalRevendedora,
      };
    });

    const ganancia = totalContado - totalRevendedora;

    // Crear pedido y actualizar stock comprometido en transacción
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          clienteId: data.clienteId,
          campanaId: data.campanaId,
          estado: 'confirmado',
          totalContado,
          totalRevendedora,
          ganancia,
          items: { create: itemsData },
        },
        include: {
          cliente: true,
          campana: { include: { marca: true } },
          items: { include: { producto: true } },
        },
      });

      // Actualizar stock comprometido
      for (const item of data.items) {
        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: 0, comprometida: item.cantidad },
          update: { comprometida: { increment: item.cantidad } },
        });
      }

      return pedido;
    });
  }

  async actualizarEstado(id: number, estado: string) {
    const pedido = await this.obtener(id);
    const transicionesValidas: Record<string, string[]> = {
      'borrador': ['confirmado', 'cancelado'],
      'confirmado': ['enviado_a_marca', 'cancelado'],
      'enviado_a_marca': ['parcial', 'recibido'],
      'parcial': ['entregado', 'cancelado'],
      'recibido': ['entregado'],
    };

    if (!transicionesValidas[pedido.estado]?.includes(estado)) {
      throw new Error(`No se puede pasar de "${pedido.estado}" a "${estado}"`);
    }

    return prisma.pedido.update({ where: { id }, data: { estado } });
  }

  async cancelar(id: number) {
    const pedido = await this.obtener(id);

    return prisma.$transaction(async (tx) => {
      // Liberar stock comprometido
      for (const item of pedido.items) {
        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: 0, comprometida: 0 },
          update: { comprometida: { decrement: item.cantidad - item.cantidadEntregada } },
        });
      }

      return tx.pedido.update({
        where: { id },
        data: { estado: 'cancelado' },
      });
    });
  }

  /** Registra la recepción de mercadería desde la marca: mete stock + actualiza items del pedido */
  async recibirDeMarca(campanaId: number, items: Array<{ productoId: number; cantidadRecibida: number }>) {
    return prisma.$transaction(async (tx) => {
      const resultados: any[] = [];

      for (const item of items) {
        if (item.cantidadRecibida <= 0) continue;

        // 1. Movimiento de entrada en inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'entrada',
            cantidad: item.cantidadRecibida,
            motivo: `Recepción campaña ${campanaId}`,
            campanaId,
          },
        });

        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: item.cantidadRecibida, comprometida: 0 },
          update: { cantidad: { increment: item.cantidadRecibida } },
        });

        // 2. Buscar pedidos que tengan este producto pendiente (confirmados, enviados o parciales)
        const pedidos = await tx.pedido.findMany({
          where: {
            campanaId,
            estado: { in: ['confirmado', 'enviado_a_marca', 'parcial'] },
          },
          include: {
            items: {
              where: { productoId: item.productoId, estadoItem: { in: ['esperando', 'parcial'] } },
              orderBy: { id: 'asc' },
            },
          },
        });

        let restante = item.cantidadRecibida;

        for (const pedido of pedidos) {
          if (restante <= 0) break;

          for (const pedidoItem of pedido.items) {
            if (restante <= 0) break;
            const pendiente = pedidoItem.cantidad - pedidoItem.cantidadRecibida;
            if (pendiente <= 0) continue;

            const aRecibir = Math.min(restante, pendiente);

            await tx.pedidoItem.update({
              where: { id: pedidoItem.id },
              data: {
                cantidadRecibida: { increment: aRecibir },
                cantidadFaltante: pendiente - aRecibir,
                estadoItem: aRecibir >= pendiente ? 'recibido_marca' : 'parcial',
              },
            });

            restante -= aRecibir;
          }

          // 3. Revisar estado del pedido
          const itemsActualizados = await tx.pedidoItem.findMany({ where: { pedidoId: pedido.id } });
          const todosRecibidos = itemsActualizados.every(i => i.cantidadRecibida >= i.cantidad);
          const algunRecibido = itemsActualizados.some(i => i.cantidadRecibida > 0);

          // Si todos los items están completos → recibido
          // Si al menos un item tiene recepción parcial → parcial
          // Sino se queda como está (confirmado/enviado_a_marca)
          if (todosRecibidos) {
            await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'recibido' } });
            resultados.push({ pedidoId: pedido.id, estado: 'recibido' });
          } else if (algunRecibido) {
            await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'parcial' } });
            resultados.push({ pedidoId: pedido.id, estado: 'parcial' });
          }
        }

        if (restante > 0) {
          resultados.push({ productoId: item.productoId, recibido: item.cantidadRecibida, sobrante: restante });
        }
      }

      return { ok: true, resultados };
    });
  }

  /** Marca un pedido como entregado: cambia estado + descuenta stock */
  async entregar(pedidoId: number) {
    const pedido = await this.obtener(pedidoId);

    if (!['recibido', 'parcial'].includes(pedido.estado)) {
      throw new Error(`No se puede entregar un pedido en estado "${pedido.estado}"`);
    }

    return prisma.$transaction(async (tx) => {
      for (const item of pedido.items) {
        const aEntregar = item.cantidad - item.cantidadEntregada;
        if (aEntregar <= 0) continue;

        // Movimiento de salida
        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'salida',
            cantidad: aEntregar,
            motivo: `Entrega pedido #${pedidoId}`,
            pedidoId,
            campanaId: pedido.campanaId,
          },
        });

        // Descontar stock
        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: 0, comprometida: 0 },
          update: {
            cantidad: { decrement: aEntregar },
            comprometida: { decrement: aEntregar },
          },
        });

        // Marcar ítem como entregado
        await tx.pedidoItem.update({
          where: { id: item.id },
          data: {
            cantidadEntregada: { increment: aEntregar },
            cantidadFaltante: 0,
            estadoItem: 'entregado',
          },
        });
      }

      return tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: 'entregado' },
        include: { cliente: true, items: true },
      });
    });
  }

  /** Entrega + registra pago en una sola transacción */
  async entregarConPago(
    pedidoId: number,
    pagoData: { tipo: 'completo' | 'parcial' | 'credito'; monto: number; notas?: string; cuotas?: number },
  ) {
    const pedido = await this.obtener(pedidoId);
    if (!['recibido', 'parcial'].includes(pedido.estado)) {
      throw new Error(`No se puede entregar un pedido en estado "${pedido.estado}"`);
    }
    if (pagoData.monto < 0) throw new Error('El monto no puede ser negativo');
    const cuotas = pagoData.tipo === 'credito' ? (pagoData.cuotas || 1) : 1;
    const montoPorCuota = Number(pedido.totalContado) / cuotas;

    return prisma.$transaction(async (tx) => {
      // 1. Movimientos de inventario (misma lógica que entregar)
      for (const item of pedido.items) {
        const aEntregar = item.cantidad - item.cantidadEntregada;
        if (aEntregar <= 0) continue;

        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'salida',
            cantidad: aEntregar,
            motivo: `Entrega pedido #${pedidoId}`,
            pedidoId,
            campanaId: pedido.campanaId,
          },
        });

        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: 0, comprometida: 0 },
          update: {
            cantidad: { decrement: aEntregar },
            comprometida: { decrement: aEntregar },
          },
        });

        await tx.pedidoItem.update({
          where: { id: item.id },
          data: {
            cantidadEntregada: { increment: aEntregar },
            cantidadFaltante: 0,
            estadoItem: 'entregado',
          },
        });
      }

      // 2. Determinar estadoPago según tipo
      let estadoPago: string;
      if (pagoData.tipo === 'completo') {
        estadoPago = 'pagado';
      } else if (pagoData.tipo === 'parcial') {
        estadoPago = 'parcial';
      } else {
        estadoPago = 'credito';
      }

      // 3. Crear registro de pago
      const totalContado = Number(pedido.totalContado);
      const montoPagado = pagoData.tipo === 'credito' ? 0 : pagoData.monto;

      await tx.pago.create({
        data: {
          clienteId: pedido.clienteId,
          pedidoId,
          monto: montoPagado,
          tipo: pagoData.tipo,
          cuotas: cuotas,
          montoPorCuota: cuotas > 1 ? montoPorCuota : null,
          notas: pagoData.notas || (cuotas > 1 ? `Crédito a ${cuotas} cuota(s) de $${montoPorCuota.toFixed(0)}` : null),
        },
      });

      // 4. Actualizar saldo del cliente
      const nuevoSaldo = totalContado - montoPagado;
      await tx.cliente.update({
        where: { id: pedido.clienteId },
        data: { saldo: { increment: nuevoSaldo } },
      });

      // 5. Actualizar pedido
      return tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: 'entregado', estadoPago },
        include: {
          cliente: true,
          items: { include: { producto: true } },
          pagos: true,
        },
      });
    });
  }

  /** Venta directa sin campaña: crea pedido, descuenta stock y registra pago opcional */
  async crearVentaDirecta(data: {
    clienteId: number;
    items: Array<{ productoId: number; cantidad: number; precioUnitario: number }>;
    pago?: { tipo: 'completo' | 'parcial' | 'credito'; monto: number; notas?: string; cuotas?: number };
  }) {
    return prisma.$transaction(async (tx) => {
      let totalContado = 0;
      let totalRevendedora = 0;

      // Validar stock disponible para cada producto
      for (const item of data.items) {
        const stock = await tx.stockActual.findUnique({ where: { productoId: item.productoId } });
        const disponible = (stock?.cantidad || 0) - (stock?.comprometida || 0);
        if (disponible < item.cantidad) {
          const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
          throw new Error(`Stock insuficiente para ${prod?.codigo || '#' + item.productoId}: disponible ${disponible}, pedido ${item.cantidad}`);
        }

        const subtotal = item.precioUnitario * item.cantidad;
        totalContado += subtotal;
        totalRevendedora += subtotal; // Para venta directa, costo = precio (no hay margen de campaña)
      }

      const ganancia = totalContado - totalRevendedora;

      // Crear pedido
      const pedido = await tx.pedido.create({
        data: {
          clienteId: data.clienteId,
          tipo: 'directa',
          estado: data.pago ? 'entregado' : 'confirmado',
          totalContado,
          totalRevendedora,
          ganancia,
          items: {
            create: data.items.map(item => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              cantidadEntregada: data.pago ? item.cantidad : 0,
              cantidadRecibida: item.cantidad,
              precioContadoUnit: item.precioUnitario,
              precioRevendedoraUnit: item.precioUnitario,
              subtotalContado: item.precioUnitario * item.cantidad,
              subtotalRevendedora: item.precioUnitario * item.cantidad,
              estadoItem: data.pago ? 'entregado' : 'recibido_marca',
            })),
          },
        },
        include: { cliente: true, items: { include: { producto: true } } },
      });

      // Descontar stock inmediatamente
      for (const item of data.items) {
        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'salida',
            cantidad: item.cantidad,
            motivo: `Venta directa pedido #${pedido.id}`,
            pedidoId: pedido.id,
          },
        });

        await tx.stockActual.upsert({
          where: { productoId: item.productoId },
          create: { productoId: item.productoId, cantidad: 0, comprometida: 0 },
          update: {
            cantidad: { decrement: item.cantidad },
          },
        });
      }

      // Si hay pago, registrarlo
      if (data.pago) {
        const cuotas = data.pago.tipo === 'credito' ? (data.pago.cuotas || 1) : 1;
        const montoPorCuota = totalContado / cuotas;

        await tx.pago.create({
          data: {
            clienteId: data.clienteId,
            pedidoId: pedido.id,
            monto: data.pago.tipo === 'credito' ? 0 : data.pago.monto,
            tipo: data.pago.tipo,
            cuotas,
            montoPorCuota: cuotas > 1 ? montoPorCuota : null,
            notas: data.pago.notas || (cuotas > 1 ? `Crédito a ${cuotas} cuota(s)` : null),
          },
        });

        const estadoPago = data.pago.tipo === 'completo' ? 'pagado'
          : data.pago.tipo === 'parcial' ? 'parcial' : 'credito';
        const nuevoSaldo = data.pago.tipo === 'credito' ? totalContado
          : data.pago.tipo === 'parcial' ? (totalContado - data.pago.monto) : 0;

        if (nuevoSaldo > 0) {
          await tx.cliente.update({
            where: { id: data.clienteId },
            data: { saldo: { increment: nuevoSaldo } },
          });
        }

        await tx.pedido.update({
          where: { id: pedido.id },
          data: { estadoPago },
        });
      }

      return pedido;
    });
  }

  /** Registra un abono posterior contra un pedido ya entregado */
  async registrarAbono(pedidoId: number, monto: number, notas?: string) {
    if (monto <= 0) throw new Error('El monto del abono debe ser positivo');

    const pedido = await this.obtener(pedidoId);
    if (pedido.estadoPago === 'pagado') {
      throw new Error('Este pedido ya está pagado');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Crear pago tipo abono
      await tx.pago.create({
        data: {
          clienteId: pedido.clienteId,
          pedidoId,
          monto,
          tipo: 'abono',
          notas: notas || null,
        },
      });

      // 2. Reducir saldo del cliente
      await tx.cliente.update({
        where: { id: pedido.clienteId },
        data: { saldo: { decrement: monto } },
      });

      // 3. Verificar si ya cubrió el total
      const totalPagos = await tx.pago.aggregate({
        where: { pedidoId },
        _sum: { monto: true },
      });
      const totalPagado = Number(totalPagos._sum.monto || 0);

      const nuevoEstadoPago = totalPagado >= Number(pedido.totalContado) ? 'pagado' : pedido.estadoPago;

      return tx.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: nuevoEstadoPago },
        include: { cliente: true, pagos: true },
      });
    });
  }

  /** Registra un abono general contra un cliente (sin pedido específico) */
  async registrarAbonoGeneral(clienteId: number, monto: number, notas?: string) {
    if (monto <= 0) throw new Error('El monto del abono debe ser positivo');

    return prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: {
          clienteId,
          monto,
          tipo: 'abono',
          notas: notas || null,
        },
      });

      await tx.cliente.update({
        where: { id: clienteId },
        data: { saldo: { decrement: monto } },
      });

      return { ok: true, clienteId, nuevoSaldo: (await tx.cliente.findUnique({ where: { id: clienteId } }))?.saldo };
    });
  }
}

export const pedidosService = new PedidosService();