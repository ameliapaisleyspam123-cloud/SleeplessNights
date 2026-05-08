import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, AlertCircle } from "lucide-react";

export default function DndBeyondImport({ open, onOpenChange, onImported }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractId = (input) => {
    const trimmed = input.trim();
    const match = trimmed.match(/characters?\/(\d+)/i);
    if (match) return match[1];
    if (/^\d+$/.test(trimmed)) return trimmed;
    return null;
  };

  const handleImport = async () => {
    setError("");
    const charId = extractId(url);
    if (!charId) {
      setError("Please enter a valid D&D Beyond character URL or ID.");
      return;
    }

    setLoading(true);
    try {
      const jsonUrl = `https://www.dndbeyond.com/character/${charId}/json`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Fetch this D&D Beyond character JSON URL and extract the character data into the CharacterSheet schema. URL: ${jsonUrl}. If you cannot fetch it, explain that the character must be public.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            race: { type: "string" },
            class: { type: "string" },
            subclass: { type: "string" },
            level: { type: "number" },
            background: { type: "string" },
            alignment: { type: "string" },
            experience_points: { type: "number" },
            strength: { type: "number" },
            dexterity: { type: "number" },
            constitution: { type: "number" },
            intelligence: { type: "number" },
            wisdom: { type: "number" },
            charisma: { type: "number" },
            hp_max: { type: "number" },
            hp_current: { type: "number" },
            ac: { type: "number" },
            speed: { type: "number" },
            proficiency_bonus: { type: "number" },
            initiative: { type: "number" },
            hit_dice: { type: "string" },
            saving_throws: { type: "string" },
            skills: { type: "string" },
            skill_expertises: { type: "string" },
            passive_perception: { type: "number" },
            languages: { type: "string" },
            features_traits: { type: "string" },
            attacks: { type: "string" },
            equipment: { type: "string" },
            cp: { type: "number" },
            sp: { type: "number" },
            ep: { type: "number" },
            gp: { type: "number" },
            pp: { type: "number" },
            spellcasting_ability: { type: "string" },
            spell_save_dc: { type: "number" },
            spell_attack_bonus: { type: "number" },
            spells_known: { type: "string" },
            traits: { type: "string" },
            ideals: { type: "string" },
            bonds: { type: "string" },
            flaws: { type: "string" },
            notes: { type: "string" },
            error: { type: "string" },
          },
        },
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const { error: _err, ...charData } = result;
      onImported(charData);
      onOpenChange(false);
      setUrl("");
    } catch (e) {
      setError("Failed to fetch character data. Make sure the character is set to public on D&D Beyond.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import from D&D Beyond</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">Paste your D&D Beyond character URL or ID. The character sheet must be set to <strong className="text-foreground">public</strong> sharing.</p>
          <a href="https://www.dndbeyond.com/my-characters" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"><ExternalLink className="w-3.5 h-3.5" /> Open D&D Beyond</a>
          <div>
            <Input value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://www.dndbeyond.com/characters/12345678" onKeyDown={(e) => e.key === "Enter" && handleImport()} />
            <p className="text-[11px] text-muted-foreground mt-1">In D&D Beyond: Character - Settings - Sharing - set to Public.</p>
          </div>
          {error && <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm p-3"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={loading || !url.trim()}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{loading ? "Importing..." : "Import"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
