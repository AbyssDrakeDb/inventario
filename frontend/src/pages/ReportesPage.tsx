import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { Campana, Marca } from '../types';
import toast from 'react-hot-toast';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Money } from '../components/Money';

type ReporteTipo = 'ventas-campana' | 'ventas-marca' | 'top-productos' | 'faltantes' | 'stock-valorizado';

export default function ReportesPage() {
  const [tipo, setTipo] = useState<ReporteTipo>('ventas-campana');
  const [campanaId, setCampanaId] = useState<number | ''>('');
  const [marcaId, setMarcaId] = useState<number | ''>('');

  const { data: campanas } = useQuery<Campana[]>({ queryKey: ['campanas'], queryFn: () => api.get('/campanas').then(r => r.data) });
  const { data: marcas } = useQuery<Marca[]>({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });

  const endpoint = tipo === 'ventas-campana' && campanaId ? `/reportes/ventas-campana/${campanaId}`
    : tipo === 'ventas-marca' && marcaId ? `/reportes/ventas-marca/${marcaId}`
    : tipo === 'faltantes' && campanaId ? `/reportes/faltantes/${campanaId}`
    : tipo === 'top-productos' ? `/reportes/top-productos${marcaId ? `?marcaId=${marcaId}` : ''}`
    : tipo === 'stock-valorizado' ? '/reportes/stock-valorizado'
    : null;

  const { data: reporte, isLoading } = useQuery<any>({
    queryKey: ['reporte', tipo, campanaId, marcaId],
    queryFn: () => endpoint ? api.get(endpoint).then(r => r.data) : Promise.resolve(null),
    enabled: !!endpoint,
  });

  const tipoLabels: Record<ReporteTipo, string> = {
    'ventas-campana': 'Ventas por campaña',
    'ventas-marca': 'Ventas por marca',
    'top-productos': 'Productos más vendidos',
    'faltantes': 'Faltantes por campaña',
    'stock-valorizado': 'Stock valorizado',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Reportes</h2>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exportación a Excel (próximamente)')} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={() => toast.success('Exportación a PDF (próximamente)')} className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700">
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(tipoLabels) as [ReporteTipo, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTipo(key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tipo === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros contextuales */}
      <div className="flex gap-3">
        {(tipo === 'ventas-campana' || tipo === 'faltantes') && (
          <select value={campanaId} onChange={e => setCampanaId(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar campaña</option>
            {campanas?.map(c => <option key={c.id} value={c.id}>{c.marca?.nombre} — C{c.numero}</option>)}
          </select>
        )}
        {(tipo === 'ventas-marca' || tipo === 'top-productos') && (
          <select value={marcaId} onChange={e => setMarcaId(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todas las marcas</option>
            {marcas?.filter(m => m.activa).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Resultado */}
      {isLoading && <div className="text-gray-500">Generando reporte...</div>}

      {reporte && tipo === 'ventas-campana' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-bold text-lg">Ventas — Campaña #{reporte.campanaId}</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-gray-500">Pedidos</p><p className="text-xl font-bold">{reporte.pedidosCount}</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-gray-500">Total contado</p><p className="text-xl font-bold"><Money amount={reporte.totalContado} /></p></div>
            <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs text-gray-500">Costo</p><p className="text-xl font-bold"><Money amount={reporte.totalRevendedora} /></p></div>
            <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-gray-500">Ganancia ({reporte.margenPromedio}%)</p><p className="text-xl font-bold text-green-600"><Money amount={reporte.gananciaTotal} /></p></div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-1.5 text-left text-xs">Producto</th><th className="px-3 py-1.5 text-right text-xs">Cant.</th><th className="px-3 py-1.5 text-right text-xs">Contado</th><th className="px-3 py-1.5 text-right text-xs">Ganancia</th><th className="px-3 py-1.5 text-right text-xs">Margen</th></tr></thead>
            <tbody>
              {reporte.productos?.map((p: any, i: number) => (
                <tr key={i} className="border-t"><td className="px-3 py-1.5">{p.codigo} — {p.nombre}</td><td className="px-3 py-1.5 text-right">{p.cantidad}</td><td className="px-3 py-1.5 text-right"><Money amount={p.contado} /></td><td className="px-3 py-1.5 text-right text-green-600"><Money amount={p.ganancia} /></td><td className="px-3 py-1.5 text-right text-xs">{p.margen}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reporte && tipo === 'top-productos' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-lg mb-3">Productos más vendidos</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-1.5 text-left text-xs">#</th><th className="px-3 py-1.5 text-left text-xs">Producto</th><th className="px-3 py-1.5 text-left text-xs">Marca</th><th className="px-3 py-1.5 text-right text-xs">Vendidos</th><th className="px-3 py-1.5 text-right text-xs">Total</th><th className="px-3 py-1.5 text-right text-xs">Ganancia</th></tr></thead>
            <tbody>
              {reporte.map((p: any, i: number) => (
                <tr key={i} className="border-t"><td className="px-3 py-1.5">{i + 1}</td><td className="px-3 py-1.5">{p.codigo} — {p.nombre}</td><td className="px-3 py-1.5 text-xs">{p.marca}</td><td className="px-3 py-1.5 text-right font-medium">{p.cantidadVendida}</td><td className="px-3 py-1.5 text-right"><Money amount={p.totalContado} /></td><td className="px-3 py-1.5 text-right text-green-600"><Money amount={p.ganancia} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reporte && tipo === 'faltantes' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-lg mb-3">Faltantes</h3>
          {reporte.length === 0 ? <p className="text-green-600">✅ Sin faltantes</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-3 py-1.5 text-left text-xs">Producto</th><th className="px-3 py-1.5 text-left text-xs">Cliente</th><th className="px-3 py-1.5 text-right text-xs">Pedido</th><th className="px-3 py-1.5 text-right text-xs">Faltante</th></tr></thead>
              <tbody>
                {reporte.map((f: any, i: number) => (
                  <tr key={i} className="border-t"><td className="px-3 py-1.5">{f.codigo} — {f.nombre}</td><td className="px-3 py-1.5 text-xs">{f.cliente}</td><td className="px-3 py-1.5 text-right">{f.cantidadPedida}</td><td className="px-3 py-1.5 text-right text-red-600 font-medium">{f.cantidadFaltante}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {reporte && tipo === 'stock-valorizado' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-lg mb-3">Stock valorizado</h3>
          <p className="text-sm mb-2">Valor total del inventario (a precio revendedora): <strong className="text-primary-700"><Money amount={reporte.valorTotal} /></strong></p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-1.5 text-left text-xs">Producto</th><th className="px-3 py-1.5 text-left text-xs">Marca</th><th className="px-3 py-1.5 text-right text-xs">Cant.</th><th className="px-3 py-1.5 text-right text-xs">Costo U.</th><th className="px-3 py-1.5 text-right text-xs">Valor total</th></tr></thead>
            <tbody>
              {reporte.items?.map((item: any, i: number) => (
                <tr key={i} className="border-t"><td className="px-3 py-1.5">{item.codigo} — {item.nombre}</td><td className="px-3 py-1.5 text-xs">{item.marca}</td><td className="px-3 py-1.5 text-right">{item.cantidad}</td><td className="px-3 py-1.5 text-right"><Money amount={item.costoUnitario} /></td><td className="px-3 py-1.5 text-right font-medium"><Money amount={item.valorTotal} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reporte && tipo === 'ventas-marca' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-bold text-lg">Ventas por marca</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-gray-500">Total contado</p><p className="text-xl font-bold"><Money amount={reporte.totalContado} /></p></div>
            <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs text-gray-500">Costo</p><p className="text-xl font-bold"><Money amount={reporte.totalRevendedora} /></p></div>
            <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-gray-500">Ganancia</p><p className="text-xl font-bold text-green-600"><Money amount={reporte.gananciaTotal} /></p></div>
          </div>
          {reporte.campanas?.map((rc: any) => (
            <div key={rc.campanaId} className="border-t pt-2">
              <p className="font-medium text-sm">Campaña #{rc.campanaId}: {rc.pedidosCount} pedidos — Ganancia: <Money amount={rc.gananciaTotal} /></p>
            </div>
          ))}
        </div>
      )}

      {!reporte && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl border text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-2" />
          <p>Selecciona un tipo de reporte y los filtros para generar resultados</p>
        </div>
      )}
    </div>
  );
}