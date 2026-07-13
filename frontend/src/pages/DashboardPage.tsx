import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { DashboardData } from '../types';
import { DollarSign, Package, Users, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { Money } from '../components/Money';

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reportes/dashboard').then(r => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="text-gray-500">Cargando dashboard...</div>;

  const kpis = [
    { label: 'Ganancia del mes', value: data ? <Money amount={data.ventasMes.ganancia} /> : 'S/ 0.00', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pedidos pendientes', value: data?.pedidosPendientes || 0, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Campañas activas', value: data?.campanasActivas || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Alertas de stock', value: data?.alertasCount || 0, icon: AlertTriangle, color: data?.alertasCount ? 'text-red-600' : 'text-gray-400', bg: data?.alertasCount ? 'bg-red-50' : 'bg-gray-50' },
    { label: 'Deuda pendiente', value: data ? <Money amount={data.deudaPendiente} /> : 'S/ 0.00', icon: CreditCard, color: data?.deudaPendiente ? 'text-red-600' : 'text-gray-400', bg: data?.deudaPendiente ? 'bg-red-50' : 'bg-gray-50' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <kpi.icon size={24} className={kpi.color} />
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ventas mes detalle */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Ventas del mes</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Total contado</p>
              <p className="text-lg font-bold text-blue-600"><Money amount={data.ventasMes.totalContado} /></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Costo (revendedora)</p>
              <p className="text-lg font-bold text-orange-600"><Money amount={data.ventasMes.totalRevendedora} /></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ganancia</p>
              <p className="text-lg font-bold text-green-600"><Money amount={data.ventasMes.ganancia} /></p>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de stock */}
      {data?.alertas && data.alertas.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            Alertas de stock bajo
          </h3>
          <div className="space-y-2">
            {data.alertas.map((a) => (
              <div key={a.productoId} className="flex justify-between items-center text-sm bg-white rounded-lg p-2 px-3">
                <span className="font-medium">{a.codigo} — {a.nombre}</span>
                <span className="text-red-600">
                  Disponible: <strong>{a.stockDisponible}</strong> (mín: {a.stockMinimo})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}