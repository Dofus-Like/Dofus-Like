-- AlterTable: économie par joueur en session (Po), balance partagée `gold` dépréciée
ALTER TABLE "GameSession" ADD COLUMN "player1Po" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "player2Po" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ALTER COLUMN "gold" SET DEFAULT 0;
