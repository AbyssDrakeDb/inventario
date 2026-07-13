import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Marca } from '../types';
import toast from 'react-hot-toast';
import { Settings, Save } from 'lucide-react';

export default function AjustesPage() {
  const queryClient = useQueryClient();
  const [monedaSimbolo, setMonedaSimbolo] = useState('S/');
  const [monedaDecimales, setMonedaDecimales] = useState(2);
  const [pais, setPais] = useState('PE');

  const { data: marcas } = useQuery<Marca[]>({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });

  // Load config from profile
  useEffect(() => {
    api.get('/auth/profile').then(r => {
      const configs = r.data.configuraciones;
      if (configs && configs.length > 0) {
        setMonedaSimbolo(configs[0].monedaSimbolo || 'S/');
        setMonedaDecimales(configs[0].monedaDecimales || 2);
        setPais(configs[0].pais || 'PE');
      }
    }).catch(() => {});
  }, []);

  const configMutation = useMutation({
    mutationFn: (data: { monedaSimbolo: string; monedaDecimales: number; pais: string }) =>
      api.put('/auth/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Configuración guardada');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al guardar'),
  });

  const handleSave = () => {
    configMutation.mutate({ monedaSimbolo, monedaDecimales, pais });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Settings size={20} /> Ajustes
      </h2>

      {/* Moneda */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Moneda y formato</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500">Símbolo</label>
            <input value={monedaSimbolo} onChange={e => setMonedaSimbolo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Decimales</label>
            <input type="number" value={monedaDecimales} min={0} max={4} onChange={e => setMonedaDecimales(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">País</label>
            <select value={pais} onChange={e => setPais(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="PE">Perú (S/)</option>
              <option value="CO">Colombia ($)</option>
              <option value="CL">Chile ($)</option>
              <option value="AR">Argentina ($)</option>
              <option value="MX">México ($)</option>
              <option value="EC">Ecuador ($)</option>
              <option value="BO">Bolivia (Bs)</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
          <Save size={16} /> Guardar
        </button>
      </div>

      {/* Marcas activas summary */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Marcas configuradas</h3>
        <div className="space-y-2">
          {marcas?.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: m.color || '#ccc' }} />
              <span className="text-sm">{m.nombre}</span>
              {m.activa ? <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Activa</span> : <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactiva</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Backup info */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Respaldo</h3>
        <p className="text-sm text-gray-500">Próximamente: exportar/respaldar base de datos desde esta sección.</p>
      </div>
    </div>
  );
}