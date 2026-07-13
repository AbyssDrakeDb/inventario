import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { CuentaCorriente } from '../types';
import { CreditCard, Search, AlertTriangle, Phone, Calendar } from 'lucide-react';
import { Money } from '../components/Money';
import ModalCuentaCorriente from '../components/ModalCuentaCorriente';

export default function CuentasCorrientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<CuentaCorriente | null>(null);

  const { data: cuentas, isLoading } = useQuery<CuentaCorriente[]>({
    queryKey: ['cuentas-corrientes'],
    queryFn: () => api.get('/clientes/cuentas-corrientes').then(r => r.data),
    refetchInterval: 30_000,
  });

  const filtered = cuentas?.filter(c =>
    !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono?.includes(busqueda)
  );

  const totalDeuda = cuentas?.reduce((s, c) => s + c.saldo, 0) || 0;

  if (isLoading) return <div className="text-gray-500">Cargando cuentas corrientes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cuentas por Cobrar (CxC)</h2>
          <p className="text-sm text-gray-500">
            {cuentas?.length || 0} cliente(s) con deuda pendiente
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-right">
          <p className="text-xs text-red-500">Deuda total</p>
          <p className="text-xl font-bold text-red-600"><Money amount={totalDeuda} /></p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Buscar cliente deudor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <CreditCard size={40} className="mx-auto text-green-400 mb-2" />
          <p className="text-gray-500">No hay deudas pendientes 🎉</p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-2 font-medium text-gray-600">Contacto</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Deuda</th>
                <th className="px-4 py-2 font-medium text-gray-600">Último pago</th>
                <th className="px-4 py-2 font-medium text-gray-600">Pedidos pendientes</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.nombre}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {c.telefono ? (
                      <span className="flex items-center gap-1"><Phone size={12} /> {c.telefono}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-red-600 font-bold text-base"><Money amount={c.saldo} /></span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {c.ultimoPago ? (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(c.ultimoPago.fecha).toLocaleDateString('es-PE')}
                        {' — '}<Money amount={Number(c.ultimoPago.monto)} />
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin pagos</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.pedidosPendientes.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> {c.pedidosPendientes.length}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setSelectedCliente(c)}
                      className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-100"
                    >
                      Cobrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCliente && (
        <ModalCuentaCorriente
          cliente={{ id: selectedCliente.id, nombre: selectedCliente.nombre, saldo: selectedCliente.saldo } as any}
          onClose={() => setSelectedCliente(null)}
          onPagoRegistrado={() => {
            queryClient.invalidateQueries({ queryKey: ['cuentas-corrientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
          }}
        />
      )}
    </div>
  );
}