/** Po de session (boutique en partie) pour le joueur courant */
export function getSessionPo(
  session: {
    player1Id: string;
    player2Id: string | null;
    player1Po: number;
    player2Po: number;
  } | null,
  playerId: string | undefined,
): number | null {
  if (!session || !playerId) return null;
  const p1 = session.player1Po ?? 0;
  const p2 = session.player2Po ?? 0;
  if (session.player1Id === playerId) return p1;
  if (session.player2Id === playerId) return p2;
  return null;
}
