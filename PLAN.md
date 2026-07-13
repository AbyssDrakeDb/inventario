# Plan Detallado — Sistema de Inventario para Revistas de Venta Directa

> Sistema de inventario y gestión de ventas adaptado al modelo de catálogo/revista
> por campañas, estilo **Natura, Avon, Ésika, Osier, Belcorp**.

---

## 0. Resumen ejecutivo

Se construirá una **aplicación web** para que una **revendedora** gestione de forma unificada su negocio
de venta directa a través de **varias marcas** (Natura, Avon, Ésika, Osier, Belcorp), cada una con su propio
ciclo de campañas y sus propios precios.

El sistema cubre cuatro bloques:

1. **Gestión de campañas y revistas** — catálogos numerados por campaña, con vigencias y precios por campaña.
2. **Inventario y stock** — entradas (recepción de la marca), salidas (entrega a clientes), alertas de stock mínimo.
3. **Pedidos y clientes** — cartera de clientes, toma de pedidos contra la revista, estados del pedido, saldos.
4. **Utilidades, reportes y ganancias** — margen por producto/campaña, reportes de ventas, exportación a Excel/PDF.

**Stack:** React + TypeScript (frontend) · Node.js + Express + Prisma (backend) · PostgreSQL (base de datos).

---

## 1. Objetivos y alcance

### 1.1 Objetivos

- Centralizar en una sola herramienta el control de inventario y ventas de **múltiples marcas** que operan
  por campañas, cada una con su propia numeración y precios.
- Calcular automáticamente la **ganancia** (precio cliente − precio revendedora) por pedido, por campaña y por marca.
- Mantener el **stock siempre al día** a partir de los movimientos reales (recepción y entrega).
- Generar **reportes exportables** (Excel/PDF) para responder a la marca y llevar las cuentas.

### 1.2 En el alcance (MVP → iterativo)

- Administración de marcas, campañas, productos y precios por campaña.
- Gestión de clientes y toma de pedidos contra una campaña.
- Control de stock por movimientos (entradas/salidas/devoluciones/ajustes) con stock actual y alertas.
- Recepción de mercadería desde la marca (con manejo de faltantes) y entrega a clientes.
- Cálculo de ganancias y reportes por campaña, marca, cliente y producto.
- Exportación a Excel y PDF.

### 1.3 Fuera del alcance (inicialmente)

- Multiusuario / roles (es para una sola revendedora).
- App móvil nativa o pasarela de pagos en línea.
- Integración automática con portales de cada marca (Natura, Avon, etc.) — los pedidos a la marca
  se registran manualmente; el sistema no se conecta a sus APIs.
- Facturación fiscal electrónica (se puede sumar después).
- Cuotas e intereses sobre pagos diferidos.
- Conciliación bancaria automática.

---

## 2. Contexto del dominio (modelo de venta directa por catálogo)

Este es el núcleo del sistema: entender cómo funcionan estas marcas evita modelar un inventario genérico
que no encaje.

### 2.1 Marcas con campañas independientes

Cada marca maneja **sus propias campañas numeradas**, con **períodos distintos**:

- Una campaña tiene: **número**, **fecha de inicio**, **fecha de fin de vigencia** (hasta cuándo el cliente
  puede pedir de esa revista) y **fecha de pedido a la marca** (hasta cuándo la revendedora consolida y envía).
- Las campañas **no coinciden** entre marcas: Natura puede estar en su campaña 8 mientras Avon va por la 15.
  Por eso la `Campaña` siempre pertenece a una `Marca`.

> Ejemplo: «Natura campaña 8» y «Avon campaña 15» existen a la vez, cada una con su catálogo y precios.

### 2.2 Niveles de precio (clave para la ganancia)

Estas marcas distinguen al menos dos precios por producto:

| Concepto | Significado |
|---|---|
| **Precio contado / catálogo** | Lo que paga el **cliente final**. Es el precio de la revista. |
| **Precio revendedora / de costo** | Lo que la revendedora **paga a la marca**. |
| **Ganancia** | `Precio contado − Precio revendedora` (por unidad). |

Algunas marcas además manejan:
- **Precio crédito** (cliente que paga en cuotas, suele ser mayor al contado).
- **Precio oferta / crono** (promociones por un período corto dentro de la campaña).
- **Bonificación por volumen** (descuento adicional según el total del pedido a la marca).

> El sistema modela precios **por campaña**: el mismo producto puede tener precios distintos en la campaña 7 y la 8.
> Los precios se almacenan como `(producto, campaña)`.

### 2.3 Flujo de pedidos (dos órdenes distintos)

Hay **dos pedidos** que conviene no confundir:

1. **Pedido del cliente** — lo que un cliente pide a la revendedora desde la revista de una campaña.
   Genera una **ganancia potencial** (no realizada hasta que se entrega y cobra).
2. **Pedido a la marca** — el **consolidado** que la revendedora envía a Natura/Avon/etc.,
   sumando todos los pedidos de clientes de esa campaña. Sirve para **reconciliar** lo pedido
   vs. lo efectivamente recibido (suele haber **faltantes**).

### 2.4 Recepción y entrega (afecta stock)

- **Recepción** (entrada de stock): llega el producto desde la marca → `movimiento de entrada`.
  Si llegan menos unidades de las pedidas → **faltante** (marca items del pedido del cliente como “no recibido”).
- **Entrega** (salida de stock): la revendedora entrega al cliente → `movimiento de salida`.
- **Devolución**: si el cliente devuelve → entrada de stock + ajuste de saldo; si se devuelve a la marca → salida.

### 2.5 Glosario

- **Campaña** — período numerado de una marca con su catálogo y precios (ej. “Natura C8”).
- **Revista / Catálogo** — los productos vigentes en una campaña con sus precios.
- **Vigencia** — ventana de tiempo en la que el cliente puede pedir de esa campaña.
- **Precio contado / revendedora / crédito** — niveles de precio definidos en §2.2.
- **Pedido del cliente** — solicitud de un cliente contra una campaña.
- **Pedido a la marca** — consolidado enviado a la empresa.
- **Faltante** — producto no entregado por la marca.
- **Stock comprometido** — unidades ya vendidas a clientes pero aún no entregadas (reservadas).
- **Cuenta corriente** — saldo que un cliente adeuda (cuando compra en cuotas/pago diferido).

---

## 3. Requisitos funcionales por módulo

### 3.1 Módulo A — Campañas y revistas

- **ABM de marcas:** nombre, color/ícono identificatorio, activa/inactiva.
- **ABM de campañas:** por marca, número, nombre, fechas (inicio, fin vigencia, pedido a la marca),
  estado (abierta / cerrada / cancelada).
- **ABM de productos:** código, nombre, descripción, categoría, presentación/contenido, marca.
- **Precios por campaña:** para cada producto en cada campaña, registrar precio contado, precio
  revendedora y (opcional) precio crédito / oferta / bonificación.
- **Vista de revista:** listar los productos de una campaña con sus precios y la ganancia unitaria calculada.
- **Importación de catálogo:** carga masiva de productos/precios desde Excel/CSV (las marcas entregan
  el catálogo en planillas). Esto acelera muchísimo el alta de cada campaña.

### 3.2 Módulo B — Inventario y stock

- **Stock por movimientos:** no se edita el stock a mano; se registran **movimientos** y el stock actual
  se calcula (o se mantiene denormalizado para lectura rápida).
- **Tipos de movimiento:**
  - `entrada` — recepción desde la marca.
  - `salida` — entrega a cliente (anula stock).
  - `devolucion_cliente` — cliente devuelve (suma stock).
  - `devolucion_marca` — se devuelve a la marca (resta stock).
  - `ajuste` — corrección manual con motivo (merma, conteo, etc.).
- **Vista de stock actual** por producto/marca, con stock disponible (= actual − comprometido).
- **Alertas:** stock mínimo configurable por producto; aviso cuando el stock cae bajo el mínimo.
- **Stock por campaña:** ver mercadería de una campaña específica.
- **Historial de movimientos** con filtros (fecha, marca, producto, tipo, lote).

### 3.3 Módulo C — Pedidos y clientes

- **ABM de clientes:** nombre, teléfono, dirección, ciudad, notas, fecha de alta.
- **Toma de pedido:**
  - Seleccionar cliente y campaña.
  - Agregar ítems desde la revista (búsqueda por código/nombre), con cantidad.
  - El sistema **congela el precio** del ítem (snapshot) al momento del pedido, para que un cambio
    posterior de precio en la campaña no afecte pedidos ya tomados.
  - Calcula **total al cliente**, **total a la marca** y **ganancia esperada**.
- **Estados del pedido:** `borrador → confirmado → enviado_a_marca → parcial → recibido → entregado → cancelado`.
- **Estados de pago (nuevo):** `pendiente → parcial → pagado → credito`. Cada pedido tiene un `estadoPago` que se define al entregar.
- **Entrega con cobro integrado:** al marcar un pedido como entregado, se abre un modal para registrar cómo pagó el cliente (completo/parcial/crédito). Se crea automáticamente un registro en `Pago` y se actualiza `Cliente.saldo`.
- **Cuenta corriente del cliente (implementado):** cada cliente tiene un `saldo` que se actualiza automáticamente con cada entrega y cada abono. Desde la pantalla de clientes o desde la nueva sección **CxC** se puede ver el detalle de deudas y registrar abonos.
- **Abonos posteriores:** un cliente puede venir después a pagar parte o toda su deuda. Se registra como abono contra un pedido específico o como abono general.

### 3.4 Módulo D — Utilidades, reportes y ganancias

- **Ganancia por pedido, por campaña, por marca y por cliente** (real = entregado y cobrado;
  potencial = confirmado no entregado).
- **Margen porcentaje:** `ganancia / precio contado × 100` por producto.
- **Reportes:**
  - Ventas por campaña (totales contado/revendedora/ganancia).
  - Productos más vendidos.
  - Faltantes por campaña.
  - Stock actual y valorizado (a precio revendedora).
  - Saldo de clientes.
- **Exportación a Excel y PDF** de reportes y del libro de pedidos de una campaña.
- **Dashboard** con KPIs: ganancia del mes/campaña activa, pedidos pendientes, alertas de stock.

---

## 4. Requisitos no funcionales

- **Seguridad:** login con usuario/contraseña (aunque sea una sola usuaria) y sesiones por JWT.
  Contraseñas hasheadas (bcrypt). HTTPS en producción.
- **Backups:** exportación/respaldo periódico de la base (script o Volúmen de Docker).
- **rendimiento:** tablas con stock muy grande deben paginar/search por servidor; índices en
  `(producto_id, campaña_id)` para precio y en `(producto_id, fecha)` para movimientos.
- **Usabilidad:** debe ser ágíl para uso intensivo desde PC y tablet; búsqueda rápida por **código**
  (las revendedoras trabajan mucho con códigos).
- **Moneda configurable:** el símbolo de moneda (S/, $, etc.) y el separador decimal deben ser
  configurables, ya que el país no está fijado. Por defecto configurable en `ajustes`.
- **Internacionalización mínima:** todo el texto en español; fechas en formato `dd/mm/yyyy`.

---

## 5. Arquitectura técnica

### 5.1 Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite · Tailwind CSS · React Router |
| Componentes UI | shadcn/ui (o equivalente) — tablas, modales, formularios |
| Estado / datos | React Query (servidor) + Zustand/Context (UI) |
| Tablas / reportes | Tabla virtualizada para catálogos grandes · Recharts para gráficos |
| Backend | Node.js + Express (TypeScript) |
| ORM | Prisma (migraciones + tipado) |
| Base de datos | PostgreSQL |
| Auth | JWT + bcrypt |
| Excel/PDF | `exceljs` (Excel) · `pdfkit` o `puppeteer` (PDF) |

### 5.2 Capas del backend

```
src/
  modules/
    marcas/
    campañas/
    productos/
    precios/
    clientes/
    pedidos/
    inventario/
    reportes/
    auth/
  shared/
    prisma/         // schema + cliente
    middlewares/
    utils/
  server.ts
```

- **Controllers** (Express) → **Services** (lógica de negocio) → **Prisma** (acceso a datos).
- Validación de entrada con Zod.
- Cada movimiento de stock se hace en **transacción** para mantener consistencia.

### 5.3 Capas del frontend

```
src/
  pages/        // vistas por módulo
  components/   // UI reutilizable (tabla pedidos, buscador de productos, etc.)
  api/          // cliente HTTP + React Query hooks
  hooks/
  types/
```

### 5.4 Despliegue

- Opción simple: **Docker Compose** con tres servicios (app frontend servida por nginx, backend
  Node, PostgreSQL). Todo corre en la máquina de la revendedora o en un servidor pequeño.
- Variables de entorno para conexión a BD, JWT secret y moneda.

---

## 6. Modelo de datos (entidades principales)

> Clave foránea `marca_id` en productos, campañas y precios para mantener las marcas separadas.

### 6.1 Tablas

**Marca**
- `id`, `nombre`, `slug`, `color`, `activa`, `created_at`

**Categoria**
- `id`, `nombre`, `marca_id` (nullable)

**Producto**
- `id`, `marca_id`, `codigo` (único por marca), `nombre`, `descripcion`, `categoria_id`,
  `presentacion`, `stock_minimo`, `activo`, `created_at`
- Índice único: `(marca_id, codigo)`.

**Campaña**
- `id`, `marca_id`, `numero`, `nombre`, `fecha_inicio`, `fecha_fin_vigencia`,
  `fecha_pedido_marca`, `estado` (abierta/cerrada/cancelada), `created_at`
- Índice único: `(marca_id, numero)`.

**PrecioProducto**  *(precio por producto en una campaña)*
- `id`, `producto_id`, `campaña_id`, `precio_contado`, `precio_revendedora`, `precio_credito`,
  `precio_oferta`, `es_oferta`, `bonificacion`
- Índice único: `(producto_id, campaña_id)`.

**Cliente**
- `id`, `nombre`, `telefono`, `direccion`, `ciudad`, `notas`, `saldo`, `created_at`

**Pedido**  *(pedido de un cliente contra una campaña)*
- `id`, `cliente_id`, `campaña_id`, `fecha`, `estado`, `estado_pago` (pendiente/parcial/pagado/credito),
  `total_contado`, `total_revendedora`, `ganancia`, `created_at`

**PedidoItem**
- `id`, `pedido_id`, `producto_id`, `cantidad`, `cantidad_entregada`, `cantidad_faltante`,
  `precio_contado_unit` (snapshot), `precio_revendedora_unit` (snapshot), `subtotal_contado`,
  `subtotal_revendedora`, `estado_item` (esperando/parcial/entregado/faltante)
- Los precios se **congelan** (snapshot) para no mutar si cambia el precio de la campaña.

**MovimientoInventario**
- `id`, `producto_id`, `tipo` (entrada/salida/devolucion_cliente/devolucion_marca/ajuste),
  `cantidad`, `costo_unitario`, `motivo`, `fecha`, `pedido_id` (nullable), `campaña_id`
- El **stock actual** = Σ movimientos por producto (se mantiene una tabla `StockActual`
  denormalizada para lectura rápida, actualizada en la misma transacción del movimiento).

**StockActual**  *(denormalizado, se recalcula en cada movimiento)*
- `producto_id` (PK), `cantidad`, `comprometida`, `updated_at`

**PedidoMarca**  *(consolidado enviado a la marca — opcional pero recomendado)*
- `id`, `campaña_id`, `fecha_envio`, `estado`, `total_revendedora`

**PedidoMarcaItem**
- `id`, `pedido_marca_id`, `producto_id`, `cantidad_pedida`, `cantidad_recibida`

**Pago**  *(cuenta corriente del cliente — implementado)*
- `id`, `cliente_id`, `pedido_id` (nullable), `fecha`, `monto`, `tipo` (completo/parcial/credito/abono), `notas`
- Se crea automáticamente al entregar (completo/parcial/crédito) o manualmente al registrar un abono.
- `Cliente.saldo` se actualiza en la misma transacción: incrementa con entregas a crédito/parcial, decrementa con abonos.

### 6.2 Relaciones resumidas

```
Marca 1───* Campaña
Marca 1───* Producto ───1 * Categoria
Producto 1───* PrecioProducto *───1 Campaña
Producto 1───* PrecioProducto *───1 Campaña
Cliente 1───* Pedido *───1 Campaña
Pedido 1───* PedidoItem *───1 Producto
Producto 1───* MovimientoInventario
Cliente 1───* Pago *───? Pedido
Campaña 1───* PedidoMarca 1───* PedidoMarcaItem
```

---

## 7. Flujos principales

### 7.1 Tomar un pedido de cliente
1. Revendedora elige cliente + campaña.
2. Agrega productos (por código/nombre) con cantidad → el sistema trae precios de esa campaña.
3. Al guardar, cada ítem **congela** sus precios (snapshot) y se calcula total contado / total
   revendedora / ganancia del pedido.
4. Estado inicial: `confirmado`. Stock comprometido += cantidades (si la revendedora vende con stock).

### 7.2 Generar pedido a la marca (consolidado)
1. Para una campaña, el sistema **suma** las cantidades pedidas por todos los clientes por producto.
2. La revendedora revisa y (opcional) ajusta → se guarda como `PedidoMarca`.
3. Marca los pedidos de clientes como `enviado a la marca`.

### 7.3 Recepción de mercadería (entrada de stock)
1. Llega la mercadería; la revendedora registra cuántas unidades **realmente llegaron** por producto.
2. Por cada producto recibido → `movimiento entrada` (transacción) → actualiza `StockActual`.
3. Si llegó menos de lo pedido → marca `cantidad_faltante` en los ítems y dejar el item en `parcial`/`faltante`.
4. Los pedidos de clientesPasados a `recibido` (los que llegaron completo).

### 7.4 Entrega al cliente (salida de stock + cobro)
1. Revendedora entrega los productos al cliente.
2. **Modal de cobro:** al hacer click en "Entregar y cobrar" se abre un diálogo donde se elige la forma de pago:
   - **Pago completo** → se registra Pago por el total, estadoPago = `pagado`. Saldo del cliente no cambia.
   - **Pago parcial** → se ingresa el monto recibido, estadoPago = `parcial`. Saldo += (total − montoPagado).
   - **Crédito / fiado** → no paga ahora, estadoPago = `credito`. Saldo += totalContado (debe todo).
3. Se crea `movimiento salida` por cada ítem → descuenta `StockActual`.
4. Se marca cada ítem como `entregado`, el pedido pasa a estado `entregado`.
5. Todo ocurre en **una sola transacción** (stock + pago + saldo).

### 7.5 Abono posterior (cuenta corriente)
1. El cliente viene después a pagar su deuda.
2. Desde **Clientes** (botón "Cobrar") o desde **CxC** (Cuentas por Cobrar), se abre el modal de cuenta corriente.
3. Muestra: saldo actual, deudas pendientes (pedidos no pagados), historial de pagos.
4. Se ingresa el monto del abono, opcionalmente vinculado a un pedido específico.
5. Se crea un `Pago` tipo `abono`, se reduce `Cliente.saldo`.
6. Si la suma de pagos cubre el total del pedido, `estadoPago` cambia a `pagado`.

### 7.6 Cierre de campaña
1. Verificar pedidos entregados y gestionar faltantes/devoluciones.
2. Reporte de campaña: total vendido, total a pagar a la marca, **ganancia real**, stock sobrante.
3. Estado de campaña → `cerrada`.

---

## 8. Pantallas principales (UI)

1. **Dashboard** — KPIs: ganancia del mes, pedidos pendientes, campañas activas, alertas de stock, **deuda pendiente de clientes**.
2. **Marcas** — listado y edición.
3. **Campañas** — listado por marca, alta con fechas visibles (inicio, fin vigencia, pedido a marca), abrir/cerrar.
4. **Revista / Catálogo** — productos de una campaña con precios y ganancia; botón **importar Excel**.
5. **Productos** — buscador por código, ABM, stock mínimo por producto.
6. **Inventario** — stock actual por producto/marca, alertas, historial de movimientos, alta de movimiento.
7. **Clientes** — listado con búsqueda, columna "Saldo" con color (rojo si debe), botón **"Cobrar"** que abre el modal de cuenta corriente.
8. **Pedidos** — toma de pedido (buscador de productos), listado con filtros por campaña/estado.
9. **Pedido a la marca** — consolidado por campaña y registro de recepción (con faltantes).
10. **Entregas** — pedidos pendientes de entregar. Al entregar se abre **modal de cobro** con opciones: pago completo / parcial / crédito. Registra el pago y actualiza el saldo automáticamente en 1 transacción.
11. **CxC (Cuentas por Cobrar)** — página dedicada con todos los clientes deudores (`saldo > 0`). Muestra total de deuda, contacto, último pago, pedidos pendientes. Botón "Cobrar" que abre el detalle de cuenta corriente.
12. **Reportes** — ventas por campaña/marca, top productos, faltantes, stock valorizado. Exportación Excel/PDF (próximamente).
13. **Ajustes** — moneda configurable (símbolo, decimales, país).

---

## 9. Plan de desarrollo por fases

> Cada fase entrega algo utilizable y demostrable. El orden prioriza poder **cargar catálogo y tomar
> pedidos** cuanto antes (el núcleo del negocio).

### Fase 0 — Setup del proyecto
- Monorepo (carpetas `frontend/`, `backend/`) o repo único.
- Inicializar backend (Express + Prisma + PostgreSQL) y frontend (Vite + React + TS + Tailwind).
- Esquema base de Prisma con `Marca`, `Campaña`, `Producto`, `PrecioProducto`, `Categoria`.
- Autenticación básica (login JWT) para una usuaria.
- **Entregable:** proyecto corriendo en local con login.

### Fase 1 — Catálogo (Marcas, campañas, productos, precios)
- CRUD de marcas, categorías, campañas y productos.
- Precios por campaña + vista de revista con ganancia unitaria.
- Importación de catálogo desde Excel.
- **Entregable:** poder cargar y revisar una campaña completa de una marca.

### Fase 2 — Inventario
- Alta de producto con stock inicial (movimiento `ajuste`/`entrada` inicial).
- Movimientos (entrada/salida/devolución/ajuste) con transacciones.
- `StockActual` denormalizado y vista de stock actual + disponibles.
- Alertas de stock mínimo (en dashboard y en listado).
- **Entregable:** control de inventario operativo.

### Fase 3 — Clientes y pedidos
- CRUD de clientes.
- Toma de pedido contra campaña con buscador por código y **congelado de precios**.
- Listado de pedidos con filtros por campaña/estado; edición y cancelación.
- Cálculo de total contado / revendedora / ganancia por pedido.
- **Entregable:** tomar y gestionar pedidos de clientes.

### Fase 4 — Recepción y entrega (cierres del flujo de stock)
- Pedido a la marca (consolidado por campaña).
- Registro de recepción con **faltantes**.
- Entrega a clientes (salidas de stock, estados).
- **Entregable:** flujo completo pedido → marca → recepción → entrega.

### Fase 5 — Utilidades y reportes
- Dashboard con KPIs.
- Reportes: por campaña, por marca, por cliente, productos top, faltantes, stock valorizado.
- Exportación a Excel y PDF.
- **Entregable:** reportes y ganancias calculadas.

### Fase 6 — Cuenta corriente y cobros (implementado)
- **Entrega con cobro integrado:** al entregar un pedido se abre modal para registrar pago completo / parcial / crédito con actualización automática de `Cliente.saldo` y creación de `Pago`.
- **Abonos posteriores:** desde clientes o desde la nueva sección CxC se pueden registrar abonos contra pedidos específicos o abonos generales.
- **Cuentas por Cobrar (CxC):** página dedicada que lista clientes deudores con saldo, contacto y detalle de pedidos pendientes.
- **Dashboard actualizado:** nuevo KPI de deuda pendiente total.
- **Bonificación por volumen y precio crédito** (pendiente para futura iteración).

### Fase 7 — Despliegue y respaldos
- Docker Compose (frontend + backend + Postgres).
- Script de backup/restore de la base.
- Documentación de instalación (README).
- **Entregable:** sistema instalable y respaldado.

---

## 10. Consideraciones de implementación

- **Precios por campaña:** nunca reutilizar el precio de la campaña 7 para la 8. Cada campaña carga sus
  propios precios; el sistema copia los de la campaña anterior como base al dar de alta una nueva
  (modificable), para ahorrar tipeo.
- **Snapshot de precios en ítems:** los ítems de pedido guardan una copia del precio al momento de
  tomarlo, para que repuntar precios no altere pedidos históricos.
- **Stock por movimientos:** el stock nunca se edita directamente; siempre vía movimiento (auditable).
  La tabla `StockActual` es una **cache** que se actualiza en la misma transacción del movimiento.
- **Stock comprometido:** vendido a cliente pero no entregado. `disponible = actual − comprometida`.
  Útil para revendedoras que mantienen estante; para las que piden por campaña puede usarse para
  saber cuánto falta enviar a la marca.
- **Códigos primero:** el buscador de productos debe priorizar coincidencia por **código**, ya que
  las revendedoras trabajan con listas de códigos de la marca.
- **Faltantes:** modelarlos como caso particular del flujo de recepción (no como error), porque son
  comunes en estas marcas.
- **Transacciones:** toda creación de movimiento + actualización de stock (y eventualmente item de
  pedido) en una sola transacción de BD.
- **Moneda configurable:** `ajustes` guarda símbolo de moneda, decimales y configuración regional.
- **Multi-marca aislada:** un producto de Natura nunca comparte código con uno de Avon; el `(marca_id,
  codigo)` es único, no `codigo` global.

---

## 11. Riesgos y supuestos

- **Supuesto:** se asume una sola revendedora. Si en el futuro se suman más, el modelo permite pasar
  a multiusuario añadiendo `usuario_id` a pedidos/clientes, pero **no** está incluido en el MVP.
- **Riesgo:** los catálogos cambian cada campaña y son grandes → la **importación masiva desde Excel**
  es crítica; sin ella el alta manual será inviable. Se prioriza en la Fase 1.
- **Riesgo:** precios con varios niveles y promotions pueden complicarse → se modelan los básicos
  (contado / revendedora) y se dejan `precio_credito`, `precio_oferta` y `bonificacion` como campos
  opcionales para activarse en Fase 6.
- **Supuesto:** no se integra con portales de las marcas; los pedidos a la marca se registran a mano.
- **Riesgo de consistencia:** si los movimientos no son transaccionales, el stock puede desincronizarse
  → se mitiga con transacciones de BD (Fase 2).

---

## 12. Próximos pasos sugeridos

1. **Confirmar** este plan (tecnología, alcance y fases).
2. Definir **moneda y país** (sólo para el símbolo y formato) o dejarlo configurable.
3. Definir **2–3 campañas reales de ejemplo** (una por marca) para usarlas como datos de prueba.
4. Decidir si se incluye el **pedido a la marca** (Fase 4) desde el inicio o se posterga.
5. Arrancar por la **Fase 0** (setup del proyecto y login).

---

*Documento generado como plan inicial. Se puede iterar módulo a módulo a medida que avanza el desarrollo.*
