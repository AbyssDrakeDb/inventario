import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Producto, Marca, Categoria } from '../types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function ProductosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [marcaFilter, setMarcaFilter] = useState<number | ''>('');
  const [form, setForm] = useState({
    marcaId: 0, codigo: '', nombre: '', descripcion: '',
    categoriaId: 0, presentacion: '', stockMinimo: 0,
  });
  const [codigoNumero, setCodigoNumero] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [codigoSugerido, setCodigoSugerido] = useState('');

  // Obtener prefijo de código cuando se selecciona marca
  const { data: nextCodeData, isFetching: codigoLoading } = useQuery<{ prefijo: string; codigo: string; siguiente: number }>({
    queryKey: ['nextCode', form.marcaId],
    queryFn: () => api.get(`/marcas/next-code/${form.marcaId}`).then(r => r.data),
    enabled: form.marcaId > 0 && !editando,
  });

  // Cuando cambia el nextCode, sugerir el código
  useEffect(() => {
    if (nextCodeData && !editando) {
      setCodigoNumero('');
      setCodigoError('');
      setCodigoSugerido(nextCodeData.codigo);
    }
  }, [nextCodeData, editando]);

  const { data: marcas } = useQuery<Marca[]>({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });
  const { data: categorias } = useQuery<Categoria[]>({ queryKey: ['categorias'], queryFn: () => api.get('/categorias').then(r => r.data) });
  const { data: productos, isLoading } = useQuery<Producto[]>({
    queryKey: ['productos', busqueda, marcaFilter],
    queryFn: () => api.get('/productos', { params: { busqueda: busqueda || undefined, marcaId: marcaFilter || undefined } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/productos', { ...data, categoriaId: data.categoriaId || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['productos'] }); setShowForm(false); resetForm(); toast.success('Producto creado'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/productos/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['productos'] }); setShowForm(false); setEditando(null); resetForm(); toast.success('Actualizado'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/productos/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['productos'] }); toast.success('Producto desactivado'); },
  });

  const resetForm = () => {
    setForm({ marcaId: 0, codigo: '', nombre: '', descripcion: '', categoriaId: 0, presentacion: '', stockMinimo: 0 });
    setCodigoNumero('');
    setCodigoError('');
    setCodigoSugerido('');
  };

  // Validar código contra el backend
  const validarCodigo = async (codigoCompleto: string) => {
    if (!codigoCompleto || editando) return;
    try {
      const res = await api.get(`/productos/buscar/${form.marcaId}/${encodeURIComponent(codigoCompleto)}`);
      if (res.status === 200) {
        setCodigoError(`Código "${codigoCompleto}" ya está en uso.`);
        if (nextCodeData?.siguiente) {
          const sig = nextCodeData.siguiente;
          setCodigoSugerido(`${nextCodeData.prefijo}${String(sig).padStart(3, '0')}`);
        }
        return false;
      }
    } catch {
      setCodigoError('');
      return true;
    }
    return true;
  };

  const openEdit = (p: Producto) => {
    setEditando(p);
    setForm({
      marcaId: p.marcaId, codigo: p.codigo, nombre: p.nombre,
      descripcion: p.descripcion || '', categoriaId: p.categoriaId || 0,
      presentacion: p.presentacion || '', stockMinimo: p.stockMinimo,
    });
    setCodigoNumero('');
    setCodigoError('');
    setCodigoSugerido('');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, categoriaId: form.categoriaId || undefined };
    if (editando) updateMutation.mutate({ id: editando.id, data: payload });
    else createMutation.mutate(payload);
  };

  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Productos</h2>
        <button onClick={() => { resetForm(); setEditando(null); setShowForm(true); }} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Buscar código o nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={marcaFilter} onChange={e => setMarcaFilter(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas</option>
          {marcas?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold">{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <select value={form.marcaId} onChange={e => { setForm(f => ({ ...f, marcaId: Number(e.target.value), codigo: '' })); setCodigoNumero(''); setCodigoError(''); setCodigoSugerido(''); }} required className="border rounded-lg px-3 py-2 text-sm">
              <option value={0}>Marca</option>
              {marcas?.filter(m => m.activa).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            {editando ? (
              <input placeholder="Código" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm" />
            ) : (
              <div>
                <div className="flex border rounded-lg overflow-hidden">
                  {nextCodeData?.prefijo ? (
                    <span className="flex items-center px-2 bg-gray-100 text-gray-600 text-sm font-mono border-r">{nextCodeData.prefijo}</span>
                  ) : null}
                  <input
                    placeholder={codigoSugerido ? `Ej: ${codigoSugerido.replace(nextCodeData?.prefijo || '', '')}` : 'Número'}
                    value={codigoNumero}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCodigoNumero(val);
                      const prefijo = nextCodeData?.prefijo || '';
                      const codigoCompleto = prefijo + val;
                      setForm(f => ({ ...f, codigo: codigoCompleto }));
                      if (val.length >= 2) validarCodigo(codigoCompleto);
                      else setCodigoError('');
                    }}
                    className="flex-1 px-3 py-2 text-sm outline-none min-w-0 w-20"
                  />
                  {codigoLoading && <span className="flex items-center px-2 text-gray-400 text-xs">Cargando...</span>}
                </div>
                {codigoError && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <span className="text-red-600">{codigoError}</span>
                    {codigoSugerido && (
                      <button type="button" onClick={() => {
                        const prefijo = nextCodeData?.prefijo || '';
                        const num = codigoSugerido.replace(prefijo, '');
                        setCodigoNumero(num);
                        setCodigoError('');
                        setForm(f => ({ ...f, codigo: codigoSugerido }));
                      }} className="text-blue-600 underline ml-1">Usar {codigoSugerido}</button>
                    )}
                  </div>
                )}
              </div>
            )}
            <input placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: Number(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value={0}>Categoría</option>
              {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input placeholder="Presentación" value={form.presentacion} onChange={e => setForm(f => ({ ...f, presentacion: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Stock mínimo" value={form.stockMinimo || ''} onChange={e => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
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
              <th className="px-4 py-2 font-medium text-gray-600">Código</th>
              <th className="px-4 py-2 font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-2 font-medium text-gray-600">Marca</th>
              <th className="px-4 py-2 font-medium text-gray-600">Cat.</th>
              <th className="px-4 py-2 font-medium text-gray-600 text-right">Stock</th>
              <th className="px-4 py-2 font-medium text-gray-600 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {productos?.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{p.codigo}</td>
                <td className="px-4 py-2 font-medium">{p.nombre}</td>
                <td className="px-4 py-2 text-xs">{p.marca?.nombre}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{p.categoria?.nombre || '-'}</td>
                <td className="px-4 py-2 text-right">{p.stockActual?.cantidad || 0}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1 hover:bg-gray-200 rounded"><Pencil size={14} /></button>
                    {p.activo && <button onClick={() => deleteMutation.mutate(p.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>}
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