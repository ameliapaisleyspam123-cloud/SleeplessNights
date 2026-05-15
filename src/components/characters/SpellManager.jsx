import React from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptySpell = () => ({ name: "", castingTime: "", rangeArea: "", components: "", duration: "" });

function readSpells(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const legacy = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return legacy ? [{ name: legacy, castingTime: "", rangeArea: "", components: "", duration: "" }] : [];
  }
}

export default function SpellManager({ value, onChange, readOnly = false }) {
  const spells = readSpells(value);
  const save = (next) => onChange?.(JSON.stringify(next));

  const update = (index, field, nextValue) => {
    save(spells.map((spell, idx) => (idx === index ? { ...spell, [field]: nextValue } : spell)));
  };

  const add = () => save([...spells, emptySpell()]);
  const remove = (index) => save(spells.filter((_, idx) => idx !== index));

  if (readOnly) {
    if (spells.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Spells</div>
        </div>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal">Spell</th>
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Casting</th>
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Range/Area</th>
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-24">Components</th>
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Duration</th>
              </tr>
            </thead>
            <tbody>
              {spells.map((spell, index) => (
                <tr key={`${spell.name}-${index}`} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-1.5 font-medium">{spell.name || "-"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{spell.castingTime || "-"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{spell.rangeArea || "-"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{spell.components || "-"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{spell.duration || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Spells</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs px-2 gap-1">
          <Plus className="w-3 h-3" /> Add Spell
        </Button>
      </div>

      {spells.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No spells yet.</div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
          <div className="grid grid-cols-[1fr_100px_112px_96px_104px_32px] gap-1 px-2 py-1 bg-secondary/40">
            {["Spell", "Casting", "Range/Area", "Components", "Duration", ""].map((heading) => (
              <div key={heading} className="text-[9px] uppercase tracking-widest text-muted-foreground text-center first:text-left">
                {heading}
              </div>
            ))}
          </div>
          {spells.map((spell, index) => (
            <div key={index} className="grid grid-cols-[1fr_100px_112px_96px_104px_32px] gap-1 px-2 py-1.5 items-center">
              <Input value={spell.name} onChange={(event) => update(index, "name", event.target.value)} placeholder="Fireball" className="h-7 text-xs px-2" />
              <Input value={spell.castingTime} onChange={(event) => update(index, "castingTime", event.target.value)} placeholder="1 action" className="h-7 text-xs px-2" />
              <Input value={spell.rangeArea} onChange={(event) => update(index, "rangeArea", event.target.value)} placeholder="150 ft" className="h-7 text-xs px-2" />
              <Input value={spell.components} onChange={(event) => update(index, "components", event.target.value)} placeholder="V,S,M" className="h-7 text-xs px-2" />
              <Input value={spell.duration} onChange={(event) => update(index, "duration", event.target.value)} placeholder="Instant" className="h-7 text-xs px-2" />
              <button type="button" onClick={() => remove(index)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
