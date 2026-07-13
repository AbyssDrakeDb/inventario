-- DropForeignKey
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_campana_id_fkey";

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "tipo" VARCHAR(20) NOT NULL DEFAULT 'campana',
ALTER COLUMN "campana_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
