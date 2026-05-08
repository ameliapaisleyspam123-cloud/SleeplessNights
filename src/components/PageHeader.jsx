import React from "react";

export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && <div className="text-[10px] uppercase tracking-[0.28em] text-accent font-medium mb-3">{eyebrow}</div>}
          <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed">{description}</p>}
        </div>
        {action}
      </div>
      <div className="ink-divider mt-8" />
    </div>
  );
}
