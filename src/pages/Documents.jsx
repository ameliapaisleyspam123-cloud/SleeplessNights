import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import DocumentEditor from "@/components/documents/DocumentEditor";
import MoveFolderDialog from "@/components/lore/MoveFolderDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Folder, MoveRight, Plus, Trash2 } from "lucide-react";

const emptyFolderKey = (campaignId) => `sleepless_empty_document_folders_${campaignId || "default"}`;
const readEmptyFolders = (campaignId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(emptyFolderKey(campaignId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeEmptyFolders = (campaignId, folders) => {
  localStorage.setItem(emptyFolderKey(campaignId), JSON.stringify([...new Set(folders.filter(Boolean))].sort()));
};

const expandFolderPaths = (paths) => {
  const expanded = new Set();
  paths.filter(Boolean).forEach((path) => {
    path.split("/").reduce((prefix, part) => {
      const next = prefix ? `${prefix}/${part}` : part;
      expanded.add(next);
      return next;
    }, "");
  });
  return [...expanded].sort();
};

const normalizeFolderPath = (path) =>
  String(path || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

const createChildFolderPath = (currentFolder, name) => {
  const folderName = normalizeFolderPath(name);
  if (!folderName) return "";
  return currentFolder && currentFolder !== "all" ? normalizeFolderPath(`${currentFolder}/${folderName}`) : folderName;
};

const visibleFolderPaths = (paths, currentFolder) =>
  paths.filter((path) => {
    if (currentFolder === "all") return !path.includes("/");
    if (!path.startsWith(`${currentFolder}/`)) return false;
    return !path.slice(currentFolder.length + 1).includes("/");
  });

const parentFolderPath = (path) => {
  const parts = String(path || "").split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [user, setUser] = useState(null);
  const [emptyFolders, setEmptyFolders] = useState([]);
  const [folder, setFolder] = useState("all");
  const [moving, setMoving] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const user = await appClient.auth.me();
    const docs = await appClient.entities.Document.filter({ campaign_id: user.campaign_id }, "-updated_date", 200);
    setUser(user);
    setEmptyFolders(readEmptyFolders(user.campaign_id));
    setDocuments(docs.filter((doc) => doc.visibility === "public" || (doc.visibility === "private" && doc.allowed_emails?.includes(user.email))));
  };

  useEffect(() => {
    load();
  }, []);

  const folders = expandFolderPaths([...documents.map((doc) => doc.folder).filter(Boolean), ...emptyFolders]);
  const folderOptions = visibleFolderPaths(folders, folder);
  const filteredDocuments = documents.filter((doc) => folder === "all" || doc.folder === folder || doc.folder?.startsWith(`${folder}/`));
  const uploadFolder = folder === "all" ? "" : folder;

  const createFolder = () => {
    const name = window.prompt(folder === "all" ? "New document folder name" : `New subfolder inside "${folder}"`);
    const folderName = createChildFolderPath(folder, name);
    if (!folderName || !user?.campaign_id) return;
    const next = [...new Set([...emptyFolders, folderName])].sort();
    setEmptyFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    setFolder(folderName);
  };

  const moveDocument = async (targetFolder) => {
    if (!moving?.id) return;
    await appClient.entities.Document.update(moving.id, { folder: targetFolder || "" });
    if (targetFolder && user?.campaign_id) {
      const next = [...new Set([...emptyFolders, targetFolder])].sort();
      setEmptyFolders(next);
      writeEmptyFolders(user.campaign_id, next);
    }
    setMoving(null);
    await load();
  };

  const deleteDocument = async (doc) => {
    if (!doc?.id) return;
    if (!window.confirm(`Permanently delete "${doc.title || "this document"}"? This cannot be undone.`)) return;
    await appClient.integrations.Core.DeleteFile({ path: doc.file_path, url: doc.file_url }).catch(() => false);
    await appClient.entities.Document.delete(doc.id);
    await load();
  };

  const deleteFolder = async (folderName) => {
    if (!folderName || !user?.campaign_id) return;
    const affected = documents.filter((doc) => doc.folder === folderName || doc.folder?.startsWith(`${folderName}/`));
    const destination = parentFolderPath(folderName);
    const destinationLabel = destination || "All Documents";
    const confirmed = window.confirm(
      affected.length > 0
        ? `Delete the "${folderName}" folder and move ${affected.length} document${affected.length === 1 ? "" : "s"} to ${destinationLabel}?`
        : `Delete the "${folderName}" folder?`,
    );
    if (!confirmed) return;
    await Promise.all(affected.map((doc) => appClient.entities.Document.update(doc.id, { folder: destination })));
    const next = emptyFolders.filter((name) => name !== folderName && !name.startsWith(`${folderName}/`));
    setEmptyFolders(next);
    writeEmptyFolders(user.campaign_id, next);
    if (folder === folderName || folder.startsWith(`${folderName}/`)) setFolder(destination || "all");
    await load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-5">
      <PageHeader
        eyebrow="Library"
        title="Documents"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />

      <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          {folder !== "all" && (
            <div className="w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Current folder: <span className="font-mono normal-case tracking-normal text-foreground">{folder}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setFolder("all")}
            className={`flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === "all" ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
          >
            <Folder className="w-7 h-7" strokeWidth={1.7} />
            <span className="text-[10px] leading-tight text-center">All Documents</span>
          </button>
          {folderOptions.map((name) => (
            <div
              key={name}
              className={`relative flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border transition-all ${folder === name ? "border-accent bg-accent/10 text-accent" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
              title={name}
            >
              <button type="button" onClick={() => setFolder(name)} className="absolute inset-0" aria-label={`Open ${name}`} />
              <Folder className="w-7 h-7" strokeWidth={1.7} />
              <span className="text-[10px] leading-tight text-center max-w-20 break-words">{name.split("/").pop()}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteFolder(name);
                }}
                className="absolute top-1 right-1 z-10 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-background/80"
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={createFolder}
            className="flex flex-col items-center gap-1 min-w-20 px-3 py-2 rounded-sm border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/60 hover:bg-accent/5 transition-all"
          >
            <Plus className="w-7 h-7" strokeWidth={1.7} />
            <span className="text-[10px] leading-tight text-center">New Folder</span>
          </button>
        </div>

        <div className="p-4">
          {documents.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No documents yet.</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No documents in this folder.</div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="border border-border rounded-sm bg-card p-4 hover:border-accent transition-colors">
                  <a href={doc.file_url} target="_blank" rel="noreferrer">
                    <FileText className="w-5 h-5 text-accent" />
                    <div className="font-display text-xl mt-3">{doc.title}</div>
                    {doc.description && <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>}
                    {doc.folder && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{doc.folder}</div>}
                  </a>
                  <Button size="sm" variant="ghost" className="mt-3" onClick={() => setMoving(doc)}>
                    <MoveRight className="w-4 h-4" /> Move
                  </Button>
                  <Button size="sm" variant="ghost" className="mt-3 text-destructive hover:text-destructive" onClick={() => deleteDocument(doc)}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <DocumentEditor open={open} onOpenChange={setOpen} onSaved={load} defaultFolder={uploadFolder} />
      <MoveFolderDialog
        open={Boolean(moving)}
        onOpenChange={(isOpen) => !isOpen && setMoving(null)}
        entry={moving}
        allFolderPaths={folders}
        onMove={moveDocument}
        title="Move Document"
        itemLabel="Moving"
        rootLabel="All Documents (root)"
      />
    </div>
  );
}
