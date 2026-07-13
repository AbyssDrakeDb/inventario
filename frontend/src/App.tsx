import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MarcasPage from './pages/MarcasPage';
import CampanasPage from './pages/CampanasPage';
import RevistaPage from './pages/RevistaPage';
import ProductosPage from './pages/ProductosPage';
import InventarioPage from './pages/InventarioPage';
import ClientesPage from './pages/ClientesPage';
import PedidosPage from './pages/PedidosPage';
import PedidoMarcaPage from './pages/PedidoMarcaPage';
import EntregasPage from './pages/EntregasPage';
import ReportesPage from './pages/ReportesPage';
import AjustesPage from './pages/AjustesPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

// Layout contiene sus propias rutas:
export { default as Layout } from './components/Layout';
export { DashboardPage, MarcasPage, CampanasPage, RevistaPage, ProductosPage, InventarioPage, ClientesPage, PedidosPage, PedidoMarcaPage, EntregasPage, ReportesPage, AjustesPage };