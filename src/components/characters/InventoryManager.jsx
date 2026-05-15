import React, { useState } from "react";
import { Plus, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const emptyItem = () => ({ name: "", qty: 1, weight: "", equipped: false, notes: "" });

function readItems(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function InventoryManager({ value, onChange, readOnly = false }) {
  const items = readItems(value);
  const [expanded, setExpanded] = useState(null);
  const save = (next) => onChange?.(JSON.stringify(next));

  const update = (index, field, val) => {
    save(items.map((item, idx) => (idx === index ? { ...item, [field]: val } : item)));
  };

  const add = () => {
    save([...items, emptyItem()]);
    setExpanded(items.length);
  };

  const remove = (index) => {
    save(items.filter((_, idx) => idx !== index));
    setExpanded(null);
  };

  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0) * (parseInt(item.qty, 10) || 1), 0);

  if (readOnly) {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Inventory</div>
          {totalWeight > 0 && <div className="text-[10px] text-muted-foreground">{totalWeight.toFixed(1)} lb total</div>}
        </div>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal">Item</th>
                <th className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-12">Qty</th>
                <th className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-16">Wt</th>
                <th className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-normal w-16">Equip</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <React.Fragment key={`${item.name}-${index}`}>
                  <tr className={`border-b border-border/40 last:border-0 ${item.equipped ? "bg-accent/5" : ""}`}>
                    <td className="px-2 py-1.5 font-medium">{item.name || "-"}</td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{item.qty}</td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{item.weight || "-"}</td>
                    <td className="px-2 py-1.5 text-center">{item.equipped && <span className="text-accent text-[10px]">Yes</span>}</td>
                  </tr>
                  {item.notes && (
                    <tr className="border-b border-border/40 last:border-0 bg-secondary/10">
                      <td colSpan={4} className="px-2 pb-1.5 text-muted-foreground italic">
                        {item.notes}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Inventory</span>
          {totalWeight > 0 && <span className="text-[10px] text-muted-foreground ml-1">- {totalWeight.toFixed(1)} lb</span>}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs px-2 gap-1">
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No items yet.</div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
          <div className="grid grid-cols-[1fr_56px_64px_56px_56px] gap-1 px-2 py-1 bg-secondary/40">
            {["Item", "Qty", "Wt", "Equip", ""].map((heading) => (
              <div key={heading} className="text-[9px] uppercase tracking-widest text-muted-foreground text-center first:text-left">
                {heading}
              </div>
            ))}
          </div>

          {items.map((item, index) => (
            <div key={index} className={item.equipped ? "bg-accent/5" : ""}>
              <div className="grid grid-cols-[1fr_56px_64px_56px_56px] gap-1 px-2 py-1.5 items-center">
                <Input value={item.name} onChange={(event) => update(index, "name", event.target.value)} placeholder="Item name" className="h-7 text-xs px-2" />
                <Input type="number" min={1} value={item.qty} onChange={(event) => update(index, "qty", parseInt(event.target.value, 10) || 1)} className="h-7 text-xs px-1 text-center" />
                <Input type="number" min={0} step={0.1} value={item.weight} onChange={(event) => update(index, "weight", event.target.value)} placeholder="0" className="h-7 text-xs px-1 text-center" />
                <div className="flex justify-center">
                  <button type="button" onClick={() => update(index, "equipped", !item.equipped)} className={`w-6 h-6 rounded-sm border-2 transition-colors ${item.equipped ? "bg-accent border-accent" : "border-border"}`} />
                </div>
                <div className="flex gap-0.5 justify-end">
                  <button type="button" onClick={() => setExpanded(expanded === index ? null : index)} className="p-1 text-muted-foreground hover:text-foreground">
                    {expanded === index ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" onClick={() => remove(index)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {expanded === index && (
                <div className="px-2 pb-2">
                  <Input value={item.notes} onChange={(event) => update(index, "notes", event.target.value)} placeholder="Notes, charges, description..." className="h-7 text-xs" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
