import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ProfileNameModal({ open, onOpenChange, currentUser, onSaved }) {
  const [name, setName] = useState(currentUser?.display_name || currentUser?.full_name || "");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setName(currentUser?.display_name || currentUser?.full_name || "");
  }, [open, currentUser]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await base44.auth.updateMe({ display_name: name.trim() });
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Change Display Name</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Your name</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Enter your character or player name..."
            />
            <p className="text-xs text-muted-foreground mt-1.5">This is how others will see you in chat and on character sheets.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Name
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
