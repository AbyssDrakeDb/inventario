export interface Marca {
  id: number;
  nombre: string;
  slug: string;
  color: string | null;
  activa: boolean;
  createdAt: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  marcaId: number | null;
  marca?: Marca;
}

export interface Producto {
  id: number;
  marcaId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number | null;
  presentacion: string | null;
  stockMinimo: number;
  activo: boolean;
  marca?: Marca;
  categoria?: Categoria;
  stockActual?: StockActual;
}

export interface Campana {
  id: number;
  marcaId: number;
  numero: number;
  nombre: string | null;
  fechaInicio: string;
  fechaFinVigencia: string;
  fechaPedidoMarca: string | null;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  marca?: Marca;
  _count?: { precios: number; pedidos: number };
}

export interface PrecioProducto {
  id: number;
  productoId: number;
  campanaId: number;
  precioContado: number;
  precioRevendedora: number;
  precioCredito: number | null;
  precioOferta: number | null;
  esOferta: boolean;
  bonificacion: number | null;
  producto?: Producto;
  campana?: Campana;
}

export interface RevistaItem {
  id: number;
  productoId: number;
  codigo: string;
  nombre: string;
  marca: string;
  categoria: string | null;
  presentacion: string | null;
  precioContado: number;
  precioRevendedora: number;
  precioCredito: number | null;
  precioOferta: number | null;
  esOferta: boolean;
  gananciaUnitaria: number;
  margenPorcentaje: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
  saldo: number;
  _count?: { pedidos: number };
}

export interface Pedido {
  id: number;
  clienteId: number;
  campanaId: number;
  fecha: string;
  estado: PedidoEstado;
  estadoPago?: EstadoPago;
  totalContado: number;
  totalRevendedora: number;
  ganancia: number;
  cliente?: Cliente;
  campana?: Campana;
  items?: PedidoItem[];
  pagos?: Pago[];
}

export type PedidoEstado =
  | 'borrador'
  | 'confirmado'
  | 'enviado_a_marca'
  | 'parcial'
  | 'recibido'
  | 'entregado'
  | 'cancelado';

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado' | 'credito';

export interface PedidoItem {
  id: number;
  pedidoId: number;
  productoId: number;
  cantidad: number;
  cantidadEntregada: number;
  cantidadRecibida?: number;
  cantidadFaltante: number;
  precioContadoUnit: number;
  precioRevendedoraUnit: number;
  subtotalContado: number;
  subtotalRevendedora: number;
  estadoItem: string;
  producto?: Producto;
}

export interface StockActual {
  productoId: number;
  cantidad: number;
  comprometida: number;
}

export interface StockVista {
  productoId: number;
  codigo: string;
  nombre: string;
  marca: string;
  categoria: string | null;
  presentacion: string | null;
  stockMinimo: number;
  stockActual: number;
  stockComprometido: number;
  stockDisponible: number;
}

export interface MovimientoInventario {
  id: number;
  productoId: number;
  tipo: string;
  cantidad: number;
  costoUnitario: number | null;
  motivo: string | null;
  fecha: string;
  pedidoId: number | null;
  campanaId: number | null;
  producto?: Producto;
  campana?: Campana;
  pedido?: Pedido;
}

export interface PedidoMarca {
  id: number;
  campanaId: number;
  fechaEnvio: string;
  estado: string;
  totalRevendedora: number;
  items?: PedidoMarcaItem[];
  campana?: Campana;
}

export interface PedidoMarcaItem {
  id: number;
  pedidoMarcaId: number;
  productoId: number;
  cantidadPedida: number;
  cantidadRecibida: number;
  producto?: Producto;
}

export interface Pago {
  id: number;
  clienteId: number;
  pedidoId: number | null;
  fecha: string;
  monto: number;
  tipo: string;
  notas: string | null;
  cuotas?: number;
  montoPorCuota?: number | null;
  pedido?: Pedido;
}

export interface CuentaCorriente {
  id: number;
  nombre: string;
  telefono: string | null;
  saldo: number;
  totalPedidos: number;
  ultimoPago: Pago | null;
  pedidosPendientes: Array<{
    id: number;
    campana: string;
    fecha: string;
    totalContado: number;
    estadoPago: string;
  }>;
}

export interface DashboardData {
  campanasActivas: number;
  pedidosPendientes: number;
  alertasCount: number;
  stockTotal: number;
  deudaPendiente: number;
  ventasMes: {
    totalContado: number;
    totalRevendedora: number;
    ganancia: number;
  };
  alertas: StockVista[];
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  configuraciones?: Configuracion[];
}

export interface Configuracion {
  id: number;
  monedaSimbolo: string;
  monedaDecimales: number;
  pais: string;
}