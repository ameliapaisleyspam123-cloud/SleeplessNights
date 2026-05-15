import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Radio, FileText, Eye, X, Trash2 } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function LoreDetail({ entry, open, onOpenChange, onEdit, onDelete, isAdmin }) {
  const [pdfOpen, setPdfOpen] = useState(false);
  if (!entry) return null;

  const broadcast = async () => {
    const existing = await appClient.entities.Broadcast.list("-created_date", 1);
    const payload = { active: true, title: entry.title, message: entry.content, image_url: entry.image_url, lore_entry_id: entry.id };
    if (existing[0]) await appClient.entities.Broadcast.update(existing[0].id, payload);
    else await appClient.entities.Broadcast.create(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto thin-scroll p-0">
        {entry.image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-muted">
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
              <span className="text-sm flex-1">PDF attached</span>
              <Button size="sm" variant="outline" onClick={() => setPdfOpen(true)}>
                <Eye className="w-3.5 h-3.5 mr-1.5" /> View PDF
              </Button>
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

        {pdfOpen && entry.pdf_url && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "hsl(var(--background))", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
              <span className="font-display text-lg">{entry.title} - PDF</span>
              <Button variant="ghost" size="sm" onClick={() => setPdfOpen(false)}>
                <X className="w-4 h-4 mr-1.5" /> Close
              </Button>
            </div>
            <iframe src={entry.pdf_url} style={{ flex: 1, width: "100%", border: "none" }} title="PDF Viewer" />
          </div>,
          document.body,
        )}
      </DialogContent>
    </Dialog>
  );
}
