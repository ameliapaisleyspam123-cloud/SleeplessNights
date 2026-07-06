import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SPELL_LEVELS = ["Cantrip", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Sorcery Points"];
const SPELL_FILTERS = ["All", ...SPELL_LEVELS];
const emptySpell = (level = "Cantrip") => ({ level, name: "", castingTime: "", rangeArea: "", hit: "", effect: "", components: "", duration: "", description: "" });

function readSpells(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const legacy = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return legacy ? [{ ...emptySpell("Cantrip"), name: legacy }] : [];
  }
}

function normalizeSpell(spell) {
  return { ...spell, level: spell.level || "Cantrip" };
}

function groupedSpells(spells, levelFilter) {
  const visible = levelFilter === "All" ? spells : spells.filter((spell) => (spell.level || "Cantrip") === levelFilter);
  return SPELL_LEVELS.map((level) => ({
    level,
    spells: visible
      .map((spell, originalIndex) => ({ spell: normalizeSpell(spell), originalIndex }))
      .filter(({ spell }) => spell.level === level),
  })).filter((group) => group.spells.length > 0);
}

function levelLabel(level) {
  if (level === "Cantrip" || level === "Sorcery Points") return level;
  return `Level ${level}`;
}

export default function SpellManager({ value, onChange, readOnly = false }) {
  const spells = readSpells(value);
  const [expanded, setExpanded] = useState(null);
  const [levelFilter, setLevelFilter] = useState("All");
  const groups = groupedSpells(spells, levelFilter);
  const save = (next) => onChange?.(JSON.stringify(next));

  const update = (index, field, nextValue) => {
    save(spells.map((spell, idx) => (idx === index ? { ...spell, [field]: nextValue } : spell)));
  };

  const add = () => {
    const level = levelFilter === "All" ? "Cantrip" : levelFilter;
    save([...spells, emptySpell(level)]);
  };
  const remove = (index) => save(spells.filter((_, idx) => idx !== index));

  const filterControls = (
    <div className="flex flex-wrap gap-1.5">
      {SPELL_FILTERS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => setLevelFilter(level)}
          className={`h-7 px-2 rounded-sm border text-[10px] transition-colors ${levelFilter === level ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {level === "All" ? "All" : levelLabel(level)}
        </button>
      ))}
    </div>
  );

  if (readOnly) {
    if (spells.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Spells</div>
        </div>
        <div className="mb-2">{filterControls}</div>
        <div className="space-y-3">
          {groups.length === 0 && <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No spells in this category.</div>}
          {groups.map((group) => (
            <div key={group.level} className="border border-border rounded-sm overflow-x-auto">
              <div className="bg-secondary/40 px-2 py-1.5 text-[9px] uppercase tracking-widest text-accent">{levelLabel(group.level)}</div>
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="border-y border-border bg-secondary/20">
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal">Spell</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Casting</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-20">Range/Area</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-14">Hit</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-20">Effect</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-20">Components</th>
                    <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-28">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {group.spells.map(({ spell, originalIndex }) => (
                    <React.Fragment key={`${group.level}-${originalIndex}`}>
                      <tr className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-1.5 font-medium">
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === originalIndex ? null : originalIndex)}
                            className="inline-flex items-center gap-1 text-left hover:text-accent"
                          >
                            {expanded === originalIndex ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {spell.name || "-"}
                          </button>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.castingTime || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.rangeArea || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.hit || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.effect || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.components || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{spell.duration || "-"}</td>
                      </tr>
                      {spell.description && expanded === originalIndex && (
                        <tr className="border-b border-border/40 last:border-0 bg-secondary/10">
                          <td colSpan={7} className="px-2 pb-1.5 text-muted-foreground italic whitespace-pre-wrap">
                            {spell.description}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Spells</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs px-2 gap-1">
          <Plus className="w-3 h-3" /> Add {levelFilter === "All" ? "Spell" : levelLabel(levelFilter)}
        </Button>
      </div>

      {filterControls}

      {spells.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No spells yet.</div>
      ) : groups.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No spells in this category.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.level} className="border border-border rounded-sm overflow-x-auto divide-y divide-border">
              <div className="min-w-[780px] bg-secondary/40 px-2 py-1.5 text-[9px] uppercase tracking-widest text-accent">{levelLabel(group.level)}</div>
              <div className="grid min-w-[780px] grid-cols-[96px_minmax(180px,1fr)_96px_84px_56px_72px_72px_96px_64px] gap-1 px-2 py-1 bg-secondary/20">
                {["Level", "Spell", "Casting", "Range/Area", "Hit", "Effect", "Components", "Duration", ""].map((heading) => (
                  <div key={heading} className="text-[9px] uppercase tracking-widest text-muted-foreground text-center first:text-left">
                    {heading}
                  </div>
                ))}
              </div>
              {group.spells.map(({ spell, originalIndex }) => (
                <div key={originalIndex}>
                  <div className="grid min-w-[780px] grid-cols-[96px_minmax(180px,1fr)_96px_84px_56px_72px_72px_96px_64px] gap-1 px-2 py-1.5 items-center">
                    <select
                      value={spell.level}
                      onChange={(event) => update(originalIndex, "level", event.target.value)}
                      className="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground"
                    >
                      {SPELL_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <Input value={spell.name} onChange={(event) => update(originalIndex, "name", event.target.value)} placeholder="Fireball" className="h-7 text-xs px-2" />
                    <Input value={spell.castingTime} onChange={(event) => update(originalIndex, "castingTime", event.target.value)} placeholder="1 action" className="h-7 text-xs px-2" />
                    <Input value={spell.rangeArea} onChange={(event) => update(originalIndex, "rangeArea", event.target.value)} placeholder="150 ft" className="h-7 text-xs px-2" />
                    <Input value={spell.hit || ""} onChange={(event) => update(originalIndex, "hit", event.target.value)} placeholder="+7" className="h-7 text-xs px-2" />
                    <Input value={spell.effect || ""} onChange={(event) => update(originalIndex, "effect", event.target.value)} placeholder="2d8" className="h-7 text-xs px-2" />
                    <Input value={spell.components} onChange={(event) => update(originalIndex, "components", event.target.value)} placeholder="V,S,M" className="h-7 text-xs px-2" />
                    <Input value={spell.duration} onChange={(event) => update(originalIndex, "duration", event.target.value)} placeholder="Instant" className="h-7 text-xs px-2" />
                    <div className="flex gap-0.5 justify-end">
                      <button type="button" onClick={() => setExpanded(expanded === originalIndex ? null : originalIndex)} className="p-1 text-muted-foreground hover:text-foreground">
                        {expanded === originalIndex ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => remove(originalIndex)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {expanded === originalIndex && (
                    <div className="px-2 pb-2">
                      <Input value={spell.description || ""} onChange={(event) => update(originalIndex, "description", event.target.value)} placeholder="Description, effect, save, higher levels..." className="h-7 text-xs" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
