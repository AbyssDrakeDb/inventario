import { create } from 'zustand';
import api from '../api/client';
import type { Usuario } from '../types';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  usuario: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    set({ token: data.token, usuario: data.usuario });
  },

  register: async (nombre, email, password) => {
    const { data } = await api.post('/auth/register', { nombre, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    set({ token: data.token, usuario: data.usuario });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ token: null, usuario: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        set({ token, usuario, loading: false });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        set({ token: null, usuario: null, loading: false });
      }
    } else {
      set({ loading: false });
    }
  },
}));