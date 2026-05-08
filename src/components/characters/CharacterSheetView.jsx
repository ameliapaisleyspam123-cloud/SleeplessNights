import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Lock, EyeOff, Users, Heart, Minus, Plus, Loader2, Swords } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const ABBR = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
const mod = (v) => Math.floor(((v || 10) - 10) / 2);
const fmt = (m) => (m >= 0 ? `+${m}` : `${m}`);

const ALL_SKILLS = [
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

function AbilityScore({ stat, value }) {
  const m = mod(value);
  return (
    <div className="flex flex-col items-center bg-card border border-border rounded-sm overflow-hidden text-center w-full">
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground bg-secondary/60 w-full py-0.5">{ABBR[stat]}</div>
      <div className="text-[10px] text-accent font-medium mt-1">{fmt(m)}</div>
      <div className="font-display text-2xl leading-none mb-1">{value ?? 10}</div>
    </div>
  );
}

function ProfDot({ filled, expertise }) {
  if (expertise) return <div className="w-3 h-3 rounded-sm bg-primary border-primary border-2 shrink-0" />;
  return <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${filled ? "bg-accent border-accent" : "border-muted-foreground/40"}`} />;
}

function SkillLine({ sk, sheet, profSkills, expertSkills, pb }) {
  const isExp = expertSkills.includes(sk.name);
  const isProf = profSkills.includes(sk.name);
  const bonus = mod(sheet[sk.ability] || 10) + (isExp ? pb * 2 : isProf ? pb : 0);
  return (
    <div className={`flex items-center gap-1.5 py-[2px] ${!isProf && !isExp ? "opacity-40" : ""}`}>
      <ProfDot filled={isProf || isExp} expertise={isExp} />
      <span className="text-[11px] tabular-nums text-accent w-7 text-right shrink-0">{fmt(bonus)}</span>
      <span className="text-[11px] flex-1 truncate">{sk.name}</span>
      <span className="text-[9px] text-muted-foreground shrink-0">{ABBR[sk.ability]}</span>
    </div>
  );
}

function SaveLine({ ability, sheet, profSaves, pb }) {
  const isProf = profSaves.includes(ability);
  const bonus = mod(sheet[ability] || 10) + (isProf ? pb : 0);
  return (
    <div className="flex items-center gap-1.5 py-[2px]">
      <ProfDot filled={isProf} />
      <span className="text-[11px] tabular-nums text-accent w-7 text-right shrink-0">{fmt(bonus)}</span>
      <span className="text-[11px] flex-1 capitalize">{ability}</span>
    </div>
  );
}

function TextSection({ label, content }) {
  if (!content) return null;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap border border-border rounded-sm bg-secondary/20 p-3">{content}</div>
    </div>
  );
}

function AddToInitiativeButton({ sheet }) {
  const [state, setState] = useState("idle");
  const dexMod = mod(sheet.dexterity || 10);
  const initMod = sheet.initiative !== undefined && sheet.initiative !== 0 ? sheet.initiative : dexMod;

  const handleAdd = async () => {
    if (!sheet.campaign_id) return;
    setState("rolling");
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + initMod;
    const list = await base44.entities.Initiative.filter({ campaign_id: sheet.campaign_id, active: true }, "-updated_date", 1);
    const combat = list[0];
    if (!combat) {
      setState("no_combat");
      setTimeout(() => setState("idle"), 2500);
      return;
    }
    const existing = (combat.entries || []).find((e) => e.id === sheet.id);
    const entries = existing
      ? (combat.entries || []).map((e) => (e.id === sheet.id ? { ...e, roll, total, modifier: initMod } : e))
      : [...(combat.entries || []), { id: sheet.id, name: sheet.name, image_url: sheet.image_url || "", roll, modifier: initMod, total, isGroup: false, groupSize: 1, ownerEmail: sheet.created_by || "", type: "character" }].sort((a, b) => b.total - a.total);
    await base44.entities.Initiative.update(combat.id, { entries });
    setState("added");
    setTimeout(() => setState("idle"), 3000);
  };

  const label = state === "rolling" ? "..." : state === "added" ? `Added (${fmt(initMod)})` : state === "no_combat" ? "No active combat" : `Roll Initiative (${fmt(initMod)})`;

  return <Button size="sm" variant={state === "added" ? "default" : "outline"} onClick={handleAdd} disabled={state === "rolling"} className="shrink-0 gap-1.5"><Swords className="w-3.5 h-3.5" />{label}</Button>;
}

function HpBlock({ hp, hpMax, hpTemp, onSave }) {
  const [current, setCurrent] = useState(hp ?? hpMax);
  const [temp, setTemp] = useState(hpTemp ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(hp ?? hpMax);
    setTemp(hpTemp ?? 0);
  }, [hp, hpMax, hpTemp]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ hp_current: current, hp_temp: temp });
    setSaving(false);
  };

  return (
    <div className="border border-border rounded-sm bg-card p-3 col-span-3 sm:col-span-2 lg:col-span-2">
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><Heart className="w-3 h-3" /> Hit Points</div>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="w-10 h-10 rounded-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"><Minus className="w-4 h-4" /></button>
        <div className="flex-1 text-center"><span className="font-display text-3xl leading-none">{current}</span><span className="text-muted-foreground text-sm">/{hpMax}</span></div>
        <button onClick={() => setCurrent((c) => Math.min(hpMax, c + 1))} className="w-10 h-10 rounded-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest shrink-0">Temp HP</span>
        <button onClick={() => setTemp((t) => Math.max(0, t - 1))} className="w-8 h-8 rounded-sm border border-border flex items-center justify-center hover:bg-secondary text-muted-foreground"><Minus className="w-3 h-3" /></button>
        <span className="text-sm font-medium w-8 text-center">{temp}</span>
        <button onClick={() => setTemp((t) => t + 1)} className="w-8 h-8 rounded-sm border border-border flex items-center justify-center hover:bg-secondary text-muted-foreground"><Plus className="w-3 h-3" /></button>
        <button onClick={handleSave} disabled={saving} className="ml-auto text-[11px] px-3 py-2 rounded-sm bg-accent/20 hover:bg-accent/30 text-accent transition-colors disabled:opacity-50">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}</button>
      </div>
    </div>
  );
}

export default function CharacterSheetView({ sheet, open, onOpenChange, canEdit, onEdit }) {
  if (!sheet) return null;

  const profSkills = (sheet.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const expertSkills = (sheet.skill_expertises || "").split(",").map((s) => s.trim()).filter(Boolean);
  const profSaves = (sheet.saving_throws || "").split(",").map((s) => s.trim()).filter(Boolean);
  const pb = sheet.proficiency_bonus || 2;
  const passivePerc = sheet.passive_perception || 10 + mod(sheet.wisdom || 10) + (profSkills.includes("Perception") ? pb : 0);
  const hasSpells = sheet.spellcasting_ability || sheet.spells_known;
  const saveField = async (data) => { if (sheet?.id) await base44.entities.CharacterSheet.update(sheet.id, data); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto thin-scroll p-0 bg-background">
        <div className="relative bg-secondary/60 border-b border-border">
          {sheet.image_url && <img src={sheet.image_url} alt={sheet.name} className="absolute inset-0 w-full h-full object-cover object-top opacity-20 pointer-events-none" />}
          <div className="relative px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              {sheet.image_url && <img src={sheet.image_url} alt={sheet.name} className="w-20 h-20 rounded-sm object-cover border border-border shrink-0 hidden sm:block" />}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-4xl leading-tight">{sheet.name}</h2>
                  {sheet.visibility === "dm_only" && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  {sheet.visibility === "archived" && <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  {sheet.visibility === "specific_players" && <Users className="w-3.5 h-3.5 text-accent" />}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  {sheet.race && <span>{sheet.race}</span>}
                  {sheet.class && <span> - {sheet.class}{sheet.subclass ? ` (${sheet.subclass})` : ""}</span>}
                  {sheet.level && <span> - Level {sheet.level}</span>}
                  {sheet.background && <span> - {sheet.background}</span>}
                  {sheet.alignment && <span> - {sheet.alignment}</span>}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  {sheet.experience_points != null && <span>{sheet.experience_points.toLocaleString()} XP</span>}
                  {sheet.hit_dice && <span>Hit Dice: {sheet.hit_dice}</span>}
                  <span>Prof Bonus: {fmt(pb)}</span>
                  <span>Passive Perception: {passivePerc}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {canEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>}
              {sheet.campaign_id && <AddToInitiativeButton sheet={sheet} />}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-0">
          <div className="md:w-52 shrink-0 border-r border-border px-3 py-4 space-y-4 bg-secondary/10">
            <div><div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 text-center">Ability Scores</div><div className="grid grid-cols-3 md:grid-cols-2 gap-1.5">{STATS.map((s) => <AbilityScore key={s} stat={s} value={sheet[s]} />)}</div></div>
            <div className="border border-border rounded-sm bg-card p-2"><div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center">Saving Throws</div>{STATS.map((a) => <SaveLine key={a} ability={a} sheet={sheet} profSaves={profSaves} pb={pb} />)}</div>
            <div className="border border-border rounded-sm bg-secondary/10 p-2"><div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center">Skills</div>{ALL_SKILLS.map((sk) => <SkillLine key={sk.name} sk={sk} sheet={sheet} profSkills={profSkills} expertSkills={expertSkills} pb={pb} />)}</div>
          </div>

          <div className="flex-1 px-5 py-4 space-y-5 min-w-0">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Combat</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[["Armor Class", sheet.ac ?? "-"], ["Speed", `${sheet.speed ?? 30}ft`], ["Hit Dice", sheet.hit_dice || "-"]].map(([label, value]) => (
                  <div key={label} className="flex flex-col items-center border border-border rounded-sm bg-card p-2 text-center min-h-[56px] justify-center"><div className="text-[8px] uppercase tracking-widest text-muted-foreground leading-none mb-0.5">{label}</div><div className="font-display text-2xl leading-none">{value}</div></div>
                ))}
                <HpBlock hp={sheet.hp_current} hpMax={sheet.hp_max} hpTemp={sheet.hp_temp} onSave={saveField} />
              </div>
            </div>
            <TextSection label="Attacks & Weapons" content={sheet.attacks} />
            <TextSection label="Equipment" content={sheet.equipment} />
            {hasSpells && <div><div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Spellcasting</div>{sheet.spellcasting_ability && <div className="flex gap-4 text-sm mb-3 flex-wrap"><span className="text-muted-foreground">Ability: <b className="text-foreground uppercase">{ABBR[sheet.spellcasting_ability] || sheet.spellcasting_ability}</b></span><span className="text-muted-foreground">Save DC: <b className="text-foreground">{sheet.spell_save_dc}</b></span><span className="text-muted-foreground">Attack: <b className="text-foreground">{fmt(sheet.spell_attack_bonus || 0)}</b></span></div>}<TextSection label="Spells Known / Prepared" content={sheet.spells_known} /></div>}
            <TextSection label="Features & Traits" content={sheet.features_traits} />
            <TextSection label="Languages & Proficiencies" content={sheet.languages} />
            <TextSection label="Notes" content={sheet.notes} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
