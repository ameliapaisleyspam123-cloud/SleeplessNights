import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import LoreCard from "@/components/lore/LoreCard";
import LoreDetail from "@/components/lore/LoreDetail";
import LoreEditor from "@/components/lore/LoreEditor";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Lore() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    const user = await appClient.auth.me();
    setItems(await appClient.entities.LoreEntry.filter({ campaign_id: user.campaign_id }, "-updated_date", 200));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <PageHeader
        eyebrow="World"
        title="Lore & Maps"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />
      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No lore entries yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((entry) => (
            <LoreCard key={entry.id} entry={entry} onClick={() => setViewing(entry)} />
          ))}
        </div>
      )}
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
