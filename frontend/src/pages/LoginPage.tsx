import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'login' | 'register'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        await register(nombre, email, password);
      }
      toast.success(modo === 'login' ? 'Bienvenida!' : 'Cuenta creada!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-800">Inventario VD</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de venta directa</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setModo('login')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${modo === 'login' ? 'bg-white shadow text-primary-700 font-medium' : 'text-gray-500'}`}
          >
            Ingresar
          </button>
          <button
            onClick={() => setModo('register')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${modo === 'register' ? 'bg-white shadow text-primary-700 font-medium' : 'text-gray-500'}`}
          >
            Registro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Tu nombre"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="admin@inventario.local"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Procesando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        {modo === 'login' && (
          <p className="text-xs text-gray-400 text-center mt-6">
            Usuario demo: admin@inventario.local / admin123
          </p>
        )}
      </div>
    </div>
  );
}