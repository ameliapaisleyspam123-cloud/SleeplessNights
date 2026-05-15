import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import CharacterSheetCard from "@/components/characters/CharacterSheetCard";
import CharacterSheetEditor from "@/components/characters/CharacterSheetEditor";
import CharacterSheetView from "@/components/characters/CharacterSheetView";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Plus } from "lucide-react";

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

  return (
    <div className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Roster"
        title="Characters"
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
      {items.length === 0 ? (
        <Empty label="No character sheets yet." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((sheet) => (
            <CharacterSheetCard key={sheet.id} sheet={sheet} onClick={() => setViewing(sheet)} />
          ))}
        </div>
      )}
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
