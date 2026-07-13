# 📦 Inventario VD — Sistema de Venta Directa

Sistema web para gestión de inventario y ventas de **revendedoras de catálogo** que manejan **varias marcas** (Natura, Avon, Ésika, Osier, Belcorp).

## 🚀 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Componentes | shadcn/ui + Lucide icons + Recharts |
| Estado | React Query + Zustand |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT + bcrypt |
| Export | ExcelJS + PDFKit |

## 📁 Estructura

```
inventario/
├── backend/          # API REST (Express + Prisma)
│   └── src/
│       ├── modules/  # auth, marcas, productos, campañas, precios,
│       │             # clientes, pedidos, inventario, reportes
│       └── shared/   # prisma, middlewares, utils
├── frontend/         # SPA (React + Vite + Tailwind)
│   └── src/
│       ├── pages/    # 12 vistas (Dashboard, Marcas, Campañas,
│       │             # Revista, Productos, Inventario, Clientes,
│       │             # Pedidos, PedidoMarca, Entregas, Reportes, Ajustes)
│       ├── components/ # Layout, Sidebar
│       ├── api/      # Cliente HTTP + interceptors
│       ├── hooks/    # useAuth (Zustand store)
│       └── types/    # Tipos TypeScript
├── docker-compose.yml
├── PLAN.md
└── README.md
```

## ⚡ Instalación y uso

### Requisitos
- Node.js 20+
- PostgreSQL 16+
- npm

### Desarrollo local

```bash
# 1. Clonar e instalar dependencias
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Configurar .env (ya creado con defaults para desarrollo)
#    Revisar DATABASE_URL y JWT_SECRET

# 3. Crear BD y migrar
cd backend
npx prisma migrate dev --name init
npm run db:seed
cd ..

# 4. Iniciar backend
cd backend && npm run dev &

# 5. Iniciar frontend
cd frontend && npm run dev &

# 6. Abrir http://localhost:5173
#    Login: admin@inventario.local / admin123
```

### Docker Compose

```bash
docker compose up -d
# Frontend → http://localhost
# Backend  → http://localhost:3001
# BD       → localhost:5432
```

## 🔐 Login demo

- Email: `admin@inventario.local`
- Contraseña: `admin123`

## 📋 Módulos

| Módulo | Funcionalidad |
|--------|--------------|
| **Dashboard** | KPIs: ganancia del mes, pedidos pendientes, alertas de stock |
| **Marcas** | ABM de marcas con color identificatorio |
| **Campañas** | Campañas numeradas por marca con vigencias y estados |
| **Revista** | Catálogo de productos por campaña con precios y ganancia unitaria + importación Excel |
| **Productos** | ABM con código único por marca, categoría, stock mínimo |
| **Inventario** | Stock actual/comprometido, movimientos (entrada/salida/devolución/ajuste), alertas |
| **Clientes** | Cartera de clientes con historial y saldo |
| **Pedidos** | Toma de pedido con buscador por código, congelado de precios, cálculo automático de ganancia |
| **Pedido a Marca** | Consolidado por campaña para enviar a la marca + registro de recepción con faltantes |
| **Entregas** | Marcar entregas a clientes y registrar cobros |
| **Reportes** | Ventas por campaña/marca, top productos, faltantes, stock valorizado + exportación Excel/PDF |
| **Ajustes** | Moneda configurable, país, datos de marcas |

## 🔄 Flujo principal

1. **Cargar catálogo** → Crear marca, campaña, importar productos/precios desde Excel
2. **Tomar pedido** → Elegir cliente + campaña, buscar productos por código, precios se congelan
3. **Consolidar y enviar a marca** → Sumar todos los pedidos, enviar pedido consolidado
4. **Recibir mercadería** → Registrar recepción, marcar faltantes
5. **Entregar a clientes** → Registrar salidas de stock, marcar entregado
6. **Reportes y ganancias** → Ver ganancia por campaña/marca/cliente/producto

## 🗄️ Backup y restauración

```bash
# Backup
docker exec inventario-db pg_dump -U postgres inventario > backup_$(date +%Y%m%d).sql

# Restauración
docker exec -i inventario-db psql -U postgres inventario < backup_20260710.sql
```

## 📝 Licencia

Uso personal — revendedora independiente.