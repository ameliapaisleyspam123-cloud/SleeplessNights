import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText, Eye, EyeOff, Lock, Users } from "lucide-react";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public - all players can see", icon: Eye },
  { value: "specific_players", label: "Specific Players - chosen few + DM", icon: Users },
  { value: "dm_only", label: "DM Only - hidden from players", icon: Lock },
  { value: "archived", label: "Archived - hidden from all", icon: EyeOff },
];

const CATEGORIES = [
  { value: "map", label: "Map" },
  { value: "character", label: "Character" },
  { value: "place", label: "Place" },
  { value: "event", label: "Event" },
  { value: "artifact", label: "Artifact" },
  { value: "religion", label: "Religion" },
  { value: "other", label: "Other" },
];

const blankEntry = {
  title: "",
  category: "other",
  folder: "",
  content: "",
  image_url: "",
  pdf_url: "",
  tags: [],
  visibility: "public",
  allowed_emails: [],
};

export default function LoreEditor({ open, onOpenChange, entry, onSaved }) {
  const [form, setForm] = useState(() => entry || blankEntry);
  const [tagInput, setTagInput] = useState("");
  const [existingTags, setExistingTags] = useState([]);
  const [existingFolders, setExistingFolders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(entry || blankEntry);
      setTagInput("");
      appClient.entities.User.list("-created_date", 200).then((u) => setAllUsers(u.filter((x) => x.role !== "admin"))).catch(() => {});
      appClient.auth.me().then((u) => {
        if (!u?.campaign_id) return;
        appClient.entities.LoreEntry.filter({ campaign_id: u.campaign_id }, "-created_date", 200).then((entries) => {
          const tags = [...new Set(entries.flatMap((e) => e.tags || []))].sort();
          setExistingTags(tags);
          const folders = [...new Set(entries.map((e) => e.folder).filter(Boolean))].sort();
          setExistingFolders(folders);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [open, entry]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, pdf_url: file_url }));
    setUploadingPdf(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput("");
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    if (entry?.id) {
      await appClient.entities.LoreEntry.update(entry.id, form);
    } else {
      const u = await appClient.auth.me().catch(() => null);
      await appClient.entities.LoreEntry.create({ ...form, campaign_id: u?.campaign_id });
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const archive = async () => {
    if (!entry?.id) return;
    await appClient.entities.LoreEntry.update(entry.id, { visibility: "archived" });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {entry?.id ? "Edit Entry" : "New Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="The Siege of Varnhold..." />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Folder (optional)</Label>
            <Input
              value={form.folder || ""}
              onChange={(e) => setForm({ ...form, folder: e.target.value })}
              placeholder="e.g. World/Factions/Guilds - use / for nesting"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Use <span className="font-mono">/</span> to nest folders, e.g. <span className="font-mono">World/Factions</span></p>
            {existingFolders.filter((f) => f !== form.folder).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {existingFolders.filter((f) => f !== form.folder).map((f) => (
                  <button key={f} type="button" onClick={() => setForm((fm) => ({ ...fm, folder: f }))} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors font-mono">
                    + {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Image / Map</Label>
            {form.image_url ? (
              <div className="relative rounded-sm overflow-hidden border border-border">
                <img src={form.image_url} alt="" className="w-full max-h-64 object-cover" />
                <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setForm({ ...form, image_url: "" })}>Remove</Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-24 rounded-sm border border-dashed border-border cursor-pointer hover:border-accent hover:bg-secondary/40 transition-all text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload image or map"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>

          <div>
            <Label>Lore</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Pen the tale..." className="min-h-[150px]" />
          </div>

          <div>
            <Label>PDF Attachment (optional)</Label>
            {form.pdf_url ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-sm bg-secondary/40 mt-1.5">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground flex-1">PDF attached</span>
                <label className="text-xs text-muted-foreground hover:text-accent cursor-pointer transition-colors mr-2">
                  {uploadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Replace"}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                </label>
                <button onClick={() => setForm((f) => ({ ...f, pdf_url: "" }))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Remove</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-16 rounded-sm border border-dashed border-border cursor-pointer hover:border-accent hover:bg-secondary/40 transition-all text-sm text-muted-foreground mt-1.5">
                {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {uploadingPdf ? "Uploading..." : "Attach a PDF"}
                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
            )}
          </div>

          <div>
            <Label>Visibility</Label>
            <div className="flex flex-col gap-1.5 mt-1.5">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: opt.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-sm text-left transition-all ${
                    form.visibility === opt.value ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <opt.icon className="w-4 h-4 shrink-0" />
                  {opt.label}
                </button>
              ))}
            </div>
            {form.visibility === "specific_players" && (
              <div className="mt-2 border border-border rounded-sm p-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Select Players</div>
                {allUsers.length === 0 && <div className="text-xs text-muted-foreground">No players found.</div>}
                {allUsers.map((u) => {
                  const checked = (form.allowed_emails || []).includes(u.email);
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        allowed_emails: checked ? (f.allowed_emails || []).filter((e) => e !== u.email) : [...(f.allowed_emails || []), u.email],
                      }))}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border-2 shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`} />
                      {u.display_name || u.full_name}
                      <span className="text-[10px] text-muted-foreground ml-auto">{u.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Press Enter to add" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {existingTags.filter((t) => !(form.tags || []).includes(t)).length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Existing tags - click to add</div>
                <div className="flex flex-wrap gap-1.5">
                  {existingTags.filter((t) => !(form.tags || []).includes(t)).map((t) => (
                    <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }))} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors max-w-[160px] truncate">
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t, i) => (
                  <button key={i} onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))} className="text-xs px-2 py-0.5 rounded-full bg-secondary hover:bg-destructive hover:text-destructive-foreground transition-colors max-w-[160px] truncate">
                    {t} x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
          <div>
            {entry?.id && entry.visibility !== "archived" && (
              <Button variant="ghost" size="sm" onClick={archive} className="text-muted-foreground hover:text-foreground">
                <EyeOff className="w-4 h-4 mr-1.5" /> Archive
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title?.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
