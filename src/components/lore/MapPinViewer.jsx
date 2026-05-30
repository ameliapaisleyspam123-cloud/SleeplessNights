import React, { useEffect, useMemo, useRef, useState } from "react";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, MapPin, X } from "lucide-react";
import PdfMapCanvas from "@/components/lore/PdfMapCanvas";

const unlinkedValue = "__unlinked__";

function createPin(x, y) {
  return {
    id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "pin",
    label: "New pin",
    x,
    y,
    lore_entry_id: "",
  };
}

export default function MapPinViewer({ entry, entries = [], isAdmin, onEntryUpdated, onOpenEntry, onClose }) {
  const [editMode, setEditMode] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createdEntries, setCreatedEntries] = useState([]);
  const [showPdfHint, setShowPdfHint] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [overlayEntry, setOverlayEntry] = useState(null);
  const mapSurfaceRef = useRef(null);
  const hasPdf = Boolean(entry?.pdf_url);
  const hasImage = Boolean(entry?.image_url);

  const pins = Array.isArray(entry?.map_pins) ? entry.map_pins : [];
  const availableEntries = [...entries, ...createdEntries];
  const loreOptions = useMemo(
    () => availableEntries.filter((item) => item.id && item.id !== entry?.id).sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    [availableEntries, entry?.id],
  );
  const loreById = useMemo(() => new Map(availableEntries.map((item) => [item.id, item])), [availableEntries]);

  const pdfSrc = entry?.pdf_url || "";

  useEffect(() => {
    setOverlayEntry(null);
  }, [entry?.id]);

  useEffect(() => {
    if (!pdfSrc || !showPdfHint) return undefined;
    const timeoutId = window.setTimeout(() => setShowPdfHint(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [pdfSrc, showPdfHint]);

  useEffect(() => {
    const surface = mapSurfaceRef.current;
    if (!surface) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMapZoom((value) => Math.min(4, Math.max(0.5, value + (event.deltaY > 0 ? -0.12 : 0.12))));
    };
    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, []);

  const updatePins = async (nextPins) => {
    if (!entry?.id) return;
    const updated = await appClient.entities.LoreEntry.update(entry.id, { map_pins: nextPins });
    onEntryUpdated?.(updated);
  };

  const startEdit = (pin) => {
    setEditingPin(pin);
    setDraft({ ...pin });
  };

  const handleMapClick = (event) => {
    if (!isAdmin || !editMode || editingPin) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPin = createPin(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
    startEdit(nextPin);
  };

  const savePin = async () => {
    const cleanLabel = draft?.label?.trim() || "Untitled pin";
    const nextPin = { ...draft, label: cleanLabel, x: Number(draft.x) || 0, y: Number(draft.y) || 0 };
    await updatePins(pins.some((pin) => pin.id === nextPin.id) ? pins.map((pin) => (pin.id === nextPin.id ? nextPin : pin)) : [...pins, nextPin]);
    setEditingPin(null);
    setDraft(null);
  };

  const deletePin = async () => {
    if (!editingPin?.id) return;
    await updatePins(pins.filter((pin) => pin.id !== editingPin.id));
    setEditingPin(null);
    setDraft(null);
  };

  const createLinkedEntry = async () => {
    if (!entry?.campaign_id || !draft) return;
    setSaving(true);
    const created = await appClient.entities.LoreEntry.create({
      campaign_id: entry.campaign_id,
      title: draft.label?.trim() || "New map lore",
      category: "place",
      folder: entry.folder || "",
      content: draft.new_content || "",
      visibility: entry.visibility || "public",
      allowed_emails: entry.allowed_emails || [],
      tags: [],
    });
    setCreatedEntries((current) => [...current, created]);
    setDraft((current) => ({ ...current, lore_entry_id: created.id, new_content: "" }));
    setSaving(false);
  };

  const openLinkedPin = (pin) => {
    if (dragStart?.moved) return;
    if (editMode && isAdmin) {
      startEdit(pin);
      return;
    }
    const linked = loreById.get(pin.lore_entry_id);
    if (!linked) return;
    setOverlayEntry(linked);
  };

  const startPan = (event) => setDragStart({ x: event.clientX, y: event.clientY, pan: mapPan, moved: false });
  const movePan = (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    setDragStart((current) => ({ ...current, moved: Math.abs(dx) + Math.abs(dy) > 3 }));
    setMapPan({ x: dragStart.pan.x + dx, y: dragStart.pan.y + dy });
  };
  const endPan = () => setDragStart(null);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <div className="font-display text-lg truncate">{entry.title} - Map</div>
          <div className="text-xs text-muted-foreground">{pins.length} pin{pins.length === 1 ? "" : "s"}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setMapZoom((value) => Math.max(0.5, value - 0.25))}>-</Button>
          <Button variant="outline" size="sm" onClick={() => setMapZoom((value) => Math.min(4, value + 0.25))}>+</Button>
          <Button variant="outline" size="sm" onClick={() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); }}>Reset</Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      <div className={`flex-1 grid ${isAdmin && editMode ? "lg:grid-cols-[1fr_19rem]" : "grid-cols-1"} min-h-0`}>
        <div
          ref={mapSurfaceRef}
          className="relative bg-muted/40 min-h-0 cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={endPan}
          onMouseLeave={endPan}
        >
          <div
            className="absolute inset-0 origin-top-left"
            style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})` }}
          >
            {hasImage ? (
              <img src={entry.image_url} alt="" className="absolute inset-0 w-full h-full object-contain bg-background" draggable={false} />
            ) : pdfSrc ? (
              <PdfMapCanvas url={pdfSrc} rotation={180} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{hasPdf ? "Loading PDF..." : "No map file attached."}</div>
            )}
            <div className="absolute inset-0 pointer-events-none">
              {pins.map((pin) => {
                const linked = loreById.get(pin.lore_entry_id);
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className="absolute pointer-events-auto group -translate-x-1/2 -translate-y-1/2 text-left"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      openLinkedPin(pin);
                    }}
                    title={linked ? `Open ${linked.title}` : pin.label}
                  >
                    {pin.kind === "label" ? (
                      <span className={`flex rounded-sm border px-2 py-1 shadow-lg text-xs font-medium max-w-48 ${linked ? "border-accent bg-background text-foreground" : "border-border bg-background/90 text-muted-foreground"}`} style={{ transform: `scale(${pin.size || 1})` }}>
                        <span className="truncate">{pin.label || "Label"}</span>
                      </span>
                    ) : (
                      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-background/95 text-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.16),0_10px_24px_rgb(0_0_0/0.25)] transition-transform group-hover:scale-110" style={{ transform: `scale(${pin.size || 1})` }}>
                        <MapPin className="w-5 h-5 fill-accent/25" />
                        <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg group-hover:block">
                          {pin.label || "Pin"}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {pdfSrc && showPdfHint && (
            <>
              {showPdfHint && (
                <div className="absolute left-3 top-3 max-w-xs rounded-sm border border-border bg-background/90 p-3 text-sm text-muted-foreground shadow-lg">
                  <div className="flex items-center gap-2 text-foreground mb-1">
                    <FileText className="w-4 h-4 text-accent" /> PDF map
                    <button type="button" onClick={() => setShowPdfHint(false)} className="ml-auto text-muted-foreground hover:text-foreground" title="Dismiss note">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  If the preview is blank or black, this browser cannot render the PDF inline. Pins and labels still appear on top.
                </div>
              )}
            </>
          )}
        </div>

      </div>
      {overlayEntry && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-4 md:p-8">
          <div className="pointer-events-auto w-full max-w-2xl max-h-[82vh] overflow-y-auto thin-scroll rounded-sm border border-border bg-background/95 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.24em] text-accent">{overlayEntry.category || "lore"}</div>
                <div className="font-display text-2xl leading-tight truncate">{overlayEntry.title || "Untitled"}</div>
              </div>
              <button type="button" onClick={() => setOverlayEntry(null)} className="text-muted-foreground hover:text-foreground" title="Close lore overlay">
                <X className="w-4 h-4" />
              </button>
            </div>
            {overlayEntry.image_url && (
              <img src={overlayEntry.image_url} alt={overlayEntry.title || "Lore"} className="w-full max-h-64 object-cover border-b border-border" />
            )}
            <div className="p-4 md:p-5">
              {overlayEntry.content ? (
                <div className="rich-content text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: overlayEntry.content }} />
              ) : (
                <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No details recorded.</div>
              )}
              {onOpenEntry && (
                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOverlayEntry(null);
                      onClose?.();
                      onOpenEntry(overlayEntry);
                    }}
                  >
                    Open Full Entry
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
