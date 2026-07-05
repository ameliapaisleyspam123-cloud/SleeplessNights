import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Lock, EyeOff, Users, Heart, Minus, Plus, Loader2, Swords, Sparkles, ChevronsUp, ChevronsDown } from "lucide-react";
import InventoryManager from "@/components/characters/InventoryManager";
import AttackManager from "@/components/characters/AttackManager";
import SpellManager from "@/components/characters/SpellManager";
import { appClient } from "@/api/appClient";

const STATS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const ABBR = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
const SHEET_AUTO_SAVE_DELAY_MS = 400;
const mod = (value) => Math.floor(((value || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

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

function RichText({ content }) {
  if (!content) return null;
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (looksHtml) return <div className="rich-content text-sm leading-relaxed border border-border rounded-sm bg-secondary/20 p-3" dangerouslySetInnerHTML={{ __html: content }} />;
  return <div className="text-sm leading-relaxed whitespace-pre-wrap border border-border rounded-sm bg-secondary/20 p-3">{content}</div>;
}

function AbilityScore({ stat, value }) {
  const modifier = mod(value);
  return (
    <div className="flex flex-col items-center bg-card border border-border rounded-sm overflow-hidden text-center w-full">
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground bg-secondary/60 w-full py-0.5">{ABBR[stat]}</div>
      <div className="text-[10px] text-accent font-medium mt-1">{fmt(modifier)}</div>
      <div className="font-display text-2xl leading-none mb-1">{value ?? 10}</div>
    </div>
  );
}

function ProfDot({ filled, expertise }) {
  if (expertise) return <div className="w-3 h-3 rounded-sm bg-primary border-primary border-2 shrink-0" />;
  return <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${filled ? "bg-accent border-accent" : "border-muted-foreground/40"}`} />;
}

function RollMarker({ advantage, disadvantage }) {
  if (advantage) return <ChevronsUp className="w-3 h-3 text-accent shrink-0" aria-label="Advantage" />;
  if (disadvantage) return <ChevronsDown className="w-3 h-3 text-destructive shrink-0" aria-label="Disadvantage" />;
  return null;
}

function rollD20WithMode(advantage, disadvantage) {
  if (!advantage && !disadvantage) {
    const roll = Math.floor(Math.random() * 20) + 1;
    return { roll, rolls: [roll], rollMode: "normal" };
  }
  const rolls = [Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1];
  return {
    roll: advantage ? Math.max(...rolls) : Math.min(...rolls),
    rolls,
    rollMode: advantage ? "advantage" : "disadvantage",
  };
}

function SkillLine({ skill, sheet, profSkills, expertSkills, advantageSkills, disadvantageSkills, pb }) {
  const expertise = expertSkills.includes(skill.name);
  const proficient = profSkills.includes(skill.name);
  const advantage = advantageSkills.includes(skill.name);
  const disadvantage = disadvantageSkills.includes(skill.name);
  const bonus = mod(sheet[skill.ability] || 10) + (expertise ? pb * 2 : proficient ? pb : 0);
  return (
    <div className={`flex items-center gap-1.5 py-[2px] ${!proficient && !expertise && !advantage && !disadvantage ? "opacity-40" : ""}`}>
      <ProfDot filled={proficient || expertise} expertise={expertise} />
      <span className="text-[11px] tabular-nums text-accent w-7 text-right shrink-0">{fmt(bonus)}</span>
      <span className="text-[11px] flex-1 truncate">{skill.name}</span>
      <RollMarker advantage={advantage} disadvantage={disadvantage} />
      <span className="text-[9px] text-muted-foreground shrink-0">{ABBR[skill.ability]}</span>
    </div>
  );
}

function SaveLine({ ability, sheet, profSaves, advantageSaves, disadvantageSaves, pb }) {
  const proficient = profSaves.includes(ability);
  const advantage = advantageSaves.includes(ability);
  const disadvantage = disadvantageSaves.includes(ability);
  const bonus = mod(sheet[ability] || 10) + (proficient ? pb : 0);
  return (
    <div className="flex items-center gap-1.5 py-[2px]">
      <ProfDot filled={proficient} />
      <span className="text-[11px] tabular-nums text-accent w-7 text-right shrink-0">{fmt(bonus)}</span>
      <span className="text-[11px] flex-1 capitalize">{ability}</span>
      <RollMarker advantage={advantage} disadvantage={disadvantage} />
    </div>
  );
}

function TextSection({ label, content }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      {content ? <RichText content={content} /> : <EmptyBlock label="Not recorded." />}
    </div>
  );
}

function EmptyBlock({ label }) {
  return <div className="border border-dashed border-border rounded-sm py-4 px-3 text-xs text-muted-foreground text-center">{label}</div>;
}

function hasListData(value) {
  return Boolean(value && value !== "[]");
}

function CurrencyBlock({ sheet }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Currency</div>
      <div className="grid grid-cols-5 gap-2 text-center">
        {[
          ["CP", sheet.cp],
          ["SP", sheet.sp],
          ["EP", sheet.ep],
          ["GP", sheet.gp],
          ["PP", sheet.pp],
        ].map(([label, value]) => (
          <div key={label} className="border border-border rounded-sm bg-card p-2">
            <div className="text-sm font-medium text-foreground">{value || 0}</div>
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddToInitiativeButton({ sheet, ownerEmail }) {
  const [state, setState] = useState("idle");
  const dexMod = mod(sheet.dexterity || 10);
  const initMod = sheet.initiative !== undefined && sheet.initiative !== 0 ? sheet.initiative : dexMod;

  const handleAdd = async () => {
    if (!sheet.campaign_id) return;
    setState("rolling");
    const { roll, rolls, rollMode } = rollD20WithMode(sheet.initiative_advantage, sheet.initiative_disadvantage);
    const total = roll + initMod;
    const [combat] = await appClient.entities.Initiative.filter({ campaign_id: sheet.campaign_id, active: true }, "-updated_date", 1);
    if (!combat) {
      setState("no_combat");
      setTimeout(() => setState("idle"), 2500);
      return;
    }

    const existing = (combat.entries || []).find((entry) => entry.id === sheet.id);
    const entries = existing
      ? (combat.entries || []).map((entry) =>
          entry.id === sheet.id
            ? {
                ...entry,
                roll,
                rolls,
                rollMode,
                total,
                modifier: initMod,
                hpCurrent: sheet.hp_current ?? sheet.hp_max ?? 0,
                hpMax: sheet.hp_max ?? 0,
                ac: sheet.ac ?? 10,
                ownerEmail,
              }
            : entry,
        )
      : [
          ...(combat.entries || []),
          {
            id: sheet.id,
            characterId: sheet.id,
            name: sheet.name,
            image_url: sheet.image_url || "",
            roll,
            rolls,
            rollMode,
            modifier: initMod,
            total,
            hpCurrent: sheet.hp_current ?? sheet.hp_max ?? 0,
            hpMax: sheet.hp_max ?? 0,
            ac: sheet.ac ?? 10,
            isGroup: false,
            groupSize: 1,
            ownerEmail,
            type: "character",
          },
        ].sort((a, b) => b.total - a.total);

    await appClient.entities.Initiative.update(combat.id, { entries });
    setState("added");
    setTimeout(() => setState("idle"), 3000);
  };

  const label = state === "rolling" ? "..." : state === "added" ? `Added (${fmt(initMod)})` : state === "no_combat" ? "No active combat" : `Roll Initiative (${fmt(initMod)})`;

  return (
    <Button size="sm" variant={state === "added" ? "default" : "outline"} onClick={handleAdd} disabled={state === "rolling"} className={`shrink-0 gap-1.5 ${state === "added" ? "bg-accent text-accent-foreground border-accent" : ""}`}>
      <Swords className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}

function HpBlock({ hp, hpMax, hpTemp, onSave }) {
  const [current, setCurrent] = useState(hp ?? hpMax);
  const [temp, setTemp] = useState(hpTemp ?? 0);
  const [amount, setAmount] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(hp ?? hpMax);
    setTemp(hpTemp ?? 0);
  }, [hp, hpMax, hpTemp]);

  const pct = Math.max(0, Math.min(100, (current / (hpMax || 1)) * 100));
  const barColor = pct > 50 ? "bg-accent" : pct > 25 ? "bg-primary" : "bg-destructive";

  const saveHp = async (nextCurrent, nextTemp) => {
    setSaving(true);
    await onSave({ hp_current: nextCurrent, hp_temp: nextTemp });
    setSaving(false);
  };

  const applyHp = (nextCurrent, nextTemp = temp) => {
    const cleanCurrent = Math.max(0, Math.min(hpMax || nextCurrent, nextCurrent));
    const cleanTemp = Math.max(0, nextTemp);
    setCurrent(cleanCurrent);
    setTemp(cleanTemp);
    saveHp(cleanCurrent, cleanTemp);
  };

  const adjustCurrent = (delta) => {
    applyHp(current + delta, temp);
  };

  const adjustTemp = (delta) => {
    applyHp(current, temp + delta);
  };

  const applyDamage = () => {
    const damage = Math.max(1, Number(amount) || 1);
    const tempDamage = Math.min(temp, damage);
    const remainingDamage = damage - tempDamage;
    applyHp(current - remainingDamage, temp - tempDamage);
  };

  return (
    <>
      <div className="border border-border rounded-sm bg-card p-3 col-span-3 sm:col-span-3">
        <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <Heart className="w-3 h-3" /> Hit Points
        </div>
        <div className="w-full h-2 bg-secondary rounded-full mb-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={() => adjustCurrent(-1)} className="w-10 h-10 rounded-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="font-display text-3xl leading-none">{current}</span>
            <span className="text-muted-foreground text-sm">/{hpMax}</span>
          </div>
          <button type="button" onClick={() => adjustCurrent(1)} className="w-10 h-10 rounded-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest shrink-0">Temp HP</span>
          <button type="button" onClick={() => adjustTemp(-1)} className="w-8 h-8 rounded-sm border border-border flex items-center justify-center hover:bg-secondary text-muted-foreground">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-medium w-8 text-center">{temp}</span>
          <button type="button" onClick={() => adjustTemp(1)} className="w-8 h-8 rounded-sm border border-border flex items-center justify-center hover:bg-secondary text-muted-foreground">
            <Plus className="w-3 h-3" />
          </button>
          {saving && <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Saving</span>}
        </div>
      </div>
      <div className="border border-border rounded-sm bg-card p-3 col-span-3 sm:col-span-2">
        <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-2">Damage / Heal</div>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(Math.max(1, Number(event.target.value) || 1))}
          className="h-10 w-full rounded-sm border border-border bg-background px-2 text-center text-sm text-foreground mb-2"
          aria-label="Hit point adjustment amount"
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={applyDamage} className="h-10 rounded-sm border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-colors">
            Damage
          </button>
          <button type="button" onClick={() => adjustCurrent(amount)} className="h-10 rounded-sm border border-border text-xs text-muted-foreground hover:text-accent hover:border-accent/60 transition-colors">
            Heal
          </button>
        </div>
      </div>
    </>
  );
}

function DeathSaveBlock({ successes, failures, onSave }) {
  const [succ, setSucc] = useState(successes || 0);
  const [fail, setFail] = useState(failures || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSucc(successes || 0);
    setFail(failures || 0);
  }, [successes, failures]);

  const saveDeathSaves = async (nextSucc, nextFail) => {
    setSaving(true);
    await onSave({ death_save_successes: nextSucc, death_save_failures: nextFail });
    setSaving(false);
  };

  const setDeathValue = (kind, currentValue, nextValue) => {
    const value = currentValue > nextValue ? nextValue : nextValue + 1;
    if (kind === "succ") {
      setSucc(value);
      saveDeathSaves(value, fail);
    } else {
      setFail(value);
      saveDeathSaves(succ, value);
    }
  };

  return (
    <div className="border border-border rounded-sm bg-card p-3">
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-2">Death Saves</div>
      <div className="space-y-1.5">
        {[
          ["Successes", "succ", succ, setSucc, "green"],
          ["Failures", "fail", fail, setFail, "red"],
        ].map(([label, key, value, setter, color]) => (
          <div className="flex items-center gap-2" key={key}>
            <span className={`text-[9px] ${color === "green" ? "text-accent" : "text-destructive"} w-16`}>{label}</span>
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    setter(value > index ? index : index + 1);
                    setDeathValue(key, value, index);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-colors ${index < value ? (color === "green" ? "bg-accent border-accent" : "bg-destructive border-destructive") : `border-border ${color === "green" ? "hover:border-accent/60" : "hover:border-destructive/60"}`}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {saving && <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground text-center">Saving</div>}
    </div>
  );
}

function SpellSlotsBlock({ slotsJson, sheet, onSave }) {
  const parse = (json) => {
    try {
      return JSON.parse(json || "{}");
    } catch {
      return {};
    }
  };
  const [slots, setSlots] = useState(parse(slotsJson));
  const [resources, setResources] = useState({
    ki_points_current: sheet.ki_points_current || 0,
    ki_points_max: sheet.ki_points_max || 0,
    channel_divinity_current: sheet.channel_divinity_current || 0,
    channel_divinity_max: sheet.channel_divinity_max || 0,
    sorcery_points_current: sheet.sorcery_points_current || 0,
    sorcery_points_max: sheet.sorcery_points_max || 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlots(parse(slotsJson));
  }, [slotsJson]);

  useEffect(() => {
    setResources({
      ki_points_current: sheet.ki_points_current || 0,
      ki_points_max: sheet.ki_points_max || 0,
      channel_divinity_current: sheet.channel_divinity_current || 0,
      channel_divinity_max: sheet.channel_divinity_max || 0,
      sorcery_points_current: sheet.sorcery_points_current || 0,
      sorcery_points_max: sheet.sorcery_points_max || 0,
    });
  }, [
    sheet.ki_points_current,
    sheet.ki_points_max,
    sheet.channel_divinity_current,
    sheet.channel_divinity_max,
    sheet.sorcery_points_current,
    sheet.sorcery_points_max,
  ]);

  const toggleSlot = (level, index) => {
    const slot = slots[level] || { total: 0, used: 0 };
    const used = slot.used || 0;
    const remaining = slot.total - used;
    const newUsed = index < remaining ? used + 1 : Math.max(0, used - 1);
    const nextSlots = { ...slots, [level]: { ...slot, used: newUsed } };
    setSlots(nextSlots);
    setSaving(true);
    onSave({ spell_slots: JSON.stringify(nextSlots), ...resources }).finally(() => setSaving(false));
  };

  const classResources = [
    ["Ki Points", "ki_points_current", "ki_points_max"],
    ["Channel Divinity", "channel_divinity_current", "channel_divinity_max"],
    ["Sorcery Points", "sorcery_points_current", "sorcery_points_max"],
  ]
    .map(([label, currentKey, maxKey]) => {
      const max = Math.max(0, Number(resources[maxKey]) || 0);
      const current = Math.min(Math.max(0, Number(resources[currentKey]) || 0), max);
      return { label, currentKey, maxKey, current, max };
    })
    .filter((resource) => resource.max > 0);

  const hasSpellSlots = Object.keys(slots).some((level) => slots[level]?.total > 0);
  const hasResources = classResources.length > 0;

  const setResourceCurrent = (resource, nextValue) => {
    const nextResources = {
      ...resources,
      [resource.currentKey]: Math.min(Math.max(0, nextValue), resource.max),
    };
    setResources(nextResources);
    setSaving(true);
    onSave({ spell_slots: JSON.stringify(slots), ...nextResources }).finally(() => setSaving(false));
  };

  if (!hasSpellSlots && !hasResources) {
    return (
      <div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Spell Slots</div>
        <EmptyBlock label="No spell slots recorded." />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
        <span>Spell Slots</span>
        {saving && <span className="text-[10px] text-muted-foreground">Saving</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {hasSpellSlots && [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
          const slot = slots[level];
          if (!slot?.total) return null;
          const used = slot.used || 0;
          const remaining = slot.total - used;
          return (
            <div key={level} className="border border-border rounded-sm bg-secondary/40 px-3 py-2 text-center min-w-[56px]">
              <div className="text-[8px] uppercase text-muted-foreground mb-1">Lvl {level}</div>
              <div className="flex gap-1.5 justify-center flex-wrap">
                {Array.from({ length: slot.total }).map((_, index) => (
                  <button type="button" key={index} onClick={() => toggleSlot(level, index)} className={`w-5 h-5 rounded-full border-2 transition-colors ${index < remaining ? "bg-accent border-accent hover:bg-accent/60" : "border-border hover:border-accent/50"}`} />
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">
                {remaining}/{slot.total}
              </div>
            </div>
          );
        })}
        {classResources.map((resource) => (
          <div key={resource.label} className="border border-border rounded-sm bg-secondary/40 px-3 py-2 text-center min-w-[96px]">
            <div className="text-[8px] uppercase text-muted-foreground mb-1">{resource.label}</div>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {Array.from({ length: resource.max }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setResourceCurrent(resource, index < resource.current ? index : index + 1)}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${index < resource.current ? "bg-accent border-accent hover:bg-accent/60" : "border-border hover:border-accent/50"}`}
                />
              ))}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {resource.current}/{resource.max}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CharacterSheetView({ sheet: incomingSheet, open, onOpenChange, canEdit, onEdit, currentUser, isDM = false, onSheetUpdated }) {
  const [sheet, setSheet] = useState(incomingSheet);
  const [inspired, setInspired] = useState(Boolean(incomingSheet?.inspiration));
  const [savingInspiration, setSavingInspiration] = useState(false);
  const latestSheetRef = useRef(incomingSheet);
  const autoSaveTimerRef = useRef(null);
  const pendingSaveRef = useRef({});
  const pendingCallbacksRef = useRef([]);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (!incomingSheet) {
      latestSheetRef.current = incomingSheet;
      setSheet(incomingSheet);
      return;
    }
    const nextSheet = { ...incomingSheet, ...pendingSaveRef.current };
    latestSheetRef.current = nextSheet;
    setSheet(nextSheet);
  }, [incomingSheet]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
  }, []);

  useEffect(() => {
    setInspired(Boolean(sheet?.inspiration));
  }, [sheet?.inspiration]);

  const flushPendingSave = useCallback(async () => {
    if (saveInFlightRef.current) return;
    const patch = pendingSaveRef.current;
    if (!Object.keys(patch).length || !latestSheetRef.current?.id || !canEdit) return;

    pendingSaveRef.current = {};
    const callbacks = pendingCallbacksRef.current;
    pendingCallbacksRef.current = [];
    saveInFlightRef.current = true;

    try {
      const updated = await appClient.entities.CharacterSheet.update(latestSheetRef.current.id, patch);
      const nextSheet = { ...updated, ...pendingSaveRef.current };
      latestSheetRef.current = nextSheet;
      setSheet(nextSheet);
      onSheetUpdated?.(nextSheet);
      callbacks.forEach(({ resolve }) => resolve(updated));
    } catch (error) {
      pendingSaveRef.current = { ...patch, ...pendingSaveRef.current };
      callbacks.forEach(({ reject }) => reject(error));
    } finally {
      saveInFlightRef.current = false;
      if (Object.keys(pendingSaveRef.current).length) {
        if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = window.setTimeout(flushPendingSave, SHEET_AUTO_SAVE_DELAY_MS);
      }
    }
  }, [canEdit, onSheetUpdated]);

  const saveField = useCallback((data) => {
    if (!latestSheetRef.current?.id || !canEdit) return Promise.resolve(null);

    pendingSaveRef.current = { ...pendingSaveRef.current, ...data };
    const optimisticSheet = { ...latestSheetRef.current, ...data };
    latestSheetRef.current = optimisticSheet;
    setSheet(optimisticSheet);
    onSheetUpdated?.(optimisticSheet);

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(flushPendingSave, SHEET_AUTO_SAVE_DELAY_MS);

    return new Promise((resolve, reject) => {
      pendingCallbacksRef.current.push({ resolve, reject });
    });
  }, [canEdit, flushPendingSave, onSheetUpdated]);

  if (!sheet) return null;

  const profSkills = (sheet.skills || "").split(",").map((value) => value.trim()).filter(Boolean);
  const expertSkills = (sheet.skill_expertises || "").split(",").map((value) => value.trim()).filter(Boolean);
  const advantageSkills = (sheet.advantage_skills || "").split(",").map((value) => value.trim()).filter(Boolean);
  const disadvantageSkills = (sheet.disadvantage_skills || "").split(",").map((value) => value.trim()).filter(Boolean);
  const profSaves = (sheet.saving_throws || "").split(",").map((value) => value.trim()).filter(Boolean);
  const advantageSaves = (sheet.advantage_saving_throws || "").split(",").map((value) => value.trim()).filter(Boolean);
  const disadvantageSaves = (sheet.disadvantage_saving_throws || "").split(",").map((value) => value.trim()).filter(Boolean);
  const pb = sheet.proficiency_bonus || 2;
  const passivePerc = 10 + mod(sheet.wisdom || 10) + (expertSkills.includes("Perception") ? pb * 2 : profSkills.includes("Perception") ? pb : 0);

  const toggleInspiration = async () => {
    if (!canEdit) return;
    const next = !inspired;
    setInspired(next);
    setSavingInspiration(true);
    await saveField({ inspiration: next });
    setSavingInspiration(false);
  };

  const canRollInitiative = isDM || sheet.assigned_to_email === currentUser?.email;
  const initiativeOwnerEmail = sheet.assigned_to_email || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[95vh] overflow-y-auto thin-scroll p-0 bg-background">
        <div className="relative bg-secondary/60 border-b border-border">
          {sheet.image_url && <img src={sheet.image_url} alt={sheet.name} className="absolute inset-0 w-full h-full object-cover object-top opacity-20 pointer-events-none" />}
          <div className="relative px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              {sheet.image_url && <img src={sheet.image_url} alt={sheet.name} className="w-20 h-20 rounded-sm object-cover border border-border shrink-0 hidden sm:block" />}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-4xl leading-tight">{sheet.name}</h2>
                  {sheet.visibility === "dm_only" && <Lock className="w-3.5 h-3.5 text-accent" />}
                  {sheet.visibility === "archived" && <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  {sheet.visibility === "specific_players" && <Users className="w-3.5 h-3.5 text-accent" />}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  {sheet.race && <span>{sheet.race}</span>}
                  {sheet.class && <span>- {sheet.class}{sheet.subclass ? ` (${sheet.subclass})` : ""}</span>}
                  {sheet.level && <span>- Level {sheet.level}</span>}
                  {sheet.background && <span>- {sheet.background}</span>}
                  {sheet.alignment && <span>- {sheet.alignment}</span>}
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
              {canEdit && (
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
              <button onClick={toggleInspiration} disabled={savingInspiration} className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-all disabled:opacity-50 ${inspired ? "bg-accent text-accent-foreground border-accent hover:bg-accent/90" : "border-border bg-card text-foreground hover:border-accent/60 hover:bg-accent/10"}`}>
                {savingInspiration ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {inspired ? "Inspired" : "Inspiration"}
              </button>
              {sheet.campaign_id && canRollInitiative && <AddToInitiativeButton sheet={sheet} ownerEmail={initiativeOwnerEmail} />}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-0">
          <div className="md:w-52 shrink-0 border-r border-border px-3 py-4 space-y-4 bg-secondary/10">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 text-center">Ability Scores</div>
              <div className="grid grid-cols-3 md:grid-cols-2 gap-1.5">{STATS.map((stat) => <AbilityScore key={stat} stat={stat} value={sheet[stat]} />)}</div>
            </div>
            <div className="border border-border rounded-sm bg-card p-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center">Saving Throws</div>
              {STATS.map((ability) => <SaveLine key={ability} ability={ability} sheet={sheet} profSaves={profSaves} advantageSaves={advantageSaves} disadvantageSaves={disadvantageSaves} pb={pb} />)}
            </div>
            <div className="border border-border rounded-sm bg-secondary/10 p-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 text-center">Skills</div>
              {ALL_SKILLS.map((skill) => <SkillLine key={skill.name} skill={skill} sheet={sheet} profSkills={profSkills} expertSkills={expertSkills} advantageSkills={advantageSkills} disadvantageSkills={disadvantageSkills} pb={pb} />)}
            </div>
          </div>

          <div className="flex-1 px-5 py-4 space-y-5 min-w-0">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Combat</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  ["Armor Class", sheet.ac ?? "-"],
                  ["Initiative", fmt(sheet.initiative || mod(sheet.dexterity || 10))],
                  ["Speed", `${sheet.speed ?? 30}ft`],
                  ["Prof Bonus", fmt(pb)],
                  ["Hit Dice", sheet.hit_dice || "-"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col items-center border border-border rounded-sm bg-card p-2 text-center min-h-[56px] justify-center">
                    <div className="text-[8px] uppercase tracking-widest text-muted-foreground leading-none mb-0.5">{label}</div>
                    <div className="font-display text-2xl leading-none flex items-center gap-1">
                      {value}
                      {label === "Initiative" && <RollMarker advantage={sheet.initiative_advantage} disadvantage={sheet.initiative_disadvantage} />}
                    </div>
                  </div>
                ))}
                <HpBlock hp={sheet.hp_current} hpMax={sheet.hp_max} hpTemp={sheet.hp_temp} onSave={saveField} />
              </div>
              <div className="mt-2">
                <DeathSaveBlock successes={sheet.death_save_successes} failures={sheet.death_save_failures} onSave={saveField} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {[
                  ["Resistances", sheet.damage_resistances],
                  ["Immunities", sheet.damage_immunities],
                  ["Vulnerabilities", sheet.damage_vulnerabilities],
                ].map(([label, value]) => (
                  <div key={label} className="border border-border rounded-sm bg-card p-3 min-h-[64px]">
                    <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
                    <div className="text-sm text-foreground">{value || "-"}</div>
                  </div>
                ))}
              </div>
            </div>

            {hasListData(sheet.attacks) ? (
              <AttackManager value={sheet.attacks} readOnly />
            ) : (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Attacks & Weapons</div>
                <EmptyBlock label="No attacks recorded." />
              </div>
            )}

            {hasListData(sheet.inventory) ? (
              <InventoryManager value={sheet.inventory} readOnly />
            ) : (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Inventory</div>
                <EmptyBlock label="No inventory recorded." />
              </div>
            )}

            <CurrencyBlock sheet={sheet} />

            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Spellcasting</div>
              <div className="flex gap-4 text-sm mb-3 flex-wrap">
                <span className="text-muted-foreground">Ability: <b className="text-foreground uppercase">{ABBR[sheet.spellcasting_ability] || sheet.spellcasting_ability || "None"}</b></span>
                <span className="text-muted-foreground">Save DC: <b className="text-foreground">{sheet.spell_save_dc ?? 8}</b></span>
                <span className="text-muted-foreground">Attack: <b className="text-foreground">{fmt(sheet.spell_attack_bonus || 0)}</b></span>
              </div>
              <SpellSlotsBlock slotsJson={sheet.spell_slots} sheet={sheet} onSave={saveField} />
              <div className="mt-3">
                {hasListData(sheet.spells_known) ? <SpellManager value={sheet.spells_known} readOnly /> : <EmptyBlock label="No spells recorded." />}
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Character Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TextSection label="Personality Traits" content={sheet.traits} />
                <TextSection label="Ideals" content={sheet.ideals} />
                <TextSection label="Bonds" content={sheet.bonds} />
                <TextSection label="Flaws" content={sheet.flaws} />
              </div>
            </div>

            <TextSection label="Features & Traits" content={sheet.features_traits} />
            <TextSection label="Languages & Proficiencies" content={sheet.languages} />
            <TextSection label="Notes" content={sheet.notes} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
