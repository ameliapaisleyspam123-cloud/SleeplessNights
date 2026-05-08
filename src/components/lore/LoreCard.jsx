import React from "react";
import { ScrollText, MapIcon, User, Castle, Sparkles, Swords, Star, Lock, EyeOff, Sun, Folder } from "lucide-react";

const CATEGORY_META = {
  map: { icon: MapIcon, label: "Map" },
  character: { icon: User, label: "Character" },
  place: { icon: Castle, label: "Place" },
  event: { icon: Sparkles, label: "Event" },
  artifact: { icon: Swords, label: "Artifact" },
  religion: { icon: Sun, label: "Religion" },
  other: { icon: Star, label: "Other" },
};

export default function LoreCard({ entry, onClick, onContextMenu }) {
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e, entry); } : undefined}
      className="group text-left relative overflow-hidden rounded-sm border border-border bg-card hover:border-accent/60 hover:-translate-y-0.5 transition-all flex flex-col"
    >
      {entry.image_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={entry.image_url}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
          <ScrollText className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
            <Icon className="w-3 h-3" />
            {meta.label}
          </div>
          {entry.visibility === "dm_only" && <Lock className="w-3 h-3 text-amber-400" title="DM Only" />}
          {entry.visibility === "archived" && <EyeOff className="w-3 h-3 text-muted-foreground" title="Archived" />}
        </div>
        <div className="font-display text-xl mt-1.5 leading-tight">{entry.title}</div>
        {entry.content && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {entry.content}
          </p>
        )}
        {entry.folder && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <Folder className="w-2.5 h-2.5" />
            {entry.folder}
          </div>
        )}
        {entry.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 overflow-hidden">
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground max-w-[120px] truncate">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
