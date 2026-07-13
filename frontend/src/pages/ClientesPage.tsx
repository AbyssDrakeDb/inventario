import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Cliente } from '../types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Search, DollarSign } from 'lucide-react';
import { Money } from '../components/Money';
import ModalCuentaCorriente from '../components/ModalCuentaCorriente';

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', ciudad: '', notas: '' });
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const { data: clientes, isLoading } = useQuery<Cliente[]>({
    queryKey: ['clientes', busqueda],
    queryFn: () => api.get('/clientes', { params: busqueda ? { busqueda } : {} }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/clientes', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clientes'] }); setShowForm(false); resetForm(); toast.success('Cliente creado'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => api.put(`/clientes/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clientes'] }); setShowForm(false); setEditando(null); resetForm(); toast.success('Actualizado'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const resetForm = () => setForm({ nombre: '', telefono: '', direccion: '', ciudad: '', notas: '' });

  const openEdit = (c: Cliente) => {
    setEditando(c);
    setForm({ nombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '', ciudad: c.ciudad || '', notas: c.notas || '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) updateMutation.mutate({ id: editando.id, data: form });
    else createMutation.mutate(form);
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
        <button onClick={() => { resetForm(); setEditando(null); setShowForm(true); }} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">{editando ? 'Guardar' : 'Crear'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditando(null); }} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-2 font-medium text-gray-600">Teléfono</th>
              <th className="px-4 py-2 font-medium text-gray-600">Ciudad</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-right">Pedidos</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-right">Saldo</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-center">Cuenta</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {clientes?.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{c.nombre}</td>
                <td className="px-4 py-2.5 text-xs">{c.telefono || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.ciudad || '-'}</td>
                <td className="px-4 py-2.5 text-right">{c._count?.pedidos || 0}</td>
                <td className="px-4 py-2.5 text-right"><Money amount={Number(c.saldo)} /></td>
                <td className="px-4 py-2.5 text-center">
                  {Number(c.saldo) > 0 ? (
                    <button onClick={() => setSelectedCliente(c)} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1 mx-auto">
                      <DollarSign size={12} /> Cobrar
                    </button>
                  ) : (
                    <button onClick={() => setSelectedCliente(c)} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 mx-auto">
                      Ver
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5"><button onClick={() => openEdit(c)} className="p-1 hover:bg-gray-200 rounded"><Pencil size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    {selectedCliente && (
        <ModalCuentaCorriente
          cliente={selectedCliente}
          onClose={() => setSelectedCliente(null)}
          onPagoRegistrado={() => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['cuentas-corrientes'] });
          }}
        />
      )}
    </div>
  );
}