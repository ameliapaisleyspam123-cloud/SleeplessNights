import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>,
    document.body,
  );
}

export function DialogContent({ className, children }) {
  return (
    <div className={cn("relative z-10 w-full max-w-lg rounded-sm border border-border bg-background p-6 shadow-2xl", className)}>
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-xl font-semibold", className)} {...props} />;
}

export function DialogClose({ onClick }) {
  return (
    <button className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={onClick}>
      <X className="h-4 w-4" />
    </button>
  );
}
