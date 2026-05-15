import React from "react";
import { Plus, Swords, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptyAttack = () => ({ name: "", hit: "", damage: "", damageType: "" });

function readAttacks(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const legacy = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return legacy ? [{ name: legacy, hit: "", damage: "", damageType: "" }] : [];
  }
}

export default function AttackManager({ value, onChange, readOnly = false }) {
  const attacks = readAttacks(value);
  const save = (next) => onChange?.(JSON.stringify(next));

  const update = (index, field, nextValue) => {
    save(attacks.map((attack, idx) => (idx === index ? { ...attack, [field]: nextValue } : attack)));
  };

  const add = () => save([...attacks, emptyAttack()]);
  const remove = (index) => save(attacks.filter((_, idx) => idx !== index));

  if (readOnly) {
    if (attacks.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Swords className="w-3.5 h-3.5 text-accent" />
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Attacks & Weapons</div>
        </div>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal">Attack</th>
                <th className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-20">Hit</th>
                <th className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-24">Damage</th>
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Type</th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((attack, index) => (
                <tr key={`${attack.name}-${index}`} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-1.5 font-medium">{attack.name || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-accent">{attack.hit || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{attack.damage || "-"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{attack.damageType || "-"}</td>
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
          <Swords className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Attacks & Weapons</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs px-2 gap-1">
          <Plus className="w-3 h-3" /> Add Attack
        </Button>
      </div>

      {attacks.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No attacks yet.</div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
          <div className="grid grid-cols-[1fr_76px_96px_112px_32px] gap-1 px-2 py-1 bg-secondary/40">
            {["Attack", "Hit", "Damage", "Type", ""].map((heading) => (
              <div key={heading} className="text-[9px] uppercase tracking-widest text-muted-foreground text-center first:text-left">
                {heading}
              </div>
            ))}
          </div>
          {attacks.map((attack, index) => (
            <div key={index} className="grid grid-cols-[1fr_76px_96px_112px_32px] gap-1 px-2 py-1.5 items-center">
              <Input value={attack.name} onChange={(event) => update(index, "name", event.target.value)} placeholder="Longsword" className="h-7 text-xs px-2" />
              <Input value={attack.hit} onChange={(event) => update(index, "hit", event.target.value)} placeholder="+5" className="h-7 text-xs px-1 text-center" />
              <Input value={attack.damage} onChange={(event) => update(index, "damage", event.target.value)} placeholder="1d8+3" className="h-7 text-xs px-1 text-center" />
              <Input value={attack.damageType} onChange={(event) => update(index, "damageType", event.target.value)} placeholder="Slashing" className="h-7 text-xs px-2" />
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
