import React from "react";
import { useNavigate } from "react-router-dom";

import type { CombatPlayer } from "@game/shared-types";
import { CombatActionType, SpellFamily } from "@game/shared-types";

import { combatApi } from "../../api/combat.api";
import {
  SpellBar,
  type SpellBarItem,
} from "../../components/SpellBar/SpellBar";
import { useGameSession } from "../../pages/GameTunnel";
import { useAuthStore } from "../../store/auth.store";
import { useCombatStore } from "../../store/combat.store";
import { useTranslation } from "../../store/language.store";
import { CombatPlayerPanel } from "./CombatPlayerPanel";
import { EndTurnButton } from "./EndTurnButton";
import { TurnTracker } from "./TurnTracker";

import "./CombatHUD.css";

const SPELL_FAMILY_ORDER: Record<SpellFamily, number> = {
  [SpellFamily.COMMON]: 1,
  [SpellFamily.WARRIOR]: 2,
  [SpellFamily.MAGE]: 3,
  [SpellFamily.NINJA]: 4,
};

function getCombatErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === "string"
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? fallback
    );
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function buildSpellItems(player: CombatPlayer): SpellBarItem[] {
  const sorted = [...player.spells].sort((a, b) => {
    const familyDiff =
      SPELL_FAMILY_ORDER[a.family] - SPELL_FAMILY_ORDER[b.family];
    if (familyDiff !== 0) return familyDiff;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
  return sorted.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    iconPath: s.iconPath,
    paCost: s.paCost,
    family: s.family,
    sortOrder: s.sortOrder,
    cooldown: player.spellCooldowns[s.id],
    damage: s.damage,
    effectKind: s.effectKind,
    minRange: s.minRange,
    maxRange: s.maxRange,
  }));
}

interface LogEntry {
  id: string;
  message: string;
  type: "damage" | "info" | "victory";
}

function CombatLogPanel({ logs, open }: { logs: LogEntry[]; open: boolean }) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [logs.length]);

  return (
    <div className={`log-panel glass ${open ? "log-panel--open" : ""}`}>
      <div className="log-panel-list" ref={listRef}>
        {logs.length === 0 && (
          <div className="log-entry type-info">Aucune action…</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`log-entry type-${log.type}`}>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CombatHUD() {
  const { t } = useTranslation();
  const combatState = useCombatStore((s) => s.combatState);
  const sessionId = useCombatStore((s) => s.sessionId);
  const selectedSpellId = useCombatStore((s) => s.selectedSpellId);
  const setSelectedSpell = useCombatStore((s) => s.setSelectedSpell);
  const setCombatState = useCombatStore((s) => s.setCombatState);
  const winnerId = useCombatStore((s) => s.winnerId);
  const disconnect = useCombatStore((s) => s.disconnect);
  const uiMessage = useCombatStore((s) => s.uiMessage);
  const setUiMessage = useCombatStore((s) => s.setUiMessage);
  const logs = useCombatStore((s) => s.logs);
  const [logsOpen, setLogsOpen] = React.useState(false);

  const user = useAuthStore((s) => s.player);
  const navigate = useNavigate();
  const { activeSession } = useGameSession();

  const currentPlayer =
    combatState && user ? combatState.players[user.id] : null;
  const enemyId =
    combatState && user
      ? Object.keys(combatState.players).find((id) => id !== user.id)
      : null;
  const isMyTurn =
    combatState && user ? combatState.currentTurnPlayerId === user.id : false;

  React.useEffect(() => {
    if (!uiMessage) return;
    const timer = setTimeout(() => setUiMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [setUiMessage, uiMessage]);

  if (!combatState || !user || !currentPlayer) return null;

  const handleCombatExit = () => {
    disconnect();
    if (activeSession?.status === "ACTIVE") {
      navigate("/farming", { replace: true });
    } else {
      navigate("/");
    }
  };

  const handleEndTurn = async () => {
    if (!sessionId || !isMyTurn) return;
    try {
      const res = await combatApi.playAction(sessionId, {
        type: CombatActionType.END_TURN,
      });
      if (res?.data) setCombatState(res.data);
      setSelectedSpell(null);
    } catch (err) {
      setUiMessage(getCombatErrorMessage(err, t("endTurn")), "error");
    }
  };

  const isWinner = winnerId === user.id;
  const showCombatEnd = !!winnerId;
  const fighters = Object.values(combatState.players);
  const mappedSpellItems = buildSpellItems(currentPlayer);

  return (
    <div className="combat-hud">
      {uiMessage && (
        <div className={`combat-toast ${uiMessage.type}`}>{uiMessage.text}</div>
      )}

      {showCombatEnd && (
        <div
          className={`combat-end-overlay ${isWinner ? "victory" : "defeat"}`}
        >
          <div className="end-modal">
            <h1>{isWinner ? `🏆 ${t("victory")}` : `💀 ${t("defeat")}`}</h1>
            <p>{isWinner ? t("victoryText") : t("defeatText")}</p>
            <div className="end-modal-actions">
              <button className="exit-button" onClick={handleCombatExit}>
                {activeSession?.status === "ACTIVE"
                  ? t("continue")
                  : t("backToLobby")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP CENTER: Turn tracker */}
      <TurnTracker
        fighters={fighters}
        currentTurnPlayerId={combatState.currentTurnPlayerId}
        turnNumber={combatState.turnNumber}
        selfId={user.id}
      />

      {/* BOTTOM PLAYER PANELS */}
      <CombatPlayerPanel playerId={user.id} side="left" />
      {enemyId && <CombatPlayerPanel playerId={enemyId} side="right" />}

      {/* BOTTOM CENTER: SpellBar seule */}
      <div className="hud-bottom-anchor">
        <div className="hud-bottom-row">
          <SpellBar
            spells={mappedSpellItems}
            selectedSpellId={selectedSpellId}
            onSpellClick={(id) => setSelectedSpell(id)}
            remainingPa={currentPlayer.remainingPa}
            maxPa={currentPlayer.stats.pa}
            isMyTurn={isMyTurn}
            attackerStats={currentPlayer.stats}
            targetStats={
              enemyId ? combatState.players[enemyId]?.stats : undefined
            }
          />
        </div>
      </div>

      {/* BOTTOM RIGHT: FIN + logs + chat */}
      <div className="hud-right-anchor">
        <EndTurnButton isMyTurn={isMyTurn} onEndTurn={handleEndTurn} />
        <CombatLogPanel logs={logs} open={logsOpen} />
        <button
          type="button"
          className={`hud-log-btn ${logsOpen ? "active" : ""}`}
          onClick={() => setLogsOpen((v) => !v)}
          aria-label="Journal de combat"
        >
          💬
          {logs.length > 0 && (
            <span className="hud-log-badge">{logs.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}
