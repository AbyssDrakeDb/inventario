import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Cliente, Pago, Pedido } from '../types';
import { X, DollarSign, CheckCircle } from 'lucide-react';
import { Money } from './Money';
import toast from 'react-hot-toast';

interface Props {
  cliente: Cliente;
  onClose: () => void;
  onPagoRegistrado?: () => void;
}

export default function ModalCuentaCorriente({ cliente, onClose, onPagoRegistrado }: Props) {
  const queryClient = useQueryClient();
  const [showAbonoForm, setShowAbonoForm] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoNotas, setAbonoNotas] = useState('');
  const [abonoPedidoId, setAbonoPedidoId] = useState<number | ''>('');

  // Fetch full client data including pagos and pedidos
  const { data: clienteData } = useQuery<Cliente & { pagos?: Pago[]; pedidos?: Pedido[] }>({
    queryKey: ['cliente-detalle', cliente.id],
    queryFn: () => api.get(`/clientes/${cliente.id}`).then(r => r.data),
  });

  const pagos = clienteData && 'pagos' in clienteData ? (clienteData as any).pagos : [];
  const pedidos = clienteData && 'pedidos' in clienteData ? (clienteData as any).pedidos : [];

  const pedidosPendientes = Array.isArray(pedidos)
    ? pedidos.filter((p: any) => p.estado === 'entregado' && p.estadoPago !== 'pagado')
    : [];

  const registrarAbonoMutation = useMutation({
    mutationFn: ({ pedidoId, monto, notas }: { pedidoId?: number; monto: number; notas?: string }) => {
      if (pedidoId) {
        return api.post(`/pedidos/${pedidoId}/abono`, { monto, notas });
      }
      // Si no hay pedido específico, registrar abono contra el cliente
      return api.post('/pedidos/abono-general', { clienteId: cliente.id, monto, notas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-detalle', cliente.id] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-corrientes'] });
      setShowAbonoForm(false);
      setAbonoMonto(0);
      setAbonoNotas('');
      setAbonoPedidoId('');
      onPagoRegistrado?.();
      toast.success('Abono registrado correctamente');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al registrar abono'),
  });

  const estadoPagoColor = (ep: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-red-100 text-red-700',
      parcial: 'bg-yellow-100 text-yellow-700',
      pagado: 'bg-green-100 text-green-700',
      credito: 'bg-orange-100 text-orange-700',
    };
    return map[ep] || 'bg-gray-100 text-gray-600';
  };

  const totalDeuda = pedidosPendientes.reduce((s: number, p: any) => s + Number(p.totalContado), 0);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">Cuenta Corriente</h3>
            <p className="text-xl font-bold mt-1">{cliente.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>

        {/* Saldo actual */}
        <div className={`rounded-lg p-4 ${Number(cliente.saldo) > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="text-sm text-gray-500">Saldo pendiente</p>
          <p className={`text-2xl font-bold ${Number(cliente.saldo) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <Money amount={Number(cliente.saldo)} />
          </p>
        </div>

        {/* Pedidos pendientes */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">
            Deudas pendientes ({pedidosPendientes.length})
          </h4>
          {pedidosPendientes.length === 0 ? (
            <p className="text-sm text-green-600">✓ Sin deudas pendientes</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs">Pedido</th>
                  <th className="px-3 py-1.5 text-left text-xs">Campaña</th>
                  <th className="px-3 py-1.5 text-right text-xs">Total</th>
                  <th className="px-3 py-1.5 text-right text-xs">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosPendientes.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs">#{p.id}</td>
                    <td className="px-3 py-1.5 text-xs">{p.campana?.marca?.nombre} C{p.campana?.numero}</td>
                    <td className="px-3 py-1.5 text-right"><Money amount={Number(p.totalContado)} /></td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${estadoPagoColor(p.estadoPago || 'pendiente')}`}>
                        {p.estadoPago || 'pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={2} className="px-3 py-1.5 text-right">Total:</td>
                  <td className="px-3 py-1.5 text-right"><Money amount={totalDeuda} /></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Historial de pagos */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Historial de pagos</h4>
          {!Array.isArray(pagos) || pagos.length === 0 ? (
            <p className="text-sm text-gray-400">Sin pagos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs">Fecha</th>
                  <th className="px-3 py-1.5 text-left text-xs">Tipo</th>
                  <th className="px-3 py-1.5 text-left text-xs">Pedido</th>
                  <th className="px-3 py-1.5 text-right text-xs">Monto</th>
                  <th className="px-3 py-1.5 text-left text-xs">Cuotas</th>
                  <th className="px-3 py-1.5 text-left text-xs">Notas</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago: any) => (
                  <tr key={pago.id} className="border-t">
                    <td className="px-3 py-1.5 text-xs">{new Date(pago.fecha).toLocaleDateString('es-PE')}</td>
                    <td className="px-3 py-1.5 text-xs capitalize">{pago.tipo}</td>
                    <td className="px-3 py-1.5 text-xs">{pago.pedidoId ? `#${pago.pedidoId}` : '-'}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-green-600"><Money amount={Number(pago.monto)} /></td>
                    <td className="px-3 py-1.5 text-xs">
                      {pago.cuotas && pago.cuotas > 1 ? (
                        <span>{pago.cuotas} cuotas de $<Money amount={Number(pago.montoPorCuota || pago.monto / pago.cuotas)} /></span>
                      ) : pago.tipo === 'credito' ? (
                        <span>1 cuota</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-500">{pago.notas || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Registrar abono */}
        {!showAbonoForm ? (
          <button onClick={() => setShowAbonoForm(true)} className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm hover:bg-primary-700 flex items-center justify-center gap-1">
            <DollarSign size={16} /> Registrar abono / pago
          </button>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">Registrar abono</h4>

            <div>
              <label className="text-xs text-gray-500">Pedido (opcional)</label>
              <select value={abonoPedidoId} onChange={e => setAbonoPedidoId(e.target.value ? Number(e.target.value) : '')} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— Sin pedido específico —</option>
                {pedidosPendientes.map((p: any) => (
                  <option key={p.id} value={p.id}>Pedido #{p.id} — <Money amount={Number(p.totalContado)} /></option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Monto *</label>
              <input type="number" value={abonoMonto} min={1} onChange={e => setAbonoMonto(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-lg font-bold" />
            </div>

            <div>
              <label className="text-xs text-gray-500">Notas (opcional)</label>
              <input value={abonoNotas} onChange={e => setAbonoNotas(e.target.value)} placeholder="Ej: Pago con transferencia" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAbonoForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg text-sm hover:bg-gray-300">Cancelar</button>
              <button
                onClick={() => registrarAbonoMutation.mutate({
                  pedidoId: abonoPedidoId ? Number(abonoPedidoId) : undefined,
                  monto: abonoMonto,
                  notas: abonoNotas || undefined,
                })}
                disabled={registrarAbonoMutation.isPending || abonoMonto <= 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {registrarAbonoMutation.isPending ? 'Registrando...' : <><CheckCircle size={16} /> Confirmar abono</>}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full bg-gray-100 py-2 rounded-lg text-sm hover:bg-gray-200 mt-2">Cerrar</button>
      </div>
    </div>
  );
}