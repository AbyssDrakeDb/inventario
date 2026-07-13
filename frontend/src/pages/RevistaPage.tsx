import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { RevistaItem } from '../types';
import { Upload, Search, DollarSign, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Money } from '../components/Money';

export default function RevistaPage() {
  const { campanaId } = useParams<{ campanaId: string }>();
  const [busqueda, setBusqueda] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: revista, isLoading } = useQuery<RevistaItem[]>({
    queryKey: ['revista', campanaId],
    queryFn: () => api.get(`/precios/revista/${campanaId}`).then(r => r.data),
    enabled: !!campanaId,
  });

  const filtered = revista?.filter(item =>
    !busqueda || item.codigo.toLowerCase().includes(busqueda.toLowerCase()) || item.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campanaId', campanaId || '');
      const res = await api.post('/precios/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { productosCreados, preciosCreados, errores } = res.data;
      if (errores && errores.length > 0) {
        toast.error(`${errores.length} error(es) en la importación. Revisa la consola.`, { duration: 6000 });
        console.warn('Errores de importación:', errores);
      }
      toast.success(`${productosCreados} productos y ${preciosCreados} precios importados correctamente`);
      queryClient.invalidateQueries({ queryKey: ['revista', campanaId] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally {
      setUploading(false);
      // Resetear el input para permitir re-subir el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) return <div className="text-gray-500">Cargando revista...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Revista / Catálogo</h2>
          <p className="text-sm text-gray-500">Campaña #{campanaId}</p>
        </div>
        <label className={`flex items-center gap-1 text-white px-3 py-2 rounded-lg text-sm cursor-pointer ${uploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
          <Upload size={16} /> {uploading ? 'Importando...' : 'Importar Excel'}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={uploading} ref={fileInputRef} />
        </label>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Buscar por código o nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="max-h-[calc(100vh-250px)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Código</th>
                <th className="px-4 py-2 font-medium text-gray-600">Producto</th>
                <th className="px-4 py-2 font-medium text-gray-600">Cat.</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">P. Contado</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">P. Revendedora</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Ganancia</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{item.codigo}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium">{item.nombre}</p>
                    {item.presentacion && <p className="text-xs text-gray-400">{item.presentacion}</p>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{item.categoria || '-'}</td>
                  <td className="px-4 py-2 text-right"><Money amount={item.precioContado} /></td>
                  <td className="px-4 py-2 text-right text-gray-500"><Money amount={item.precioRevendedora} /></td>
                  <td className="px-4 py-2 text-right font-medium text-green-600"><Money amount={item.gananciaUnitaria} /></td>
                  <td className="px-4 py-2 text-right text-xs">{item.margenPorcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered && (
        <div className="text-xs text-gray-400">{filtered.length} productos en esta campaña</div>
      )}
    </div>
  );
}