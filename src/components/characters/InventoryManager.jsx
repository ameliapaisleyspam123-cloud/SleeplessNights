import React, { useState } from "react";
import { Briefcase, ChevronDown, ChevronUp, Package, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const entryId = () => `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const emptyItem = () => ({ id: entryId(), name: "", qty: 1, weight: "", equipped: false, notes: "" });
const emptyContainer = () => ({ id: entryId(), type: "container", name: "Backpack", notes: "", items: [] });
const isContainer = (entry) => entry?.type === "container";

function normalizeItem(item = {}) {
  return { ...emptyItem(), ...item, type: undefined, items: undefined };
}

function normalizeContainer(container = {}) {
  return {
    id: container.id || entryId(),
    type: "container",
    name: container.name || "Container",
    notes: container.notes || "",
    items: Array.isArray(container.items) ? container.items.map(normalizeItem) : [],
  };
}

function readItems(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => (isContainer(entry) ? normalizeContainer(entry) : normalizeItem(entry)));
  } catch {
    return [];
  }
}

function itemWeight(item) {
  return (parseFloat(item.weight) || 0) * (parseInt(item.qty, 10) || 1);
}

function entryWeight(entry) {
  if (isContainer(entry)) return entry.items.reduce((sum, item) => sum + itemWeight(item), 0);
  return itemWeight(entry);
}

function InventoryTable({ items, expandedKey, makeKey, onToggle, readOnly = false, onUpdate, onRemove }) {
  if (items.length === 0) return null;

  if (readOnly) {
    return (
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
              <React.Fragment key={item.id || `${item.name}-${index}`}>
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
    );
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
      <div className="grid grid-cols-[1fr_56px_64px_56px_56px] gap-1 px-2 py-1 bg-secondary/40">
        {["Item", "Qty", "Wt", "Equip", ""].map((heading) => (
          <div key={heading} className="text-[9px] uppercase tracking-widest text-muted-foreground text-center first:text-left">
            {heading}
          </div>
        ))}
      </div>
      {items.map((item, index) => {
        const key = makeKey(index);
        return (
          <div key={item.id || index} className={item.equipped ? "bg-accent/5" : ""}>
            <div className="grid grid-cols-[1fr_56px_64px_56px_56px] gap-1 px-2 py-1.5 items-center">
              <Input value={item.name} onChange={(event) => onUpdate(index, "name", event.target.value)} placeholder="Item name" className="h-7 text-xs px-2" />
              <Input type="number" min={1} value={item.qty} onChange={(event) => onUpdate(index, "qty", parseInt(event.target.value, 10) || 1)} className="h-7 text-xs px-1 text-center" />
              <Input type="number" min={0} step={0.1} value={item.weight} onChange={(event) => onUpdate(index, "weight", event.target.value)} placeholder="0" className="h-7 text-xs px-1 text-center" />
              <div className="flex justify-center">
                <button type="button" onClick={() => onUpdate(index, "equipped", !item.equipped)} className={`w-6 h-6 rounded-sm border-2 transition-colors ${item.equipped ? "bg-accent border-accent" : "border-border"}`} />
              </div>
              <div className="flex gap-0.5 justify-end">
                <button type="button" onClick={() => onToggle(key)} className="p-1 text-muted-foreground hover:text-foreground">
                  {expandedKey === key ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => onRemove(index)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {expandedKey === key && (
              <div className="px-2 pb-2">
                <Input value={item.notes} onChange={(event) => onUpdate(index, "notes", event.target.value)} placeholder="Notes, charges, description..." className="h-7 text-xs" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function InventoryManager({ value, onChange, readOnly = false }) {
  const entries = readItems(value);
  const looseItems = entries.filter((entry) => !isContainer(entry));
  const containers = entries.filter(isContainer);
  const [expanded, setExpanded] = useState(null);
  const save = (next) => onChange?.(JSON.stringify(next));
  const toggleExpanded = (key) => setExpanded((current) => (current === key ? null : key));

  const updateEntry = (index, field, val) => {
    save(entries.map((entry, idx) => (idx === index ? { ...entry, [field]: val } : entry)));
  };

  const addLooseItem = () => {
    save([...entries, emptyItem()]);
    setExpanded(`loose-${looseItems.length}`);
  };

  const removeLooseItem = (looseIndex) => {
    let seen = -1;
    save(entries.filter((entry) => {
      if (isContainer(entry)) return true;
      seen += 1;
      return seen !== looseIndex;
    }));
    setExpanded(null);
  };

  const updateLooseItem = (looseIndex, field, val) => {
    let seen = -1;
    save(entries.map((entry) => {
      if (isContainer(entry)) return entry;
      seen += 1;
      return seen === looseIndex ? { ...entry, [field]: val } : entry;
    }));
  };

  const addContainer = () => {
    save([...entries, emptyContainer()]);
  };

  const removeContainer = (containerId) => {
    save(entries.filter((entry) => entry.id !== containerId));
    setExpanded(null);
  };

  const addContainedItem = (containerId) => {
    const next = entries.map((entry) => (entry.id === containerId ? { ...entry, items: [...entry.items, emptyItem()] } : entry));
    save(next);
    const containerIndex = containers.findIndex((container) => container.id === containerId);
    const container = containers[containerIndex];
    setExpanded(`container-${containerIndex}-${container?.items.length || 0}`);
  };

  const updateContainedItem = (containerId, itemIndex, field, val) => {
    save(entries.map((entry) =>
      entry.id === containerId
        ? { ...entry, items: entry.items.map((item, idx) => (idx === itemIndex ? { ...item, [field]: val } : item)) }
        : entry,
    ));
  };

  const removeContainedItem = (containerId, itemIndex) => {
    save(entries.map((entry) => (entry.id === containerId ? { ...entry, items: entry.items.filter((_, idx) => idx !== itemIndex) } : entry)));
    setExpanded(null);
  };

  const totalWeight = entries.reduce((sum, entry) => sum + entryWeight(entry), 0);

  if (readOnly) {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Inventory</div>
          {totalWeight > 0 && <div className="text-[10px] text-muted-foreground">{totalWeight.toFixed(1)} lb total</div>}
        </div>
        {looseItems.length > 0 && <InventoryTable items={looseItems} readOnly />}
        {containers.map((container) => {
          const weight = entryWeight(container);
          return (
            <div key={container.id} className="border border-border rounded-sm bg-card/50 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-sm font-medium truncate">{container.name || "Container"}</span>
                </div>
                {weight > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{weight.toFixed(1)} lb</span>}
              </div>
              <div className="p-2">
                {container.items.length > 0 ? <InventoryTable items={container.items} readOnly /> : <div className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-sm">Empty.</div>}
                {container.notes && <div className="text-xs text-muted-foreground italic mt-2">{container.notes}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-accent" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Inventory</span>
          {totalWeight > 0 && <span className="text-[10px] text-muted-foreground ml-1">- {totalWeight.toFixed(1)} lb</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addContainer} className="h-7 text-xs px-2 gap-1">
            <Briefcase className="w-3 h-3" /> Add Container
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addLooseItem} className="h-7 text-xs px-2 gap-1">
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-6 text-center text-xs text-muted-foreground">No items yet.</div>
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Loose Items</div>
            {looseItems.length > 0 ? (
              <InventoryTable
                items={looseItems}
                expandedKey={expanded}
                makeKey={(index) => `loose-${index}`}
                onToggle={toggleExpanded}
                onUpdate={updateLooseItem}
                onRemove={removeLooseItem}
              />
            ) : (
              <div className="border border-dashed border-border rounded-sm py-4 text-center text-xs text-muted-foreground">No loose items.</div>
            )}
          </div>

          {containers.map((container, containerIndex) => {
            const weight = entryWeight(container);
            return (
              <div key={container.id} className="border border-border rounded-sm bg-card/50 overflow-hidden">
                <div className="flex items-center gap-2 px-2 py-2 border-b border-border bg-secondary/30">
                  <Briefcase className="w-3.5 h-3.5 text-accent shrink-0" />
                  <Input
                    value={container.name}
                    onChange={(event) => updateEntry(entries.findIndex((entry) => entry.id === container.id), "name", event.target.value)}
                    placeholder="Backpack, briefcase, pouch..."
                    className="h-7 text-xs px-2"
                  />
                  {weight > 0 && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{weight.toFixed(1)} lb</span>}
                  <Button type="button" size="sm" variant="outline" onClick={() => addContainedItem(container.id)} className="h-7 text-xs px-2 gap-1 shrink-0">
                    <Plus className="w-3 h-3" /> Item
                  </Button>
                  <button type="button" onClick={() => removeContainer(container.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2 space-y-2">
                  <InventoryTable
                    items={container.items}
                    expandedKey={expanded}
                    makeKey={(index) => `container-${containerIndex}-${index}`}
                    onToggle={toggleExpanded}
                    onUpdate={(itemIndex, field, val) => updateContainedItem(container.id, itemIndex, field, val)}
                    onRemove={(itemIndex) => removeContainedItem(container.id, itemIndex)}
                  />
                  {container.items.length === 0 && <div className="border border-dashed border-border rounded-sm py-4 text-center text-xs text-muted-foreground">No items in this container.</div>}
                  <Input
                    value={container.notes}
                    onChange={(event) => updateEntry(entries.findIndex((entry) => entry.id === container.id), "notes", event.target.value)}
                    placeholder="Container notes..."
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
