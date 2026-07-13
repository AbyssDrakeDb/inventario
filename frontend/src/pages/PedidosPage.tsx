import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Pedido, Cliente, Campana, RevistaItem } from '../types';
import toast from 'react-hot-toast';
import { Plus, Search, X, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { Money } from '../components/Money';

export default function PedidosPage() {
  const queryClient = useQueryClient();
  const [showNuevo, setShowNuevo] = useState(false);
  const [campanaFilter, setCampanaFilter] = useState<number | ''>('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Form for new order
  const [tipoPedido, setTipoPedido] = useState<'campana' | 'directa'>('campana');
  const [clienteId, setClienteId] = useState(0);
  const [campanaId, setCampanaId] = useState(0);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [items, setItems] = useState<Array<{ productoId: number; codigo: string; nombre: string; cantidad: number; precioContado: number; precioRevendedora: number }>>([]);
  const [conPago, setConPago] = useState(false);
  const [tipoPago, setTipoPago] = useState<'completo' | 'parcial' | 'credito'>('completo');
  const [montoPago, setMontoPago] = useState(0);

  const { data: pedidos, isLoading } = useQuery<Pedido[]>({
    queryKey: ['pedidos', campanaFilter, estadoFilter],
    queryFn: () => api.get('/pedidos', { params: { campanaId: campanaFilter || undefined, estado: estadoFilter || undefined } }).then(r => r.data),
  });

  const { data: clientes } = useQuery<Cliente[]>({ queryKey: ['clientes'], queryFn: () => api.get('/clientes').then(r => r.data) });
  const { data: campanas } = useQuery<Campana[]>({ queryKey: ['campanas'], queryFn: () => api.get('/campanas', { params: { estado: 'abierta' } }).then(r => r.data) });

  // Stock disponible para venta directa
  const { data: stockDisponible } = useQuery<any[]>({
    queryKey: ['stock-venta-directa'],
    queryFn: () => api.get('/inventario/stock').then(r => r.data),
    enabled: tipoPedido === 'directa' && showNuevo,
  });

  const { data: revista } = useQuery<RevistaItem[]>({
    queryKey: ['revista', campanaId],
    queryFn: () => api.get(`/precios/revista/${campanaId}`).then(r => r.data),
    enabled: campanaId > 0 && tipoPedido === 'campana',
  });

  const createMutation = useMutation({
    mutationFn: (data: { clienteId: number; campanaId: number; items: Array<{ productoId: number; cantidad: number }> }) =>
      api.post('/pedidos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowNuevo(false); resetForm(); toast.success('Pedido creado');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const ventaDirectaMutation = useMutation({
    mutationFn: (data: { clienteId: number; items: Array<{ productoId: number; cantidad: number; precioUnitario: number }>; pago?: any }) =>
      api.post('/pedidos/venta-directa', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-venta-directa'] });
      setShowNuevo(false); resetForm(); toast.success('Venta directa registrada');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/pedidos/${id}/cancelar`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); toast.success('Pedido cancelado'); },
  });

  const resetForm = () => {
    setClienteId(0); setCampanaId(0); setBusquedaProd(''); setItems([]);
    setTipoPedido('campana'); setConPago(false); setTipoPago('completo'); setMontoPago(0);
  };

  const addItem = (item: { productoId: number; codigo: string; nombre: string; precioContado: number }) => {
    const existe = items.find(i => i.productoId === item.productoId);
    if (existe) {
      setItems(items.map(i => i.productoId === item.productoId ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setItems([...items, {
        productoId: item.productoId,
        codigo: item.codigo,
        nombre: item.nombre,
        cantidad: 1,
        precioContado: item.precioContado,
        precioRevendedora: item.precioContado,
      }]);
    }
    toast.success(`Agregado: ${item.codigo}`);
  };

  const totalContado = items.reduce((s, i) => s + i.precioContado * i.cantidad, 0);
  const gananciaDirecta = items.reduce((s, i) => s + (i.precioContado - i.precioRevendedora) * i.cantidad, 0);

  const estadoColor = (e: string) => {
    const map: Record<string, string> = {
      'borrador': 'bg-gray-100 text-gray-600', 'confirmado': 'bg-blue-50 text-blue-700',
      'enviado_a_marca': 'bg-purple-50 text-purple-700', 'parcial': 'bg-yellow-50 text-yellow-700',
      'recibido': 'bg-green-50 text-green-700', 'entregado': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-50 text-red-500',
    };
    return map[e] || '';
  };

  const handleCrearPedido = () => {
    if (!clienteId || items.length === 0) {
      toast.error('Complete todos los campos');
      return;
    }
    if (tipoPedido === 'directa') {
      ventaDirectaMutation.mutate({
        clienteId,
        items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, precioUnitario: i.precioContado })),
        pago: conPago ? {
          tipo: tipoPago,
          monto: tipoPago === 'credito' ? 0 : (tipoPago === 'completo' ? totalContado : montoPago),
          notas: 'Venta directa',
        } : undefined,
      });
    } else {
      if (!campanaId) { toast.error('Seleccione una campaña'); return; }
      createMutation.mutate({
        clienteId,
        campanaId,
        items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      });
    }
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Pedidos</h2>
        <button onClick={() => { resetForm(); setShowNuevo(true); }} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={campanaFilter} onChange={e => setCampanaFilter(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas las campañas</option>
          {campanas?.map(c => <option key={c.id} value={c.id}>{c.marca?.nombre} C{c.numero}</option>)}
        </select>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="confirmado">Confirmado</option>
          <option value="enviado_a_marca">Enviado a marca</option>
          <option value="parcial">Parcial</option>
          <option value="recibido">Recibido</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista de pedidos */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
              <th className="px-4 py-2 font-medium text-gray-600">Cliente</th>
              <th className="px-4 py-2 font-medium text-gray-600">Campaña</th>
              <th className="px-4 py-2 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-right">Total</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-right">Ganancia</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {pedidos?.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs">{new Date(p.fecha).toLocaleDateString('es-PE')}</td>
                <td className="px-4 py-2.5">{p.cliente?.nombre}</td>
                <td className="px-4 py-2.5 text-xs">
                  {(p as any).tipo === 'directa' ? (
                    <span className="text-purple-600 font-medium">Venta directa</span>
                  ) : (
                    <>{p.campana?.marca?.nombre} C{p.campana?.numero}</>
                  )}
                </td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor(p.estado)}`}>{p.estado.replace(/_/g, ' ')}</span></td>
                <td className="px-4 py-2.5 text-right"><Money amount={Number(p.totalContado)} /></td>
                <td className="px-4 py-2.5 text-right font-medium text-green-600"><Money amount={Number(p.ganancia)} /></td>
                <td className="px-4 py-2.5">
                  {['confirmado', 'borrador'].includes(p.estado) && (
                    <button onClick={() => cancelMutation.mutate(p.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><X size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Nuevo pedido */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4">
            <h3 className="font-bold text-lg">Nuevo pedido</h3>

            {/* Toggle tipo de pedido */}
            <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
              <button
                onClick={() => { setTipoPedido('campana'); setCampanaId(0); setBusquedaProd(''); }}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${tipoPedido === 'campana' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Pedido por campaña
              </button>
              <button
                onClick={() => { setTipoPedido('directa'); setCampanaId(0); setBusquedaProd(''); }}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${tipoPedido === 'directa' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Package size={14} className="inline mr-1" /> Venta directa
              </button>
            </div>

            {/* Cliente (siempre visible) */}
            <div>
              <label className="text-xs text-gray-500">Cliente</label>
              <select value={clienteId} onChange={e => setClienteId(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value={0}>Seleccionar...</option>
                {clientes?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Campaña selector (solo para pedido por campaña) */}
            {tipoPedido === 'campana' && (
              <div>
                <label className="text-xs text-gray-500">Campaña</label>
                <select value={campanaId} onChange={e => setCampanaId(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value={0}>Seleccionar...</option>
                  {campanas?.map(c => <option key={c.id} value={c.id}>{c.marca?.nombre} — C{c.numero}</option>)}
                </select>
              </div>
            )}

            {/* Buscador de productos */}
            {tipoPedido === 'campana' && campanaId > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Buscar en revista</p>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="Buscar por código o nombre..." value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none" />
                </div>
                {revista && (
                  <div className="mt-2 max-h-40 overflow-auto border rounded-lg divide-y">
                    {revista.filter(r => !busquedaProd || r.codigo.toLowerCase().includes(busquedaProd.toLowerCase()) || r.nombre.toLowerCase().includes(busquedaProd.toLowerCase())).slice(0, 10).map(r => (
                      <button key={r.id} onClick={() => addItem(r)} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between text-sm">
                        <span><span className="font-mono text-xs">{r.codigo}</span> — {r.nombre}</span>
                        <span className="text-green-600"><Money amount={r.precioContado} /></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tipoPedido === 'directa' && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Buscar producto en stock disponible</p>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="Buscar por código o nombre..." value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none" />
                </div>
                {stockDisponible && (
                  <div className="mt-2 max-h-40 overflow-auto border rounded-lg divide-y">
                    {stockDisponible
                      .filter((s: any) => s.stockDisponible > 0)
                      .filter((s: any) => !busquedaProd || s.codigo.toLowerCase().includes(busquedaProd.toLowerCase()) || s.nombre.toLowerCase().includes(busquedaProd.toLowerCase()))
                      .slice(0, 10)
                      .map((s: any) => (
                        <button key={s.productoId} onClick={() => addItem({ productoId: s.productoId, codigo: s.codigo, nombre: s.nombre, precioContado: 0 })} className="w-full text-left px-3 py-2 hover:bg-purple-50 flex justify-between text-sm">
                          <span>
                            <span className="font-mono text-xs">{s.codigo}</span> — {s.nombre}
                            <span className="text-xs text-gray-400 ml-2">disp: {s.stockDisponible}</span>
                          </span>
                          <span className="text-purple-600 text-xs">Precio manual</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Ítems agregados */}
            {items.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Ítems del pedido</h4>
                <table className="w-full text-sm border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-xs">Código</th>
                      <th className="px-3 py-1.5 text-left text-xs">Producto</th>
                      <th className="px-3 py-1.5 text-right text-xs">Cant.</th>
                      <th className="px-3 py-1.5 text-right text-xs">P. Unit</th>
                      <th className="px-3 py-1.5 text-right text-xs">Subtotal</th>
                      <th className="px-3 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-1.5 font-mono text-xs">{item.codigo}</td>
                        <td className="px-3 py-1.5 text-xs">{item.nombre}</td>
                        <td className="px-3 py-1.5 text-right">
                          <input type="number" value={item.cantidad} min={1} onChange={e => {
                            const cant = Number(e.target.value);
                            setItems(items.map((i, j) => j === idx ? { ...i, cantidad: cant } : i));
                          }} className="w-14 text-center border rounded text-xs py-0.5" />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {tipoPedido === 'directa' ? (
                            <input type="number" value={item.precioContado} min={1} onChange={e => {
                              const precio = Number(e.target.value);
                              setItems(items.map((i, j) => j === idx ? { ...i, precioContado: precio, precioRevendedora: precio } : i));
                            }} className="w-20 text-center border rounded text-xs py-0.5" />
                          ) : (
                            <span className="text-xs"><Money amount={item.precioContado} /></span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-medium"><Money amount={item.precioContado * item.cantidad} /></td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => setItems(items.filter((_, j) => j !== idx))} className="text-red-400"><X size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="mt-3 text-sm space-y-1 text-right">
                  <p>Total: <strong><Money amount={totalContado} /></strong></p>
                  {tipoPedido === 'campana' && (
                    <>
                      <p className="text-gray-500">Costo: <Money amount={items.reduce((s, i) => s + i.precioRevendedora * i.cantidad, 0)} /></p>
                      <p className="text-green-600 font-bold">Ganancia: <Money amount={items.reduce((s, i) => s + (i.precioContado - i.precioRevendedora) * i.cantidad, 0)} /></p>
                    </>
                  )}
                </div>

                {/* Opción de pago para venta directa */}
                {tipoPedido === 'directa' && (
                  <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={conPago} onChange={e => setConPago(e.target.checked)} className="accent-purple-600" />
                      <span className="font-medium">Registrar pago ahora</span>
                    </label>
                    {conPago && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          {(['completo', 'parcial', 'credito'] as const).map(t => (
                            <label key={t} className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-lg border text-xs cursor-pointer ${tipoPago === t ? 'border-purple-500 bg-purple-50' : 'hover:bg-gray-100'}`}>
                              <input type="radio" name="tipoPagoDirecta" checked={tipoPago === t} onChange={() => { setTipoPago(t); setMontoPago(t === 'completo' ? totalContado : 0); }} className="sr-only" />
                              {t === 'completo' ? 'Completo' : t === 'parcial' ? 'Parcial' : 'Crédito'}
                            </label>
                          ))}
                        </div>
                        {tipoPago === 'parcial' && (
                          <input type="number" value={montoPago} min={1} max={totalContado} onChange={e => setMontoPago(Number(e.target.value))} placeholder="Monto a recibir" className="w-full border rounded px-3 py-1.5 text-sm" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowNuevo(false); resetForm(); }} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleCrearPedido} disabled={createMutation.isPending || ventaDirectaMutation.isPending || items.length === 0} className={`px-4 py-2 rounded-lg text-sm disabled:opacity-50 ${tipoPedido === 'directa' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                <ShoppingCart size={16} className="inline mr-1" />
                {tipoPedido === 'directa' ? 'Realizar venta directa' : 'Crear pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}