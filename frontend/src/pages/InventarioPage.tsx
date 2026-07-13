import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { StockVista, MovimientoInventario, Marca, Campana, Producto } from '../types';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, Search, ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react';

type Tab = 'stock' | 'movimientos' | 'alertas';

export default function InventarioPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('stock');
  const [marcaFilter, setMarcaFilter] = useState<number | ''>('');
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState({
    productoId: 0, tipo: 'entrada' as string, cantidad: 1,
    costoUnitario: '', motivo: '', campanaId: 0,
  });
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<{ id: number; codigo: string; nombre: string } | null>(null);

  const { data: marcas } = useQuery<Marca[]>({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });
  const { data: campanas } = useQuery<Campana[]>({ queryKey: ['campanas'], queryFn: () => api.get('/campanas', { params: { estado: 'abierta' } }).then(r => r.data) });

  const { data: stock, isLoading: stockLoading } = useQuery<StockVista[]>({
    queryKey: ['stock', marcaFilter],
    queryFn: () => api.get('/inventario/stock', { params: { marcaId: marcaFilter || undefined } }).then(r => r.data),
    enabled: tab === 'stock',
  });

  const { data: movimientos, isLoading: movLoading } = useQuery<{ movimientos: MovimientoInventario[]; total: number }>({
    queryKey: ['movimientos'],
    queryFn: () => api.get('/inventario/movimientos', { params: { limit: 100 } }).then(r => r.data),
    enabled: tab === 'movimientos',
  });

  const { data: alertas, isLoading: alertasLoading } = useQuery<StockVista[]>({
    queryKey: ['alertas'],
    queryFn: () => api.get('/inventario/alertas').then(r => r.data),
    enabled: tab === 'alertas',
  });

  // Búsqueda de productos para el formulario de movimiento
  const { data: productosBusqueda } = useQuery<Producto[]>({
    queryKey: ['productos-busqueda', busquedaProducto],
    queryFn: () => api.get('/productos', { params: { busqueda: busquedaProducto, activo: true } }).then(r => r.data),
    enabled: busquedaProducto.length >= 1 && !productoSeleccionado,
  });

  const movMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventario/movimientos', {
      ...data,
      costoUnitario: data.costoUnitario ? Number(data.costoUnitario) : undefined,
      campanaId: data.campanaId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      setShowMovForm(false);
      toast.success('Movimiento registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error'),
  });

  const resetForm = () => {
    setMovForm({ productoId: 0, tipo: 'entrada', cantidad: 1, costoUnitario: '', motivo: '', campanaId: 0 });
    setBusquedaProducto('');
    setProductoSeleccionado(null);
  };

  const openForm = () => {
    resetForm();
    setShowMovForm(true);
  };

  const selectProducto = (p: Producto) => {
    setProductoSeleccionado({ id: p.id, codigo: p.codigo, nombre: p.nombre });
    setMovForm(f => ({ ...f, productoId: p.id }));
    setBusquedaProducto('');
  };

  const tipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <ArrowDown size={14} className="text-green-500" />;
      case 'salida': return <ArrowUp size={14} className="text-red-500" />;
      case 'devolucion_cliente': return <RotateCcw size={14} className="text-blue-500" />;
      case 'devolucion_marca': return <RotateCcw size={14} className="text-orange-500" />;
      case 'ajuste': return <AlertTriangle size={14} className="text-yellow-500" />;
      default: return null;
    }
  };

  const tabs = [
    { key: 'stock' as Tab, label: 'Stock Actual' },
    { key: 'movimientos' as Tab, label: 'Movimientos' },
    { key: 'alertas' as Tab, label: 'Alertas', icon: alertas && alertas.length > 0 ? <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{alertas.length}</span> : null },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Inventario</h2>
        <button onClick={openForm} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={16} /> Nuevo movimiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${tab === t.key ? 'bg-white shadow font-medium text-primary-700' : 'text-gray-500'}`}>
            {t.label}{t.icon}
          </button>
        ))}
      </div>

      {/* Stock */}
      {tab === 'stock' && (
        <div className="space-y-3">
          <select value={marcaFilter} onChange={e => setMarcaFilter(e.target.value ? Number(e.target.value) : '')} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Todas las marcas</option>
            {marcas?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-600">Código</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Producto</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Marca</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Actual</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Comprometido</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Disponible</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Mín.</th>
                </tr>
              </thead>
              <tbody>
                {stock?.map(s => (
                  <tr key={s.productoId} className={`border-t hover:bg-gray-50 ${s.stockDisponible <= s.stockMinimo ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2 font-mono text-xs">{s.codigo}</td>
                    <td className="px-4 py-2 font-medium">{s.nombre}</td>
                    <td className="px-4 py-2 text-xs">{s.marca}</td>
                    <td className="px-4 py-2 text-right">{s.stockActual}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{s.stockComprometido}</td>
                    <td className="px-4 py-2 text-right font-medium">{s.stockDisponible}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400">{s.stockMinimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movimientos */}
      {tab === 'movimientos' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-2 font-medium text-gray-600">Producto</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Cant.</th>
                <th className="px-4 py-2 font-medium text-gray-600">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimientos?.movimientos.map(m => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs">{new Date(m.fecha).toLocaleDateString('es-PE')}</td>
                  <td className="px-4 py-2">{tipoIcon(m.tipo)} <span className="text-xs ml-1">{m.tipo.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-2 text-xs">{m.producto?.codigo} — {m.producto?.nombre}</td>
                  <td className="px-4 py-2 text-right font-medium">{m.cantidad}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{m.motivo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alertas */}
      {tab === 'alertas' && (
        <div className="space-y-3">
          {alertas?.length === 0 && <p className="text-green-600 text-sm">✅ No hay alertas de stock.</p>}
          {alertas?.map(a => (
            <div key={a.productoId} className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{a.codigo} — {a.nombre}</p>
                <p className="text-xs text-gray-500">{a.marca}</p>
              </div>
              <div className="text-right">
                <p className="text-red-600 font-bold">Disponible: {a.stockDisponible}</p>
                <p className="text-xs text-gray-400">Mínimo: {a.stockMinimo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo movimiento */}
      {showMovForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowMovForm(false)}>
          <form onSubmit={(e) => { e.preventDefault(); movMutation.mutate(movForm); }} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl space-y-3">
            <h3 className="font-bold text-lg">Registrar movimiento</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Buscador de producto por código */}
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Producto *</label>
                {productoSeleccionado ? (
                  <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-lg px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">{productoSeleccionado.codigo}</span>
                      {productoSeleccionado.nombre}
                    </span>
                    <button type="button" onClick={() => { setProductoSeleccionado(null); setMovForm(f => ({ ...f, productoId: 0 })); }} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      placeholder="Buscar por código o nombre..."
                      value={busquedaProducto}
                      onChange={e => setBusquedaProducto(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    {busquedaProducto.length >= 1 && productosBusqueda && productosBusqueda.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {productosBusqueda.slice(0, 10).map(p => (
                          <button type="button" key={p.id} onClick={() => selectProducto(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center text-sm border-b last:border-0">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500">{p.codigo}</span>
                              <span>{p.nombre}</span>
                            </span>
                            {p.stockActual && <span className="text-xs text-gray-400">Stock: {p.stockActual.cantidad}</span>}
                          </button>
                        ))}
                        {productosBusqueda.length > 10 && <p className="px-3 py-1 text-xs text-gray-400">...y {productosBusqueda.length - 10} más</p>}
                      </div>
                    )}
                    {busquedaProducto.length >= 1 && productosBusqueda?.length === 0 && (
                      <p className="absolute z-10 mt-1 w-full bg-white border rounded-lg px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500">Tipo *</label>
                <select value={movForm.tipo} onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="devolucion_cliente">Devolución cliente</option>
                  <option value="devolucion_marca">Devolución marca</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Cantidad *</label>
                <input type="number" value={movForm.cantidad} onChange={e => setMovForm(f => ({ ...f, cantidad: Number(e.target.value) }))} required min={1} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Costo unitario</label>
                <input type="number" step="0.01" value={movForm.costoUnitario} onChange={e => setMovForm(f => ({ ...f, costoUnitario: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Campaña</label>
                <select value={movForm.campanaId} onChange={e => setMovForm(f => ({ ...f, campanaId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value={0}>Seleccionar</option>
                  {campanas?.map(c => <option key={c.id} value={c.id}>{c.marca?.nombre} C{c.numero}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Motivo</label>
              <input value={movForm.motivo} onChange={e => setMovForm(f => ({ ...f, motivo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowMovForm(false); resetForm(); }} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Cancelar</button>
              <button type="submit" disabled={!movForm.productoId} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}