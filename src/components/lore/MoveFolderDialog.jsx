import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Home, Plus } from "lucide-react";

export default function MoveFolderDialog({
  open,
  onOpenChange,
  entry,
  allFolderPaths,
  onMove,
  title = "Move Entry",
  itemLabel = "Moving",
  rootLabel = "Root",
}) {
  const [selected, setSelected] = useState(entry?.folder || null);
  const [expanded, setExpanded] = useState(new Set());
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [localFolders, setLocalFolders] = useState(() => allFolderPaths || []);

  React.useEffect(() => {
    if (open) {
      setSelected(entry?.folder || null);
      setLocalFolders(allFolderPaths || []);
      setExpanded(new Set());
      setNewFolderParent(null);
      setNewFolderName("");
    }
  }, [open, entry, allFolderPaths]);

  const buildTree = (paths) => {
    const root = {};
    for (const p of paths) {
      const parts = p.split("/");
      let node = root;
      let built = "";
      for (const part of parts) {
        built = built ? `${built}/${part}` : part;
        if (!node[part]) node[part] = { __path: built, __children: {} };
        node = node[part].__children;
      }
    }
    return root;
  };

  const tree = buildTree(localFolders);

  const toggle = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const addNewFolder = () => {
    if (!newFolderName.trim()) return;
    const full = newFolderParent && newFolderParent !== "__root__" ? `${newFolderParent}/${newFolderName.trim()}` : newFolderName.trim();
    if (!localFolders.includes(full)) {
      setLocalFolders((prev) => [...prev, full].sort());
    }
    setSelected(full);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (newFolderParent && newFolderParent !== "__root__") next.add(newFolderParent);
      return next;
    });
    setNewFolderName("");
    setNewFolderParent(null);
  };

  const renderNode = (nodeMap, depth = 0) =>
    Object.entries(nodeMap).map(([name, node]) => {
      const path = node.__path;
      const children = node.__children;
      const hasChildren = Object.keys(children).length > 0;
      const isExpanded = expanded.has(path);
      const isSelected = selected === path;
      const isAddingHere = newFolderParent === path;

      return (
        <div key={path}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm cursor-pointer select-none group transition-colors ${
              isSelected ? "bg-accent/20 text-foreground" : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => setSelected(path)}
            onDoubleClick={() => hasChildren && toggle(path)}
          >
            <button className="w-4 h-4 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); toggle(path); }}>
              {hasChildren ? (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3 h-3" />}
            </button>
            {isSelected || isExpanded ? <FolderOpen className="w-4 h-4 shrink-0 text-accent" /> : <Folder className="w-4 h-4 shrink-0" />}
            <span className="text-sm flex-1 truncate">{name}</span>
            <button
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              title="New subfolder"
              onClick={(e) => {
                e.stopPropagation();
                setNewFolderParent(path);
                setNewFolderName("");
                setExpanded((prev) => new Set([...prev, path]));
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isAddingHere && (
            <div className="flex items-center gap-1.5 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              <Folder className="w-4 h-4 shrink-0 text-accent/60" />
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addNewFolder();
                  if (e.key === "Escape") {
                    setNewFolderParent(null);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name..."
                className="h-6 text-xs py-0 px-1.5"
              />
              <button onClick={addNewFolder} className="text-xs text-accent hover:text-accent/80">✓</button>
              <button onClick={() => { setNewFolderParent(null); setNewFolderName(""); }} className="text-xs text-muted-foreground hover:text-destructive">×</button>
            </div>
          )}

          {isExpanded && hasChildren && <div>{renderNode(children, depth + 1)}</div>}
        </div>
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          {itemLabel}: <span className="text-foreground font-medium">{entry?.title || entry?.name}</span>
        </p>

        <div className="border border-border rounded-sm bg-secondary/20 overflow-y-auto thin-scroll" style={{ maxHeight: "280px" }}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm cursor-pointer select-none group transition-colors ${
              selected === null ? "bg-accent/20 text-foreground" : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelected(null)}
          >
            <span className="w-4 h-4 shrink-0" />
            <Home className="w-4 h-4 shrink-0 text-accent" />
            <span className="text-sm">{rootLabel}</span>
            <button
              className="ml-auto opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              title="New root folder"
              onClick={(e) => {
                e.stopPropagation();
                setNewFolderParent("__root__");
                setNewFolderName("");
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {renderNode(tree)}

          {newFolderParent === "__root__" && (
            <div className="flex items-center gap-1.5 px-2 py-1" style={{ paddingLeft: "24px" }}>
              <Folder className="w-4 h-4 shrink-0 text-accent/60" />
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addNewFolder();
                  if (e.key === "Escape") {
                    setNewFolderParent(null);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name..."
                className="h-6 text-xs py-0 px-1.5"
              />
              <button onClick={addNewFolder} className="text-xs text-accent hover:text-accent/80">✓</button>
              <button onClick={() => { setNewFolderParent(null); setNewFolderName(""); }} className="text-xs text-muted-foreground hover:text-destructive">×</button>
            </div>
          )}
        </div>

        <button onClick={() => { setNewFolderParent("__root__"); setNewFolderName(""); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors w-fit">
          <Plus className="w-3.5 h-3.5" /> New folder at root
        </button>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
            → {selected === null ? "Root" : selected}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { onMove(selected); onOpenChange(false); }}>Move Here</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
