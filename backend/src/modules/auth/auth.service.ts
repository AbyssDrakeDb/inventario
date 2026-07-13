import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../shared/prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'inventario-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  async login(email: string, password: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign({ usuarioId: usuario.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    };
  }

  async registrar(nombre: string, email: string, password: string) {
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      throw new Error('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        configuraciones: {
          create: {},
        },
      },
    });

    const token = jwt.sign({ usuarioId: usuario.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    };
  }

  async getProfile(usuarioId: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { configuraciones: true },
    });
    if (!usuario) throw new Error('Usuario no encontrado');

    const { password, ...rest } = usuario;
    return rest;
  }

  async actualizarConfig(usuarioId: number, data: { monedaSimbolo?: string; monedaDecimales?: number; pais?: string }) {
    return prisma.configuracion.upsert({
      where: { usuarioId },
      create: { usuarioId, monedaSimbolo: 'S/', monedaDecimales: 2, pais: 'PE', ...data },
      update: data,
    });
  }
}

export const authService = new AuthService();