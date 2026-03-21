-- AlterTable
ALTER TABLE "EquipmentSlot" ADD COLUMN "sessionItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentSlot_sessionItemId_key" ON "EquipmentSlot"("sessionItemId");

-- AddForeignKey
ALTER TABLE "EquipmentSlot" ADD CONSTRAINT "EquipmentSlot_sessionItemId_fkey" FOREIGN KEY ("sessionItemId") REFERENCES "SessionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
