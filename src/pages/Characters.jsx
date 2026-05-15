import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import CharacterSheetCard from "@/components/characters/CharacterSheetCard";
import CharacterSheetEditor from "@/components/characters/CharacterSheetEditor";
import CharacterSheetView from "@/components/characters/CharacterSheetView";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Characters() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    const user = await appClient.auth.me();
    setItems(await appClient.entities.CharacterSheet.filter({ campaign_id: user.campaign_id }, "-updated_date", 200));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Roster"
        title="Characters"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="w-4 h-4" /> New
          </Button>
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
      <CharacterSheetEditor open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} sheet={editing?.id ? editing : null} onSaved={load} />
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
    </div>
  );
}

function Empty({ label }) {
  return <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">{label}</div>;
}
