import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appClient } from "@/api/appClient";
import { Copy, Check, Loader2, Save } from "lucide-react";

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 text-accent hover:text-foreground transition-colors">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function CampaignSettingsModal({ open, onOpenChange, campaign, onSaved }) {
  const [name, setName] = useState(campaign?.name || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setName(campaign?.name || "");
    setDescription(campaign?.description || "");
  }, [campaign]);

  const handleSave = async () => {
    if (!name.trim() || !campaign?.id) return;
    setSaving(true);
    await appClient.entities.Campaign.update(campaign.id, { name: name.trim(), description: description.trim() });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border border-border">
        <h2 className="font-display text-2xl mb-4">Campaign Settings</h2>

        <div className="space-y-5">
          <div>
            <Label>Campaign Name</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name..." />
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Campaign Description</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should players know before entering this campaign?"
              className="mt-1.5 min-h-24"
            />
          </div>

          <div className="space-y-3">
            <div className="p-4 border border-accent/30 rounded-sm bg-accent/5">
              <div className="text-[10px] uppercase tracking-widest text-accent mb-1">Dungeon Master Code (keep secret)</div>
              <div className="flex items-center text-xl font-mono font-bold tracking-[0.2em]">
                {campaign.dm_code}
                <CopyButton value={campaign.dm_code} />
              </div>
            </div>
            <div className="p-4 border border-border rounded-sm bg-secondary/30">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Player Code (share with party)</div>
              <div className="flex items-center text-xl font-mono font-bold tracking-[0.2em]">
                {campaign.player_code}
                <CopyButton value={campaign.player_code} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
