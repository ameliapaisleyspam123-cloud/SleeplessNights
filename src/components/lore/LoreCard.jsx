import React from "react";
import { ScrollText, MapIcon, User, Castle, Sparkles, Swords, Star, Lock, EyeOff, Sun, Folder, Pencil } from "lucide-react";

const CATEGORY_META = {
  map: { icon: MapIcon, label: "Map" },
  character: { icon: User, label: "Character" },
  place: { icon: Castle, label: "Place" },
  event: { icon: Sparkles, label: "Event" },
  artifact: { icon: Swords, label: "Artifact" },
  religion: { icon: Sun, label: "Religion" },
  other: { icon: Star, label: "Other" },
};

export default function LoreCard({ entry, onClick, onContextMenu, onEdit, viewMode = "grid" }) {
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;
  const Icon = meta.icon;
  const isList = viewMode === "list";

  const handleEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e, entry); } : undefined}
      className={`group text-left relative overflow-hidden rounded-sm border border-border bg-card hover:border-accent/60 transition-all ${
        isList ? "w-full flex items-center min-h-[92px]" : "flex flex-col hover:-translate-y-0.5"
      }`}
    >
      {entry.image_url ? (
        <div className={`${isList ? "w-28 self-stretch shrink-0" : "aspect-[4/3]"} overflow-hidden bg-muted`}>
          <img
            src={entry.image_url}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className={`${isList ? "w-28 self-stretch shrink-0" : "aspect-[4/3]"} bg-secondary/60 flex items-center justify-center`}>
          <ScrollText className={`${isList ? "w-7 h-7" : "w-10 h-10"} text-muted-foreground/40`} strokeWidth={1} />
        </div>
      )}
      <div className={`${isList ? "p-3" : "p-4"} flex-1 flex flex-col min-w-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
            <Icon className="w-3 h-3" />
            {meta.label}
          </div>
          <div className="flex items-center gap-1.5">
            {entry.visibility === "dm_only" && <Lock className="w-3 h-3 text-amber-400" title="DM Only" />}
            {entry.visibility === "archived" && <EyeOff className="w-3 h-3 text-muted-foreground" title="Archived" />}
            <button
              type="button"
              onClick={handleEdit}
              className="h-7 px-2 rounded-sm border border-border bg-background/60 text-muted-foreground hover:text-accent hover:border-accent/60 hover:bg-accent/10 transition-all inline-flex items-center gap-1.5"
              title="Edit lore entry"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-[0.16em] hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
        <div className={`${isList ? "text-lg truncate" : "text-xl"} font-display mt-1.5 leading-tight`}>{entry.title}</div>
        {entry.content && (
          <p className={`text-sm text-muted-foreground mt-2 ${isList ? "line-clamp-1" : "line-clamp-2"} leading-relaxed`}>
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
    </div>
  );
}
