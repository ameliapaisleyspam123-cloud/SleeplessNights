import React, { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function WhatsNewModal({ open, onOpenChange, announcement, canEdit, onSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(announcement?.title || "");
    setContent(announcement?.content || "");
    setEditing(canEdit && !announcement);
  }, [open, announcement, canEdit]);

  const save = async () => {
    if (!canEdit || !title.trim() || !content.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      published_date: new Date().toISOString(),
      created_by: "global-admin",
    };
    const saved = announcement?.id
      ? await appClient.entities.WhatsNew.update(announcement.id, payload)
      : await appClient.entities.WhatsNew.create(payload);
    setSaving(false);
    setEditing(false);
    onSaved?.(saved);
  };

  const cancelEditing = () => {
    setTitle(announcement?.title || "");
    setContent(announcement?.content || "");
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader className="flex-row items-start justify-between gap-4 pr-8">
          <div>
            <div className="flex items-center gap-2 text-accent mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Across all campaigns</span>
            </div>
            <DialogTitle className="font-display text-2xl">What&apos;s New</DialogTitle>
          </div>
          {canEdit && announcement && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit update</Button>
          )}
        </DialogHeader>

        {editing ? (
          <div className="space-y-4 mt-5">
            <div>
              <Label htmlFor="whats-new-title">Headline</Label>
              <Input
                id="whats-new-title"
                className="mt-1.5"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="A short summary of the update"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="whats-new-content">Update</Label>
              <Textarea
                id="whats-new-content"
                className="mt-1.5 min-h-56"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Tell everyone what has changed..."
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground mt-1.5">Publishing replaces the current update for users in every campaign.</p>
            </div>
            <div className="flex justify-end gap-2">
              {announcement && <Button variant="ghost" onClick={cancelEditing} disabled={saving}>Cancel</Button>}
              <Button onClick={save} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            </div>
          </div>
        ) : announcement ? (
          <article className="mt-5 rounded-sm border border-border bg-card/45 p-5">
            <h3 className="font-display text-xl text-foreground">{announcement.title}</h3>
            {announcement.published_date && (
              <time className="block text-[10px] uppercase tracking-widest text-muted-foreground mt-1 mb-4">
                Published {new Date(announcement.published_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </time>
            )}
            <div className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap break-words">{announcement.content}</div>
          </article>
        ) : (
          <div className="mt-5 rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            There isn&apos;t an update to share yet.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
