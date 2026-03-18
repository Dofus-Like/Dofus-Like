-- DropForeignKey
ALTER TABLE "CombatSession" DROP CONSTRAINT "CombatSession_player2Id_fkey";

-- AlterTable
ALTER TABLE "CombatSession" ALTER COLUMN "player2Id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CombatSession" ADD CONSTRAINT "CombatSession_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
