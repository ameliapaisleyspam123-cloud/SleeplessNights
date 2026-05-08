import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Swords,
  Plus,
  ChevronUp,
  ChevronDown,
  SkipForward,
  SkipBack,
  Trash2,
  Users,
  User,
  Clock,
  Zap,
  X,
  Play,
  Square,
  Group,
  Ungroup,
} from "lucide-react";

const SPELL_DURATIONS = [
  { label: "1 round (6s)", rounds: 1 },
  { label: "1 minute (10 rounds)", rounds: 10 },
  { label: "10 minutes (100 rounds)", rounds: 100 },
  { label: "1 hour (600 rounds)", rounds: 600 },
  { label: "8 hours (4800 rounds)", rounds: 4800 },
  { label: "24 hours", rounds: 14400 },
  { label: "Concentration (up to 1 min)", rounds: 10 },
  { label: "Concentration (up to 10 min)", rounds: 100 },
  { label: "Concentration (up to 1 hr)", rounds: 600 },
];

function formatRoundsLeft(rounds, turnSecs) {
  const secs = rounds * turnSecs;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}min`;
  return `${(secs / 3600).toFixed(1)}hr`;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-display text-lg">{title}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function InitiativeTracker({ campaignId, splitscreen = false }) {
  const [combat, setCombat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [groupModal, setGroupModal] = useState(null);
  const [spellModal, setSpellModal] = useState(false);
  const [setupModal, setSetupModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", roll: "", modifier: "0", isGroup: false, groupSize: 2 });
  const [spellForm, setSpellForm] = useState({ name: "", casterName: "", duration: 10 });
  const [setupSeconds, setSetupSeconds] = useState(6);

  const loadCombat = useCallback(async () => {
    if (!campaignId) return;
    const list = await base44.entities.Initiative.filter({ campaign_id: campaignId }, "-updated_date", 1);
    if (list[0]) setCombat(list[0]);
    else setCombat(null);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    loadCombat();
  }, [loadCombat]);

  useEffect(() => {
    const unsub = base44.entities.Initiative.subscribe(() => loadCombat());
    return () => unsub();
  }, [loadCombat]);

  const save = async (patch) => {
    if (combat?.id) {
      const updated = await base44.entities.Initiative.update(combat.id, patch);
      setCombat(updated);
    } else {
      const created = await base44.entities.Initiative.create({ campaign_id: campaignId, ...patch });
      setCombat(created);
    }
  };

  const startCombat = async () => {
    setSetupModal(true);
  };

  const confirmStart = async () => {
    setSetupModal(false);
    await save({
      active: true,
      round: 1,
      current_turn_index: 0,
      turn_seconds: setupSeconds,
      entries: [],
      spells: [],
    });
  };

  const stopCombat = async () => {
    await save({ active: false, entries: [], spells: [], round: 1, current_turn_index: 0 });
  };

  const entries = combat?.entries || [];
  const currentIndex = combat?.current_turn_index ?? 0;
  const round = combat?.round ?? 1;
  const turnSecs = combat?.turn_seconds ?? 6;
  const spells = combat?.spells || [];

  const updateEntries = (newEntries) => save({ entries: newEntries });

  const nextTurn = async () => {
    let next = currentIndex + 1;
    let newRound = round;
    if (next >= entries.length) {
      next = 0;
      newRound = round + 1;
    }
    let newSpells = spells;
    if (next === 0) {
      newSpells = spells.map((sp) => ({ ...sp, roundsLeft: sp.roundsLeft - 1 })).filter((sp) => sp.roundsLeft > 0);
    }
    await save({ current_turn_index: next, round: newRound, spells: newSpells });
  };

  const prevTurn = async () => {
    let prev = currentIndex - 1;
    let newRound = round;
    if (prev < 0) {
      prev = entries.length - 1;
      newRound = Math.max(1, round - 1);
    }
    await save({ current_turn_index: prev, round: newRound });
  };

  const moveEntry = (index, dir) => {
    const arr = [...entries];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    let newCurrent = currentIndex;
    if (currentIndex === index) newCurrent = target;
    else if (currentIndex === target) newCurrent = index;
    save({ entries: arr, current_turn_index: newCurrent });
  };

  const removeEntry = (index) => {
    const arr = entries.filter((_, i) => i !== index);
    let newCurrent = currentIndex;
    if (index < currentIndex) newCurrent = currentIndex - 1;
    if (newCurrent >= arr.length) newCurrent = 0;
    save({ entries: arr, current_turn_index: newCurrent });
  };

  const addEntry = () => {
    const roll = addForm.roll !== "" ? Number(addForm.roll) : Math.floor(Math.random() * 20) + 1;
    const mod = Number(addForm.modifier) || 0;
    const entry = {
      id: `manual_${Date.now()}`,
      name: addForm.name || "Unknown",
      roll,
      modifier: mod,
      total: roll + mod,
      isGroup: addForm.isGroup,
      groupSize: addForm.isGroup ? Number(addForm.groupSize) : 1,
      type: "manual",
      ownerEmail: "",
      image_url: "",
    };
    const arr = [...entries, entry].sort((a, b) => b.total - a.total);
    updateEntries(arr);
    setAddModal(false);
    setAddForm({ name: "", roll: "", modifier: "0", isGroup: false, groupSize: 2 });
  };

  const groupWith = (indexA, indexB) => {
    const arr = [...entries];
    const a = arr[indexA];
    const b = arr[indexB];
    const merged = {
      ...a,
      name: `${a.name} + ${b.name}`,
      isGroup: true,
      groupSize: (a.groupSize || 1) + (b.groupSize || 1),
      members: [...(a.members || [a.name]), ...(b.members || [b.name])],
    };
    arr.splice(indexA, 1, merged);
    arr.splice(indexA < indexB ? indexB - 1 : indexB, 1);
    let newCurrent = currentIndex;
    if (currentIndex === indexB) newCurrent = indexA;
    save({ entries: arr, current_turn_index: Math.min(newCurrent, arr.length - 1) });
    setGroupModal(null);
  };

  const splitGroup = (index) => {
    const arr = [...entries];
    const entry = arr[index];
    if (!entry.isGroup || !entry.members) return;
    const splits = entry.members.map((name, i) => ({
      ...entry,
      name,
      isGroup: false,
      groupSize: 1,
      members: undefined,
      id: `${entry.id}_split_${i}`,
    }));
    arr.splice(index, 1, ...splits);
    updateEntries(arr);
  };

  const addSpell = () => {
    const newSpell = {
      id: Date.now(),
      name: spellForm.name,
      casterName: spellForm.casterName,
      roundsLeft: Number(spellForm.duration),
      roundsTotal: Number(spellForm.duration),
    };
    save({ spells: [...spells, newSpell] });
    setSpellModal(false);
    setSpellForm({ name: "", casterName: "", duration: 10 });
  };

  const removeSpell = (id) => {
    save({ spells: spells.filter((s) => s.id !== id) });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading combat...</div>;

  return (
    <div className={`flex flex-col gap-4 ${splitscreen ? "h-full overflow-y-auto thin-scroll" : ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Swords className="w-5 h-5 text-accent" />
          <span className="font-display text-2xl">Initiative Tracker</span>
          {combat?.active && (
            <>
              <span className="text-[10px] uppercase tracking-widest text-accent border border-accent/40 px-2 py-0.5 rounded-sm">
                Round {round}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {turnSecs}s / turn
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!combat?.active ? (
            <Button onClick={startCombat} className="gap-2">
              <Play className="w-4 h-4" /> Start Combat
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setSpellModal(true)} className="gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Track Spell
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddModal(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </Button>
              <Button variant="destructive" size="sm" onClick={stopCombat} className="gap-1.5">
                <Square className="w-3.5 h-3.5" /> End Combat
              </Button>
            </>
          )}
        </div>
      </div>

      {!combat?.active && (
        <div className="text-center py-20 border border-dashed border-border rounded-sm">
          <Swords className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" strokeWidth={1} />
          <div className="font-display text-xl text-foreground/70">No combat active.</div>
          <p className="text-sm text-muted-foreground mt-1">Start combat to roll initiative for all characters.</p>
          <Button className="mt-4" onClick={startCombat}>
            <Play className="w-4 h-4 mr-2" /> Begin Combat
          </Button>
        </div>
      )}

      {combat?.active && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium mb-3">Turn Order</div>

            {entries.map((entry, i) => {
              const isCurrent = i === currentIndex;
              return (
                <div
                  key={entry.id || i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-all ${
                    isCurrent ? "border-accent bg-accent/10 sculk-glow" : "border-border bg-card/50 opacity-80"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>

                  {entry.image_url ? (
                    <img src={entry.image_url} alt="" className="w-8 h-8 rounded-sm object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
                      {entry.isGroup ? <Users className="w-4 h-4 text-muted-foreground" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isCurrent ? "text-accent" : ""}`}>{entry.name}</span>
                      {entry.isGroup && (
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border px-1 rounded-sm shrink-0">
                          Group x{entry.groupSize}
                        </span>
                      )}
                      {isCurrent && <span className="text-[9px] uppercase tracking-widest text-accent shrink-0">Active</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Initiative: <span className="text-foreground font-medium">{entry.total}</span>
                      <span className="ml-2 opacity-60">
                        (d20:{entry.roll} + {entry.modifier >= 0 ? "+" : ""}
                        {entry.modifier})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveEntry(i, -1)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveEntry(i, 1)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {entry.isGroup ? (
                      <button onClick={() => splitGroup(i)} title="Split group" className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-accent transition-colors">
                        <Ungroup className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => setGroupModal(i)} title="Group with another" className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-accent transition-colors">
                        <Group className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => removeEntry(i)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {entries.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-sm">No combatants. Add an entry above.</div>}

            {entries.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={prevTurn} className="gap-1.5">
                  <SkipBack className="w-4 h-4" /> Previous
                </Button>
                <Button size="sm" onClick={nextTurn} className="gap-1.5 flex-1">
                  <SkipForward className="w-4 h-4" /> Next Turn
                </Button>
              </div>
            )}
          </div>

          <div className="lg:w-64 shrink-0 space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Spell Durations</div>
            {spells.length === 0 && <p className="text-xs text-muted-foreground">No active spells.</p>}
            {spells.map((sp) => {
              const pct = (sp.roundsLeft / sp.roundsTotal) * 100;
              return (
                <div key={sp.id} className="border border-border rounded-sm bg-card/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{sp.name}</span>
                    <button onClick={() => removeSpell(sp.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {sp.casterName && <div className="text-[10px] text-muted-foreground mb-1.5">{sp.casterName}</div>}
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 50 ? "bg-accent" : pct > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {sp.roundsLeft} / {sp.roundsTotal} rounds - {formatRoundsLeft(sp.roundsLeft, turnSecs)} left
                  </div>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setSpellModal(true)}>
              <Zap className="w-3.5 h-3.5" /> Add Spell Duration
            </Button>
          </div>
        </div>
      )}

      <Modal open={setupModal} onClose={() => setSetupModal(false)} title="Start Combat">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Initiative will be auto-rolled for all active characters. You can adjust the order afterward.</p>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Seconds per turn</label>
            <div className="flex gap-2 flex-wrap">
              {[6, 10, 12, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => setSetupSeconds(s)}
                  className={`px-3 py-2 rounded-sm border text-sm transition-all ${setupSeconds === s ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {s}s
                </button>
              ))}
              <Input type="number" min={1} className="w-20 h-9 text-sm" value={setupSeconds} onChange={(e) => setSetupSeconds(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSetupModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmStart}>
              <Play className="w-4 h-4 mr-1.5" /> Begin
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Combatant">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Name</label>
            <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Goblin, Dragon..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">d20 Roll (blank = random)</label>
              <Input type="number" value={addForm.roll} onChange={(e) => setAddForm((f) => ({ ...f, roll: e.target.value }))} placeholder="-" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Modifier</label>
              <Input type="number" value={addForm.modifier} onChange={(e) => setAddForm((f) => ({ ...f, modifier: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddForm((f) => ({ ...f, isGroup: !f.isGroup }))}
              className={`w-4 h-4 rounded border-2 transition-colors ${addForm.isGroup ? "bg-accent border-accent" : "border-border"}`}
            />
            <span className="text-sm">This is a group</span>
          </div>
          {addForm.isGroup && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Group size</label>
              <Input type="number" min={2} value={addForm.groupSize} onChange={(e) => setAddForm((f) => ({ ...f, groupSize: e.target.value }))} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={addEntry} disabled={!addForm.name.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={groupModal !== null} onClose={() => setGroupModal(null)} title="Group with another combatant">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            Select a combatant to merge with <strong>{entries[groupModal]?.name}</strong>.
          </p>
          {entries.map((e, i) => {
            if (i === groupModal) return null;
            return (
              <button
                key={i}
                onClick={() => groupWith(groupModal, i)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-sm border border-border hover:border-accent hover:bg-accent/10 transition-all text-left text-sm"
              >
                <span className="flex-1">{e.name}</span>
                <span className="text-muted-foreground text-xs">Init {e.total}</span>
              </button>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setGroupModal(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={spellModal} onClose={() => setSpellModal(false)} title="Track Spell Duration">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Spell name</label>
            <Input value={spellForm.name} onChange={(e) => setSpellForm((f) => ({ ...f, name: e.target.value }))} placeholder="Hold Person, Bless..." />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Caster</label>
            <Input value={spellForm.casterName} onChange={(e) => setSpellForm((f) => ({ ...f, casterName: e.target.value }))} placeholder="Character name..." />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Duration</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto thin-scroll">
              {SPELL_DURATIONS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setSpellForm((f) => ({ ...f, duration: d.rounds }))}
                  className={`flex items-center justify-between px-3 py-2 rounded-sm border text-sm text-left transition-all ${spellForm.duration === d.rounds ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <span>{d.label}</span>
                  <span className="text-xs opacity-60">{d.rounds} rounds</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">Custom (rounds):</label>
              <Input type="number" min={1} className="h-8 text-sm" value={spellForm.duration} onChange={(e) => setSpellForm((f) => ({ ...f, duration: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setSpellModal(false)}>
              Cancel
            </Button>
            <Button onClick={addSpell} disabled={!spellForm.name.trim()}>
              <Zap className="w-4 h-4 mr-1" /> Track
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
