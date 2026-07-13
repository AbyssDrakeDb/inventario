-- CreateTable
CREATE TABLE "marcas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "marca_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "marca_id" INTEGER NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "categoria_id" INTEGER,
    "presentacion" VARCHAR(200),
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanas" (
    "id" SERIAL NOT NULL,
    "marca_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" VARCHAR(200),
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin_vigencia" TIMESTAMP(3) NOT NULL,
    "fecha_pedido_marca" TIMESTAMP(3),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'abierta',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_producto" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "campana_id" INTEGER NOT NULL,
    "precio_contado" DECIMAL(10,2) NOT NULL,
    "precio_revendedora" DECIMAL(10,2) NOT NULL,
    "precio_credito" DECIMAL(10,2),
    "precio_oferta" DECIMAL(10,2),
    "es_oferta" BOOLEAN NOT NULL DEFAULT false,
    "bonificacion" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precios_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(50),
    "direccion" TEXT,
    "ciudad" VARCHAR(100),
    "notas" TEXT,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "campana_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'borrador',
    "total_contado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_revendedora" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ganancia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidad_entregada" INTEGER NOT NULL DEFAULT 0,
    "cantidad_faltante" INTEGER NOT NULL DEFAULT 0,
    "precio_contado_unit" DECIMAL(10,2) NOT NULL,
    "precio_revendedora_unit" DECIMAL(10,2) NOT NULL,
    "subtotal_contado" DECIMAL(10,2) NOT NULL,
    "subtotal_revendedora" DECIMAL(10,2) NOT NULL,
    "estado_item" VARCHAR(20) NOT NULL DEFAULT 'esperando',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(10,2),
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedido_id" INTEGER,
    "campana_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_actual" (
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "comprometida" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_actual_pkey" PRIMARY KEY ("producto_id")
);

-- CreateTable
CREATE TABLE "pedidos_marca" (
    "id" SERIAL NOT NULL,
    "campana_id" INTEGER NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "total_revendedora" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_marca_items" (
    "id" SERIAL NOT NULL,
    "pedido_marca_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad_pedida" INTEGER NOT NULL,
    "cantidad_recibida" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pedido_marca_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "pedido_id" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(10,2) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "moneda_simbolo" VARCHAR(10) NOT NULL DEFAULT 'S/',
    "moneda_decimales" INTEGER NOT NULL DEFAULT 2,
    "pais" VARCHAR(50) NOT NULL DEFAULT 'PE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "productos_marca_id_codigo_key" ON "productos"("marca_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "campanas_marca_id_numero_key" ON "campanas"("marca_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "precios_producto_producto_id_campana_id_key" ON "precios_producto"("producto_id", "campana_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_usuario_id_key" ON "configuraciones"("usuario_id");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanas" ADD CONSTRAINT "campanas_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_producto" ADD CONSTRAINT "precios_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_producto" ADD CONSTRAINT "precios_producto_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_actual" ADD CONSTRAINT "stock_actual_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_marca" ADD CONSTRAINT "pedidos_marca_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_marca_items" ADD CONSTRAINT "pedido_marca_items_pedido_marca_id_fkey" FOREIGN KEY ("pedido_marca_id") REFERENCES "pedidos_marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_marca_items" ADD CONSTRAINT "pedido_marca_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones" ADD CONSTRAINT "configuraciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
