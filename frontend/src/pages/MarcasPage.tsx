import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Marca } from '../types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function MarcasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Marca | null>(null);
  const [form, setForm] = useState({ nombre: '', slug: '', color: '', codigoPrefijo: '' });

  const { data: marcas, isLoading } = useQuery<Marca[]>({
    queryKey: ['marcas'],
    queryFn: () => api.get('/marcas').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/marcas', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marcas'] }); setShowForm(false); resetForm(); toast.success('Marca creada'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => api.put(`/marcas/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marcas'] }); setShowForm(false); setEditando(null); resetForm(); toast.success('Marca actualizada'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/marcas/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marcas'] }); toast.success('Marca desactivada'); },
  });

  const resetForm = () => setForm({ nombre: '', slug: '', color: '', codigoPrefijo: '' });

  const openEdit = (m: Marca) => {
    setEditando(m);
    setForm({ nombre: m.nombre, slug: m.slug, color: m.color || '', codigoPrefijo: m.codigoPrefijo || '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      updateMutation.mutate({ id: editando.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Marcas</h2>
        <button onClick={() => { resetForm(); setEditando(null); setShowForm(true); }} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={16} /> Nueva
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold">{editando ? 'Editar marca' : 'Nueva marca'}</h3>
          <div className="grid grid-cols-4 gap-3">
            <input placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="slug (ej. natura)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required pattern="[a-z0-9-]+" className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Prefijo código (ej. NAT-)" value={form.codigoPrefijo} onChange={e => setForm(f => ({ ...f, codigoPrefijo: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Color (hex)" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
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
              <th className="px-4 py-2 font-medium text-gray-600">Color</th>
              <th className="px-4 py-2 font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-2 font-medium text-gray-600">Slug</th>
              <th className="px-4 py-2 font-medium text-gray-600">Prefijo</th>
              <th className="px-4 py-2 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-2 font-medium text-gray-600 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {marcas?.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5"><div className="w-5 h-5 rounded" style={{ backgroundColor: m.color || '#ccc' }} /></td>
                <td className="px-4 py-2.5 font-medium">{m.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500">{m.slug}</td>
                <td className="px-4 py-2.5"><code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{m.codigoPrefijo || '-'}</code></td>
                <td className="px-4 py-2.5">{m.activa ? <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">Activa</span> : <span className="text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded-full">Inactiva</span>}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-200 rounded"><Pencil size={14} /></button>
                    {m.activa && <button onClick={() => deleteMutation.mutate(m.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>}
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