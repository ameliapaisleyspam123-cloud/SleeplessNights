import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Eye, Lock, EyeOff, Users } from "lucide-react";

const ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];
const ABILITY_SCORES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const ABILITY_ABBR = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };

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
  const m = Math.floor(((value || 10) - 10) / 2);
  const fmt = m >= 0 ? `+${m}` : `${m}`;
  return (
    <div className="flex flex-col items-center border border-border rounded-sm bg-secondary/40 py-3 px-1 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold text-accent">{fmt}</div>
      <Input type="number" min={1} max={30} className="text-center px-1 h-7 text-sm mt-1 w-full" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
    </div>
  );
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Eye },
  { value: "specific_players", label: "Specific Players", icon: Users },
  { value: "dm_only", label: "DM Only", icon: Lock },
  { value: "archived", label: "Archived", icon: EyeOff },
];

export default function CharacterSheetEditor({ open, onOpenChange, sheet, onSaved }) {
  const [form, setForm] = useState(defaultForm());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(sheet ? { ...defaultForm(), ...sheet } : defaultForm());
      base44.entities.User.list("-created_date", 200)
        .then((u) => setAllUsers(u.filter((x) => x.role !== "admin")))
        .catch(() => {});
    }
  }, [open, sheet]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setNum = (k, v) => set(k, v === "" ? "" : Number(v));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploading(false);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    if (sheet?.id) {
      await base44.entities.CharacterSheet.update(sheet.id, form);
    } else {
      const u = await base44.auth.me().catch(() => null);
      await base44.entities.CharacterSheet.create({ ...form, campaign_id: u?.campaign_id });
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const archive = async () => {
    if (!sheet?.id) return;
    await base44.entities.CharacterSheet.update(sheet.id, { visibility: "archived" });
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
                <div className="col-span-2"><Field label="Character Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Aelindra..." /></Field></div>
                <div className="col-span-2"><Field label="Folder"><Input value={form.folder || ""} onChange={(e) => set("folder", e.target.value)} placeholder="Players/NPCs/Villains" /></Field></div>
                <Field label="Race"><Input value={form.race} onChange={(e) => set("race", e.target.value)} /></Field>
                <Field label="Class"><Input value={form.class} onChange={(e) => set("class", e.target.value)} /></Field>
                <Field label="Subclass"><Input value={form.subclass} onChange={(e) => set("subclass", e.target.value)} /></Field>
                <Field label="Background"><Input value={form.background} onChange={(e) => set("background", e.target.value)} /></Field>
                <Field label="Alignment">
                  <Select value={form.alignment} onValueChange={(v) => set("alignment", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ALIGNMENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Level"><Input type="number" min={1} max={20} value={form.level} onChange={(e) => setNum("level", e.target.value)} /></Field>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Ability Scores</div>
            <div className="grid grid-cols-6 gap-2">
              {ABILITY_SCORES.map((s) => <AbilityBox key={s} label={ABILITY_ABBR[s]} value={form[s]} onChange={(v) => setNum(s, v)} />)}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Combat Stats</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[["ac", "AC"], ["initiative", "Initiative"], ["speed", "Speed"], ["proficiency_bonus", "Prof"], ["hp_max", "HP Max"], ["hp_current", "HP Current"]].map(([k, label]) => (
                <div key={k} className="border border-border rounded-sm bg-secondary/40 p-2 text-center">
                  <div className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
                  <Input type="number" className="text-center px-1 h-8 text-sm" value={form[k]} onChange={(e) => setNum(k, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          {["attacks", "equipment", "features_traits", "languages", "spells_known", "notes"].map((key) => (
            <Field key={key} label={key.replace(/_/g, " ")}>
              <Textarea value={form[key] || ""} onChange={(e) => set(key, e.target.value)} className="min-h-[90px]" />
            </Field>
          ))}

          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Visibility</div>
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("visibility", opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-sm border text-xs transition-all ${form.visibility === opt.value ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-accent/40"}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
            {form.visibility === "specific_players" && (
              <div className="border border-border rounded-sm p-3 space-y-1.5">
                {allUsers.map((u) => {
                  const checked = (form.allowed_emails || []).includes(u.email);
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => set("allowed_emails", checked ? (form.allowed_emails || []).filter((e) => e !== u.email) : [...(form.allowed_emails || []), u.email])}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border-2 shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`} />
                      {u.display_name || u.full_name}
                      <span className="text-[10px] text-muted-foreground ml-auto">{u.email}</span>
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
