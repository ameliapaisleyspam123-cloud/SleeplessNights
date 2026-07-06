import React, { useState, useRef } from "react";
import { X, Dices, ChevronsUp, ChevronsDown, ExternalLink } from "lucide-react";

const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function AnimatedResult({ sides, final, rolling }) {
  const [displayed, setDisplayed] = React.useState(final);
  const frameRef = useRef(null);

  React.useEffect(() => {
    if (!rolling) {
      setDisplayed(final);
      return;
    }
    let count = 0;
    const total = 16;
    const tick = () => {
      count++;
      setDisplayed(rollDie(sides));
      if (count < total) {
        frameRef.current = setTimeout(tick, 40 + count * 6);
      } else {
        setDisplayed(final);
      }
    };
    frameRef.current = setTimeout(tick, 30);
    return () => clearTimeout(frameRef.current);
  }, [rolling, final, sides]);

  return (
    <span
      className={`font-display text-3xl tabular-nums transition-all ${rolling ? "opacity-60 scale-90" : "opacity-100 scale-100"}`}
      style={{ display: "inline-block", minWidth: "2.5rem", textAlign: "center" }}
    >
      {displayed}
    </span>
  );
}

export default function DiceRoller({ onClose, onPopout }) {
  const [results, setResults] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [lastRolled, setLastRolled] = useState(null);
  const [count, setCount] = useState(1);
  const [rollMode, setRollMode] = useState("normal");
  const idRef = useRef(0);

  const toggleMode = (mode) => {
    setRollMode((current) => (current === mode ? "normal" : mode));
  };

  const roll = (sides) => {
    const effectiveCount = rollMode === "normal" ? count : 2;
    const rolls = Array.from({ length: effectiveCount }, () => ({
      sides,
      value: rollDie(sides),
      id: ++idRef.current,
    }));
    const kept = rollMode === "advantage"
      ? Math.max(...rolls.map((item) => item.value))
      : rollMode === "disadvantage"
        ? Math.min(...rolls.map((item) => item.value))
        : rolls.reduce((sum, item) => sum + item.value, 0);
    const newGroup = {
      id: ++idRef.current,
      sides,
      count: effectiveCount,
      requestedCount: count,
      rolls,
      total: kept,
      mode: rollMode,
    };
    setRolling(true);
    setLastRolled(sides);
    setResults((prev) => [newGroup, ...prev].slice(0, 100));
    setTimeout(() => setRolling(false), 700);
  };

  const clearHistory = () => {
    setResults([]);
    setLastRolled(null);
    setRolling(false);
  };

  const latestGroup = results[0];
  const previousResults = results.slice(1);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Dice Roller</span>
        </div>
        <div className="flex items-center gap-2">
          {onPopout && (
            <button onClick={onPopout} className="text-muted-foreground hover:text-accent transition-colors" title="Pop out dice roller">
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" title="Close dice roller">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="px-3 pt-3 pb-2">
        <div className="mb-3 space-y-2 flex flex-col items-center">
          <div className="grid grid-cols-3 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setRollMode("normal")}
              className={`h-8 rounded-sm border text-xs transition-all ${rollMode === "normal" ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => toggleMode("advantage")}
              className={`h-8 rounded-sm border text-xs transition-all flex items-center justify-center gap-1 ${rollMode === "advantage" ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <ChevronsUp className="w-3.5 h-3.5" /> Adv
            </button>
            <button
              type="button"
              onClick={() => toggleMode("disadvantage")}
              className={`h-8 rounded-sm border text-xs transition-all flex items-center justify-center gap-1 ${rollMode === "disadvantage" ? "border-destructive bg-destructive text-destructive-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <ChevronsDown className="w-3.5 h-3.5" /> Dis
            </button>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded text-xs font-medium border transition-all ${
                  count === n ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
                } ${rollMode !== "normal" ? "opacity-50" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            {[6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded text-xs font-medium border transition-all ${
                  count === n ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
                } ${rollMode !== "normal" ? "opacity-50" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {DICE.map((sides) => (
            <button
              key={sides}
              onClick={() => roll(sides)}
              disabled={rolling}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-sm border transition-all text-xs font-medium gap-0.5
                ${
                  lastRolled === sides
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
                }
                ${rolling && lastRolled === sides ? "animate-pulse" : ""}
                disabled:opacity-50`}
            >
              <DiceIcon sides={sides} />
              <span>d{sides}</span>
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="px-3 pb-2">
          <div className="bg-secondary/50 rounded-sm p-3 text-center border border-border/50">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {latestGroup.mode === "advantage" ? `Advantage d${latestGroup.sides}` : latestGroup.mode === "disadvantage" ? `Disadvantage d${latestGroup.sides}` : latestGroup.count > 1 ? `${latestGroup.count}d${latestGroup.sides}` : `d${latestGroup.sides}`}
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {latestGroup.rolls.map((r) => (
                <AnimatedResult key={r.id} sides={r.sides} final={r.value} rolling={rolling} />
              ))}
            </div>
            {latestGroup.mode !== "normal" ? (
              <div className="text-xs text-muted-foreground mt-1">
                Keep {latestGroup.mode === "advantage" ? "highest" : "lowest"}: <span className="text-foreground font-medium">{rolling ? "..." : latestGroup.total}</span>
              </div>
            ) : latestGroup.count > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                Total: <span className="text-foreground font-medium">{rolling ? "..." : latestGroup.total}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Roll History</div>
            <button
              onClick={clearHistory}
              disabled={results.length === 0}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              Clear History
            </button>
          </div>
          <div className="px-3 py-2">
            {previousResults.length === 0 ? (
              <div className="h-full min-h-24 flex items-center justify-center text-center text-xs text-muted-foreground">
                Previous rolls will appear here.
              </div>
            ) : (
              <div className="space-y-1">
                {previousResults.map((group) => (
                <div key={group.id} className="flex items-center justify-between gap-3 text-xs px-2 py-1.5 rounded bg-secondary/30 text-muted-foreground">
                  <span>{group.mode === "advantage" ? `Adv d${group.sides}` : group.mode === "disadvantage" ? `Dis d${group.sides}` : group.count > 1 ? `${group.count}d${group.sides}` : `d${group.sides}`}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {group.mode !== "normal" ? `${group.rolls.map((r) => r.value).join(", ")} -> ${group.total}` : group.count > 1 ? `${group.rolls.map((r) => r.value).join(" + ")} = ${group.total}` : group.total}
                  </span>
                </div>
                ))}
              </div>
            )}
          </div>
      </div>
      </div>
    </div>
  );
}

function DiceIcon({ sides }) {
  const cls = "w-5 h-5 shrink-0";
  switch (sides) {
    case 4:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12,3 22,21 2,21" /></svg>;
    case 6:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
    case 8:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12,2 22,12 12,22 2,12" /></svg>;
    case 10:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12,2 20,8 20,16 12,22 4,16 4,8" /></svg>;
    case 12:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12,2 19,6 22,13 19,20 12,22 5,20 2,13 5,6" /></svg>;
    case 20:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="8" x2="22" y2="8" /><line x1="2" y1="16" x2="22" y2="16" /></svg>;
    case 100:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="5" /></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /></svg>;
  }
}
