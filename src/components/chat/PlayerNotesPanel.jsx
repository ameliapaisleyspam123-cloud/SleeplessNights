import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { X, NotebookPen, Loader2, Check, BookOpen, Dices, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";

const quillModules = { toolbar: [["bold", "italic"], [{ list: "bullet" }, { list: "ordered" }], ["clean"]] };
const quillClass = "[&_.ql-container]:border-border [&_.ql-container]:text-sm [&_.ql-editor]:bg-background/55 [&_.ql-editor]:text-foreground [&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-card/60 [&_.ql-stroke]:stroke-muted-foreground [&_.ql-fill]:fill-muted-foreground [&_.ql-picker]:text-muted-foreground";

function selectedSessionKey(user) {
  return user?.campaign_id && user?.email ? `sleepless_selected_note_${user.campaign_id}_${user.email}` : "";
}

export default function PlayerNotesPanel({ onClose, currentUser, embedded = false }) {
  const fullPage = !onClose && !embedded;
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef(null);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  const loadNotes = async () => {
    if (!currentUser?.campaign_id) return;
    const [playerNotes, campaigns] = await Promise.all([
      appClient.entities.PlayerNote.filter({ campaign_id: currentUser.campaign_id, created_by: currentUser.email }, "created_date", 100),
      appClient.entities.Campaign.list("-created_date", 50).catch(() => []),
    ]);
    setCampaign(campaigns.find((item) => item.id === currentUser.campaign_id) || null);
    setNotes(playerNotes);

    const savedSelectedId = localStorage.getItem(selectedSessionKey(currentUser));
    const selected = playerNotes.find((note) => note.id === (noteId || savedSelectedId)) || playerNotes[0];
    if (selected) {
      setContent(selected.content || "");
      setNoteId(selected.id);
      localStorage.setItem(selectedSessionKey(currentUser), selected.id);
    } else {
      setContent("");
      setNoteId(null);
    }
  };

  useEffect(() => {
    loadNotes().catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.campaign_id) return undefined;
    const syncSelected = (event) => {
      if (event.detail?.key !== selectedSessionKey(currentUser)) return;
      const selected = notes.find((note) => note.id === event.detail.noteId);
      if (selected) {
        setNoteId(selected.id);
        setContent(selected.content || "");
      }
    };
    const syncContent = (event) => {
      if (event.detail?.key !== selectedSessionKey(currentUser)) return;
      if (event.detail?.sourceId === instanceId.current) return;
      if (event.detail?.noteId !== noteId) return;
      setContent(event.detail.content || "");
    };
    const unsubscribe = appClient.entities.PlayerNote.subscribe((event) => {
      if (event.type === "delete") {
        loadNotes().catch(() => {});
        return;
      }
      if (event.data?.id === noteId) {
        setContent(event.data.content || "");
        setNotes((items) => items.map((item) => (item.id === event.data.id ? event.data : item)));
      } else if (event.type === "create" || event.type === "update") {
        loadNotes().catch(() => {});
      }
    });
    window.addEventListener("sleepless-note-selected", syncSelected);
    window.addEventListener("sleepless-note-content", syncContent);
    return () => {
      unsubscribe();
      window.removeEventListener("sleepless-note-selected", syncSelected);
      window.removeEventListener("sleepless-note-content", syncContent);
    };
  }, [currentUser, noteId, notes]);

  const save = async (val) => {
    const v = val !== undefined ? val : content;
    if (!currentUser?.campaign_id) return;
    setSaving(true);
    try {
      if (noteId) {
        const updated = await appClient.entities.PlayerNote.update(noteId, { content: v });
        setNotes((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await appClient.entities.PlayerNote.create({ campaign_id: currentUser.campaign_id, session_label: "Session 0", content: v });
        setNoteId(created.id);
        setNotes([created]);
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
    if (noteId) {
      window.dispatchEvent(new CustomEvent("sleepless-note-content", {
        detail: {
          key: selectedSessionKey(currentUser),
          noteId,
          content: newContent,
          sourceId: instanceId.current,
        },
      }));
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(newContent), 1200);
  };

  const selectNote = (note) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaved(false);
    setNoteId(note.id);
    setContent(note.content || "");
    localStorage.setItem(selectedSessionKey(currentUser), note.id);
    window.dispatchEvent(new CustomEvent("sleepless-note-selected", { detail: { key: selectedSessionKey(currentUser), noteId: note.id } }));
  };

  const createSessionLog = async () => {
    if (!currentUser?.campaign_id) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (noteId) await save(content);
    const usedSessionNumbers = notes
      .map((note) => /^Session\s+(\d+)$/i.exec(note.session_label || ""))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    const nextIndex = usedSessionNumbers.length > 0 ? Math.max(...usedSessionNumbers) + 1 : 0;
    const created = await appClient.entities.PlayerNote.create({
      campaign_id: currentUser.campaign_id,
      session_label: `Session ${nextIndex}`,
      content: "",
    });
    setNotes((items) => [...items, created]);
    setNoteId(created.id);
    localStorage.setItem(selectedSessionKey(currentUser), created.id);
    window.dispatchEvent(new CustomEvent("sleepless-note-selected", { detail: { key: selectedSessionKey(currentUser), noteId: created.id } }));
    setContent("");
    setSaved(false);
  };

  const startRename = (event, note) => {
    event.stopPropagation();
    setRenamingId(note.id);
    setRenameValue(note.session_label || "Session 0");
  };

  const finishRename = async () => {
    const cleanName = renameValue.trim();
    if (!renamingId || !cleanName) {
      setRenamingId(null);
      return;
    }
    const updated = await appClient.entities.PlayerNote.update(renamingId, { session_label: cleanName });
    setNotes((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    setRenamingId(null);
    setRenameValue("");
  };

  const deleteSessionLog = async (event, note) => {
    event.stopPropagation();
    if (!window.confirm(`Delete ${note.session_label || "this session log"}?`)) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    await appClient.entities.PlayerNote.delete(note.id);
    const remaining = notes.filter((item) => item.id !== note.id);
    setNotes(remaining);
    if (note.id === noteId) {
      const next = remaining[0];
      setNoteId(next?.id || null);
      setContent(next?.content || "");
    }
    setRenamingId(null);
  };

  const activeNote = notes.find((note) => note.id === noteId);
  const activeLabel = activeNote?.session_label || "Session 0";
  const campaignName = campaign?.name || "Sleepless Nights";

  if (fullPage) {
    return (
      <div className="min-h-full p-6 lg:p-10 space-y-5">
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-accent font-medium mb-3">Campaign: {campaignName}</div>
              <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">Grimoire</h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed">Your private field notes - visible only to you.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("toggle-dice-roller"))} className="h-10 px-4">
                <Dices className="w-4 h-4" /> Dice
              </Button>
              <Button onClick={createSessionLog} className="h-10 px-4">
                <Plus className="w-4 h-4" /> New Session Log
              </Button>
            </div>
          </div>
          <div className="ink-divider mt-8" />
        </div>

        <div className="grid lg:grid-cols-[276px_1fr] min-h-[calc(100vh-16rem)] border border-border bg-card/50 rounded-sm overflow-hidden">
          <aside className="border-r border-border/70 bg-background/20 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between px-4 py-5 border-b border-border/60">
              <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.28em] text-muted-foreground">
                <ScrollText className="w-4 h-4 text-accent" />
                Chronicles
              </div>
              <button type="button" onClick={createSessionLog} className="w-8 h-8 rounded-sm text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="New session log">
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            </div>
            <div className="flex-1 py-2">
              {notes.length === 0 ? (
                <button type="button" onClick={createSessionLog} className="w-full px-4 py-3 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  Create your first session log
                </button>
              ) : (
                notes.map((note, index) => {
                  const selected = note.id === noteId;
                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectNote(note)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectNote(note);
                        }
                      }}
                      className={`group w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                        selected ? "bg-accent/10 text-foreground border-l-2 border-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-l-2 border-transparent"
                      }`}
                    >
                      <BookOpen className={`w-4 h-4 shrink-0 ${selected ? "text-accent" : ""}`} />
                      {renamingId === note.id ? (
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={finishRename}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") finishRename();
                            if (event.key === "Escape") setRenamingId(null);
                          }}
                          className="min-w-0 flex-1 rounded-sm border border-accent/60 bg-background px-2 py-1 text-sm text-foreground outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{note.session_label || `Session ${index}`}</span>
                      )}
                      {renamingId !== note.id && (
                        <span className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(event) => startRename(event, note)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10"
                            title="Rename session"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => deleteSessionLog(event, note)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-border/60 sm:hidden">
              <Button onClick={createSessionLog} className="w-full">
                <Plus className="w-4 h-4" /> New Session Log
              </Button>
            </div>
          </aside>

          <main className="px-5 lg:px-12 py-6 lg:py-7 min-w-0">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-5 mb-6">
              <div>
                <h2 className="font-display text-2xl md:text-3xl text-foreground leading-tight">{activeLabel}</h2>
                <p className="mt-2 text-sm italic text-muted-foreground">{campaignName} · Your private field notes</p>
              </div>
              <div className="flex items-center gap-2 h-8">
                {saving && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                {saved && <Check className="w-4 h-4 text-accent" />}
              </div>
            </div>

            <div className="player-notes-editor rounded-sm border border-border/90 overflow-hidden">
              <ReactQuill
                value={content}
                onChange={autosave}
                theme="snow"
                placeholder="What transpired this session? Jot down clues, suspicions, NPC names, and secrets only you know..."
                modules={quillModules}
                className={`${quillClass} [&_.ql-editor]:min-h-[42vh] lg:[&_.ql-editor]:min-h-[50vh]`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Auto-inscribed. Visible only to you.</p>
          </main>
        </div>
      </div>
    );
  }

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
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{activeLabel}</div>
            <div className="text-[10px] text-muted-foreground">Synced with Grimoire</div>
          </div>
          {notes.length > 1 && (
            <select
              value={noteId || ""}
              onChange={(event) => {
                const selected = notes.find((note) => note.id === event.target.value);
                if (selected) selectNote(selected);
              }}
              className="max-w-32 rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              {notes.map((note, index) => (
                <option key={note.id} value={note.id}>{note.session_label || `Session ${index}`}</option>
              ))}
            </select>
          )}
        </div>
        <div className="player-notes-editor flex-1 min-h-0 rounded-sm border border-border overflow-hidden">
          <ReactQuill
            value={content}
            onChange={autosave}
            theme="snow"
            placeholder="Jot down your secrets, plans, and observations... Only you can see these."
            modules={quillModules}
            className={`${quillClass} h-full [&_.ql-container]:h-[calc(100%-42px)] [&_.ql-editor]:min-h-[220px]`}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 italic">Private — only visible to you.</p>
      </div>
    </div>
  );
}
