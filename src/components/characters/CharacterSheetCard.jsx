import "react-quill/dist/quill.snow.css";
import React from "react";
import { Shield, Swords, Zap, Lock, EyeOff } from "lucide-react";

const STAT_MOD = (v) => Math.floor((v - 10) / 2);
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);

export default function CharacterSheetCard({ sheet, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left border border-border rounded-sm bg-card hover:border-accent/60 transition-all p-5 flex flex-col gap-3 min-h-[180px]"
    >
      <div className="flex items-start gap-3">
        {sheet.image_url ? (
          <img src={sheet.image_url} alt={sheet.name} className="w-12 h-12 rounded-sm object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <span className="font-display text-xl text-muted-foreground">{sheet.name?.[0] || "?"}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="font-display text-xl leading-tight truncate group-hover:text-accent transition-colors">{sheet.name}</div>
            {sheet.visibility === "dm_only" && <Lock className="w-3 h-3 text-amber-400 shrink-0" title="DM Only" />}
            {sheet.visibility === "archived" && <EyeOff className="w-3 h-3 text-muted-foreground shrink-0" title="Archived" />}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[sheet.race, sheet.class].filter(Boolean).join(" · ")} {sheet.level ? `· Lvl ${sheet.level}` : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto">
        <div className="flex flex-col items-center p-1.5 rounded-sm bg-secondary/60 text-center">
          <Shield className="w-3 h-3 text-accent mb-0.5" />
          <span className="text-xs font-bold">{sheet.ac ?? "—"}</span>
          <span className="text-[9px] text-muted-foreground">AC</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-sm bg-secondary/60 text-center">
          <Zap className="w-3 h-3 text-accent mb-0.5" />
          <span className="text-xs font-bold">{sheet.hp_current ?? sheet.hp_max ?? "—"}</span>
          <span className="text-[9px] text-muted-foreground">HP</span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-sm bg-secondary/60 text-center">
          <Swords className="w-3 h-3 text-accent mb-0.5" />
          <span className="text-xs font-bold">{sheet.strength ? fmtMod(STAT_MOD(sheet.strength)) : "—"}</span>
          <span className="text-[9px] text-muted-foreground">STR</span>
        </div>
      </div>
    </button>
  );
}
