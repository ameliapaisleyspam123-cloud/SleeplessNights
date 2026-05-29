import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import LoreCard from "@/components/lore/LoreCard";
import LoreDetail from "@/components/lore/LoreDetail";
import LoreEditor from "@/components/lore/LoreEditor";
import MoveFolderDialog from "@/components/lore/MoveFolderDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canViewVisibleItem, isDmUser } from "@/lib/visibility";
import { Folder, Grid2X2, List, MoveRight, Plus, Search } from "lucide-react";

const CATEGORIES = ["all", "map", "character", "place", "event", "artifact", "religion", "other"];

function plainText(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const emptyFolderKey = (campaignId) => `sleepless_empty_lore_folders_${campaignId || "default"}`;
const readEmptyFolders = (campaignId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(emptyFolderKey(campaignId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeEmptyFolders = (campaignId, folders) => {
  localStorage.setItem(emptyFolderKey(campaignId), JSON.stringify([...new Set(folders.filter(Boolean))].sort()));
};

export default function Lore() {
  const [items, setItems] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [emptyFolders, setEmptyFolders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [moving, setMoving] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const load = async () => {
    const user = await appClient.auth.me();
    const isDm = isDmUser(user);
    setCurrentUser(user);
    setIsAdmin(isDm);
    setCampaignId(user.campaign_id);
    setEmptyFolders(readEmptyFolders(user.campaign_id));
    setItems(await appClient.entities.LoreEntry.filter({ campaign_id: user.campaign_id }, "-updated_date", 200));
  };

  useEffect(() => {
    load();
  }, []);

  const folders = [...new Set([...items.map((item) => item.folder).filter(Boolean), ...emptyFolders])].sort();
  const visibleItems = items.filter((item) => canViewVisibleItem(item, currentUser, isAdmin));
  const filtered = visibleItems.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || item.title?.toLowerCase().includes(q) || plainText(item.content).toLowerCase().includes(q) || item.tags?.some((tag) => tag.toLowerCase().includes(q));
    const matchesCategory = category === "all" || item.category === category;
    const matchesFolder = folder === "all" || item.folder === folder;
    return matchesQuery && matchesCategory && matchesFolder;
  });

  const deleteEntry = async (entry) => {
    if (!entry?.id) return;
    if (!window.confirm(`Delete "${entry.title}" from Lore & Maps?`)) return;
    await appClient.entities.LoreEntry.delete(entry.id);
    if (viewing?.id === entry.id) setViewing(null);
    if (editing?.id === entry.id) setEditing(null);
    await load();
  };

  const createFolder = () => {
    const name = window.prompt("New lore folder name");
    const folderName = name?.trim();
    if (!folderName) return;
    const next = [...new Set([...emptyFolders, folderName])].sort();
    setEmptyFolders(next);
    writeEmptyFolders(campaignId, next);
    setFolder(folderName);
  };

  const moveEntry = async (targetFolder) => {
    if (!moving?.id) return;
    await appClient.entities.LoreEntry.update(moving.id, { folder: targetFolder || "" });
    if (targetFolder) {
      const next = [...new Set([...emptyFolders, targetFolder])].sort();
      setEmptyFolders(next);
      writeEmptyFolders(campaignId, next);
    }
    setMoving(null);
    setContextMenu(null);
    await load();
  };

  const syncUpdatedEntry = (updated) => {
    if (!updated?.id) return;
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setViewing((current) => (current?.id === updated.id ? updated : current));
  };

  const openContextMenu = (event, entry) => {
    if (!isAdmin) return;
    setContextMenu({ x: event.clientX, y: event.clientY, entry });
  };

  return (
    <div className="p-6 lg:p-10 space-y-5" onClick={() => setContextMenu(null)}>
      <PageHeader
        eyebrow="World"
        title="Lore & Maps"
        description="Browse the annals of the world — places, people, events, and ancient secrets."
        action={
          isAdmin ? (
            <Button onClick={() => setEditing({})}>
              <Plus className="w-4 h-4" /> New
            </Button>
          ) : null
        }
      />

      <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lore..." className="pl-9 h-10 bg-background/60" />
            </div>
            <div className="flex flex-wrap gap-2 pb-1 xl:pb-0">
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
            <div className="flex flex-wrap gap-2 min-w-0">
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
              {isAdmin && (
                <button
                  type="button"
                  onClick={createFolder}
                  className="flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/60 hover:bg-accent/5 transition-all"
                >
                  <Plus className="w-7 h-7" strokeWidth={1.7} />
                  <span className="text-[10px] leading-tight text-center">New Folder</span>
                </button>
              )}
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
                <LoreCard
                  key={entry.id}
                  entry={entry}
                  viewMode={viewMode}
                  canManage={isAdmin}
                  onClick={() => setViewing(entry)}
                  onContextMenu={openContextMenu}
                  onEdit={() => setEditing(entry)}
                  onDelete={() => deleteEntry(entry)}
                />
          ))}
        </div>
      )}
        </div>
      </div>

      <LoreEditor open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} entry={editing?.id ? editing : null} onSaved={load} />
      <MoveFolderDialog
        open={Boolean(moving)}
        onOpenChange={(open) => !open && setMoving(null)}
        entry={moving}
        allFolderPaths={folders}
        onMove={moveEntry}
        title="Move Lore Entry"
        rootLabel="All Lore (root)"
      />
      <LoreDetail
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        entry={viewing}
        entries={visibleItems}
        onEntryUpdated={syncUpdatedEntry}
        onOpenEntry={setViewing}
        onEdit={() => {
          if (!isAdmin) return;
          setEditing(viewing);
          setViewing(null);
        }}
        onDelete={() => viewing && deleteEntry(viewing)}
        isAdmin={isAdmin}
      />
      {contextMenu && isAdmin && (
        <div
          className="fixed z-[120] min-w-44 rounded-sm border border-border bg-card shadow-2xl p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMoving(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm"
          >
            <MoveRight className="w-4 h-4 text-accent" /> Move to folder
          </button>
        </div>
      )}
    </div>
  );
}
