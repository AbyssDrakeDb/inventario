-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "cuotas" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "monto_por_cuota" DECIMAL(10,2);
