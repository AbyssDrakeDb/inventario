-- AlterTable
ALTER TABLE "marcas" ADD COLUMN     "codigo_prefijo" VARCHAR(10);

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "alertar_stock_bajo" BOOLEAN NOT NULL DEFAULT true;
