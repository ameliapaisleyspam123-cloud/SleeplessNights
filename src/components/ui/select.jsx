import React from "react";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext(null);

export function Select({ value, onValueChange, children }) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children }) {
  return <div className={cn("relative", className)}>{children}</div>;
}

export function SelectValue() {
  return null;
}

export function SelectContent({ className, children }) {
  const context = React.useContext(SelectContext);
  const options = React.Children.toArray(children).filter(Boolean);
  return (
    <select
      className={cn("h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary", className)}
      value={context?.value || ""}
      onChange={(event) => context?.onValueChange?.(event.target.value)}
    >
      {options}
    </select>
  );
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}
