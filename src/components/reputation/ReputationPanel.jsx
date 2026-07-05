import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appClient } from "@/api/appClient";
import { isDmUser } from "@/lib/visibility";
import { makeOpinionId, normalizeReputation, REPUTATION_VALUES } from "@/lib/reputation";

const VALUE_LABELS = {
  "-3": "Dire",
  "-2": "Poor",
  "-1": "Wary",
  0: "Even",
  1: "Warm",
  2: "Strong",
  3: "Devoted",
};

function ValueSelect({ value, onChange, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {REPUTATION_VALUES.map((option) => (
        <option key={option} value={option}>
          {option > 0 ? `+${option}` : option} {VALUE_LABELS[option]}
        </option>
      ))}
    </select>
  );
}

function ReputationGrid({ grid, editing, onGridChange }) {
  const markerLeft = `${((grid.x + 3) / 6) * 100}%`;
  const markerBottom = `${((grid.y + 3) / 6) * 100}%`;
  const gridValues = REPUTATION_VALUES;
  const axisLabels = [
    { key: "yMaxLabel", className: "top-3 left-1/2 -translate-x-1/2 text-center" },
    { key: "xMinLabel", className: "left-3 top-1/2 -translate-y-1/2 max-w-[34%]" },
    { key: "xMaxLabel", className: "right-3 top-1/2 -translate-y-1/2 max-w-[34%] text-right" },
    { key: "yMinLabel", className: "bottom-3 left-1/2 -translate-x-1/2 text-center" },
  ];

  return (
    <section className="border border-border bg-card/70 rounded-sm p-3 md:p-4 min-w-0 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">Party Reputation</h2>
          <p className="text-sm text-muted-foreground mt-1">Current standing: x {grid.x > 0 ? `+${grid.x}` : grid.x}, y {grid.y > 0 ? `+${grid.y}` : grid.y}</p>
        </div>
        {editing && (
          <div className="flex gap-2 shrink-0">
            <ValueSelect value={grid.x} label="Reputation x value" onChange={(value) => onGridChange({ x: value })} />
            <ValueSelect value={grid.y} label="Reputation y value" onChange={(value) => onGridChange({ y: value })} />
          </div>
        )}
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[24rem] rounded-sm border border-accent/40 bg-background/60 overflow-hidden">
        <div className="absolute inset-x-11 top-12 bottom-10">
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-45">
            {Array.from({ length: 36 }).map((_, index) => (
              <div key={index} className="border-r border-b border-accent/20" />
            ))}
          </div>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-accent/70" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-accent/70" />
          {gridValues.map((value) => {
            const position = `${((value + 3) / 6) * 100}%`;
            const label = value > 0 ? `+${value}` : String(value);

            return (
              <React.Fragment key={value}>
                <span
                  className="absolute bottom-1 -translate-x-1/2 rounded-sm bg-background/80 px-1 text-[10px] tabular-nums text-muted-foreground"
                  style={{ left: position }}
                >
                  {label}
                </span>
                <span
                  className="absolute left-1 translate-y-1/2 rounded-sm bg-background/80 px-1 text-[10px] tabular-nums text-muted-foreground"
                  style={{ bottom: position }}
                >
                  {label}
                </span>
              </React.Fragment>
            );
          })}
          <div
            className="absolute w-5 h-5 -ml-2.5 -mb-2.5 rounded-full border-2 border-accent bg-primary shadow-[0_0_22px_hsl(var(--accent)/0.75)]"
            style={{ left: markerLeft, bottom: markerBottom }}
            title={`x ${grid.x}, y ${grid.y}`}
          />
        </div>
        {axisLabels.map((item) => (
          <div key={item.key} className={`absolute z-10 rounded-sm border border-border/70 bg-card/95 px-2 py-0.5 text-xs font-medium leading-tight text-foreground shadow-sm ${item.className}`}>
            {grid[item.key]}
          </div>
        ))}
      </div>

      {editing && (
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {[
            ["xMinLabel", "X Negative"],
            ["xMaxLabel", "X Positive"],
            ["yMinLabel", "Y Negative"],
            ["yMaxLabel", "Y Positive"],
          ].map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input className="mt-1.5" value={grid[key]} onChange={(event) => onGridChange({ [key]: event.target.value })} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function OpinionTrack({ opinion, editing, onChange, onRemove }) {
  const percent = ((opinion.value + 3) / 6) * 100;

  return (
    <div className="border border-border bg-card/70 rounded-sm p-3 min-h-[7rem] lg:min-h-0 lg:h-full lg:flex lg:flex-col lg:justify-center">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={opinion.name} onChange={(event) => onChange({ name: event.target.value })} aria-label="Opinion name" />
          ) : (
            <div className="font-display text-xl text-foreground truncate">{opinion.name}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">Standing {opinion.value > 0 ? `+${opinion.value}` : opinion.value}</div>
        </div>
        {editing && (
          <div className="flex items-center gap-2 shrink-0">
            <ValueSelect value={opinion.value} label={`${opinion.name} opinion value`} onChange={(value) => onChange({ value })} />
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} title={`Remove ${opinion.name}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="relative h-2 rounded-sm bg-background border border-border overflow-visible">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-muted-foreground/40" />
          <div className="absolute -top-1.5 w-5 h-5 -ml-2.5 rounded-full border-2 border-accent bg-primary shadow-[0_0_14px_hsl(var(--accent)/0.55)]" style={{ left: `${percent}%` }} />
        </div>
        <div className="flex justify-between gap-3 mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="tabular-nums">-3</span>
          <span className="tabular-nums">+3</span>
        </div>
      </div>
    </div>
  );
}

export default function ReputationPanel({ user, campaign }) {
  const [draft, setDraft] = useState(() => normalizeReputation());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEdit = useMemo(() => isDmUser(user) || user?.role === "admin", [user]);

  useEffect(() => {
    setDraft(normalizeReputation(campaign?.reputation));
    setEditing(false);
  }, [campaign?.id, campaign?.reputation]);

  const updateGrid = (patch) => {
    setDraft((current) => normalizeReputation({ ...current, grid: { ...current.grid, ...patch } }));
  };

  const updateOpinion = (id, patch) => {
    setDraft((current) =>
      normalizeReputation({
        ...current,
        opinions: current.opinions.map((opinion) => (opinion.id === id ? { ...opinion, ...patch } : opinion)),
      }),
    );
  };

  const addOpinion = () => {
    const name = "New Faction";
    setDraft((current) =>
      normalizeReputation({
        ...current,
        opinions: [
          ...current.opinions,
          { id: makeOpinionId(name), name, value: 0, minLabel: "-3", maxLabel: "+3" },
        ],
      }),
    );
  };

  const removeOpinion = (id) => {
    setDraft((current) => normalizeReputation({ ...current, opinions: current.opinions.filter((opinion) => opinion.id !== id) }));
  };

  const save = async () => {
    if (!campaign?.id) return;
    setSaving(true);
    await appClient.entities.Campaign.update(campaign.id, { reputation: normalizeReputation(draft) });
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(normalizeReputation(campaign?.reputation));
    setEditing(false);
  };

  return (
    <section className="mb-7 md:mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-accent font-medium mb-2">Party Standing</div>
          <h2 className="font-display text-3xl text-foreground leading-tight">Reputation</h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">The party's public standing and the factions watching their every move.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button type="button" variant="outline" onClick={cancel}>Cancel</Button>
                <Button type="button" onClick={save} disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? "Saving" : "Save"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(20rem,0.95fr)_minmax(20rem,1.05fr)] lg:items-stretch">
        <ReputationGrid grid={draft.grid} editing={editing} onGridChange={updateGrid} />

        <section className="min-w-0 h-full flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="font-display text-2xl text-foreground">Opinions</h3>
              <p className="text-sm text-muted-foreground mt-1">Faction feelings on a -3 to +3 scale.</p>
            </div>
            {editing && (
              <Button type="button" variant="outline" size="sm" onClick={addOpinion}>
                <Plus className="w-4 h-4" />
                Add
              </Button>
            )}
          </div>
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-rows-4 lg:gap-2 lg:flex-1">
            {draft.opinions.map((opinion) => (
              <OpinionTrack
                key={opinion.id}
                opinion={opinion}
                editing={editing}
                onChange={(patch) => updateOpinion(opinion.id, patch)}
                onRemove={() => removeOpinion(opinion.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
