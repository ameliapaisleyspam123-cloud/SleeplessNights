import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Radio, FileText, Trash2 } from "lucide-react";
import { appClient } from "@/api/appClient";
import MapPinViewer from "@/components/lore/MapPinViewer";

export default function LoreDetail({ entry, open, onOpenChange, onEdit, onDelete, isAdmin, entries = [], onEntryUpdated, onOpenEntry }) {
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setMapOpen(false);
      return;
    }
    if ((entry?.pdf_url || entry?.image_url) && entry?.category === "map") {
      setMapOpen(true);
    }
  }, [open, entry?.id, entry?.pdf_url, entry?.image_url, entry?.category]);

  if (!entry) return null;
  const isMap = entry.category === "map";

  const broadcast = async () => {
    const all = await appClient.entities.Broadcast.list("-updated_date", 100);
    await Promise.all(all.filter((item) => item.active).map((item) => appClient.entities.Broadcast.update(item.id, { active: false })));
    const user = await appClient.auth.me().catch(() => null);
    await appClient.entities.Broadcast.create({
      active: true,
      archived: false,
      campaign_id: user?.campaign_id,
      title: entry.title,
      message: entry.content,
      image_url: entry.image_url,
      lore_entry_id: entry.id,
      target_emails: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto thin-scroll p-0">
        {entry.image_url && isMap && (
          <button type="button" onClick={() => setMapOpen(true)} className="block w-full aspect-[16/9] overflow-hidden bg-muted text-left">
            <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
          </button>
        )}
        {entry.image_url && !isMap && (
          <div className="block w-full aspect-[16/9] overflow-hidden bg-muted">
            <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-accent mb-2">{entry.category}</div>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">{entry.title}</h2>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
              </div>
            )}
          </div>
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {entry.tags.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
              ))}
            </div>
          )}
          <div className="ink-divider my-5" />
          {entry.content && (
            <div className="rich-content text-[15px] leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: entry.content }} />
          )}

          {entry.pdf_url && (
            <div className="mt-4 p-3 border border-border rounded-sm bg-secondary/30 flex items-center gap-3">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-sm flex-1">{isMap ? "PDF map attached" : "PDF attached"}</span>
              {isMap ? (
                <button type="button" onClick={() => setMapOpen(true)} className="text-xs text-muted-foreground hover:text-accent transition-colors">
                  Open map
                </button>
              ) : (
                <a href={entry.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-accent transition-colors">
                  Open PDF
                </a>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-8 justify-end">
            {isAdmin && (
              <Button variant="outline" onClick={broadcast}>
                <Radio className="w-4 h-4 mr-1.5" /> Broadcast
              </Button>
            )}
          </div>
        </div>

        {mapOpen && isMap && (entry.pdf_url || entry.image_url) && createPortal(
          <MapPinViewer
            entry={entry}
            entries={entries}
            isAdmin={isAdmin}
            onEntryUpdated={onEntryUpdated}
            onOpenEntry={onOpenEntry}
            onClose={() => setMapOpen(false)}
          />,
          document.body,
        )}
      </DialogContent>
    </Dialog>
  );
}
