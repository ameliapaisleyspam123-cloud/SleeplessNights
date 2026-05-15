import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

function normalizeCharacter(input) {
  const data = input.data || input.character || input;
  return {
    name: data.name || "",
    race: data.race || data.raceName || "",
    class: data.class || data.className || data.classes?.map((entry) => entry.definition?.name).filter(Boolean).join(", ") || "",
    level: data.level || data.classes?.reduce((sum, entry) => sum + (entry.level || 0), 0) || 1,
    background: data.background || data.backgroundName || data.background?.definition?.name || "",
    strength: data.strength || data.stats?.[0]?.value || 10,
    dexterity: data.dexterity || data.stats?.[1]?.value || 10,
    constitution: data.constitution || data.stats?.[2]?.value || 10,
    intelligence: data.intelligence || data.stats?.[3]?.value || 10,
    wisdom: data.wisdom || data.stats?.[4]?.value || 10,
    charisma: data.charisma || data.stats?.[5]?.value || 10,
    hp_max: data.hp_max || data.baseHitPoints || data.hitPointInfo?.maximum || 10,
    hp_current: data.hp_current || data.baseHitPoints || data.hitPointInfo?.current || 10,
    ac: data.ac || data.armorClass || 10,
    speed: data.speed || data.race?.weightSpeeds?.normal?.walk || 30,
    notes: data.notes || "",
  };
}

export default function DndBeyondImport({ open, onOpenChange, onImported }) {
  const [json, setJson] = useState("");
  const [error, setError] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(json);
      onImported(normalizeCharacter(parsed));
      setJson("");
      setError("");
      onOpenChange(false);
    } catch (err) {
      setError(`Could not parse character JSON: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import Character JSON</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">Paste a character JSON export. This standalone app does not call any external AI or platform service to fetch it.</p>
          <Textarea value={json} onChange={(event) => setJson(event.target.value)} placeholder='{"name":"Aelindra","level":3,...}' className="min-h-[180px]" />
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!json.trim()}>Import</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
