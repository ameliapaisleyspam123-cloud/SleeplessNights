import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Swords } from "lucide-react";

export default function CombatTurnIndicator({ currentUser }) {
  const [combat, setCombat] = useState(null);
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (!currentUser?.campaign_id) return;

    const load = async () => {
      const [list, sheets] = await Promise.all([
        appClient.entities.Initiative.filter({ campaign_id: currentUser.campaign_id, active: true }, "-updated_date", 1),
        appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "name", 300),
      ]);
      setCombat(list[0] || null);
      setCharacters(sheets);
    };

    load();

    const unsubInitiative = appClient.entities.Initiative.subscribe(() => load());
    const unsubCharacters = appClient.entities.CharacterSheet.subscribe(() => load());
    return () => {
      unsubInitiative();
      unsubCharacters();
    };
  }, [currentUser?.campaign_id]);

  if (!combat?.active) return null;

  const entries = combat.entries || [];
  const currentEntry = entries[combat.current_turn_index ?? 0];
  if (!currentEntry) return null;

  const currentSheet = characters.find((sheet) => sheet.id === (currentEntry.characterId || currentEntry.id));
  const ownerEmail = currentSheet?.assigned_to_email || currentEntry.ownerEmail || "";
  const isDM = currentUser?.campaign_role === "dm" || currentUser?.campaign_role === "DM" || currentUser?.role === "admin";
  const isMyTurn = ownerEmail ? ownerEmail === currentUser?.email : isDM;
  const turnLabel = ownerEmail ? `${currentEntry.name}'s turn` : "DM's turn";

  return (
    <div
      className={`fixed bottom-16 left-4 z-40 flex items-center gap-2 px-3 py-2.5 rounded-sm border shadow-lg transition-all duration-500 ${
        isMyTurn ? "bg-accent text-accent-foreground border-accent sculk-glow" : "bg-secondary/80 text-muted-foreground border-border"
      }`}
      style={{ maxWidth: "220px" }}
    >
      <Swords className={`w-4 h-4 shrink-0 ${isMyTurn ? "animate-pulse" : ""}`} />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest opacity-70">{isMyTurn ? "Your Turn!" : "In Combat"}</div>
        <div className="text-xs font-medium truncate">{turnLabel}</div>
      </div>
    </div>
  );
}
