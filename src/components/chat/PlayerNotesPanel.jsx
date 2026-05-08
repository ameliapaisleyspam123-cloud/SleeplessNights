import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { X, NotebookPen, Loader2, Check } from "lucide-react";

export default function PlayerNotesPanel({ onClose, currentUser }) {
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    if (!currentUser?.campaign_id) return;
    base44.entities.PlayerNote.filter({ campaign_id: currentUser.campaign_id, created_by: currentUser.email }, "-created_date", 1)
      .then((notes) => {
        if (notes.length > 0) {
          setContent(notes[0].content || "");
          setNoteId(notes[0].id);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const save = async (val) => {
    const v = val !== undefined ? val : content;
    if (!currentUser?.campaign_id) return;
    setSaving(true);
    try {
      if (noteId) {
        await base44.entities.PlayerNote.update(noteId, { content: v });
      } else {
        const created = await base44.entities.PlayerNote.create({ campaign_id: currentUser.campaign_id, content: v });
        setNoteId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const autosave = (newContent) => {
    setContent(newContent);
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(newContent), 1200);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">The Chronicle</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          {saved && <Check className="w-3.5 h-3.5 text-green-500" />}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <Textarea
          value={content}
          onChange={(e) => autosave(e.target.value)}
          placeholder="Jot down your secrets, plans, and observations... Only you can see these."
          className="flex-1 resize-none bg-secondary/20 border-border text-sm leading-relaxed h-full min-h-0 focus-visible:ring-1 focus-visible:ring-accent/50"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5 italic">Private — only visible to you.</p>
      </div>
    </div>
  );
}
