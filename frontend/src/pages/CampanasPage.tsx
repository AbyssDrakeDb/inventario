import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';
import type { Campana, Marca } from '../types';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Lock } from 'lucide-react';

export default function CampanasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [marcaFilter, setMarcaFilter] = useState<number | ''>('');
  const [form, setForm] = useState({
    marcaId: 0, numero: 0, nombre: '',
    fechaInicio: '', fechaFinVigencia: '', fechaPedidoMarca: '',
  });

  const { data: marcas } = useQuery<Marca[]>({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });
  const { data: campanas, isLoading } = useQuery<Campana[]>({
    queryKey: ['campanas', marcaFilter],
    queryFn: () => api.get('/campanas', { params: marcaFilter ? { marcaId: marcaFilter } : {} }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/campanas', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campanas'] }); setShowForm(false); toast.success('Campaña creada'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const cerrarMutation = useMutation({
    mutationFn: (id: number) => api.post(`/campanas/${id}/cerrar`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campanas'] }); toast.success('Campaña cerrada'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'abierta': return 'bg-green-50 text-green-700';
      case 'cerrada': return 'bg-gray-100 text-gray-600';
      case 'cancelada': return 'bg-red-50 text-red-600';
      default: return '';
    }
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Campañas</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="flex gap-3">
        <select value={marcaFilter} onChange={e => setMarcaFilter(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas las marcas</option>
          {marcas?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-4">
          <h3 className="font-semibold text-gray-800">Nueva campaña</h3>

          {/* Datos básicos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
              <select value={form.marcaId} onChange={e => setForm(f => ({ ...f, marcaId: Number(e.target.value) }))} required className="border rounded-lg px-3 py-2 text-sm w-full">
                <option value={0}>Seleccionar marca</option>
                {marcas?.filter(m => m.activa).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número *</label>
              <input type="number" placeholder="Ej: 8, 15" value={form.numero || ''} onChange={e => setForm(f => ({ ...f, numero: Number(e.target.value) }))} required className="border rounded-lg px-3 py-2 text-sm w-full" />
              <p className="text-[10px] text-gray-400 mt-0.5">Número de campaña de la marca</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input placeholder="Ej: Primavera 2026" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>

          {/* Fechas — con etiquetas descriptivas claras */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">📅 Fechas de la campaña</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Inicio de campaña *</label>
                <input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm w-full" />
                <p className="text-[10px] text-gray-400 mt-0.5">Cuándo empieza el período de esta campaña</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fin de vigencia *</label>
                <input type="date" value={form.fechaFinVigencia} onChange={e => setForm(f => ({ ...f, fechaFinVigencia: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm w-full" />
                <p className="text-[10px] text-gray-400 mt-0.5">Último día que los clientes pueden pedir de esta revista</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pedido a la marca</label>
                <input type="date" value={form.fechaPedidoMarca} onChange={e => setForm(f => ({ ...f, fechaPedidoMarca: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full" />
                <p className="text-[10px] text-gray-400 mt-0.5">Fecha límite para consolidar y enviar el pedido a la marca (opcional)</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-600">Marca</th>
              <th className="px-4 py-2 font-medium text-gray-600">Número</th>
              <th className="px-4 py-2 font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-2 font-medium text-gray-600">Fechas</th>
              <th className="px-4 py-2 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-2 font-medium text-gray-600 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {campanas?.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5">{c.marca?.nombre}</td>
                <td className="px-4 py-2.5 font-medium">{c.numero}</td>
                <td className="px-4 py-2.5">{c.nombre || '-'}</td>
                <td className="px-4 py-2.5 text-xs">
                    <div><span className="text-gray-400">Inicio:</span> {new Date(c.fechaInicio).toLocaleDateString('es-PE')}</div>
                    <div><span className="text-gray-400">Fin vigencia:</span> {new Date(c.fechaFinVigencia).toLocaleDateString('es-PE')}</div>
                    {c.fechaPedidoMarca && <div><span className="text-gray-400">Pedido a marca:</span> {new Date(c.fechaPedidoMarca).toLocaleDateString('es-PE')}</div>}
                  </td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor(c.estado)}`}>{c.estado}</span></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Link to={`/campanas/${c.id}/revista`} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Ver revista"><BookOpen size={14} /></Link>
                    {c.estado === 'abierta' && <button onClick={() => cerrarMutation.mutate(c.id)} className="p-1 hover:bg-gray-200 rounded" title="Cerrar"><Lock size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}