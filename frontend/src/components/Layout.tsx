import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardPage from '../pages/DashboardPage';
import MarcasPage from '../pages/MarcasPage';
import CampanasPage from '../pages/CampanasPage';
import RevistaPage from '../pages/RevistaPage';
import ProductosPage from '../pages/ProductosPage';
import InventarioPage from '../pages/InventarioPage';
import ClientesPage from '../pages/ClientesPage';
import PedidosPage from '../pages/PedidosPage';
import PedidoMarcaPage from '../pages/PedidoMarcaPage';
import EntregasPage from '../pages/EntregasPage';
import CuentasCorrientesPage from '../pages/CuentasCorrientesPage';
import ReportesPage from '../pages/ReportesPage';
import AjustesPage from '../pages/AjustesPage';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/marcas" element={<MarcasPage />} />
          <Route path="/campanas" element={<CampanasPage />} />
          <Route path="/campanas/:campanaId/revista" element={<RevistaPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/nuevo" element={<PedidosPage />} />
          <Route path="/pedido-marca" element={<PedidoMarcaPage />} />
          <Route path="/entregas" element={<EntregasPage />} />
          <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/ajustes" element={<AjustesPage />} />
        </Routes>
      </main>
    </div>
  );
}