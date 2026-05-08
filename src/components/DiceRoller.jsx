import React, { useState, useRef } from "react";
import { X, Dices } from "lucide-react";

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

export default function DiceRoller({ onClose }) {
  const [results, setResults] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [lastRolled, setLastRolled] = useState(null);
  const [count, setCount] = useState(1);
  const idRef = useRef(0);

  const roll = (sides) => {
    const newRolls = Array.from({ length: count }, () => ({
      sides,
      value: rollDie(sides),
      id: ++idRef.current,
    }));
    setRolling(true);
    setLastRolled(sides);
    setResults((prev) => [...newRolls, ...prev].slice(0, 40));
    setTimeout(() => setRolling(false), 700);
  };

  const latestSides = results[0]?.sides;
  const latestGroup = results.filter((r) => r.sides === latestSides && results.indexOf(r) < count);
  const latestTotal = latestGroup.reduce((s, r) => s + r.value, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Dice Roller</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="mb-3 space-y-2 flex flex-col items-center">
          <div className="flex items-center gap-1.5 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded text-xs font-medium border transition-all ${
                  count === n ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
                }`}
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
                }`}
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
        <div className="px-3 pb-2 shrink-0">
          <div className="bg-secondary/50 rounded-sm p-3 text-center border border-border/50">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{count > 1 ? `${count}d${latestSides}` : `d${latestSides}`}</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {latestGroup.map((r) => (
                <AnimatedResult key={r.id} sides={r.sides} final={r.value} rolling={rolling} />
              ))}
            </div>
            {count > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                Total: <span className="text-foreground font-medium">{rolling ? "..." : latestTotal}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">History</div>
            <button onClick={() => setResults([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll px-3 py-2">
            <div className="space-y-1">
              {results.slice(count).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-secondary/30 text-muted-foreground">
                  <span>d{r.sides}</span>
                  <span className="font-medium text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
