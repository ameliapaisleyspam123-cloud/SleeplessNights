import React, { useEffect, useRef, useState } from "react";
import { appClient } from "@/api/appClient";
import {
  ScrollText,
  MapIcon,
  User,
  Castle,
  Sparkles,
  Swords,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Shield,
  Zap,
  NotebookPen,
  Minus,
  Plus,
  Tag,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCampaign } from "@/hooks/useCampaign";
import PlayerNotesPanel from "@/components/chat/PlayerNotesPanel";
import { sortClaimedCharactersFirst } from "@/lib/characters";
import { hasTimelineDate, timelineLibraryRecords, timelineViewDate } from "@/lib/timeline";
import { canViewVisibleItem, isDmUser, isPlayerViewMode } from "@/lib/visibility";

const STAT_MOD = (v) => Math.floor((v - 10) / 2);
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);

const CATEGORY_META = {
  map: { icon: MapIcon, label: "Map", color: "text-accent" },
  character: { icon: User, label: "Character", color: "text-accent" },
  place: { icon: Castle, label: "Place", color: "text-accent" },
  event: { icon: Sparkles, label: "Event", color: "text-accent" },
  artifact: { icon: Swords, label: "Artifact", color: "text-accent" },
  religion: { icon: Sparkles, label: "Religion", color: "text-accent" },
  other: { icon: Star, label: "Other", color: "text-muted-foreground" },
};

const ALL_SKILLS_PANEL = [
  { name: "Acrobatics", ability: "dexterity" },
  { name: "Animal Handling", ability: "wisdom" },
  { name: "Arcana", ability: "intelligence" },
  { name: "Athletics", ability: "strength" },
  { name: "Deception", ability: "charisma" },
  { name: "History", ability: "intelligence" },
  { name: "Insight", ability: "wisdom" },
  { name: "Intimidation", ability: "charisma" },
  { name: "Investigation", ability: "intelligence" },
  { name: "Medicine", ability: "wisdom" },
  { name: "Nature", ability: "intelligence" },
  { name: "Perception", ability: "wisdom" },
  { name: "Performance", ability: "charisma" },
  { name: "Persuasion", ability: "charisma" },
  { name: "Religion", ability: "intelligence" },
  { name: "Sleight of Hand", ability: "dexterity" },
  { name: "Stealth", ability: "dexterity" },
  { name: "Survival", ability: "wisdom" },
];

const ABBR_PANEL = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const HP_SAVE_DELAY_MS = 500;

function readCharacterSpells(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((spell) => ({ ...spell, effect: spell.effect ?? spell.damage ?? "" })) : [];
  } catch {
    const legacy = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return legacy ? [{ level: "Cantrip", name: legacy }] : [];
  }
}

function previewHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function EntryCard({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;
  const Icon = meta.icon;

  return (
    <div className="border border-border rounded-sm bg-muted/30 overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {entry.image_url ? (
          <img src={entry.image_url} alt={entry.title} className="w-10 h-10 rounded-sm object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase tracking-widest ${meta.color} flex items-center gap-1`}>
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
          </div>
          <div className="font-display text-sm leading-tight truncate">{entry.title}</div>
          {entry.tags?.length > 0 && (
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
              {entry.tags.slice(0, 3).join(" · ")}
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {entry.image_url && (
            <img src={entry.image_url} alt={entry.title} className="w-full rounded-sm object-cover max-h-40" />
          )}
          {entry.content && (
            <div className="rich-content text-xs text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: entry.content }} />
          )}
          {!entry.content && !entry.image_url && (
            <p className="text-xs text-muted-foreground italic">No details recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SpellSlotsEditor({ sheet, onSheetUpdated }) {
  const [slots, setSlots] = useState(() => {
    try {
      return sheet.spell_slots ? JSON.parse(sheet.spell_slots) : {};
    } catch {
      return {};
    }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      setSlots(sheet.spell_slots ? JSON.parse(sheet.spell_slots) : {});
    } catch {
      setSlots({});
    }
  }, [sheet.spell_slots]);

  const updateSlot = async (level, field, value) => {
    const newSlots = {
      ...slots,
      [level]: { ...slots[level], [field]: value },
    };
    setSlots(newSlots);
    setSaving(true);
    const updated = await appClient.entities.CharacterSheet.update(sheet.id, { spell_slots: JSON.stringify(newSlots) });
    onSheetUpdated?.(updated);
    setSaving(false);
  };

  if (!Object.keys(slots).some((level) => slots[level]?.total > 0)) {
    return <div className="text-[10px] text-muted-foreground border border-dashed border-border rounded-sm px-2 py-2 text-center">No spell slots recorded.</div>;
  }

  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
        const slotData = slots[level] || { total: 0, used: 0 };
        if (!slotData.total) return null;
        const remaining = slotData.total - slotData.used;
        return (
          <div key={level} className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Lvl {level}:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateSlot(level, "used", Math.min(slotData.total, slotData.used + 1))}
                className="w-4 h-4 rounded border border-border bg-secondary/60 hover:bg-destructive/20 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-colors leading-none flex items-center justify-center"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className={`min-w-[2rem] text-center font-medium ${saving ? "text-muted-foreground" : remaining === 0 && slotData.total > 0 ? "text-destructive" : "text-foreground"}`}>
                {remaining}/{slotData.total}
              </span>
              <button
                onClick={() => updateSlot(level, "used", Math.max(0, slotData.used - 1))}
                className="w-4 h-4 rounded border border-border bg-secondary/60 hover:bg-accent/20 hover:border-accent/50 text-muted-foreground hover:text-accent transition-colors leading-none flex items-center justify-center"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClassResourcesEditor({ sheet, onSheetUpdated }) {
  const [resources, setResources] = useState({
    ki_points_current: sheet.ki_points_current ?? 0,
    ki_points_max: sheet.ki_points_max ?? 0,
    sorcery_points_current: sheet.sorcery_points_current ?? 0,
    sorcery_points_max: sheet.sorcery_points_max ?? 0,
  });
  const [savingField, setSavingField] = useState("");

  useEffect(() => {
    setResources({
      ki_points_current: sheet.ki_points_current ?? 0,
      ki_points_max: sheet.ki_points_max ?? 0,
      sorcery_points_current: sheet.sorcery_points_current ?? 0,
      sorcery_points_max: sheet.sorcery_points_max ?? 0,
    });
  }, [sheet.ki_points_current, sheet.ki_points_max, sheet.sorcery_points_current, sheet.sorcery_points_max]);

  const updateResource = async (field, value) => {
    const nextValue = Math.max(0, Number(value) || 0);
    const nextResources = { ...resources, [field]: nextValue };
    setResources(nextResources);
    setSavingField(field);
    const updated = await appClient.entities.CharacterSheet.update(sheet.id, { [field]: nextValue });
    onSheetUpdated?.(updated);
    setSavingField("");
  };

  const adjustCurrent = (currentField, maxField, delta) => {
    const max = resources[maxField] || 0;
    const current = resources[currentField] || 0;
    updateResource(currentField, Math.max(0, Math.min(max || 99, current + delta)));
  };

  const rows = [
    ["Ki Points", "ki_points_current", "ki_points_max"],
    ["Sorcery Points", "sorcery_points_current", "sorcery_points_max"],
  ]
    .map(([label, currentField, maxField]) => {
      const max = Math.max(0, Number(resources[maxField]) || 0);
      const current = Math.min(Math.max(0, Number(resources[currentField]) || 0), max);
      return { label, currentField, maxField, current, max };
    })
    .filter((resource) => resource.max > 0);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1">
      {rows.map((resource) => (
        <div key={resource.currentField} className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">{resource.label}:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustCurrent(resource.currentField, resource.maxField, -1)}
              className="w-4 h-4 rounded border border-border bg-secondary/60 hover:bg-destructive/20 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-colors leading-none flex items-center justify-center"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className={`min-w-[2rem] text-center font-medium ${savingField === resource.currentField ? "text-muted-foreground" : resource.current === 0 ? "text-destructive" : "text-foreground"}`}>
              {resource.current}/{resource.max}
            </span>
            <button
              onClick={() => adjustCurrent(resource.currentField, resource.maxField, 1)}
              className="w-4 h-4 rounded border border-border bg-secondary/60 hover:bg-accent/20 hover:border-accent/50 text-muted-foreground hover:text-accent transition-colors leading-none flex items-center justify-center"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CharacterCard({ sheet, expanded, onToggleExpanded, onSheetUpdated }) {
  const [hp, setHp] = useState(sheet.hp_current ?? sheet.hp_max ?? 0);
  const [savingHp, setSavingHp] = useState(false);
  const hpSaveTimerRef = useRef(null);
  const latestHpRef = useRef(sheet.hp_current ?? sheet.hp_max ?? 0);
  const [savingDeathSaves, setSavingDeathSaves] = useState(false);
  const [deathSaves, setDeathSaves] = useState({
    successes: sheet.death_save_successes ?? 0,
    failures: sheet.death_save_failures ?? 0,
  });
  const stats = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
  const spells = readCharacterSpells(sheet.spells_known);
  const hasClassResources = Boolean(
    sheet.ki_points_current ||
      sheet.ki_points_max ||
      sheet.sorcery_points_current ||
      sheet.sorcery_points_max
  );

  useEffect(() => {
    const nextHp = sheet.hp_current ?? sheet.hp_max ?? 0;
    latestHpRef.current = nextHp;
    setHp(nextHp);
    setDeathSaves({
      successes: sheet.death_save_successes ?? 0,
      failures: sheet.death_save_failures ?? 0,
    });
  }, [sheet.hp_current, sheet.hp_max, sheet.death_save_successes, sheet.death_save_failures]);

  useEffect(() => () => {
    if (hpSaveTimerRef.current) window.clearTimeout(hpSaveTimerRef.current);
  }, []);

  const scheduleHpSave = (nextHp) => {
    if (hpSaveTimerRef.current) window.clearTimeout(hpSaveTimerRef.current);
    hpSaveTimerRef.current = window.setTimeout(async () => {
      setSavingHp(true);
      const updated = await appClient.entities.CharacterSheet.update(sheet.id, { hp_current: latestHpRef.current });
      onSheetUpdated?.(updated);
      setSavingHp(false);
    }, HP_SAVE_DELAY_MS);
  };

  const changeHp = (delta) => {
    const max = sheet.hp_max ?? 0;
    const next = Math.max(0, Math.min(max, latestHpRef.current + delta));
    if (next === latestHpRef.current) return;
    latestHpRef.current = next;
    setHp(next);
    onSheetUpdated?.({ ...sheet, hp_current: next });
    scheduleHpSave(next);
  };

  const updateDeathSave = async (type, delta) => {
    const field = type === "success" ? "death_save_successes" : "death_save_failures";
    const key = type === "success" ? "successes" : "failures";
    const current = deathSaves[key];
    const next = Math.max(0, Math.min(3, current + delta));
    if (next === current) return;
    const newSaves = { ...deathSaves, [key]: next };
    setDeathSaves(newSaves);
    setSavingDeathSaves(true);
    const updated = await appClient.entities.CharacterSheet.update(sheet.id, { [field]: next });
    onSheetUpdated?.(updated);
    setSavingDeathSaves(false);
  };

  const profSkills = (sheet.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const expertSkills = (sheet.skill_expertises || "").split(",").map((s) => s.trim()).filter(Boolean);
  const advantageSkills = (sheet.advantage_skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const disadvantageSkills = (sheet.disadvantage_skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const profSaves = (sheet.saving_throws || "").split(",").map((s) => s.trim()).filter(Boolean);
  const advantageSaves = (sheet.advantage_saving_throws || "").split(",").map((s) => s.trim()).filter(Boolean);
  const disadvantageSaves = (sheet.disadvantage_saving_throws || "").split(",").map((s) => s.trim()).filter(Boolean);
  const pb = sheet.proficiency_bonus || 2;
  const initiativeBonus = sheet.initiative !== undefined && sheet.initiative !== 0 ? sheet.initiative : STAT_MOD(sheet.dexterity || 10);
  const saveBonus = (ability) => STAT_MOD(sheet[ability] || 10) + (profSaves.includes(ability) ? pb : 0);
  const skillBonus = (sk) => {
    const isExp = expertSkills.includes(sk.name);
    const isProf = profSkills.includes(sk.name);
    return STAT_MOD(sheet[sk.ability] || 10) + (isExp ? pb * 2 : isProf ? pb : 0);
  };

  return (
    <div className="border border-border rounded-sm bg-muted/30 overflow-hidden">
      <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/50 transition-colors" onClick={onToggleExpanded}>
        {sheet.image_url ? (
          <img src={sheet.image_url} alt={sheet.name} className="w-10 h-10 rounded-sm object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center shrink-0 font-display text-lg">{sheet.name?.[0] || "?"}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-accent flex items-center gap-1">
            <User className="w-2.5 h-2.5" />
            Character
          </div>
          <div className="font-display text-sm leading-tight truncate">{sheet.name}</div>
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {[sheet.race, sheet.class, sheet.level && `Lvl ${sheet.level}`].filter(Boolean).join(" · ")}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-6 gap-1">
            {stats.map((s) => (
              <div key={s} className="text-center p-1 bg-secondary/60 rounded-sm">
                <div className="text-[8px] uppercase text-muted-foreground">{s.slice(0, 3)}</div>
                <div className="text-xs font-bold">{sheet[s] ?? 10}</div>
                <div className="text-[9px] text-accent">{fmtMod(STAT_MOD(sheet[s] ?? 10))}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-accent" />
                AC {sheet.ac}
              </span>
              <span className="flex items-center gap-1">
                <Swords className="w-3 h-3 text-accent" />
                Init {fmtMod(initiativeBonus)}
                {sheet.initiative_advantage && <ChevronsUp className="w-3 h-3 text-accent" />}
                {sheet.initiative_disadvantage && <ChevronsDown className="w-3 h-3 text-destructive" />}
              </span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-accent" />
                <button onClick={() => changeHp(-1)} className="w-5 h-5 rounded-sm border border-border bg-secondary/60 hover:bg-destructive/20 hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-colors text-sm leading-none flex items-center justify-center">-</button>
                <span className={`min-w-[2.5rem] text-center font-medium ${hp === 0 ? "text-destructive" : hp < sheet.hp_max * 0.33 ? "text-destructive" : hp < sheet.hp_max * 0.66 ? "text-primary" : "text-accent"}`}>
                  {hp}/{sheet.hp_max}
                </span>
                <button onClick={() => changeHp(1)} className="w-5 h-5 rounded-sm border border-border bg-secondary/60 hover:bg-accent/20 hover:border-accent/50 text-muted-foreground hover:text-accent transition-colors text-sm leading-none flex items-center justify-center">+</button>
                {savingHp && <span className="text-[9px] text-muted-foreground">Saving...</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-accent flex-wrap">
              <span className="uppercase tracking-widest text-muted-foreground">Death Saves</span>
              <div className="flex items-center gap-1">
                <span className="text-accent">S</span>
                {[...Array(3)].map((_, i) => (
                  <button key={`success-${i}`} onClick={() => updateDeathSave("success", i < deathSaves.successes ? -1 : 1)} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < deathSaves.successes ? "bg-accent/30 border-accent" : "border-border hover:border-accent/50"}`} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-destructive">F</span>
                {[...Array(3)].map((_, i) => (
                  <button key={`failure-${i}`} onClick={() => updateDeathSave("failure", i < deathSaves.failures ? -1 : 1)} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < deathSaves.failures ? "bg-destructive/30 border-destructive" : "border-border hover:border-destructive/50"}`} />
                ))}
              </div>
              {savingDeathSaves && <span className="text-muted-foreground">Saving...</span>}
            </div>
          </div>
          <SkillList
            skills={ALL_SKILLS_PANEL}
            profSkills={profSkills}
            expertSkills={expertSkills}
            advantageSkills={advantageSkills}
            disadvantageSkills={disadvantageSkills}
            stats={stats}
            profSaves={profSaves}
            advantageSaves={advantageSaves}
            disadvantageSaves={disadvantageSaves}
            saveBonus={saveBonus}
            skillBonus={skillBonus}
          />
          {(sheet.spells_known || sheet.spell_slots || hasClassResources) && (
            <div className="border-t border-border pt-2 space-y-2">
              {spells.length > 0 && <SpellList spells={spells} />}
              {(sheet.spell_slots || hasClassResources) && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Spell Slots</div>
                  <div className="space-y-2">
                    {sheet.spell_slots && <SpellSlotsEditor sheet={sheet} onSheetUpdated={onSheetUpdated} />}
                    {hasClassResources && <ClassResourcesEditor sheet={sheet} onSheetUpdated={onSheetUpdated} />}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpellList({ spells }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full flex items-center justify-between text-left mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Spells</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-1">
          {spells.map((spell, index) => (
            <div key={`${spell.name}-${index}`} className="text-[10px] text-foreground/80 leading-relaxed border border-border/60 rounded-sm px-2 py-1">
              <div className="font-medium text-foreground">
                <span className="text-muted-foreground">{spell.level || "Cantrip"}</span> - {spell.name || "-"}
              </div>
              {(spell.castingTime || spell.rangeArea || spell.hit || spell.effect || spell.components || spell.duration) && (
                <div className="text-muted-foreground">
                  {[spell.castingTime, spell.rangeArea, spell.hit && `Hit ${spell.hit}`, spell.effect && `Effect ${spell.effect}`, spell.components, spell.duration].filter(Boolean).join(" | ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillList({ skills, profSkills, expertSkills, advantageSkills, disadvantageSkills, stats, profSaves, advantageSaves, disadvantageSaves, saveBonus, skillBonus }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-border pt-2">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full flex items-center justify-between text-left mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Saving Throws & Skills</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-2">
          <div className="space-y-0.5">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Saving Throws</div>
            {stats.map((ability) => {
              const isProf = profSaves.includes(ability);
              const hasAdvantage = advantageSaves.includes(ability);
              const hasDisadvantage = disadvantageSaves.includes(ability);
              return (
                <div key={ability} className={`flex items-center gap-1.5 ${!isProf && !hasAdvantage && !hasDisadvantage ? "opacity-60" : ""}`}>
                  <div className={`w-2.5 h-2.5 shrink-0 rounded-full border ${isProf ? "bg-accent border-accent" : "border-muted-foreground/40"}`} />
                  <span className="text-[10px] flex-1 capitalize">{ability}</span>
                  <span className="text-[10px] text-accent font-medium">{fmtMod(saveBonus(ability))}</span>
                  {hasAdvantage && <ChevronsUp className="w-3 h-3 text-accent shrink-0" />}
                  {hasDisadvantage && <ChevronsDown className="w-3 h-3 text-destructive shrink-0" />}
                  <span className="text-[9px] text-muted-foreground">{ABBR_PANEL[ability]}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-0.5">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Skills</div>
            {skills.map((sk) => {
              const isExp = expertSkills.includes(sk.name);
              const isProf = profSkills.includes(sk.name);
              const hasAdvantage = advantageSkills.includes(sk.name);
              const hasDisadvantage = disadvantageSkills.includes(sk.name);
              const bonus = skillBonus(sk);
              return (
                <div key={sk.name} className={`flex items-center gap-1.5 ${!isExp && !isProf && !hasAdvantage && !hasDisadvantage ? "opacity-60" : ""}`}>
                  <div className={`w-2.5 h-2.5 shrink-0 border ${isExp ? "rounded-sm bg-primary border-primary" : isProf ? "rounded-full bg-accent border-accent" : "rounded-full border-muted-foreground/40"}`} />
                  <span className="text-[10px] flex-1">{sk.name}</span>
                  <span className="text-[10px] text-accent font-medium">{fmtMod(bonus)}</span>
                  {hasAdvantage && <ChevronsUp className="w-3 h-3 text-accent shrink-0" />}
                  {hasDisadvantage && <ChevronsDown className="w-3 h-3 text-destructive shrink-0" />}
                  <span className="text-[9px] text-muted-foreground">{ABBR_PANEL[sk.ability]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LorePanel({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [panelCampaign, setPanelCampaign] = useState(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [tag, setTag] = useState("all");
  const [showTags, setShowTags] = useState(false);
  const [mainTab, setMainTab] = useState("lore");
  const [expandedCharacterIds, setExpandedCharacterIds] = useState(() => new Set());
  const { user } = useCampaign();

  useEffect(() => {
    if (!user?.campaign_id) return;
    const cid = user.campaign_id;
    const load = () => {
      Promise.all([
        appClient.entities.Campaign.get(cid),
        appClient.entities.LoreEntry.filter({ campaign_id: cid }, "title", 5000),
        appClient.entities.CharacterSheet.filter({ campaign_id: cid }, "name", 5000),
      ]).then(([campaignRecord, loreEntries, characterSheets]) => {
        setPanelCampaign(campaignRecord);
        setEntries(loreEntries);
        setCharacters(characterSheets);
      });
    };
    load();
    const unsubCampaign = appClient.entities.Campaign.subscribe(load);
    const unsubLore = appClient.entities.LoreEntry.subscribe(load);
    const unsubCharacters = appClient.entities.CharacterSheet.subscribe(load);
    return () => {
      unsubCampaign();
      unsubLore();
      unsubCharacters();
    };
  }, [user?.campaign_id]);

  const cats = ["all", "map", "character", "place", "event", "artifact", "religion", "other"];
  const isAdmin = isDmUser(user);
  const activeDate = timelineViewDate(panelCampaign, panelCampaign?.calendar_system, user, isAdmin, isPlayerViewMode(user));
  const visibleEntriesByPermission = entries.filter((entry) => canViewVisibleItem(entry, user, isAdmin));
  const loreTimelineStarted = Boolean(panelCampaign?.timeline_started || visibleEntriesByPermission.some(hasTimelineDate));
  const visibleDateEntries = loreTimelineStarted
    ? timelineLibraryRecords(visibleEntriesByPermission, activeDate, panelCampaign?.calendar_system)
    : visibleEntriesByPermission.filter((entry) => !hasTimelineDate(entry));
  const visibleCharactersByPermission = characters.filter((character) => canViewVisibleItem(character, user, isAdmin));
  const characterTimelineStarted = Boolean(panelCampaign?.timeline_started || visibleCharactersByPermission.some(hasTimelineDate));
  const visibleDateCharacters = characterTimelineStarted
    ? timelineLibraryRecords(visibleCharactersByPermission, activeDate, panelCampaign?.calendar_system)
    : visibleCharactersByPermission.filter((character) => !hasTimelineDate(character));

  const filtered = visibleDateEntries.filter((e) => {
    const matchCat = cat === "all" || e.category === cat;
    const matchTag = tag === "all" || (e.tags || []).some((entryTag) => entryTag === tag);
    const q = query.toLowerCase();
    const matchQ = !q || e.title?.toLowerCase().includes(q) || previewHtml(e.content).toLowerCase().includes(q) || e.tags?.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchTag && matchQ;
  });
  const tags = [...new Set(visibleDateEntries.flatMap((entry) => entry.tags || []).map((entryTag) => String(entryTag).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const filteredChars = sortClaimedCharactersFirst(
    visibleDateCharacters.filter((c) => {
      const q = query.toLowerCase();
      return !q || c.name?.toLowerCase().includes(q) || c.race?.toLowerCase().includes(q) || c.class?.toLowerCase().includes(q);
    }),
    user?.email,
  );
  const syncUpdatedCharacter = (updated) => {
    if (!updated?.id) return;
    setCharacters((current) => current.map((character) => (character.id === updated.id ? updated : character)));
  };
  const toggleCharacterExpanded = (characterId) => {
    setExpandedCharacterIds((current) => {
      const next = new Set(current);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative px-4 py-3 pr-12 border-b border-border">
        <div className="grid grid-cols-3 gap-1 min-w-0">
          <button onClick={() => setMainTab("lore")} className={`flex h-9 items-center justify-center gap-1.5 rounded-sm px-2 text-xs transition-colors whitespace-nowrap ${mainTab === "lore" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <ScrollText className="w-3.5 h-3.5" /> Lore & Maps
          </button>
          <button onClick={() => setMainTab("characters")} className={`flex h-9 items-center justify-center gap-1.5 rounded-sm px-2 text-xs transition-colors whitespace-nowrap ${mainTab === "characters" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <User className="w-3.5 h-3.5" /> Characters
          </button>
          <button onClick={() => setMainTab("notes")} className={`flex h-9 items-center justify-center gap-1.5 rounded-sm px-2 text-xs transition-colors whitespace-nowrap ${mainTab === "notes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <NotebookPen className="w-3.5 h-3.5" /> Grimoire
          </button>
        </div>
        <button onClick={onClose} className="absolute right-6 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {mainTab === "notes" && (
        <div className="flex-1 overflow-hidden">
          <PlayerNotesPanel currentUser={user} embedded />
        </div>
      )}

      {mainTab !== "notes" && (
        <>
          <div className="px-3 py-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
            </div>
            {mainTab === "lore" && (
              <>
                <div className="flex flex-wrap gap-1">
                  {cats.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded-sm border whitespace-nowrap transition-all ${
                        cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {tags.length > 0 && (
                  <div className="space-y-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowTags((value) => !value)}
                      className={`px-2 py-1 text-[10px] rounded-sm border whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                        showTags || tag !== "all" ? "bg-primary/15 text-accent border-primary" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag === "all" ? `Tags (${tags.length})` : tag}
                    </button>
                    {showTags && (
                      <div className="max-w-full overflow-x-auto overflow-y-hidden thin-scroll pb-2">
                        <div className="inline-flex min-w-max items-center gap-1 pr-2">
                          <button
                            type="button"
                            onClick={() => setTag("all")}
                            className={`px-2 py-1 text-[10px] rounded-sm border whitespace-nowrap transition-all ${
                              tag === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            All tags
                          </button>
                          {tags.map((entryTag) => (
                            <button
                              type="button"
                              key={entryTag}
                              onClick={() => setTag(entryTag)}
                              className={`px-2 py-1 text-[10px] rounded-sm border whitespace-nowrap transition-all ${
                                tag === entryTag ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {entryTag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto thin-scroll p-3 pb-28 space-y-2">
            {mainTab === "lore" && (
              <>
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" strokeWidth={1} />
                    No entries found.
                  </div>
                )}
                {filtered.map((e) => <EntryCard key={e.id} entry={e} />)}
              </>
            )}
            {mainTab === "characters" && (
              <>
                {filteredChars.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" strokeWidth={1} />
                    No characters found.
                  </div>
                )}
                {filteredChars.map((c) => (
                  <CharacterCard
                    key={c.id}
                    sheet={c}
                    expanded={expandedCharacterIds.has(c.id)}
                    onToggleExpanded={() => toggleCharacterExpanded(c.id)}
                    onSheetUpdated={syncUpdatedCharacter}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
