-- DropIndex
DROP INDEX "InventoryItem_playerId_itemId_rank_key";

-- DropIndex
DROP INDEX "SessionItem_sessionId_playerId_itemId_key";

-- CreateIndex
CREATE INDEX "InventoryItem_playerId_itemId_rank_idx" ON "InventoryItem"("playerId", "itemId", "rank");

-- CreateIndex
CREATE INDEX "SessionItem_sessionId_playerId_itemId_idx" ON "SessionItem"("sessionId", "playerId", "itemId");
