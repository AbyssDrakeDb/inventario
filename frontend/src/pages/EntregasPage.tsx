import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Pedido } from '../types';
import toast from 'react-hot-toast';
import { CheckCircle, Truck, Package, AlertTriangle, DollarSign, X } from 'lucide-react';
import { Money } from '../components/Money';

export default function EntregasPage() {
  const queryClient = useQueryClient();
  const [campanaFilter, setCampanaFilter] = useState<number | ''>('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [tipoPago, setTipoPago] = useState<'completo' | 'parcial' | 'credito'>('completo');
  const [montoPagado, setMontoPagado] = useState(0);
  const [notasPago, setNotasPago] = useState('');
  const [cuotas, setCuotas] = useState(1);

  const { data: pedidos, isLoading } = useQuery<Pedido[]>({
    queryKey: ['pedidos', 'entregas', campanaFilter],
    queryFn: () => api.get('/pedidos', {
      params: {
        campanaId: campanaFilter || undefined,
        estado: 'recibido,parcial',
      },
    }).then(r => r.data),
  });

  const { data: campanas } = useQuery<any[]>({
    queryKey: ['campanas'],
    queryFn: () => api.get('/campanas').then(r => r.data),
  });

  const entregarConPagoMutation = useMutation({
    mutationFn: ({ pedidoId, tipo, monto, notas, cuotas }: { pedidoId: number; tipo: string; monto: number; notas?: string; cuotas?: number }) =>
      api.post(`/pedidos/${pedidoId}/entregar-con-pago`, { tipo, monto, notas, cuotas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-corrientes'] });
      setShowPagoModal(false);
      setSelectedPedido(null);
      toast.success('Pedido entregado y pago registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const abrirModalPago = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setTipoPago('completo');
    setMontoPagado(Number(pedido.totalContado));
    setNotasPago('');
    setCuotas(1);
    setShowPagoModal(true);
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  const pendientesEntrega = pedidos?.filter(p => ['recibido', 'parcial'].includes(p.estado)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Entregas pendientes</h2>
          {pendientesEntrega.length > 0 && (
            <p className="text-sm text-gray-500">{pendientesEntrega.length} pedido(s) por entregar</p>
          )}
        </div>
        <Truck size={24} className="text-primary-600" />
      </div>

      <select value={campanaFilter} onChange={e => setCampanaFilter(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
        <option value="">Todas las campañas</option>
        {campanas?.map((c: any) => <option key={c.id} value={c.id}>{c.marca?.nombre} C{c.numero}</option>)}
      </select>

      {pendientesEntrega.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-2" />
          <p className="text-gray-500">No hay pedidos pendientes de entrega 🎉</p>
        </div>
      )}

      <div className="space-y-3">
        {pendientesEntrega.map(p => {
          // Items listos para entregar al cliente (recibidos de marca, no entregados)
          const itemsPorEntregar = p.items?.filter(i => i.estadoItem === 'recibido_marca') || [];
          // Items que aún no han llegado de la marca
          const itemsFaltantesMarca = p.items?.filter(i => i.estadoItem === 'esperando' || (i.estadoItem === 'parcial' && i.cantidadEntregada < i.cantidad)) || [];
          const hayItemsEsperandoMarca = itemsFaltantesMarca.length > 0;
          // Items ya entregados al cliente
          const itemsYaEntregados = p.items?.filter(i => i.estadoItem === 'entregado') || [];
          const todosEntregados = itemsYaEntregados.length === p.items?.length;

          const totalUnidadesPorEntregar = itemsPorEntregar.reduce((s, i) => s + (i.cantidad - (i.cantidadEntregada || 0)), 0);

          return (
            <div key={p.id} className={`bg-white rounded-xl border p-4 ${hayItemsEsperandoMarca ? 'opacity-70' : ''}`}>
              {/* Header: cliente + total */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {p.cliente?.nombre?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.cliente?.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {p.campana?.marca?.nombre} — Campaña {p.campana?.numero}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg"><Money amount={Number(p.totalContado)} /></p>
                  <p className="text-xs text-green-600">Ganancia: <Money amount={Number(p.ganancia)} /></p>
                </div>
              </div>

              {/* Items con detalle de entrega */}
              <table className="w-full text-xs mb-3">
                <thead className="text-gray-500 border-b">
                  <tr>
                    <th className="text-left pb-1.5 font-medium">Producto</th>
                    <th className="text-right pb-1.5 font-medium">Pedido</th>
                    <th className="text-right pb-1.5 font-medium">Recibido</th>
                    <th className="text-right pb-1.5 font-medium text-green-700">A entregar</th>
                    <th className="text-right pb-1.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items?.map(item => {
                    const recibido = item.cantidadRecibida || 0;
                    const entregadoAlCliente = item.cantidadEntregada || 0;
                    const porEntregar = item.cantidad - entregadoAlCliente;
                    return (
                      <tr key={item.id} className="border-t last:border-b">
                        <td className="py-1.5">
                          <span className="font-mono">{item.producto?.codigo}</span> — {item.producto?.nombre}
                        </td>
                        <td className="py-1.5 text-right">{item.cantidad}</td>
                        <td className="py-1.5 text-right">{recibido}</td>
                        <td className="py-1.5 text-right font-medium">
                          {item.estadoItem === 'recibido_marca' ? (
                            <span className="text-green-700">{porEntregar}</span>
                          ) : porEntregar > 0 && entregadoAlCliente > 0 ? (
                            <span className="text-yellow-700">{porEntregar}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right">
                          {item.estadoItem === 'entregado' ? (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Entregado</span>
                          ) : item.estadoItem === 'recibido_marca' ? (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Pendiente de entrega</span>
                          ) : item.estadoItem === 'parcial' ? (
                            <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center justify-end gap-0.5">
                              <AlertTriangle size={10} /> Parcial
                            </span>
                          ) : item.cantidadEntregada > 0 && item.cantidadEntregada < item.cantidad ? (
                            <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Parcial</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Esperando de marca</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Botón de entregar con cobro */}
              {hayItemsEsperandoMarca ? (
                <div className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 bg-gray-100 text-gray-400 cursor-not-allowed">
                  <AlertTriangle size={16} />
                  Esperando recepción de {itemsFaltantesMarca.length} producto(s) de la marca
                </div>
              ) : todosEntregados ? (
                <div className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 bg-gray-100 text-gray-400">
                  <CheckCircle size={16} /> Todo entregado
                </div>
              ) : itemsPorEntregar.length > 0 ? (
                <button
                  onClick={() => abrirModalPago(p)}
                  disabled={entregarConPagoMutation.isPending}
                  className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <DollarSign size={16} />
                  {entregarConPagoMutation.isPending ? 'Procesando...' : `Entregar y cobrar (${totalUnidadesPorEntregar} unidades)`}
                </button>
              ) : (
                <div className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 bg-gray-100 text-gray-400">
                  Sin productos pendientes
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de pago */}
      {showPagoModal && selectedPedido && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Registrar cobro</h3>
              <button onClick={() => setShowPagoModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold">{selectedPedido.cliente?.nombre}</p>
              <p className="text-sm text-gray-500">
                {selectedPedido.campana?.marca?.nombre} — Campaña {selectedPedido.campana?.numero}
              </p>
              <p className="text-lg font-bold">
                Total: <Money amount={Number(selectedPedido.totalContado)} />
              </p>
            </div>

            {/* Tipo de pago */}
            <div>
              <label className="text-sm font-medium text-gray-700">Forma de pago</label>
              <div className="mt-1 space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${tipoPago === 'completo' ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="tipoPago" checked={tipoPago === 'completo'} onChange={() => { setTipoPago('completo'); setMontoPagado(Number(selectedPedido.totalContado)); }} className="accent-green-600" />
                  <div>
                    <p className="font-medium text-sm">Pago completo</p>
                    <p className="text-xs text-gray-500">El cliente paga todo al entregar</p>
                  </div>
                  <span className="ml-auto text-green-600 font-bold"><Money amount={Number(selectedPedido.totalContado)} /></span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${tipoPago === 'parcial' ? 'border-yellow-500 bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="tipoPago" checked={tipoPago === 'parcial'} onChange={() => { setTipoPago('parcial'); setMontoPagado(0); }} className="accent-yellow-600" />
                  <div>
                    <p className="font-medium text-sm">Pago parcial</p>
                    <p className="text-xs text-gray-500">El cliente paga una parte ahora</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${tipoPago === 'credito' ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="tipoPago" checked={tipoPago === 'credito'} onChange={() => { setTipoPago('credito'); setMontoPagado(0); }} className="accent-red-600" />
                  <div>
                    <p className="font-medium text-sm">Crédito / Fiado</p>
                    <p className="text-xs text-gray-500">No paga ahora, queda como deuda</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Número de cuotas (solo para crédito) */}
            {tipoPago === 'credito' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Número de cuotas</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={cuotas}
                    min={1}
                    max={12}
                    onChange={e => setCuotas(Math.max(1, Number(e.target.value)))}
                    className="w-20 border rounded-lg px-3 py-2 text-center text-lg font-bold"
                  />
                  <span className="text-sm text-gray-500">
                    {cuotas > 1
                      ? `${cuotas} cuotas de $${(Number(selectedPedido?.totalContado || 0) / cuotas).toFixed(0)}`
                      : 'Pago único al vencimiento'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Monto para pago parcial */}
            {tipoPago === 'parcial' && (
              <div>
                <label className="text-sm font-medium text-gray-700">¿Cuánto recibes?</label>
                <input
                  type="number"
                  value={montoPagado}
                  min={0}
                  max={Number(selectedPedido.totalContado)}
                  onChange={e => setMontoPagado(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-lg font-bold mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Saldo pendiente: <strong className="text-red-600"><Money amount={Math.max(0, Number(selectedPedido.totalContado) - montoPagado)} /></strong>
                </p>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
              <input value={notasPago} onChange={e => setNotasPago(e.target.value)} placeholder="Ej: Pagó con Yape" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowPagoModal(false)} className="flex-1 bg-gray-100 py-2 rounded-lg text-sm hover:bg-gray-200">Cancelar</button>
              <button
                onClick={() => entregarConPagoMutation.mutate({
                  pedidoId: selectedPedido.id,
                  tipo: tipoPago,
                  monto: tipoPago === 'credito' ? 0 : montoPagado,
                  notas: notasPago || undefined,
                  cuotas: tipoPago === 'credito' ? cuotas : undefined,
                })}
                disabled={entregarConPagoMutation.isPending || (tipoPago === 'parcial' && montoPagado <= 0)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {entregarConPagoMutation.isPending ? 'Procesando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}