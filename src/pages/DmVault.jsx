import React, { useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import DocumentEditor from "@/components/documents/DocumentEditor";
import LoreDetail from "@/components/lore/LoreDetail";
import LoreEditor from "@/components/lore/LoreEditor";
import { Button } from "@/components/ui/button";
import { Archive, Box, FileText, Lock, Plus, Radio, Swords, Users, Wand2 } from "lucide-react";

const TABS = [
  { id: "documents", label: "Documents", icon: Lock },
  { id: "combat", label: "Combat", icon: Swords },
  { id: "overrides", label: "Overrides", icon: Radio },
  { id: "archived", label: "Archived", icon: Box },
  { id: "players", label: "Players", icon: Users },
];

function plainText(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function shortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function DmVault() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("documents");
  const [documents, setDocuments] = useState([]);
  const [lore, setLore] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [combats, setCombats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingLore, setViewingLore] = useState(null);
  const [editingLore, setEditingLore] = useState(null);

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [docs, loreEntries, overrideEntries, initiativeEntries, userEntries] = await Promise.all([
      appClient.entities.Document.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.LoreEntry.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.Broadcast.list("-updated_date", 500),
      appClient.entities.Initiative.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 100),
      appClient.entities.User.filter({ campaign_id: currentUser.campaign_id }, "display_name", 200),
    ]);
    setUser(currentUser);
    setDocuments(docs);
    setLore(loreEntries);
    setBroadcasts(overrideEntries.filter((entry) => !entry.campaign_id || entry.campaign_id === currentUser.campaign_id));
    setCombats(initiativeEntries);
    setPlayers(userEntries);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const sealedDocs = documents.filter((doc) => doc.visibility === "private");
  const sealedLore = lore.filter((entry) => entry.visibility === "dm_only");
  const archived = useMemo(
    () => [
      ...documents.filter((doc) => doc.visibility === "archived").map((item) => ({ ...item, kind: "document" })),
      ...lore.filter((entry) => entry.visibility === "archived").map((item) => ({ ...item, kind: "lore" })),
      ...broadcasts.filter((entry) => entry.archived).map((item) => ({ ...item, kind: "override" })),
    ],
    [documents, lore, broadcasts],
  );
  const reusableOverrides = broadcasts.filter((entry) => !entry.archived);

  const activateOverride = async (override) => {
    await Promise.all(broadcasts.filter((entry) => entry.active && entry.id !== override.id).map((entry) => appClient.entities.Broadcast.update(entry.id, { active: false })));
    await appClient.entities.Broadcast.update(override.id, { active: true });
    await load();
  };

  const deactivateOverrides = async () => {
    await Promise.all(broadcasts.filter((entry) => entry.active).map((entry) => appClient.entities.Broadcast.update(entry.id, { active: false })));
    await load();
  };

  const archiveOverride = async (override) => {
    await appClient.entities.Broadcast.update(override.id, { archived: true, active: false });
    await load();
  };

  const archiveDocument = async (doc) => {
    await appClient.entities.Document.update(doc.id, { visibility: "archived" });
    await load();
  };

  const deleteLore = async (entry) => {
    if (!entry?.id) return;
    if (!window.confirm(`Delete "${entry.title}" from the vault?`)) return;
    await appClient.entities.LoreEntry.delete(entry.id);
    setViewingLore(null);
    setEditingLore(null);
    await load();
  };

  const restoreLore = async (entry) => {
    await appClient.entities.LoreEntry.update(entry.id, { visibility: "public" });
    await load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-none text-foreground">DM Vault</h1>
            <p className="text-muted-foreground mt-4 text-lg">Sealed documents, past overrides, and campaign management.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => window.dispatchEvent(new Event("toggle-dice-roller"))}>
              <Wand2 className="w-4 h-4" /> Dice
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4" /> Upload
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border flex gap-4 overflow-x-auto thin-scroll">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm md:text-base transition-colors whitespace-nowrap ${
              tab === item.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "documents" && (
        <VaultPanel empty={sealedDocs.length === 0 && sealedLore.length === 0} emptyTitle="The vault is empty." emptyBody="Upload sealed documents for the DM.">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sealedDocs.map((doc) => (
              <div key={doc.id} className="border border-border bg-card/55 rounded-sm p-4 flex flex-col min-h-40">
                <FileText className="w-5 h-5 text-accent" />
                <div className="font-display text-xl mt-3">{doc.title}</div>
                {doc.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>}
                <div className="mt-auto pt-4 flex gap-2">
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors">
                    Open
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => archiveDocument(doc)}>Archive</Button>
                </div>
              </div>
            ))}
            {sealedLore.map((entry) => (
              <button key={entry.id} type="button" onClick={() => setViewingLore(entry)} className="text-left border border-border bg-card/55 rounded-sm p-4 hover:border-accent/70 transition-colors min-h-40">
                <Lock className="w-5 h-5 text-accent" />
                <div className="font-display text-xl mt-3">{entry.title}</div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{plainText(entry.content) || entry.category}</p>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-4">Lore & Maps - DM Only</div>
              </button>
            ))}
          </div>
        </VaultPanel>
      )}

      {tab === "combat" && (
        <VaultPanel empty={combats.length === 0} emptyTitle="No combat records." emptyBody="Initiative encounters will appear here.">
          <div className="space-y-3">
            {combats.map((combat) => (
              <div key={combat.id} className="border border-border bg-card/55 rounded-sm p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-display text-xl">{combat.active ? "Active Encounter" : "Saved Encounter"}</div>
                  <div className="text-sm text-muted-foreground">{combat.entries?.length || 0} combatants - round {combat.round || 1}</div>
                </div>
                <div className={combat.active ? "text-accent text-sm" : "text-muted-foreground text-sm"}>{combat.active ? "Live" : shortDate(combat.updated_date)}</div>
              </div>
            ))}
          </div>
        </VaultPanel>
      )}

      {tab === "overrides" && (
        <VaultPanel empty={reusableOverrides.length === 0} emptyTitle="No saved overrides." emptyBody="Broadcasts you send will be saved here for reuse.">
          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={deactivateOverrides}>
              <Radio className="w-4 h-4" /> Deactivate All
            </Button>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reusableOverrides.map((override) => (
              <div key={override.id} className="border border-border bg-card/55 rounded-sm overflow-hidden">
                {override.image_url && <img src={override.image_url} alt={override.title || "Override"} className="w-full aspect-video object-cover bg-muted" />}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-xl">{override.title || "Untitled Override"}</div>
                    {override.active && <span className="text-[10px] uppercase tracking-widest text-accent">Live</span>}
                  </div>
                  {override.message && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{plainText(override.message)}</p>}
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => activateOverride(override)}>Reuse</Button>
                    <Button size="sm" variant="ghost" onClick={() => archiveOverride(override)}>Archive</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </VaultPanel>
      )}

      {tab === "archived" && (
        <VaultPanel empty={archived.length === 0} emptyTitle="Nothing archived." emptyBody="Archived vault items will rest here.">
          <div className="space-y-2">
            {archived.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="border border-border bg-card/55 rounded-sm p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{item.title || "Untitled"}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{item.kind} - {shortDate(item.updated_date || item.created_date)}</div>
                </div>
                <Archive className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </VaultPanel>
      )}

      {tab === "players" && (
        <VaultPanel empty={players.length === 0} emptyTitle="No players yet." emptyBody="Campaign members will appear here.">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {players.map((player) => (
              <div key={player.id} className="border border-border bg-card/55 rounded-sm p-4">
                <div className="font-medium">{player.display_name || player.full_name || player.email}</div>
                <div className="text-sm text-muted-foreground mt-1">{player.email}</div>
                <div className="text-[10px] uppercase tracking-widest text-accent mt-3">{player.campaign_role || player.role || "player"}</div>
              </div>
            ))}
          </div>
        </VaultPanel>
      )}

      <DocumentEditor open={uploadOpen} onOpenChange={setUploadOpen} onSaved={load} defaultVisibility="private" />
      <LoreDetail
        open={Boolean(viewingLore)}
        onOpenChange={(open) => !open && setViewingLore(null)}
        entry={viewingLore}
        isAdmin
        onEdit={() => {
          setEditingLore(viewingLore);
          setViewingLore(null);
        }}
        onDelete={() => viewingLore && deleteLore(viewingLore)}
      />
      <LoreEditor open={Boolean(editingLore)} onOpenChange={(open) => !open && setEditingLore(null)} entry={editingLore?.id ? editingLore : null} onSaved={load} />
    </div>
  );
}

function VaultPanel({ empty, emptyTitle, emptyBody, children }) {
  if (empty) {
    return (
      <div className="min-h-[20rem] border border-dashed border-border rounded-sm flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-10 h-10 text-muted-foreground/60 mb-5" strokeWidth={1.5} />
        <div className="font-display text-2xl">{emptyTitle}</div>
        <div className="text-muted-foreground mt-2">{emptyBody}</div>
      </div>
    );
  }
  return <div>{children}</div>;
}
