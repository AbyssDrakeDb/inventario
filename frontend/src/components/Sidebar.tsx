import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Tags, CalendarRange, BookOpen, Package,
  Boxes, Users, ShoppingCart, Truck, ClipboardCheck,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, CreditCard,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/marcas', icon: Tags, label: 'Marcas' },
  { to: '/campanas', icon: CalendarRange, label: 'Campañas' },
  { to: '/productos', icon: Package, label: 'Productos' },
  { to: '/inventario', icon: Boxes, label: 'Inventario' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/pedido-marca', icon: Truck, label: 'Pedido a Marca' },
  { to: '/entregas', icon: ClipboardCheck, label: 'Entregas' },
  { to: '/cuentas-corrientes', icon: CreditCard, label: 'CxC' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200">
        {!collapsed && (
          <h1 className="font-bold text-primary-700 text-sm truncate">Inventario VD</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-gray-200 p-3">
        {!collapsed && usuario && (
          <p className="text-xs text-gray-500 mb-2 truncate">{usuario.nombre}</p>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 w-full"
        >
          <LogOut size={16} />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </aside>
  );
}