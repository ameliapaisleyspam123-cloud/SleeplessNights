import React, { useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import CharacterSheetEditor from "@/components/characters/CharacterSheetEditor";
import CharacterSheetView from "@/components/characters/CharacterSheetView";
import DocumentEditor from "@/components/documents/DocumentEditor";
import LoreDetail from "@/components/lore/LoreDetail";
import LoreEditor from "@/components/lore/LoreEditor";
import MoveFolderDialog from "@/components/lore/MoveFolderDialog";
import { Button } from "@/components/ui/button";
import { isGlobalAdminEmail } from "@/api/appClient";
import { Archive, Box, FileText, Folder, Lock, MoveRight, Plus, Radio, Sparkles, Swords, Trash2, Users, Zap } from "lucide-react";

const TABS = [
  { id: "documents", label: "Documents", icon: Lock },
  { id: "combat", label: "Combat", icon: Swords },
  { id: "overrides", label: "Overrides", icon: Radio },
  { id: "archived", label: "Archived", icon: Box },
  { id: "players", label: "Players", icon: Users },
];
const MAX_CAMPAIGN_PLAYERS = 18;

function plainText(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueEmails(emails = []) {
  return [...new Set(emails.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))];
}

function shortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const emptyFolderKey = (campaignId) => `sleepless_empty_vault_document_folders_${campaignId || "default"}`;
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

const expandFolderPaths = (paths) => {
  const expanded = new Set();
  paths.filter(Boolean).forEach((path) => {
    path.split("/").reduce((prefix, part) => {
      const next = prefix ? `${prefix}/${part}` : part;
      expanded.add(next);
      return next;
    }, "");
  });
  return [...expanded].sort();
};

const normalizeFolderPath = (path) =>
  String(path || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

const createChildFolderPath = (currentFolder, name) => {
  const folderName = normalizeFolderPath(name);
  if (!folderName) return "";
  return currentFolder && currentFolder !== "all" ? normalizeFolderPath(`${currentFolder}/${folderName}`) : folderName;
};

const visibleFolderPaths = (paths, currentFolder) =>
  paths.filter((path) => {
    if (currentFolder === "all") return !path.includes("/");
    if (!path.startsWith(`${currentFolder}/`)) return false;
    return !path.slice(currentFolder.length + 1).includes("/");
  });

const parentFolderPath = (path) => {
  const parts = String(path || "").split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
};

function combatStats(combat) {
  const events = combat.events || [];
  const damage = events.filter((event) => event.type === "damage");
  const healing = events.filter((event) => event.type === "healing");
  const spells = events.filter((event) => event.type === "spell");
  const damageByType = damage.reduce((totals, event) => {
    const key = event.damageType || "untyped";
    return { ...totals, [key]: (totals[key] || 0) + (Number(event.amount) || 0) };
  }, {});
  const totalsBySource = damage.reduce((totals, event) => {
    const key = event.sourceName || "Unknown";
    return { ...totals, [key]: (totals[key] || 0) + (Number(event.amount) || 0) };
  }, {});
  const topDamage = Object.entries(totalsBySource).sort((a, b) => b[1] - a[1])[0];
  return {
    damageTotal: damage.reduce((sum, event) => sum + (Number(event.amount) || 0), 0),
    healingTotal: healing.reduce((sum, event) => sum + (Number(event.amount) || 0), 0),
    spellsCast: spells.length,
    topDamage,
    damageByType,
  };
}

export default function DmVault() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("documents");
  const [documents, setDocuments] = useState([]);
  const [lore, setLore] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [emptyDocumentFolders, setEmptyDocumentFolders] = useState([]);
  const [documentFolder, setDocumentFolder] = useState("all");
  const [movingDocument, setMovingDocument] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [combats, setCombats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingLore, setViewingLore] = useState(null);
  const [editingLore, setEditingLore] = useState(null);
  const [viewingCharacter, setViewingCharacter] = useState(null);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const canViewPlayerPasswords = isGlobalAdminEmail(user?.email);

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [docs, loreEntries, characterEntries, overrideEntries, initiativeEntries, userEntries, campaignEntries] = await Promise.all([
      appClient.entities.Document.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.LoreEntry.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.Broadcast.list("-updated_date", 500),
      appClient.entities.Initiative.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 100),
      appClient.entities.User.filter({ campaign_id: currentUser.campaign_id }, "display_name", 200),
      appClient.entities.Campaign.list("-created_date", 200),
    ]);
    setUser(currentUser);
    setDocuments(docs);
    setLore(loreEntries);
    setCharacters(characterEntries);
    setEmptyDocumentFolders(readEmptyFolders(currentUser.campaign_id));
    setBroadcasts(overrideEntries.filter((entry) => !entry.campaign_id || entry.campaign_id === currentUser.campaign_id));
    setCombats(initiativeEntries);
    setPlayers(userEntries);
    setCampaigns(campaignEntries);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const sealedDocs = documents.filter((doc) => doc.visibility === "private");
  const archivedLore = lore.filter((entry) => entry.visibility === "archived");
  const archivedCharacters = characters.filter((entry) => entry.visibility === "archived");
  const archived = useMemo(
    () => [
      ...documents.filter((doc) => doc.visibility === "archived").map((item) => ({ ...item, kind: "document" })),
      ...broadcasts.filter((entry) => entry.archived).map((item) => ({ ...item, kind: "override" })),
    ],
    [documents, lore, broadcasts],
  );
  const reusableOverrides = broadcasts.filter((entry) => !entry.archived);
  const documentFolders = expandFolderPaths([...sealedDocs.map((doc) => doc.folder).filter(Boolean), ...emptyDocumentFolders]);
  const documentFolderOptions = visibleFolderPaths(documentFolders, documentFolder);
  const filteredSealedDocs = sealedDocs.filter((doc) => documentFolder === "all" || doc.folder === documentFolder || doc.folder?.startsWith(`${documentFolder}/`));
  const uploadFolder = documentFolder === "all" ? "" : documentFolder;
  const currentCampaign = campaigns.find((item) => item.id === user?.campaign_id);
  const campaignPlayerCount = uniqueEmails(currentCampaign?.player_emails || []).length;

  const createDocumentFolder = () => {
    const name = window.prompt(documentFolder === "all" ? "New document folder name" : `New subfolder inside "${documentFolder}"`);
    const folderName = createChildFolderPath(documentFolder, name);
    if (!folderName || !user?.campaign_id) return;
    const next = [...new Set([...emptyDocumentFolders, folderName])].sort();
    setEmptyDocumentFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    setDocumentFolder(folderName);
  };

  const moveDocument = async (targetFolder) => {
    if (!movingDocument?.id) return;
    await appClient.entities.Document.update(movingDocument.id, { folder: targetFolder || "" });
    if (targetFolder && user?.campaign_id) {
      const next = [...new Set([...emptyDocumentFolders, targetFolder])].sort();
      setEmptyDocumentFolders(next);
      writeEmptyFolders(user.campaign_id, next);
    }
    setMovingDocument(null);
    await load();
  };

  const deleteDocumentFolder = async (folderName) => {
    if (!folderName || !user?.campaign_id) return;
    const affected = sealedDocs.filter((doc) => doc.folder === folderName || doc.folder?.startsWith(`${folderName}/`));
    const destination = parentFolderPath(folderName);
    const destinationLabel = destination || "All Documents";
    const confirmed = window.confirm(
      affected.length > 0
        ? `Delete the "${folderName}" folder and move ${affected.length} document${affected.length === 1 ? "" : "s"} to ${destinationLabel}?`
        : `Delete the "${folderName}" folder?`,
    );
    if (!confirmed) return;
    await Promise.all(affected.map((doc) => appClient.entities.Document.update(doc.id, { folder: destination })));
    const next = emptyDocumentFolders.filter((name) => name !== folderName && !name.startsWith(`${folderName}/`));
    setEmptyDocumentFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    if (documentFolder === folderName || documentFolder.startsWith(`${folderName}/`)) setDocumentFolder(destination || "all");
    await load();
  };

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

  const deleteCombat = async (combat) => {
    if (!combat?.id) return;
    const label = combat.active ? "active encounter" : "saved encounter";
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    await appClient.entities.Initiative.delete(combat.id);
    await load();
  };

  const deleteLore = async (entry) => {
    if (!entry?.id) return;
    if (!window.confirm(`Permanently delete "${entry.title}" from the vault? This cannot be undone.`)) return;
    await Promise.all([
      appClient.integrations.Core.DeleteFile({ path: entry.image_path, url: entry.image_url }).catch(() => false),
      appClient.integrations.Core.DeleteFile({ path: entry.pdf_path, url: entry.pdf_url }).catch(() => false),
    ]);
    await appClient.entities.LoreEntry.delete(entry.id);
    setViewingLore(null);
    setEditingLore(null);
    await load();
  };

  const deleteCharacter = async (entry) => {
    if (!entry?.id) return;
    if (!window.confirm(`Permanently delete ${entry.name || "this character"} from the vault? This cannot be undone.`)) return;
    await appClient.entities.CharacterSheet.delete(entry.id);
    setViewingCharacter(null);
    setEditingCharacter(null);
    await load();
  };

  const restoreLore = async (entry) => {
    await appClient.entities.LoreEntry.update(entry.id, { visibility: "public" });
    await load();
  };

  const syncUpdatedLore = (updated) => {
    if (!updated?.id) return;
    setLore((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setViewingLore((current) => (current?.id === updated.id ? updated : current));
  };

  const syncUpdatedCharacter = (updated) => {
    if (!updated?.id) return;
    setCharacters((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setViewingCharacter((current) => (current?.id === updated.id ? updated : current));
    setEditingCharacter((current) => (current?.id === updated.id ? updated : current));
  };

  const restoreCharacter = async (entry) => {
    await appClient.entities.CharacterSheet.update(entry.id, { visibility: "public" });
    await load();
  };

  const removePlayer = async (player) => {
    if (!player?.id || player.role === "admin" || player.campaign_role === "dm") return;
    if (!window.confirm(`Remove ${player.display_name || player.email} from this campaign?`)) return;
    const campaign = campaigns.find((item) => item.id === user?.campaign_id);
    if (campaign) {
      await appClient.entities.Campaign.update(campaign.id, {
        player_emails: (campaign.player_emails || []).filter((email) => email !== player.email),
      });
    }
    await appClient.entities.User.update(player.id, {
      campaign_id: "",
      campaign_role: "",
      role: "user",
    });
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
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4" /> Upload
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border flex flex-wrap gap-x-4 gap-y-1">
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
        <VaultPanel empty={sealedDocs.length === 0 && documentFolders.length === 0} emptyTitle="The vault is empty." emptyBody="Upload sealed documents for the DM.">
          <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b border-border p-3">
              {documentFolder !== "all" && (
                <div className="w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Current folder: <span className="font-mono normal-case tracking-normal text-foreground">{documentFolder}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setDocumentFolder("all")}
                className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${documentFolder === "all" ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
              >
                <Folder className="w-7 h-7" strokeWidth={1.7} />
                <span className="text-[10px] leading-tight text-center">All Documents</span>
              </button>
              {documentFolderOptions.map((name) => (
                <div
                  key={name}
                  className={`relative flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${documentFolder === name ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                  title={name}
                >
                  <button type="button" onClick={() => setDocumentFolder(name)} className="absolute inset-0" aria-label={`Open ${name}`} />
                  <Folder className="w-7 h-7" strokeWidth={1.7} />
                  <span className="text-[10px] leading-tight text-center max-w-20 break-words">{name.split("/").pop()}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteDocumentFolder(name);
                    }}
                    className="absolute top-1 right-1 z-10 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-background/80"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={createDocumentFolder}
                className="flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/60 hover:bg-accent/5 transition-all"
              >
                <Plus className="w-7 h-7" strokeWidth={1.7} />
                <span className="text-[10px] leading-tight text-center">New Folder</span>
              </button>
            </div>

            <div className="p-4">
              {filteredSealedDocs.length === 0 ? (
                <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No documents in this folder.</div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSealedDocs.map((doc) => (
                    <div key={doc.id} className="border border-border bg-card/55 rounded-sm p-4 flex flex-col min-h-40">
                      <FileText className="w-5 h-5 text-accent" />
                      <div className="font-display text-xl mt-3">{doc.title}</div>
                      {doc.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>}
                      {doc.folder && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{doc.folder}</div>}
                      <div className="mt-auto pt-4 flex gap-2 flex-wrap">
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors">
                          Open
                        </a>
                        <Button size="sm" variant="ghost" onClick={() => setMovingDocument(doc)}>
                          <MoveRight className="w-4 h-4" /> Move
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => archiveDocument(doc)}>Archive</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </VaultPanel>
      )}

      {tab === "combat" && (
        <VaultPanel empty={combats.length === 0} emptyTitle="No combat records." emptyBody="Initiative encounters will appear here.">
          <div className="space-y-3">
            {combats.map((combat) => (
              <div key={combat.id} className="border border-border bg-card/55 rounded-sm p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-display text-xl">{combat.active ? "Active Encounter" : "Saved Encounter"}</div>
                    <div className="text-sm text-muted-foreground">{combat.entries?.length || 0} combatants - round {combat.round || 1}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={combat.active ? "text-accent text-sm" : "text-muted-foreground text-sm"}>{combat.active ? "Live" : shortDate(combat.updated_date)}</div>
                    <Button size="sm" variant="ghost" onClick={() => deleteCombat(combat)} title="Delete encounter" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {(() => {
                  const stats = combatStats(combat);
                  return (
                    <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                      <StatTile icon={Swords} label="Damage" value={stats.damageTotal} />
                      <StatTile icon={Sparkles} label="Healing" value={stats.healingTotal} />
                      <StatTile icon={Zap} label="Spells Cast" value={stats.spellsCast} />
                      <StatTile icon={Users} label="Top Damage" value={stats.topDamage ? `${stats.topDamage[0]} (${stats.topDamage[1]})` : "-"} />
                      {Object.keys(stats.damageByType).length > 0 && (
                        <div className="sm:col-span-2 xl:col-span-4 text-xs text-muted-foreground pt-1">
                          Damage types: {Object.entries(stats.damageByType).map(([type, total]) => `${type} ${total}`).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
        <VaultPanel empty={archived.length === 0 && archivedLore.length === 0 && archivedCharacters.length === 0} emptyTitle="Nothing archived." emptyBody="Archived vault items will rest here.">
          <div className="space-y-6">
            {archived.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="border border-border bg-card/55 rounded-sm p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{item.title || "Untitled"}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{item.kind} - {shortDate(item.updated_date || item.created_date)}</div>
                </div>
                <Archive className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
            <ArchiveSection title="Archived Lore Entries" items={archivedLore} empty="No archived lore entries." onRestore={restoreLore} onDelete={deleteLore} onOpen={setViewingLore} />
            <ArchiveSection title="Archived Characters" items={archivedCharacters} empty="No archived characters." onRestore={restoreCharacter} onDelete={deleteCharacter} onOpen={setViewingCharacter} nameKey="name" />
          </div>
        </VaultPanel>
      )}

      {tab === "players" && (
        <VaultPanel empty={false}>
          <div className="mb-4 rounded-sm border border-border bg-card/55 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Player Capacity</div>
              <div className="mt-1 text-sm text-muted-foreground">New player-code joins are blocked once the campaign reaches {MAX_CAMPAIGN_PLAYERS} players.</div>
            </div>
            <div className="font-display text-3xl text-foreground">{campaignPlayerCount}/{MAX_CAMPAIGN_PLAYERS}</div>
          </div>
          {players.length === 0 && (
            <div className="min-h-[14rem] border border-dashed border-border rounded-sm flex flex-col items-center justify-center text-center px-4 mb-4">
              <Users className="w-10 h-10 text-muted-foreground/60 mb-5" strokeWidth={1.5} />
              <div className="font-display text-2xl">No players yet.</div>
              <div className="text-muted-foreground mt-2">Campaign members will appear here.</div>
            </div>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {players.map((player) => (
              <div key={player.id} className="border border-border bg-card/55 rounded-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{player.display_name || player.full_name || player.email}</div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">{player.email}</div>
                  </div>
                  {player.role !== "admin" && player.campaign_role !== "dm" && (
                    <Button size="sm" variant="ghost" onClick={() => removePlayer(player)} title="Remove from campaign">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-accent mt-3">{isGlobalAdminEmail(player.email) ? "Admin" : player.campaign_role || player.role || "player"}</div>
                {canViewPlayerPasswords && (
                  <div className="mt-3 rounded-sm border border-border bg-background/60 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Password</div>
                    <div className="font-mono text-sm mt-1 break-all">{player.password || "No password set"}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </VaultPanel>
      )}

      <DocumentEditor open={uploadOpen} onOpenChange={setUploadOpen} onSaved={load} defaultVisibility="private" defaultFolder={uploadFolder} />
      <MoveFolderDialog
        open={Boolean(movingDocument)}
        onOpenChange={(isOpen) => !isOpen && setMovingDocument(null)}
        entry={movingDocument}
        allFolderPaths={documentFolders}
        onMove={moveDocument}
        title="Move Document"
        itemLabel="Moving"
        rootLabel="All Documents (root)"
      />
      <LoreDetail
        open={Boolean(viewingLore)}
        onOpenChange={(open) => !open && setViewingLore(null)}
        entry={viewingLore}
        entries={lore}
        onEntryUpdated={syncUpdatedLore}
        onOpenEntry={setViewingLore}
        isAdmin
        onEdit={() => {
          setEditingLore(viewingLore);
          setViewingLore(null);
        }}
        onDelete={() => viewingLore && deleteLore(viewingLore)}
      />
      <LoreEditor open={Boolean(editingLore)} onOpenChange={(open) => !open && setEditingLore(null)} entry={editingLore?.id ? editingLore : null} onSaved={load} />
      <CharacterSheetView
        open={Boolean(viewingCharacter)}
        onOpenChange={(open) => !open && setViewingCharacter(null)}
        sheet={viewingCharacter}
        canEdit
        currentUser={user}
        isDM
        onSheetUpdated={syncUpdatedCharacter}
        onEdit={() => {
          setEditingCharacter(viewingCharacter);
          setViewingCharacter(null);
        }}
      />
      <CharacterSheetEditor
        open={Boolean(editingCharacter)}
        onOpenChange={(open) => !open && setEditingCharacter(null)}
        sheet={editingCharacter?.id ? editingCharacter : null}
        onSaved={load}
        currentUser={user}
        isDM
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="border border-border rounded-sm bg-background/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
        <Icon className="w-3 h-3 text-accent" /> {label}
      </div>
      <div className="text-sm font-medium mt-1 truncate">{value}</div>
    </div>
  );
}

function ArchiveSection({ title, items, empty, onRestore, onDelete, onOpen, nameKey = "title" }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-widest text-accent font-medium mb-3">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border border-border bg-card/55 rounded-sm p-4 flex items-center justify-between gap-4">
              <button type="button" onClick={() => onOpen(item)} className="text-left min-w-0">
                <div className="font-medium truncate">{item[nameKey] || "Untitled"}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{shortDate(item.updated_date || item.created_date)}</div>
              </button>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => onRestore(item)}>
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete?.(item)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
