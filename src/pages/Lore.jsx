import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import LoreCard from "@/components/lore/LoreCard";
import LoreDetail from "@/components/lore/LoreDetail";
import LoreEditor from "@/components/lore/LoreEditor";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Grid2X2, List, Plus, Search } from "lucide-react";

const CATEGORIES = ["all", "map", "character", "place", "event", "artifact", "religion", "other"];

export default function Lore() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const load = async () => {
    const user = await appClient.auth.me();
    setItems(await appClient.entities.LoreEntry.filter({ campaign_id: user.campaign_id }, "-updated_date", 200));
  };

  useEffect(() => {
    load();
  }, []);

  const folders = [...new Set(items.map((item) => item.folder).filter(Boolean))].sort();
  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q) || item.tags?.some((tag) => tag.toLowerCase().includes(q));
    const matchesCategory = category === "all" || item.category === category;
    const matchesFolder = folder === "all" || item.folder === folder;
    return matchesQuery && matchesCategory && matchesFolder;
  });

  return (
    <div className="p-6 lg:p-10 space-y-5">
      <PageHeader
        eyebrow="World"
        title="Lore & Maps"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />

      <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lore..." className="pl-9 h-10 bg-background/60" />
            </div>
            <div className="flex gap-2 overflow-x-auto thin-scroll pb-1 xl:pb-0">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`h-9 px-3 rounded-sm border text-[10px] uppercase tracking-[0.22em] whitespace-nowrap transition-all ${
                    category === item ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-accent/60"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 overflow-x-auto thin-scroll">
              <button
                type="button"
                onClick={() => setFolder("all")}
                className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === "all" ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
              >
                <Folder className="w-7 h-7" strokeWidth={1.7} />
                <span className="text-[10px] leading-tight text-center">All Lore</span>
              </button>
              {folders.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFolder(name)}
                  className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === name ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                  title={name}
                >
                  <Folder className="w-7 h-7" strokeWidth={1.7} />
                  <span className="text-[10px] leading-tight text-center max-w-20 break-words">{name.split("/").pop()}</span>
                </button>
              ))}
            </div>

            <div className="flex border border-border rounded-sm overflow-hidden shrink-0">
              <button type="button" onClick={() => setViewMode("grid")} className={`h-8 px-3 flex items-center gap-1.5 text-xs transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <Grid2X2 className="w-3.5 h-3.5" /> Grid
              </button>
              <button type="button" onClick={() => setViewMode("list")} className={`h-8 px-3 flex items-center gap-1.5 text-xs border-l border-border transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No lore entries yet.</div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No lore entries match those filters.</div>
      ) : (
            <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2"}>
          {filtered.map((entry) => (
                <LoreCard key={entry.id} entry={entry} viewMode={viewMode} onClick={() => setViewing(entry)} onEdit={() => setEditing(entry)} />
          ))}
        </div>
      )}
        </div>
      </div>

      <LoreEditor open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} entry={editing?.id ? editing : null} onSaved={load} />
      <LoreDetail
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        entry={viewing}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
        }}
      />
    </div>
  );
}
