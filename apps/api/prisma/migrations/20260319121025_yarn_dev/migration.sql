-- CreateEnum
CREATE TYPE "SpellVisualType" AS ENUM ('PHYSICAL', 'PROJECTILE', 'UTILITY');

-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "visualType" "SpellVisualType" NOT NULL DEFAULT 'PHYSICAL';
