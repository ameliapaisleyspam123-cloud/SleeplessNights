import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import CharacterClaimButton from "@/components/characters/CharacterClaimButton";
import CharacterSheetCard from "@/components/characters/CharacterSheetCard";
import CharacterSheetEditor from "@/components/characters/CharacterSheetEditor";
import CharacterSheetView from "@/components/characters/CharacterSheetView";
import MoveFolderDialog from "@/components/lore/MoveFolderDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sortClaimedCharactersFirst } from "@/lib/characters";
import { canViewVisibleItem, isDmUser } from "@/lib/visibility";
import { campaignDate, datedCreatePayload, hasTimelineDate, isRecordOnDate } from "@/lib/timeline";
import { Copy, Download, Folder, MoveRight, Plus, Trash2 } from "lucide-react";

function cloneSheet(sheet, campaignId, suffix = "Copy") {
  const {
    id,
    created_date,
    updated_date,
    created_by,
    ...rest
  } = sheet;
  return {
    ...rest,
    name: `${sheet.name || "Character"} ${suffix}`.trim(),
    campaign_id: campaignId,
  };
}

const emptyFolderKey = (campaignId) => `sleepless_empty_character_folders_${campaignId || "default"}`;
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

const canEditSheet = (sheet, user, isAdmin) => {
  if (!sheet) return false;
  if (isAdmin) return true;
  return sheet.created_by === user?.email || sheet.assigned_to_email === user?.email;
};

export default function Characters() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [emptyFolders, setEmptyFolders] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [allSheets, setAllSheets] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [moving, setMoving] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [folder, setFolder] = useState("all");

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [currentSheets, everyCampaign, everySheet] = await Promise.all([
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 500),
      appClient.entities.Campaign.list("-created_date", 200),
      appClient.entities.CharacterSheet.list("-updated_date", 500),
    ]);
    setUser(currentUser);
    setEmptyFolders(readEmptyFolders(currentUser.campaign_id));
    setItems(currentSheets);
    setCampaigns(everyCampaign);
    setCampaign(everyCampaign.find((item) => item.id === currentUser.campaign_id) || null);
    setAllSheets(everySheet);
  };

  useEffect(() => {
    load();
  }, []);

  const duplicateSheet = async (sheet) => {
    if (!sheet || !user?.campaign_id) return;
    const created = await appClient.entities.CharacterSheet.create(
      datedCreatePayload(cloneSheet(sheet, user.campaign_id), campaignDate(campaign, campaign?.calendar_system), campaign?.calendar_system),
    );
    if (!created.timeline_series_id) await appClient.entities.CharacterSheet.update(created.id, { timeline_series_id: created.id });
    setViewing(null);
    setEditing(null);
    await load();
  };

  const importSheet = async (sheet) => {
    if (!sheet || !user?.campaign_id) return;
    const created = await appClient.entities.CharacterSheet.create(
      datedCreatePayload(cloneSheet(sheet, user.campaign_id, "Imported"), campaignDate(campaign, campaign?.calendar_system), campaign?.calendar_system),
    );
    if (!created.timeline_series_id) await appClient.entities.CharacterSheet.update(created.id, { timeline_series_id: created.id });
    setImportOpen(false);
    await load();
  };

  const importableSheets = allSheets.filter((sheet) => sheet.campaign_id && sheet.campaign_id !== user?.campaign_id);
  const campaignName = (campaignId) => campaigns.find((campaign) => campaign.id === campaignId)?.name || "Unknown campaign";
  const isAdmin = isDmUser(user);
  const currentCampaign = campaign || campaigns.find((campaign) => campaign.id === user?.campaign_id) || null;
  const activeDate = campaignDate(currentCampaign, currentCampaign?.calendar_system);
  const visibleItems = items.filter((item) => {
    if (!canViewVisibleItem(item, user, isAdmin)) return false;
    return hasTimelineDate(item) ? isRecordOnDate(item, activeDate, currentCampaign?.calendar_system) : !currentCampaign?.timeline_started;
  });
  const folders = expandFolderPaths([...visibleItems.map((item) => item.folder).filter(Boolean), ...emptyFolders]);
  const folderOptions = visibleFolderPaths(folders, folder);
  const filteredItems = sortClaimedCharactersFirst(
    visibleItems.filter((item) => folder === "all" || item.folder === folder || item.folder?.startsWith(`${folder}/`)),
    user?.email,
  );
  const userCharacterCounts = items.reduce((counts, sheet) => {
    if (!sheet.assigned_to_email) return counts;
    return { ...counts, [sheet.assigned_to_email]: (counts[sheet.assigned_to_email] || 0) + 1 };
  }, {});

  const syncUpdatedSheet = (updated) => {
    if (!updated?.id) return;
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setAllSheets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setViewing((current) => (current?.id === updated.id ? updated : current));
    setEditing((current) => (current?.id === updated.id ? updated : current));
  };

  const createFolder = () => {
    const name = window.prompt(folder === "all" ? "New character folder name" : `New subfolder inside "${folder}"`);
    const folderName = createChildFolderPath(folder, name);
    if (!folderName || !user?.campaign_id) return;
    const next = [...new Set([...emptyFolders, folderName])].sort();
    setEmptyFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    setFolder(folderName);
  };

  const moveSheet = async (targetFolder) => {
    if (!moving?.id) return;
    await appClient.entities.CharacterSheet.update(moving.id, { folder: targetFolder || "" });
    if (targetFolder && user?.campaign_id) {
      const next = [...new Set([...emptyFolders, targetFolder])].sort();
      setEmptyFolders(next);
      writeEmptyFolders(user.campaign_id, next);
    }
    setMoving(null);
    setContextMenu(null);
    await load();
  };

  const deleteSheet = async (sheet) => {
    if (!sheet?.id) return;
    const confirmed = window.confirm(`Move ${sheet.name || "this character"} to the DM Vault archive?`);
    if (!confirmed) return;
    await appClient.entities.CharacterSheet.update(sheet.id, { visibility: "archived" });
    setViewing(null);
    setEditing(null);
    setContextMenu(null);
    await load();
  };

  const deleteFolder = async (folderName) => {
    if (!folderName || !user?.campaign_id) return;
    const affected = items.filter((item) => item.folder === folderName || item.folder?.startsWith(`${folderName}/`));
    const destination = parentFolderPath(folderName);
    const destinationLabel = destination || "All Characters";
    const confirmed = window.confirm(
      affected.length > 0
        ? `Delete the "${folderName}" folder and move ${affected.length} character${affected.length === 1 ? "" : "s"} to ${destinationLabel}?`
        : `Delete the "${folderName}" folder?`,
    );
    if (!confirmed) return;
    await Promise.all(affected.map((item) => appClient.entities.CharacterSheet.update(item.id, { folder: destination })));
    const next = emptyFolders.filter((name) => name !== folderName && !name.startsWith(`${folderName}/`));
    setEmptyFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    if (folder === folderName || folder.startsWith(`${folderName}/`)) setFolder(destination || "all");
    await load();
  };

  const openContextMenu = (event, sheet) => {
    if (!isAdmin) return;
    setContextMenu({ x: event.clientX, y: event.clientY, sheet });
  };

  return (
    <div className="p-6 lg:p-10 space-y-5" onClick={() => setContextMenu(null)}>
      <PageHeader
        eyebrow="Roster"
        title="Characters"
        description="Track your heroes - stats, spells, and stories."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="w-4 h-4" /> Import
            </Button>
            <Button onClick={() => setEditing({})}>
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        }
      />

      <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          {folder !== "all" && (
            <div className="w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Current folder: <span className="font-mono normal-case tracking-normal text-foreground">{folder}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setFolder("all")}
            className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === "all" ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
          >
            <Folder className="w-7 h-7" strokeWidth={1.7} />
            <span className="text-[10px] leading-tight text-center">All Characters</span>
          </button>
          {folderOptions.map((name) => (
            <div
              key={name}
              className={`relative flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === name ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
              title={name}
            >
              <button type="button" onClick={() => setFolder(name)} className="absolute inset-0" aria-label={`Open ${name}`} />
              <Folder className="w-7 h-7" strokeWidth={1.7} />
              <span className="text-[10px] leading-tight text-center max-w-20 break-words">{name.split("/").pop()}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteFolder(name);
                  }}
                  className="absolute top-1 right-1 z-10 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-background/80"
                  title="Delete folder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
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

        <div className="p-4">
          {items.length === 0 ? (
            <Empty label="No character sheets yet." />
          ) : filteredItems.length === 0 ? (
            <Empty label="No characters in this folder." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((sheet) => (
                <CharacterSheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onClick={() => setViewing(sheet)}
                  onContextMenu={openContextMenu}
                  action={
                    <CharacterClaimButton
                      sheet={sheet}
                      campaign={currentCampaign}
                      currentUserEmail={user?.email}
                      isDM={isAdmin}
                      onClaimChange={load}
                      userCharacterCounts={userCharacterCounts}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <CharacterSheetEditor
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        sheet={editing?.id ? editing : null}
        onSaved={load}
        onDuplicate={() => duplicateSheet(editing)}
        onDelete={isAdmin && editing?.id ? () => deleteSheet(editing) : undefined}
        currentUser={user}
        isDM={isAdmin}
        campaign={currentCampaign}
        onClaimChange={load}
        userCharacterCounts={userCharacterCounts}
      />
      <MoveFolderDialog
        open={Boolean(moving)}
        onOpenChange={(open) => !open && setMoving(null)}
        entry={moving}
        allFolderPaths={folders}
        onMove={moveSheet}
        title="Move Character"
        itemLabel="Moving"
        rootLabel="All Characters (root)"
      />
      <CharacterSheetView
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        sheet={viewing}
        canEdit={canEditSheet(viewing, user, isAdmin)}
        currentUser={user}
        isDM={isAdmin}
        onSheetUpdated={syncUpdatedSheet}
        onEdit={() => {
          if (!canEditSheet(viewing, user, isAdmin)) return;
          setEditing(viewing);
          setViewing(null);
        }}
      />
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto thin-scroll">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Import Character</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Copy a character sheet from another campaign into this one.</p>
          {importableSheets.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm p-8 text-center text-muted-foreground">No characters found in other campaigns.</div>
          ) : (
            <div className="space-y-2">
              {importableSheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => importSheet(sheet)}
                  className="w-full border border-border bg-card hover:border-accent/60 rounded-sm p-3 text-left transition-colors flex items-center gap-3"
                >
                  <Copy className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{sheet.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[sheet.race, sheet.class].filter(Boolean).join(" - ")} from {campaignName(sheet.campaign_id)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {contextMenu && isAdmin && (
        <div
          className="fixed z-[120] min-w-44 rounded-sm border border-border bg-card shadow-2xl p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMoving(contextMenu.sheet);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm"
          >
            <MoveRight className="w-4 h-4 text-accent" /> Move to folder
          </button>
          <button
            type="button"
            onClick={() => deleteSheet(contextMenu.sheet)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-secondary rounded-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete character
          </button>
        </div>
      )}
    </div>
  );
}

function Empty({ label }) {
  return <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">{label}</div>;
}
