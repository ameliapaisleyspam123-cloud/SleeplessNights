import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Swords } from "lucide-react";

export default function CombatTurnIndicator({ currentUser }) {
  const [combat, setCombat] = useState(null);

  useEffect(() => {
    if (!currentUser?.campaign_id) return;

    const load = async () => {
      const list = await base44.entities.Initiative.filter({ campaign_id: currentUser.campaign_id, active: true }, "-updated_date", 1);
      setCombat(list[0] || null);
    };

    load();

    const unsub = base44.entities.Initiative.subscribe(() => load());
    return () => unsub();
  }, [currentUser?.campaign_id]);

  if (!combat?.active) return null;

  const entries = combat.entries || [];
  const currentEntry = entries[combat.current_turn_index ?? 0];
  if (!currentEntry) return null;

  const isMyTurn = currentEntry.ownerEmail && currentEntry.ownerEmail === currentUser?.email;

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
        <div className="text-xs font-medium truncate">{isMyTurn ? "Take your action" : `${currentEntry.name}'s turn`}</div>
      </div>
    </div>
  );
}
