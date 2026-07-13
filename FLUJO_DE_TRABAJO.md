# Guía de Flujo de Trabajo — Sistema de Inventario y Ventas

## Índice
1. [Diagrama de flujo completo](#1-diagrama-de-flujo-completo)
2. [Modelo de datos](#2-modelo-de-datos)
3. [Estados del pedido y pago](#3-estados-del-pedido-y-pago)
4. [Flujo paso a paso](#4-flujo-paso-a-paso)
5. [Pantallas del sistema](#5-pantallas-del-sistema)
6. [Casos especiales](#6-casos-especiales)

---

## 1. Diagrama de flujo completo

```
═══════════════════════════════════════════════════════════════
                    FLUJO PRINCIPAL
═══════════════════════════════════════════════════════════════

  1. IMPORTAR CATÁLOGO (Excel)
     │
     ▼
  2. CREAR CAMPAÑA (fechas)
     │
     ▼
  3. CREAR PEDIDO (cliente + productos)
     │  Estado: confirmado
     │
     ▼
  4. PEDIDO A LA MARCA (recibir mercadería)
     │  Ingresa stock al inventario
     │  Estado: recibido | parcial
     │
     ▼
  5. ENTREGAR AL CLIENTE + COBRAR ◄── [NUEVO]
     │  Descuenta stock del inventario
     │  Registra el pago (completo/parcial/crédito)
     │  Estado: entregado
     │  EstadoPago: pagado | parcial | credito
     │
     ▼
  6. COBRAR ABONOS (si aplica) ◄── [NUEVO]
     │  El cliente paga parte o toda su deuda pendiente
     │
     ▼
  7. REPORTES Y CIERRE

═══════════════════════════════════════════════════════════════
```

---

## 2. Modelo de datos

### Pedido (orden del cliente)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `estado` | String | `borrador → confirmado → enviado_a_marca → parcial → recibido → entregado → cancelado` |
| **`estadoPago`** | **String** | **NUEVO: `pendiente → parcial → pagado → credito`** |
| `totalContado` | Decimal | Precio de venta al cliente |
| `totalRevendedora` | Decimal | Costo para la revendedora |
| `ganancia` | Decimal | totalContado - totalRevendedora |

### Pago (registro de cobro) — Modelo existente, ahora en uso

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Int | Auto |
| `clienteId` | Int | Cliente que paga |
| `pedidoId` | Int? | Pedido al que se aplica (opcional para abonos generales) |
| `fecha` | DateTime | Fecha del pago |
| `monto` | Decimal | Monto pagado |
| `tipo` | String | `completo | parcial | credito | abono` |
| `notas` | String? | Opcional (ej: "Pagó con Yape") |

### Cliente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `saldo` | Decimal | **Ahora se actualiza automáticamente** — deuda pendiente del cliente |

---

## 3. Estados del pedido y pago

### Estados del pedido (estado)

```
borrador ──► confirmado ──► enviado_a_marca ──► parcial ──► entregado
                               │                  │
                               └──► recibido ──────┘
                                        │
                                        └──► entregado

cancelado (desde borrador, confirmado o parcial)
```

### Estados de pago (estadoPago) — NUEVO

| Estado | Significado | ¿Cómo se asigna? |
|--------|-------------|-------------------|
| `pendiente` | No se ha registrado pago aún | Default (pedido nuevo) |
| `pagado` | Cliente pagó el total | Al entregar con "Pago completo" o cuando abonos cubren el total |
| `parcial` | Cliente pagó solo una parte | Al entregar con "Pago parcial" |
| `credito` | Cliente no pagó nada, todo a crédito | Al entregar con "Crédito" |

### Relación entre estados

```
estado = entregado + estadoPago = pagado   →  Pedido entregado y pagado ✅
estado = entregado + estadoPago = parcial  →  Entregado, debe saldo pendiente 💰
estado = entregado + estadoPago = credito  →  Entregado, todo a crédito 📝
estado = entregado + estadoPago = pendiente → No debería ocurrir (solo si se usó /entregar antiguo)
```

---

## 4. Flujo paso a paso

### PASO 1: Importar catálogo (Excel)

**Pantalla:** Revista / Catálogo de una campaña

1. Ir a Campañas → seleccionar campaña → "Ver revista"
2. Click "Importar Excel"
3. Formato del archivo:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Código | Nombre | Descripción | Precio Contado | Precio Revendedora | Categoría | Presentación |

4. El sistema automáticamente:
   - Crea o actualiza productos
   - Crea las categorías si no existen
   - Crea los precios para la campaña
   - Inicializa el stock en 0

### PASO 2: Crear campaña

**Pantalla:** Campañas

1. Click "Nueva campaña"
2. Seleccionar marca, ingresar número, nombre
3. Fechas:
   - **Inicio de campaña** — fecha desde la que aplican los precios
   - **Fin de vigencia** — fecha límite para hacer pedidos
   - **Pedido a la marca** — fecha en que se envía el pedido a la marca (no confundir con entrega al cliente)

### PASO 3: Crear pedido de cliente

**Pantalla:** Pedidos → Nuevo pedido

1. Seleccionar cliente
2. Seleccionar campaña (se cargan los productos de la revista)
3. Buscar productos por código o nombre y agregarlos
4. Ajustar cantidades
5. Click "Crear pedido"
6. El pedido queda en estado **confirmado**
7. Se actualiza el **stock comprometido** (productos reservados para este cliente)

### PASO 4: Recibir mercadería de la marca

**Pantalla:** Pedido a Marca

1. Seleccionar campaña
2. Se muestran los productos pedidos a la marca
3. Ingresar las cantidades recibidas
4. Click "Recibir"
5. El sistema:
   - Crea movimiento de **entrada** en inventario
   - Aumenta el **stock actual**
   - Distribuye los productos entre los pedidos de clientes pendientes
   - Actualiza estado de los pedidos: **recibido** o **parcial**
   - Actualiza estado de cada ítem: **recibido_marca** (pendiente de entrega al cliente)

### PASO 5: Entregar al cliente y cobrar (NUEVO)

**Pantalla:** Entregas

1. Se muestran los pedidos en estado **recibido** o **parcial**
2. Por cada pedido, se ve:
   - Cliente, campaña, total
   - Productos pendientes de entregar (en verde)
   - Estado de cada ítem
3. Click **"Entregar y cobrar"**
4. Se abre un modal con opciones de pago:

```
┌─────────────────────────────────────────────┐
│  Registrar cobro                            │
│                                             │
│  ┌──────────────────────────────────┐       │
│  │  Cliente: María Pérez            │       │
│  │  Campaña: Natura C6              │       │
│  │  Total: S/ 350.00                │       │
│  └──────────────────────────────────┘       │
│                                             │
│  Forma de pago:                             │
│                                             │
│  ● Pago completo      S/ 350.00             │
│    (El cliente paga todo al entregar)       │
│                                             │
│  ○ Pago parcial                             │
│    (El cliente paga una parte ahora)        │
│                                             │
│  ○ Crédito / Fiado                          │
│    (No paga ahora, queda como deuda)        │
│                                             │
│  Notas: [Yape - 987654321]                  │
│                                             │
│  [Cancelar]    [Confirmar entrega]          │
└─────────────────────────────────────────────┘
```

5. Según la opción elegida:

| Opción | ¿Qué pasa con el pago? | ¿Qué pasa con el saldo? |
|--------|------------------------|------------------------|
| **Pago completo** | Se crea Pago por el total, estadoPago = pagado | El saldo del cliente no cambia |
| **Pago parcial** | Se crea Pago por el monto recibido, estadoPago = parcial | Saldo += (total - montoPagado) |
| **Crédito** | Se crea Pago con monto 0, estadoPago = credito | Saldo += totalContado (debe todo) |

6. Además, el sistema:
   - Crea movimiento de **salida** en inventario
   - **Descuenta stock actual**
   - Marca cada ítem como **entregado**
   - Cambia el pedido a estado **entregado**

### PASO 6: Registrar abonos posteriores (NUEVO)

**Pantalla:** CxC (Cuentas por Cobrar) o en la ficha del cliente

Cuando un cliente que debe viene a pagar después:

1. Ir a **CxC** en el menú lateral o **Clientes** → botón "Cobrar"
2. Se ve el detalle de la cuenta corriente:
   - **Saldo pendiente** (total de deuda)
   - **Deudas pendientes** (pedidos no pagados)
   - **Historial de pagos** (todos los pagos registrados)
3. Click **"Registrar abono / pago"**
4. Ingresar:
   - **Pedido** (opcional — si se quiere aplicar a un pedido específico)
   - **Monto** del pago
   - **Notas** (opcional)
5. Click "Confirmar abono"
6. El sistema:
   - Crea un Pago tipo **abono**
   - Reduce el **saldo del cliente**
   - Si el abono cubre el total del pedido, cambia estadoPago a **pagado**
7. La deuda pendiente se actualiza automáticamente en todas las pantallas

### PASO 7: Reportes

**Pantalla:** Reportes

- **Ventas por campaña** — totales y detalle por producto
- **Ventas por marca** — agrupado por campañas
- **Productos más vendidos** — ranking de ventas
- **Faltantes por campaña** — productos que no alcanzaron
- **Stock valorizado** — valor del inventario a precio de costo
- **Cuentas por cobrar** — clientes con deuda pendiente (dashboard)

**Dashboard:**
- Nuevo KPI: **Deuda pendiente** — suma total de todos los saldos de clientes
- Alerta si hay clientes con saldo > 0

---

## 5. Pantallas del sistema

| # | Pantalla | Ruta | Función |
|---|----------|------|---------|
| 1 | Dashboard | `/` | KPIs: ganancia del mes, pedidos pendientes, campañas activas, alertas stock, **deuda pendiente** |
| 2 | Marcas | `/marcas` | Gestionar marcas (Natura, Avon, etc.) |
| 3 | Campañas | `/campanas` | Crear y gestionar campañas por marca |
| 4 | Productos | `/productos` | Catálogo completo de productos |
| 5 | Inventario | `/inventario` | Stock actual, movimientos |
| 6 | **Clientes** | `/clientes` | CRUD clientes + **columna saldo + botón "Cobrar"** |
| 7 | Pedidos | `/pedidos` | Crear y gestionar pedidos de clientes |
| 8 | Pedido a Marca | `/pedido-marca` | Recibir mercadería de la marca |
| 9 | **Entregas** | `/entregas` | **Entregar al cliente + registrar pago en un solo paso** |
| 10 | **CxC** | `/cuentas-corrientes` | **Clientes deudores, registrar abonos** |
| 11 | Reportes | `/reportes` | Reportes de ventas, stock |
| 12 | Ajustes | `/ajustes` | Configuración: moneda, país |

---

## 6. Casos especiales

### Cliente paga después de haberse llevado el pedido (abono)

1. Ir a **Clientes** → buscar el cliente → click "Cobrar"
2. O ir a **CxC** → buscar el cliente deudor → click "Cobrar"
3. En el modal, se ven las deudas pendientes y el historial de pagos
4. Click "Registrar abono / pago"
5. Ingresar monto y opcionalmente seleccionar a qué pedido aplica
6. Confirmar → el saldo se reduce automáticamente
7. Si ya pagó todo, el pedido cambia a estadoPago = pagado

### Pedido entregado con pago parcial + luego otro abono

**Ejemplo:**
- Pedido: S/ 350.00
- Entrega con pago parcial: S/ 200.00 → saldo pendiente: S/ 150.00
- Cliente viene después y paga S/ 100.00 → saldo: S/ 50.00
- Cliente viene después y paga S/ 50.00 → saldo: S/ 0.00, estadoPago: pagado

### Pedido cancelado con deuda

Si se cancela un pedido que ya fue entregado con crédito:
- El sistema verifica si hay pagos registrados
- Si el estadoPago no es "pendiente", no permite cancelar el pedido
- Se debe primero pagar la deuda o hacer un ajuste manual

### Moneda configurable

En **Ajustes** se puede cambiar:
- Símbolo de moneda (S/, $, Bs, etc.)
- Número de decimales (0, 2, 4)
- País

Esto afecta a todos los montos en el sistema.

---

## Resumen de endpoints nuevos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/pedidos/:id/entregar-con-pago` | Entrega + registra pago (completo/parcial/crédito) |
| POST | `/api/pedidos/:id/abono` | Abono contra un pedido específico |
| POST | `/api/pedidos/abono-general` | Abono contra cliente (sin pedido específico) |
| GET | `/api/clientes/cuentas-corrientes` | Lista clientes con deuda > 0 |
| GET | `/api/reportes/dashboard` | Ahora incluye `deudaPendiente` |

---

*Documento generado el 12/07/2026*