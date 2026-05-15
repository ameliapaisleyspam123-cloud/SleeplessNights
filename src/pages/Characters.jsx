import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import CharacterSheetCard from "@/components/characters/CharacterSheetCard";
import CharacterSheetEditor from "@/components/characters/CharacterSheetEditor";
import CharacterSheetView from "@/components/characters/CharacterSheetView";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Folder, Plus } from "lucide-react";

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

export default function Characters() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [allSheets, setAllSheets] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [folder, setFolder] = useState("all");

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [currentSheets, everyCampaign, everySheet] = await Promise.all([
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 200),
      appClient.entities.Campaign.list("-created_date", 200),
      appClient.entities.CharacterSheet.list("-updated_date", 500),
    ]);
    setUser(currentUser);
    setItems(currentSheets);
    setCampaigns(everyCampaign);
    setAllSheets(everySheet);
  };

  useEffect(() => {
    load();
  }, []);

  const duplicateSheet = async (sheet) => {
    if (!sheet || !user?.campaign_id) return;
    await appClient.entities.CharacterSheet.create(cloneSheet(sheet, user.campaign_id));
    setViewing(null);
    setEditing(null);
    await load();
  };

  const importSheet = async (sheet) => {
    if (!sheet || !user?.campaign_id) return;
    await appClient.entities.CharacterSheet.create(cloneSheet(sheet, user.campaign_id, "Imported"));
    setImportOpen(false);
    await load();
  };

  const importableSheets = allSheets.filter((sheet) => sheet.campaign_id && sheet.campaign_id !== user?.campaign_id);
  const campaignName = (campaignId) => campaigns.find((campaign) => campaign.id === campaignId)?.name || "Unknown campaign";
  const folders = [...new Set(items.map((item) => item.folder).filter(Boolean))].sort();
  const filteredItems = items.filter((item) => folder === "all" || item.folder === folder);

  return (
    <div className="p-6 lg:p-10 space-y-5">
      <PageHeader
        eyebrow="Roster"
        title="Characters"
        description="Track your heroes — stats, spells, and stories."
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
        <div className="flex gap-2 overflow-x-auto thin-scroll border-b border-border p-3">
          <button
            type="button"
            onClick={() => setFolder("all")}
            className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === "all" ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
          >
            <Folder className="w-7 h-7" strokeWidth={1.7} />
            <span className="text-[10px] leading-tight text-center">All Characters</span>
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

        <div className="p-4">
          {items.length === 0 ? (
            <Empty label="No character sheets yet." />
          ) : filteredItems.length === 0 ? (
            <Empty label="No characters in this folder." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((sheet) => (
                <CharacterSheetCard key={sheet.id} sheet={sheet} onClick={() => setViewing(sheet)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <CharacterSheetEditor open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} sheet={editing?.id ? editing : null} onSaved={load} onDuplicate={() => duplicateSheet(editing)} />
      <CharacterSheetView
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        sheet={viewing}
        canEdit
        onEdit={() => {
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
    </div>
  );
}

function Empty({ label }) {
  return <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">{label}</div>;
}
