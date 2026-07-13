import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos iniciales...');

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const usuario = await prisma.usuario.upsert({
    where: { email: 'admin@inventario.local' },
    update: {},
    create: {
      nombre: 'Administradora',
      email: 'admin@inventario.local',
      password: hashedPassword,
      configuraciones: {
        create: {
          monedaSimbolo: '$',
          monedaDecimales: 0,
          pais: 'CL',
        },
      },
    },
  });
  console.log('✅ Usuario admin creado:', usuario.email);

  // Crear marcas
  const marcasData = [
    { nombre: 'Natura', slug: 'natura', color: '#E8782A' },
    { nombre: 'Avon', slug: 'avon', color: '#D4166E' },
    { nombre: 'Ésika', slug: 'esika', color: '#C49B2C' },
    { nombre: 'Osier', slug: 'osier', color: '#6B3FA0' },
    { nombre: 'Belcorp', slug: 'belcorp', color: '#00A3E0' },
  ];

  for (const m of marcasData) {
    await prisma.marca.upsert({
      where: { slug: m.slug },
      update: {},
      create: m,
    });
  }
  console.log('✅ Marcas creadas:', marcasData.map(m => m.nombre).join(', '));

  // Crear categorías genéricas
  const categoriasData = [
    { nombre: 'Fragancias' },
    { nombre: 'Maquillaje' },
    { nombre: 'Cuidado facial' },
    { nombre: 'Cuidado corporal' },
    { nombre: 'Cabello' },
    { nombre: 'Accesorios' },
  ];

  for (const c of categoriasData) {
    await prisma.categoria.upsert({
      where: { id: categoriasData.indexOf(c) + 1 },
      update: {},
      create: c,
    });
  }
  console.log('✅ Categorías creadas');

  console.log('🌱 Seed completado.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });