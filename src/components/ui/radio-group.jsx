import React from "react";
import { cn } from "@/lib/utils";

const RadioContext = React.createContext(null);

export function RadioGroup({ value, onValueChange, className, children }) {
  return (
    <RadioContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)}>{children}</div>
    </RadioContext.Provider>
  );
}

export function RadioGroupItem({ value, id, className }) {
  const context = React.useContext(RadioContext);
  return (
    <input
      id={id}
      type="radio"
      value={value}
      checked={context?.value === value}
      onChange={() => context?.onValueChange?.(value)}
      className={cn("h-4 w-4 accent-primary", className)}
    />
  );
}
