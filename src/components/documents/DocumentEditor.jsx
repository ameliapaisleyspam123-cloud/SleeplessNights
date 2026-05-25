import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2, FileText } from "lucide-react";

export default function DocumentEditor({ open, onOpenChange, onSaved, defaultVisibility = "public" }) {
  const [form, setForm] = useState({ title: "", description: "", file_url: "", visibility: "public", allowed_emails: [] });
  const [users, setUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ title: "", description: "", file_url: "", visibility: defaultVisibility, allowed_emails: [] });
      setFileName("");
      appClient.entities.User.list("-created_date", 200).then(setUsers).catch(() => {});
    }
  }, [open, defaultVisibility]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url, title: f.title || file.name.replace(/\.pdf$/i, "") }));
    setUploading(false);
  };

  const toggleEmail = (email) => {
    setForm((f) => ({
      ...f,
      allowed_emails: f.allowed_emails.includes(email)
        ? f.allowed_emails.filter((e) => e !== email)
        : [...f.allowed_emails, email],
    }));
  };

  const save = async () => {
    if (!form.title?.trim() || !form.file_url) return;
    setSaving(true);
    const u = await appClient.auth.me().catch(() => null);
    await appClient.entities.Document.create({ ...form, campaign_id: u?.campaign_id });
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">New Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>PDF File</Label>
            {form.file_url ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-sm bg-secondary/40">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm truncate flex-1">{fileName}</span>
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, file_url: "" }));
                    setFileName("");
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-20 rounded-sm border border-dashed border-border cursor-pointer hover:border-accent hover:bg-secondary/40 transition-all text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload PDF or file"}
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>

          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <Label>Access</Label>
            <RadioGroup value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })} className="mt-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="public" id="public" className="mt-1" />
                <label htmlFor="public" className="cursor-pointer">
                  <div className="text-sm font-medium">Open to all</div>
                  <div className="text-xs text-muted-foreground">Every member may read this.</div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="private" id="private" className="mt-1" />
                <label htmlFor="private" className="cursor-pointer">
                  <div className="text-sm font-medium">Sealed</div>
                  <div className="text-xs text-muted-foreground">Only chosen eyes may view.</div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {form.visibility === "private" && (
            <div>
              <Label>Allowed Readers</Label>
              <div className="mt-1.5 border border-border rounded-sm max-h-40 overflow-y-auto thin-scroll">
                {users.length === 0 && <div className="p-3 text-xs text-muted-foreground">No other members yet.</div>}
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleEmail(u.email)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                      form.allowed_emails.includes(u.email) ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="truncate">{u.display_name || u.full_name}</span>
                    <span className="text-xs text-muted-foreground">{form.allowed_emails.includes(u.email) ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !form.title?.trim() || !form.file_url}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
