import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { appClient } from "@/api/appClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileText, Eye, EyeOff, Lock, Users, MapPin, Tag, Trash2, Link2, X, Undo2, Redo2, RotateCw } from "lucide-react";
import PdfMapCanvas from "@/components/lore/PdfMapCanvas";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public - all players can see", icon: Eye },
  { value: "specific_players", label: "Specific Players - chosen few + DM", icon: Users },
  { value: "dm_only", label: "DM Only - hidden from players", icon: Lock },
  { value: "archived", label: "Archived - hidden from all", icon: EyeOff },
];

const CATEGORIES = [
  { value: "map", label: "Map" },
  { value: "character", label: "Character" },
  { value: "place", label: "Place" },
  { value: "event", label: "Event" },
  { value: "artifact", label: "Artifact" },
  { value: "religion", label: "Religion" },
  { value: "other", label: "Other" },
];

const unlinkedValue = "__unlinked__";

const createBlankEntry = () => ({
  title: "",
  category: "other",
  folder: "",
  content: "",
  image_url: "",
  pdf_url: "",
  pdf_rotation: 0,
  map_pins: [],
  tags: [],
  visibility: "public",
  allowed_emails: [],
});

function newMapMark(kind, x = 50, y = 50) {
  return {
    id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label: kind === "label" ? "New label" : "New pin",
    x,
    y,
    size: kind === "label" ? 1 : 1,
    lore_entry_id: "",
  };
}

const cloneMarks = (marks) => marks.map((mark) => ({ ...mark }));

const quillModules = { toolbar: [["bold", "italic"], [{ list: "bullet" }, { list: "ordered" }], ["clean"]] };
const quillClass = "[&_.ql-container]:text-sm [&_.ql-editor]:bg-card [&_.ql-editor]:text-foreground [&_.ql-editor]:min-h-[150px] [&_.ql-toolbar]:border-border [&_.ql-container]:border-border [&_.ql-toolbar]:bg-card/60 [&_.ql-stroke]:stroke-muted-foreground [&_.ql-fill]:fill-muted-foreground [&_.ql-picker]:text-muted-foreground";

export default function LoreEditor({ open, onOpenChange, entry, onSaved }) {
  const [form, setForm] = useState(() => entry || createBlankEntry());
  const [tagInput, setTagInput] = useState("");
  const [existingTags, setExistingTags] = useState([]);
  const [existingFolders, setExistingFolders] = useState([]);
  const [existingEntries, setExistingEntries] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [mapTool, setMapTool] = useState("pin");
  const [editingMarkId, setEditingMarkId] = useState("");
  const [creatingLore, setCreatingLore] = useState(false);
  const [showPdfHint, setShowPdfHint] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [markDrag, setMarkDrag] = useState(null);
  const [mapHistory, setMapHistory] = useState({ past: [], future: [] });
  const mapSurfaceRef = useRef(null);
  const suppressNextMapClickRef = useRef(false);

  const mapMarks = useMemo(() => (Array.isArray(form.map_pins) ? form.map_pins : []), [form.map_pins]);
  const editingMark = mapMarks.find((mark) => mark.id === editingMarkId);

  useEffect(() => {
    if (open) {
      setForm(entry ? { ...createBlankEntry(), ...entry, map_pins: Array.isArray(entry.map_pins) ? entry.map_pins : [] } : createBlankEntry());
      setTagInput("");
      setEditingMarkId("");
      setShowPdfHint(true);
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      setDragStart(null);
      setMarkDrag(null);
      setMapHistory({ past: [], future: [] });
      suppressNextMapClickRef.current = false;
      appClient.auth.me().then((u) => {
        if (!u?.campaign_id) return;
        appClient.entities.User.filter({ campaign_id: u.campaign_id }, "display_name", 200)
          .then((users) => setAllUsers(users.filter((x) => x.role !== "admin" && x.campaign_role !== "dm")))
          .catch(() => {});
        appClient.entities.LoreEntry.filter({ campaign_id: u.campaign_id }, "-created_date", 200).then((entries) => {
          setExistingEntries(entries);
          const tags = [...new Set(entries.flatMap((e) => e.tags || []))].sort();
          setExistingTags(tags);
          const folders = [...new Set(entries.map((e) => e.folder).filter(Boolean))].sort();
          setExistingFolders(folders);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [open, entry]);

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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const user = await appClient.auth.me().catch(() => null);
    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
    if (file.type === "application/pdf") {
      setForm((f) => ({
        ...f,
        campaign_id: f.campaign_id || user?.campaign_id || "",
        pdf_url: file_url,
        image_url: "",
        category: f.category === "other" ? "map" : f.category,
        pdf_rotation: 0,
      }));
    } else {
      setForm((f) => ({
        ...f,
        campaign_id: f.campaign_id || user?.campaign_id || "",
        image_url: file_url,
        pdf_url: "",
        pdf_rotation: 0,
        map_pins: [],
      }));
    }
    setUploading(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput("");
  };

  const updateMapMarks = (updater, options = {}) => {
    const { record = true } = options;
    setForm((current) => {
      const currentMarks = Array.isArray(current.map_pins) ? current.map_pins : [];
      const nextMarks = typeof updater === "function" ? updater(currentMarks) : updater;
      if (record && JSON.stringify(currentMarks) !== JSON.stringify(nextMarks)) {
        setMapHistory((history) => ({
          past: [...history.past, cloneMarks(currentMarks)].slice(-50),
          future: [],
        }));
      }
      return { ...current, map_pins: nextMarks };
    });
  };

  const undoMapMarks = () => {
    const previous = mapHistory.past[mapHistory.past.length - 1];
    if (!previous) return;
    const current = cloneMarks(mapMarks);
    setForm((active) => ({ ...active, map_pins: cloneMarks(previous) }));
    setMapHistory((history) => ({
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, 50),
    }));
    setEditingMarkId("");
  };

  const redoMapMarks = () => {
    const next = mapHistory.future[0];
    if (!next) return;
    const current = cloneMarks(mapMarks);
    setForm((active) => ({ ...active, map_pins: cloneMarks(next) }));
    setMapHistory((history) => ({
      past: [...history.past, current].slice(-50),
      future: history.future.slice(1),
    }));
    setEditingMarkId("");
  };

  const addMarkAt = (event) => {
    if (suppressNextMapClickRef.current || markDrag) {
      suppressNextMapClickRef.current = false;
      return;
    }
    if ((!form.image_url && !form.pdf_url) || mapTool === "pan" || dragStart?.moved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - rect.left - mapPan.x) / mapZoom;
    const localY = (event.clientY - rect.top - mapPan.y) / mapZoom;
    const mark = newMapMark(mapTool, (localX / rect.width) * 100, (localY / rect.height) * 100);
    updateMapMarks((current) => [...current, mark]);
    setEditingMarkId(mark.id);
  };

  const startPan = (event) => {
    if (mapTool !== "pan") return;
    setDragStart({ x: event.clientX, y: event.clientY, pan: mapPan, moved: false });
  };

  const movePan = (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    setDragStart((current) => ({ ...current, moved: Math.abs(dx) + Math.abs(dy) > 3 }));
    setMapPan({ x: dragStart.pan.x + dx, y: dragStart.pan.y + dy });
  };

  const endPan = () => setDragStart(null);

  const updateEditingMark = (patch) => {
    if (!editingMarkId) return;
    updateMapMarks((current) => current.map((mark) => (mark.id === editingMarkId ? { ...mark, ...patch } : mark)));
  };

  const updateEditingLoreLink = (value) => {
    if (!editingMarkId) return;
    if (value === unlinkedValue) {
      updateEditingMark({ lore_entry_id: "" });
      return;
    }
    const linked = existingEntries.find((item) => item.id === value);
    updateEditingMark({ lore_entry_id: value, label: linked?.title || editingMark?.label || "" });
  };

  const removeEditingMark = () => {
    if (!editingMarkId) return;
    updateMapMarks((current) => current.filter((mark) => mark.id !== editingMarkId));
    setEditingMarkId("");
  };

  const removeMark = (markId) => {
    updateMapMarks((current) => current.filter((mark) => mark.id !== markId));
    if (editingMarkId === markId) setEditingMarkId("");
  };

  const startMarkDrag = (event, mark) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = mapSurfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = (event.clientX - rect.left - mapPan.x) / mapZoom;
    const pointerY = (event.clientY - rect.top - mapPan.y) / mapZoom;
    const markX = (mark.x / 100) * rect.width;
    const markY = (mark.y / 100) * rect.height;
    setEditingMarkId(mark.id);
    setMarkDrag({
      id: mark.id,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: pointerX - markX,
      offsetY: pointerY - markY,
      moved: false,
      originalMarks: cloneMarks(mapMarks),
    });
  };

  const moveMark = (event) => {
    if (!markDrag) return;
    const moved = Math.abs(event.clientX - markDrag.startX) + Math.abs(event.clientY - markDrag.startY) > 3;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - rect.left - mapPan.x) / mapZoom - markDrag.offsetX;
    const localY = (event.clientY - rect.top - mapPan.y) / mapZoom - markDrag.offsetY;
    const x = Math.max(0, Math.min(100, (localX / rect.width) * 100));
    const y = Math.max(0, Math.min(100, (localY / rect.height) * 100));
    if (moved) {
      suppressNextMapClickRef.current = true;
      setMarkDrag((current) => (current ? { ...current, moved: true } : current));
    }
    updateMapMarks((current) => current.map((mark) => (mark.id === markDrag.id ? { ...mark, x, y } : mark)), { record: false });
  };

  const endMarkDrag = () => {
    if (markDrag && suppressNextMapClickRef.current) {
      suppressNextMapClickRef.current = true;
      setMapHistory((history) => ({
        past: [...history.past, cloneMarks(markDrag.originalMarks || [])].slice(-50),
        future: [],
      }));
    }
    setMarkDrag(null);
  };

  const createLoreForMark = async () => {
    if (!editingMark) return;
    setCreatingLore(true);
    const user = await appClient.auth.me().catch(() => null);
    const created = await appClient.entities.LoreEntry.create({
      campaign_id: user?.campaign_id,
      title: editingMark.label?.trim() || "New map lore",
      category: "place",
      folder: form.folder || "",
      content: "",
      visibility: form.visibility || "public",
      allowed_emails: form.allowed_emails || [],
      tags: [],
    });
    setExistingEntries((current) => [...current, created]);
    updateEditingMark({ lore_entry_id: created.id, label: created.title });
    setCreatingLore(false);
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    const u = await appClient.auth.me().catch(() => null);
    const payload = { ...form, campaign_id: form.campaign_id || u?.campaign_id || "" };
    if (entry?.id) {
      await appClient.entities.LoreEntry.update(entry.id, payload);
    } else {
      await appClient.entities.LoreEntry.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const archive = async () => {
    if (!entry?.id) return;
    await appClient.entities.LoreEntry.update(entry.id, { visibility: "archived" });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {entry?.id ? "Edit Entry" : "New Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="The Siege of Varnhold..." />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Folder (optional)</Label>
            <Input
              value={form.folder || ""}
              onChange={(e) => setForm({ ...form, folder: e.target.value })}
              placeholder="e.g. World/Factions/Guilds - use / for nesting"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Use <span className="font-mono">/</span> to nest folders, e.g. <span className="font-mono">World/Factions</span></p>
            {existingFolders.filter((f) => f !== form.folder).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {existingFolders.filter((f) => f !== form.folder).map((f) => (
                  <button key={f} type="button" onClick={() => setForm((fm) => ({ ...fm, folder: f }))} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors font-mono">
                    + {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Image / Map</Label>
            {form.image_url ? (
              <div className="relative rounded-sm overflow-hidden border border-border">
                <img src={form.image_url} alt="" className="w-full max-h-64 object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <label className="h-8 px-3 rounded-sm border border-border bg-background/85 text-xs text-foreground hover:border-accent hover:text-accent cursor-pointer transition-colors inline-flex items-center justify-center">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Replace"}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
                  </label>
                  <Button size="sm" variant="destructive" onClick={() => setForm({ ...form, image_url: "" })}>Remove</Button>
                </div>
              </div>
            ) : form.pdf_url ? (
              <div className="flex items-center gap-2 p-3 border border-border rounded-sm bg-secondary/40 mt-1.5">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground flex-1">PDF map uploaded</span>
                <label className="text-xs text-muted-foreground hover:text-accent cursor-pointer transition-colors mr-2">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Replace"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => setForm((f) => ({ ...f, pdf_url: "", map_pins: [] }))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Remove</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-24 rounded-sm border border-dashed border-border cursor-pointer hover:border-accent hover:bg-secondary/40 transition-all text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload image or PDF map"}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>

          {(form.image_url || form.pdf_url) && (
            <div className="rounded-sm border border-border bg-secondary/25 overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-3 border-b border-border flex-wrap">
                <Label className="m-0">Map Pins & Labels</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMapTool("pin")}
                    className={`h-8 px-3 rounded-sm border text-xs inline-flex items-center gap-1.5 ${mapTool === "pin" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <MapPin className="w-3.5 h-3.5" /> Pin
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTool("label")}
                    className={`h-8 px-3 rounded-sm border text-xs inline-flex items-center gap-1.5 ${mapTool === "label" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <Tag className="w-3.5 h-3.5" /> Label
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTool("pan")}
                    className={`h-8 px-3 rounded-sm border text-xs inline-flex items-center gap-1.5 ${mapTool === "pan" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={undoMapMarks}
                    disabled={mapHistory.past.length === 0}
                    title="Undo"
                    className="h-8 w-8 rounded-sm border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground inline-flex items-center justify-center"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={redoMapMarks}
                    disabled={mapHistory.future.length === 0}
                    title="Redo"
                    className="h-8 w-8 rounded-sm border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground inline-flex items-center justify-center"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                  {form.pdf_url && (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, pdf_rotation: ((Number(current.pdf_rotation) || 0) + 90) % 360 }))}
                      title="Rotate PDF 90 degrees clockwise"
                      className="h-8 px-2 rounded-sm border border-border text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate
                    </button>
                  )}
                  <button type="button" onClick={() => setMapZoom((value) => Math.max(0.5, value - 0.25))} className="h-8 w-8 rounded-sm border border-border text-xs text-muted-foreground hover:text-foreground">-</button>
                  <button type="button" onClick={() => setMapZoom((value) => Math.min(4, value + 0.25))} className="h-8 w-8 rounded-sm border border-border text-xs text-muted-foreground hover:text-foreground">+</button>
                  <button type="button" onClick={() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); }} className="h-8 px-2 rounded-sm border border-border text-xs text-muted-foreground hover:text-foreground">Reset</button>
                </div>
              </div>

              <div className="min-h-[20rem]">
                <div
                  ref={mapSurfaceRef}
                  type="button"
                  onClick={addMarkAt}
                  onMouseDown={startPan}
                  onMouseMove={(event) => {
                    movePan(event);
                    moveMark(event);
                  }}
                  onMouseUp={() => {
                    endPan();
                    endMarkDrag();
                  }}
                  onMouseLeave={() => {
                    endPan();
                    endMarkDrag();
                  }}
                  className={`relative h-[70vh] min-h-[32rem] w-full bg-background overflow-hidden text-left ${mapTool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
                >
                  <div
                    className="absolute inset-0 origin-top-left"
                    style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})` }}
                  >
                    {form.image_url ? (
                      <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                    ) : (
                      <div className="absolute inset-0">
                        <PdfMapCanvas url={form.pdf_url} rotation={form.pdf_rotation || 0} />
                      </div>
                    )}
                    {mapMarks.map((mark) => (
                      <span
                        key={mark.id}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingMarkId(mark.id);
                        }}
                        onMouseDown={(event) => startMarkDrag(event, mark)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (window.confirm(`Delete ${mark.kind === "label" ? "label" : "pin"} "${mark.label || "Untitled"}"?`)) removeMark(mark.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setEditingMarkId(mark.id);
                          }
                        }}
                        className={`absolute z-10 group -translate-x-1/2 -translate-y-1/2 ${editingMarkId === mark.id ? "ring-2 ring-accent" : ""}`}
                        style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                      >
                        {mark.kind === "label" ? (
                          editingMarkId === mark.id ? (
                            <input
                              value={mark.label || ""}
                              onChange={(event) => updateEditingMark({ label: event.target.value })}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              className="max-w-56 min-w-24 rounded-sm border border-accent bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-lg outline-none ring-2 ring-accent/20"
                              style={{ transform: `scale(${mark.size || 1})`, width: `${Math.max(10, Math.min(26, (mark.label || "Label").length + 2))}ch` }}
                            />
                          ) : (
                            <span className="inline-flex max-w-48 rounded-sm border border-accent bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-lg" style={{ transform: `scale(${mark.size || 1})` }}>
                              {mark.label || "Label"}
                            </span>
                          )
                        ) : (
                          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-background/95 text-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.16),0_10px_24px_rgb(0_0_0/0.25)] transition-transform group-hover:scale-110" style={{ transform: `scale(${mark.size || 1})` }}>
                            <MapPin className="w-5 h-5 fill-accent/25" />
                            <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg group-hover:block">
                              {mark.label || "Pin"}
                            </span>
                          </span>
                        )}
                        {editingMarkId === mark.id && (
                          <div
                            className="absolute left-full top-1/2 z-30 ml-3 w-72 rounded-sm border border-border bg-background/95 p-3 text-left shadow-2xl backdrop-blur"
                            style={{ transform: `translateY(-50%) scale(${1 / mapZoom})`, transformOrigin: "left center" }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onContextMenu={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {mark.kind === "label" ? "Label" : "Pin"}
                              </div>
                              <button type="button" onClick={() => setEditingMarkId("")} className="ml-auto text-muted-foreground hover:text-foreground" title="Close editor">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <Input value={mark.label || ""} onChange={(event) => updateEditingMark({ label: event.target.value })} />
                              <div>
                                <Label>Size</Label>
                                <input
                                  type="range"
                                  min="0.6"
                                  max="2.4"
                                  step="0.1"
                                  value={mark.size || 1}
                                  onChange={(event) => updateEditingMark({ size: Number(event.target.value) })}
                                  className="w-full accent-[hsl(var(--accent))]"
                                />
                                <div className="text-xs text-muted-foreground">{Math.round((mark.size || 1) * 100)}%</div>
                              </div>
                              <div>
                                <Label>Linked Lore</Label>
                                <Select value={mark.lore_entry_id || unlinkedValue} onValueChange={updateEditingLoreLink}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={unlinkedValue}>No linked entry</SelectItem>
                                    {existingEntries.filter((item) => item.id !== entry?.id).map((item) => (
                                      <SelectItem key={item.id} value={item.id}>{item.title || "Untitled"}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button type="button" variant="outline" size="sm" onClick={createLoreForMark} disabled={creatingLore}>
                                  <Link2 className="w-3.5 h-3.5" /> {creatingLore ? "Creating..." : "Create Lore"}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removeEditingMark}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </span>
                    ))}
                  </div>
                  {form.pdf_url && (
                    <>
                      {showPdfHint && (
                        <div className="absolute left-3 top-3 max-w-xs rounded-sm border border-border bg-background/90 p-3 text-sm text-muted-foreground shadow-lg">
                          <div className="flex items-center gap-2 text-foreground mb-1">
                            <FileText className="w-4 h-4 text-accent" /> PDF map
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowPdfHint(false);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setShowPdfHint(false);
                                }
                              }}
                              className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Dismiss note"
                            >
                              <X className="w-3.5 h-3.5" />
                            </span>
                          </div>
                          If the preview is blank or black, this browser cannot render the PDF inline. Pins and labels still save on this map.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Lore</Label>
            <div className="mt-1 rounded-sm border border-border overflow-hidden">
              <ReactQuill
                value={form.content || ""}
                onChange={(value) => setForm({ ...form, content: value })}
                placeholder="Pen the tale..."
                theme="snow"
                modules={quillModules}
                className={quillClass}
              />
            </div>
          </div>

          <div>
            <Label>Visibility</Label>
            <div className="flex flex-col gap-1.5 mt-1.5">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: opt.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-sm text-left transition-all ${
                    form.visibility === opt.value ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <opt.icon className="w-4 h-4 shrink-0" />
                  {opt.label}
                </button>
              ))}
            </div>
            {form.visibility === "specific_players" && (
              <div className="mt-2 border border-border rounded-sm p-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Select Players</div>
                {allUsers.length === 0 && <div className="text-xs text-muted-foreground">No players found.</div>}
                {allUsers.map((u) => {
                  const checked = (form.allowed_emails || []).includes(u.email);
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        allowed_emails: checked ? (f.allowed_emails || []).filter((e) => e !== u.email) : [...(f.allowed_emails || []), u.email],
                      }))}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border-2 shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`} />
                      {u.display_name || u.full_name}
                      <span className="text-[10px] text-muted-foreground ml-auto">{u.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Press Enter to add" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {existingTags.filter((t) => !(form.tags || []).includes(t)).length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Existing tags - click to add</div>
                <div className="flex flex-wrap gap-1.5">
                  {existingTags.filter((t) => !(form.tags || []).includes(t)).map((t) => (
                    <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }))} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors max-w-[160px] truncate">
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t, i) => (
                  <button key={i} onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))} className="text-xs px-2 py-0.5 rounded-full bg-secondary hover:bg-destructive hover:text-destructive-foreground transition-colors max-w-[160px] truncate">
                    {t} x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
          <div>
            {entry?.id && entry.visibility !== "archived" && (
              <Button variant="ghost" size="sm" onClick={archive} className="text-muted-foreground hover:text-foreground">
                <EyeOff className="w-4 h-4 mr-1.5" /> Archive
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title?.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
