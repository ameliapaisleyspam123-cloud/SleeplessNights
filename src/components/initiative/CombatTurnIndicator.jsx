import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Swords } from "lucide-react";

export default function CombatTurnIndicator({ currentUser, sidebarCollapsed = false }) {
  const [combat, setCombat] = useState(null);
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (!currentUser?.campaign_id) return;
    let mounted = true;

    const load = async () => {
      const [list, sheets] = await Promise.all([
        appClient.entities.Initiative.filter({ campaign_id: currentUser.campaign_id, active: true }, "-updated_date", 1),
        appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "name", 300),
      ]);
      if (!mounted) return;
      setCombat(list[0] || null);
      setCharacters(sheets);
    };

    load();

    const unsubInitiative = appClient.entities.Initiative.subscribe(() => load());
    const unsubCharacters = appClient.entities.CharacterSheet.subscribe(() => load());
    const interval = window.setInterval(load, 2000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
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
      className={`fixed bottom-20 left-4 right-4 sm:right-auto lg:right-auto ${
        sidebarCollapsed ? "lg:left-[calc(80px+1rem)]" : "lg:left-[calc(280px+1rem)]"
      } z-40 flex items-center gap-3 px-4 py-3 rounded-sm border shadow-lg transition-all duration-500 ${
        isMyTurn ? "bg-accent text-accent-foreground border-accent sculk-glow" : "bg-secondary/80 text-muted-foreground border-border"
      }`}
      style={{ maxWidth: "320px" }}
    >
      <Swords className={`w-5 h-5 shrink-0 ${isMyTurn ? "animate-pulse" : ""}`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest opacity-70">{isMyTurn ? "Your Turn!" : "In Combat"}</div>
        <div className="text-sm font-medium truncate">{turnLabel}</div>
      </div>
    </div>
  );
}
