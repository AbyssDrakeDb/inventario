import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Campana, PedidoItem } from '../types';
import toast from 'react-hot-toast';
import { Truck, Package, AlertTriangle } from 'lucide-react';

export default function PedidoMarcaPage() {
  const queryClient = useQueryClient();
  const [selectedCampana, setSelectedCampana] = useState<number | ''>('');

  const { data: campanas } = useQuery<Campana[]>({
    queryKey: ['campanas'],
    queryFn: () => api.get('/campanas', { params: { estado: 'abierta' } }).then(r => r.data),
  });

  // Get consolidated items for the selected campaign
  const { data: consolidado, isLoading: consLoading } = useQuery<any>({
    queryKey: ['consolidado', selectedCampana],
    queryFn: () => api.get(`/pedidos`, { params: { campanaId: selectedCampana, estado: 'confirmado' } }).then(r => {
      // Also fetch parcial and enviado_a_marca
      return Promise.all([
        api.get('/pedidos', { params: { campanaId: selectedCampana, estado: 'confirmado' } }).then(r => r.data),
        api.get('/pedidos', { params: { campanaId: selectedCampana, estado: 'enviado_a_marca' } }).then(r => r.data),
        api.get('/pedidos', { params: { campanaId: selectedCampana, estado: 'parcial' } }).then(r => r.data),
      ]).then(([confirmados, enviados, parciales]) => {
        const todos = [...confirmados, ...enviados, ...parciales];
        const porProducto = new Map<number, any>();
        for (const pedido of todos) {
          for (const item of (pedido.items || [])) {
            const existente = porProducto.get(item.productoId) || {
              productoId: item.productoId,
              codigo: item.producto?.codigo || '?',
              nombre: item.producto?.nombre || '?',
              cantidadPedida: 0,
              cantidadRecibida: 0,
              items: [] as PedidoItem[],
            };
            existente.cantidadPedida += item.cantidad;
            existente.cantidadRecibida += item.cantidadRecibida || 0;
            existente.items.push(item);
            porProducto.set(item.productoId, existente);
          }
        }
        return Array.from(porProducto.values());
      });
    }),
    enabled: !!selectedCampana,
  });

  const registrarRecepcion = useMutation({
    mutationFn: (data: { productoId?: number; cantidadRecibida?: number; campanaId: number; items?: Array<{ productoId: number; cantidadRecibida: number }> }) => {
      // Si ya viene con items[], usar directamente; si no, crear array de 1 elemento
      const items = data.items || [{ productoId: data.productoId!, cantidadRecibida: data.cantidadRecibida! }];
      return api.post('/pedidos/recibir-marca', { campanaId: data.campanaId, items });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['consolidado'] });
      const estados = res.data?.resultados?.filter((r: any) => r.estado) || [];
      if (estados.length > 0) {
        toast.success(`Recepción registrada — ${estados.length} pedido(s) actualizado(s)`);
      } else {
        toast.success('Recepción registrada');
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al registrar recepción'),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Pedido a la marca</h2>

      <div>
        <label className="text-sm text-gray-500">Seleccionar campaña para consolidar:</label>
        <select
          value={selectedCampana}
          onChange={e => setSelectedCampana(e.target.value ? Number(e.target.value) : '')}
          className="ml-2 border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">— Elegir campaña —</option>
          {campanas?.filter(c => c.estado === 'abierta').map(c => (
            <option key={c.id} value={c.id}>{c.marca?.nombre} — Campaña {c.numero}</option>
          ))}
        </select>
      </div>

      {consLoading && <div className="text-gray-500">Consolidando pedidos...</div>}

      {consolidado && consolidado.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Truck size={18} />
              <span>Consolidado para enviar a la marca — {consolidado.length} productos, {
                consolidado.reduce((s: number, p: any) => s + p.cantidadPedida, 0)} unidades totales
              </span>
            </div>
            {/* Botón Recibir todo */}
            {consolidado.some((p: any) => (p.cantidadPedida - (p.cantidadRecibida || 0)) > 0) && (
              <button
                onClick={() => {
                  const itemsPendientes = consolidado
                    .filter((p: any) => (p.cantidadPedida - (p.cantidadRecibida || 0)) > 0)
                    .map((p: any) => ({
                      productoId: p.productoId,
                      cantidadRecibida: p.cantidadPedida - (p.cantidadRecibida || 0),
                    }));
                  registrarRecepcion.mutate({
                    campanaId: Number(selectedCampana),
                    items: itemsPendientes,
                  });
                }}
                disabled={registrarRecepcion.isPending}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {registrarRecepcion.isPending ? 'Recibiendo...' : `Recibir todo (${consolidado.reduce((s: number, p: any) => s + (p.cantidadPedida - (p.cantidadRecibida || 0)), 0)} uds)`}
              </button>
            )}
          </div>

          <div className="bg-white border rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">Código</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Producto</th>
                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Pedido</th>
                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Recibido</th>
                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Faltante</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidado.map((p: any) => (
                    <tr key={p.productoId} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{p.codigo}</td>
                      <td className="px-4 py-2.5">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{p.cantidadPedida}</td>
                      <td className="px-4 py-2.5 text-right">{p.cantidadRecibida || 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        {p.cantidadPedida - (p.cantidadRecibida || 0) > 0 ? (
                          <span className="text-red-600 flex items-center justify-end gap-1">
                            <AlertTriangle size={14} /> {p.cantidadPedida - (p.cantidadRecibida || 0)}
                          </span>
                        ) : <span className="text-green-600">✓</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <RecibirButton
                          productoId={p.productoId}
                          cantidadPedida={p.cantidadPedida}
                          cantidadRecibida={p.cantidadRecibida || 0}
                          campanaId={Number(selectedCampana)}
                          onRecibir={(productoId, cant, campId) => registrarRecepcion.mutate({ productoId, cantidadRecibida: cant, campanaId: campId })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {consolidado && consolidado.length === 0 && selectedCampana && (
        <div className="text-gray-500 text-center py-8 border rounded-xl bg-white">
          <Package size={32} className="mx-auto text-gray-300 mb-2" />
          <p>No hay pedidos confirmados para esta campaña</p>
        </div>
      )}
    </div>
  );
}

function RecibirButton({ productoId, cantidadPedida, cantidadRecibida, campanaId, onRecibir }: {
  productoId: number; cantidadPedida: number; cantidadRecibida: number; campanaId: number;
  onRecibir: (pid: number, cant: number, cid: number) => void;
}) {
  const [show, setShow] = useState(false);
  const [cantidad, setCantidad] = useState(cantidadPedida - cantidadRecibida);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popupStyle, setPopupStyle] = useState({});

  useEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupStyle({
        position: 'fixed' as const,
        top: rect.bottom + 4,
        left: rect.left,
        zIndex: 9999,
      });
    }
  }, [show]);

  const faltante = cantidadPedida - cantidadRecibida;
  if (faltante <= 0) return <span className="text-xs text-green-600">Completo</span>;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => { setShow(!show); setCantidad(faltante); }}
        className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
      >
        Recibir
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShow(false)} />
          <div style={popupStyle} className="bg-white border rounded-lg shadow-xl p-3 w-52">
            <p className="text-xs text-gray-500 mb-1">Recibir <strong>{faltante}</strong> unidades</p>
            <input
              type="number"
              value={cantidad}
              min={1}
              max={faltante}
              onChange={e => setCantidad(Number(e.target.value))}
              className="w-full border rounded px-2 py-1.5 text-sm mb-2"
              autoFocus
            />
            <button
              onClick={() => { onRecibir(productoId, cantidad, campanaId); setShow(false); }}
              className="w-full bg-green-600 text-white text-sm px-2 py-1.5 rounded hover:bg-green-700"
            >
              Registrar recepción
            </button>
          </div>
        </>
      )}
    </>
  );
}