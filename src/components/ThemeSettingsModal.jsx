import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_THEME, THEME_COLOR_FIELDS, THEME_PRESETS, getStoredTheme, saveTheme } from "@/lib/theme";

const PRESET_GROUPS = [
  ["light", "Light"],
  ["dark", "Dark"],
];

function storedToState() {
  const stored = getStoredTheme();
  if (stored?.presetId === "custom") return { presetId: "custom", colors: { ...DEFAULT_THEME.colors, ...stored.colors } };
  return { presetId: stored?.presetId || stored?.id || DEFAULT_THEME.id, colors: { ...DEFAULT_THEME.colors } };
}

export default function ThemeSettingsModal({ open, onOpenChange }) {
  const [theme, setTheme] = useState(storedToState);

  useEffect(() => {
    if (open) setTheme(storedToState());
  }, [open]);

  const selectPreset = (preset) => {
    setTheme({ presetId: preset.id, colors: { ...preset.colors } });
    saveTheme({ presetId: preset.id });
  };

  const setCustomColor = (key, value) => {
    const next = { presetId: "custom", colors: { ...theme.colors, [key]: value } };
    setTheme(next);
    saveTheme(next);
  };

  const saveCustom = () => {
    saveTheme({ presetId: "custom", name: "Custom", colors: theme.colors });
    onOpenChange(false);
  };

  const renderPreset = (preset) => (
    <button
      key={preset.id}
      type="button"
      onClick={() => selectPreset(preset)}
      className={`text-left rounded-sm border p-3 transition-all ${theme.presetId === preset.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/60 bg-card/50"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{preset.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {["background", "card", "primary", "accent"].map((key) => (
            <span key={key} className="w-5 h-5 rounded-sm border border-border" style={{ background: preset.colors[key] }} />
          ))}
        </div>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Colour Scheme</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <div className="text-[10px] uppercase tracking-widest text-accent font-medium mb-3">Presets</div>
            <div className="grid md:grid-cols-2 gap-4">
              {PRESET_GROUPS.map(([mode, label]) => (
                <div key={mode} className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="space-y-2">
                    {THEME_PRESETS.filter((preset) => preset.mode === mode).map(renderPreset)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border rounded-sm bg-card/45 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Custom Scheme</div>
                <p className="text-sm text-muted-foreground mt-1">Pick your own colors. Changes preview immediately and are saved on this device.</p>
              </div>
              <Button size="sm" onClick={saveCustom}>Done</Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEME_COLOR_FIELDS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-3 rounded-sm border border-border bg-background/50 p-2">
                  <input
                    type="color"
                    value={theme.colors[key] || DEFAULT_THEME.colors[key]}
                    onChange={(event) => setCustomColor(key, event.target.value)}
                    className="w-10 h-10 rounded-sm border border-border bg-transparent shrink-0"
                    aria-label={label}
                  />
                  <div className="min-w-0">
                    <Label className="text-xs">{label}</Label>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{theme.colors[key] || DEFAULT_THEME.colors[key]}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
