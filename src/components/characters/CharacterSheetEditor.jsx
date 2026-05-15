import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { appClient } from "@/api/appClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Eye, Lock, EyeOff, Users } from "lucide-react";
import InventoryManager from "@/components/characters/InventoryManager";

const ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];
const ABILITY_SCORES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const ABILITY_ABBR = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const mod = (value) => Math.floor(((value || 10) - 10) / 2);
const fmtMod = (value) => (value >= 0 ? `+${value}` : `${value}`);

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

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Eye },
  { value: "specific_players", label: "Specific Players", icon: Users },
  { value: "dm_only", label: "DM Only", icon: Lock },
  { value: "archived", label: "Archived", icon: EyeOff },
];

const quillModules = { toolbar: [["bold", "italic"], [{ list: "bullet" }], ["clean"]] };
const quillClass = "[&_.ql-container]:text-sm [&_.ql-editor]:bg-card [&_.ql-editor]:text-foreground [&_.ql-editor]:min-h-[100px] [&_.ql-toolbar]:border-border";

const defaultForm = () => ({
  name: "",
  race: "",
  class: "",
  subclass: "",
  level: 1,
  background: "",
  alignment: "True Neutral",
  experience_points: 0,
  inspiration: false,
  hit_dice: "1d8",
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  saving_throws: "",
  hp_max: 10,
  hp_current: 10,
  hp_temp: 0,
  ac: 10,
  initiative: 0,
  speed: 30,
  proficiency_bonus: 2,
  death_save_successes: 0,
  death_save_failures: 0,
  skills: "",
  skill_expertises: "",
  passive_perception: 10,
  languages: "",
  traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  features_traits: "",
  attacks: "",
  equipment: "",
  inventory: "",
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  spellcasting_ability: "",
  spell_save_dc: 8,
  spell_attack_bonus: 0,
  spell_slots: "",
  spells_known: "",
  notes: "",
  image_url: "",
  folder: "",
  visibility: "public",
  allowed_emails: [],
});

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function AbilityBox({ label, value, onChange }) {
  const modifier = mod(value);
  return (
    <div className="flex flex-col items-center border border-border rounded-sm bg-secondary/40 py-3 px-1 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold text-accent">{fmtMod(modifier)}</div>
      <Input type="number" min={1} max={30} className="text-center px-1 h-7 text-sm mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} />
    </div>
  );
}

function SkillRow({ skill, profList, expertiseList, abilityScores, profBonus, onToggle, onExpertiseToggle }) {
  const proficient = profList.includes(skill.name);
  const expertise = expertiseList.includes(skill.name);
  const total = mod(abilityScores[skill.ability] || 10) + (expertise ? profBonus * 2 : proficient ? profBonus : 0);
  return (
    <div className="flex items-center gap-2 py-0.5">
      <button type="button" onClick={() => onToggle(skill.name)} className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${proficient ? "bg-accent border-accent" : "border-border"}`}>
        {proficient && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
      </button>
      <button type="button" onClick={() => onExpertiseToggle(skill.name)} className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${expertise ? "bg-primary border-primary" : "border-border"}`}>
        {expertise && <div className="w-1.5 h-1.5 rounded-sm bg-primary-foreground" />}
      </button>
      <span className="text-xs flex-1">
        {skill.name} <span className="text-muted-foreground text-[10px]">({ABILITY_ABBR[skill.ability]})</span>
      </span>
      <span className="text-xs font-medium w-7 text-right">{fmtMod(total)}</span>
    </div>
  );
}

function SavingThrowRow({ ability, profList, abilityScores, profBonus, onToggle }) {
  const proficient = profList.includes(ability);
  const total = mod(abilityScores[ability] || 10) + (proficient ? profBonus : 0);
  return (
    <div className="flex items-center gap-2 py-0.5">
      <button type="button" onClick={() => onToggle(ability)} className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${proficient ? "bg-accent border-accent" : "border-border"}`}>
        {proficient && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
      </button>
      <span className="text-xs flex-1 capitalize">{ability}</span>
      <span className="text-xs font-medium w-7 text-right">{fmtMod(total)}</span>
    </div>
  );
}

function RichEditor({ value, onChange, placeholder, min = 100 }) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <ReactQuill value={value || ""} onChange={onChange} theme="snow" placeholder={placeholder} modules={quillModules} className={`${quillClass} [&_.ql-editor]:min-h-[${min}px]`} />
    </div>
  );
}

export default function CharacterSheetEditor({ open, onOpenChange, sheet, onSaved }) {
  const [form, setForm] = useState(defaultForm());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(sheet ? { ...defaultForm(), ...sheet } : defaultForm());
      appClient.entities.User.list("-created_date", 200)
        .then((users) => setAllUsers(users.filter((user) => user.role !== "admin")))
        .catch(() => {});
    }
  }, [open, sheet]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setNum = (key, value) => set(key, value === "" ? "" : Number(value));
  const csv = (value) => (value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const profSkills = csv(form.skills);
  const expertSkills = csv(form.skill_expertises);
  const profSaves = csv(form.saving_throws);

  const calcPassivePerc = () => {
    const pb = form.proficiency_bonus || 2;
    return 10 + mod(form.wisdom || 10) + (expertSkills.includes("Perception") ? pb * 2 : profSkills.includes("Perception") ? pb : 0);
  };

  const toggleCsv = (key, list, name) => set(key, (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]).join(", "));
  const spellSlots = (() => {
    try {
      return JSON.parse(form.spell_slots || "{}");
    } catch {
      return {};
    }
  })();
  const setSlot = (level, key, value) => {
    const next = { ...spellSlots, [level]: { ...(spellSlots[level] || { total: 0, used: 0 }), [key]: Number(value) || 0 } };
    set("spell_slots", JSON.stringify(next));
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploading(false);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const dataToSave = { ...form, passive_perception: calcPassivePerc() };
    if (sheet?.id) {
      await appClient.entities.CharacterSheet.update(sheet.id, dataToSave);
    } else {
      const user = await appClient.auth.me().catch(() => null);
      await appClient.entities.CharacterSheet.create({ ...dataToSave, campaign_id: user?.campaign_id });
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const archive = async () => {
    if (!sheet?.id) return;
    await appClient.entities.CharacterSheet.update(sheet.id, { visibility: "archived" });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto thin-scroll p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-2xl">{sheet?.id ? "Edit Character" : "New Character"}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6 mt-4">
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Identity</div>
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="shrink-0">
                {form.image_url ? (
                  <div className="relative w-24 h-24 rounded-sm overflow-hidden border border-border">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => set("image_url", "")} className="absolute top-1 right-1 text-[10px] bg-destructive text-white px-1 rounded">x</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-24 h-24 rounded-sm border border-dashed border-border cursor-pointer hover:border-accent transition-all text-xs text-muted-foreground">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 mb-1" />}
                    Portrait
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="col-span-2"><Field label="Character Name"><Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Aelindra..." /></Field></div>
                <div className="col-span-2"><Field label="Folder"><Input value={form.folder || ""} onChange={(event) => set("folder", event.target.value)} placeholder="Players/NPCs/Villains" /></Field></div>
                <Field label="Race"><Input value={form.race} onChange={(event) => set("race", event.target.value)} /></Field>
                <Field label="Class"><Input value={form.class} onChange={(event) => set("class", event.target.value)} /></Field>
                <Field label="Subclass"><Input value={form.subclass} onChange={(event) => set("subclass", event.target.value)} /></Field>
                <Field label="Background"><Input value={form.background} onChange={(event) => set("background", event.target.value)} /></Field>
                <Field label="Alignment">
                  <Select value={form.alignment} onValueChange={(value) => set("alignment", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ALIGNMENTS.map((alignment) => <SelectItem key={alignment} value={alignment}>{alignment}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Level"><Input type="number" min={1} max={20} value={form.level} onChange={(event) => setNum("level", event.target.value)} /></Field>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="XP"><Input type="number" min={0} value={form.experience_points} onChange={(event) => setNum("experience_points", event.target.value)} /></Field>
              <Field label="Hit Dice"><Input value={form.hit_dice} onChange={(event) => set("hit_dice", event.target.value)} /></Field>
              <Field label="Inspiration">
                <button type="button" onClick={() => set("inspiration", !form.inspiration)} className={`w-full h-9 rounded-sm border text-sm font-medium transition-colors ${form.inspiration ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"}`}>
                  {form.inspiration ? "Inspired" : "No Inspiration"}
                </button>
              </Field>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Ability Scores</div>
            <div className="grid grid-cols-6 gap-2">{ABILITY_SCORES.map((score) => <AbilityBox key={score} label={ABILITY_ABBR[score]} value={form[score]} onChange={(value) => setNum(score, value)} />)}</div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Combat Stats</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                ["ac", "AC"],
                ["initiative", "Initiative"],
                ["speed", "Speed"],
                ["proficiency_bonus", "Prof"],
                ["hp_max", "HP Max"],
                ["hp_current", "HP Current"],
              ].map(([key, label]) => (
                <div key={key} className="border border-border rounded-sm bg-secondary/40 p-2 text-center">
                  <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
                  <Input type="number" className="text-center px-1 h-8 text-sm" value={form[key]} onChange={(event) => setNum(key, event.target.value)} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Temp HP"><Input type="number" min={0} value={form.hp_temp} onChange={(event) => setNum("hp_temp", event.target.value)} /></Field>
              <div className="border border-border rounded-sm bg-secondary/40 p-2">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1 text-center">Death Saves</div>
                <div className="flex justify-around text-xs">
                  {[
                    ["Successes", "death_save_successes", "green"],
                    ["Failures", "death_save_failures", "red"],
                  ].map(([label, key, color]) => (
                    <div key={key}>
                      <div className={`${color === "green" ? "text-green-400" : "text-red-400"} text-[9px] mb-1 text-center`}>{label}</div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => set(key, index < (form[key] || 0) ? index : index + 1)} className={`w-5 h-5 rounded-full border-2 ${index < (form[key] || 0) ? (color === "green" ? "bg-green-500 border-green-500" : "bg-red-500 border-red-500") : "border-border"}`} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Saving Throws & Skills</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-border rounded-sm p-3">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Saving Throws</div>
                {ABILITY_SCORES.map((ability) => <SavingThrowRow key={ability} ability={ability} profList={profSaves} abilityScores={form} profBonus={form.proficiency_bonus || 2} onToggle={(value) => toggleCsv("saving_throws", profSaves, value)} />)}
              </div>
              <div className="border border-border rounded-sm p-3">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Skills <span className="normal-case">(circle prof, square expertise)</span></div>
                {ALL_SKILLS.map((skill) => <SkillRow key={skill.name} skill={skill} profList={profSkills} expertiseList={expertSkills} abilityScores={form} profBonus={form.proficiency_bonus || 2} onToggle={(value) => toggleCsv("skills", profSkills, value)} onExpertiseToggle={(value) => toggleCsv("skill_expertises", expertSkills, value)} />)}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Attacks & Weapons</div>
            <RichEditor value={form.attacks} onChange={(value) => set("attacks", value)} placeholder="Longsword: +5 to hit, 1d8+3 slashing" />
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Inventory</div>
            <InventoryManager value={form.inventory} onChange={(value) => set("inventory", value)} />
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Equipment & Currency</div>
            <RichEditor value={form.equipment} onChange={(value) => set("equipment", value)} placeholder="Chain mail, explorer's pack..." />
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                ["cp", "CP"],
                ["sp", "SP"],
                ["ep", "EP"],
                ["gp", "GP"],
                ["pp", "PP"],
              ].map(([key, label]) => (
                <div key={key} className="border border-border rounded-sm bg-secondary/40 p-1.5">
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                  <Input type="number" min={0} className="text-center px-0 h-7 text-xs mt-0.5" value={form[key]} onChange={(event) => setNum(key, event.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Character Details</div>
            <Field label="Personality Traits"><RichEditor value={form.traits} onChange={(value) => set("traits", value)} placeholder="I am always calm..." min={60} /></Field>
            <Field label="Ideals"><RichEditor value={form.ideals} onChange={(value) => set("ideals", value)} placeholder="Honor above all." min={60} /></Field>
            <Field label="Bonds"><RichEditor value={form.bonds} onChange={(value) => set("bonds", value)} placeholder="My village is my home..." min={60} /></Field>
            <Field label="Flaws"><RichEditor value={form.flaws} onChange={(value) => set("flaws", value)} placeholder="Too proud to ask for help." min={60} /></Field>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Features & Languages</div>
            <Field label="Features & Traits"><RichEditor value={form.features_traits} onChange={(value) => set("features_traits", value)} placeholder="Darkvision 60ft" min={120} /></Field>
            <Field label="Languages & Proficiencies"><RichEditor value={form.languages} onChange={(value) => set("languages", value)} placeholder="Common, Elvish; tools..." min={60} /></Field>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Spellcasting</div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Casting Ability">
                <Select value={form.spellcasting_ability || ""} onValueChange={(value) => set("spellcasting_ability", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {ABILITY_SCORES.map((ability) => <SelectItem key={ability} value={ability}>{ABILITY_ABBR[ability]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Save DC"><Input type="number" value={form.spell_save_dc} onChange={(event) => setNum("spell_save_dc", event.target.value)} /></Field>
              <Field label="Attack Bonus"><Input type="number" value={form.spell_attack_bonus} onChange={(event) => setNum("spell_attack_bonus", event.target.value)} /></Field>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Spell Slots (used / total)</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SPELL_LEVELS.map((level) => (
                  <div key={level} className="border border-border rounded-sm bg-secondary/40 p-2 text-center">
                    <div className="text-[8px] uppercase text-muted-foreground mb-1">Level {level}</div>
                    <div className="flex items-center gap-1 justify-center">
                      <Input type="number" min={0} max={9} className="text-center px-0 h-6 text-xs w-8" placeholder="Used" value={spellSlots[level]?.used ?? ""} onChange={(event) => setSlot(level, "used", event.target.value)} />
                      <span className="text-muted-foreground text-xs">/</span>
                      <Input type="number" min={0} max={9} className="text-center px-0 h-6 text-xs w-8" placeholder="Max" value={spellSlots[level]?.total ?? ""} onChange={(event) => setSlot(level, "total", event.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Field label="Spells Known / Prepared"><RichEditor value={form.spells_known} onChange={(value) => set("spells_known", value)} placeholder="Cantrips: Fire Bolt, Mage Hand" min={120} /></Field>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Notes</div>
            <RichEditor value={form.notes} onChange={(value) => set("notes", value)} placeholder="Session notes, backstory..." min={120} />
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Visibility</div>
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => set("visibility", option.value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-sm border text-xs transition-all ${form.visibility === option.value ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-accent/40"}`}>
                  <option.icon className="w-3.5 h-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
            {form.visibility === "specific_players" && (
              <div className="border border-border rounded-sm p-3 space-y-1.5">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Select Players</div>
                {allUsers.length === 0 && <div className="text-xs text-muted-foreground">No players found.</div>}
                {allUsers.map((user) => {
                  const checked = (form.allowed_emails || []).includes(user.email);
                  return (
                    <button key={user.email} type="button" onClick={() => set("allowed_emails", checked ? (form.allowed_emails || []).filter((email) => email !== user.email) : [...(form.allowed_emails || []), user.email])} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <div className={`w-3.5 h-3.5 rounded-sm border-2 shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`} />
                      {user.display_name || user.full_name}
                      <span className="text-[10px] text-muted-foreground ml-auto">{user.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-border sticky bottom-0 bg-background">
          {sheet?.id && sheet.visibility !== "archived" ? (
            <Button variant="ghost" size="sm" onClick={archive} className="text-muted-foreground hover:text-foreground">
              <EyeOff className="w-4 h-4 mr-1.5" /> Archive
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name?.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Character
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
