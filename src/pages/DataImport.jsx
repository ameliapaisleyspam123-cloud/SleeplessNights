import React, { useState } from "react";
import { appClient, ENTITY_NAMES } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, Download, RefreshCcw } from "lucide-react";

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DataImport() {
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("merge");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await readFile(file));
      const store = appClient.data.import(payload, { mode });
      const counts = ENTITY_NAMES.map((name) => `${name}: ${store[name]?.length || 0}`).join(", ");
      setStatus(`Imported ${file.name}. ${counts}`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };

  const exportData = () => {
    downloadJson("sleepless-nights-data.json", appClient.data.export());
    setStatus("Exported current local data.");
  };

  const resetData = () => {
    appClient.data.reset();
    setStatus("Reset local data. Refresh the app to start from the default campaign.");
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <PageHeader eyebrow="Data" title="Import & Export" description="Load a JSON export from the previous app into this Vercel-hosted version." />

      <div className="grid md:grid-cols-2 gap-4">
        <section className="border border-border bg-card rounded-sm p-5">
          <div className="font-display text-2xl mb-2">Import JSON</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The importer accepts a JSON object with entity arrays named Campaign, User, CharacterSheet, Document, Initiative, LoreEntry, Message, PlayerNote, and Broadcast.
          </p>
          <div className="flex gap-2 mb-4">
            {["merge", "replace"].map((value) => (
              <button key={value} onClick={() => setMode(value)} className={`px-3 py-2 rounded-sm border text-sm capitalize ${mode === value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {value}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-sm bg-primary text-primary-foreground cursor-pointer hover:opacity-90">
            <Upload className="w-4 h-4" />
            Choose JSON
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
          </label>
        </section>

        <section className="border border-border bg-card rounded-sm p-5">
          <div className="font-display text-2xl mb-2">Current Data</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">Export or reset the browser-local dataset used by this deployment.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="ghost" onClick={resetData}>
              <RefreshCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </section>
      </div>

      {status && <div className="mt-4 border border-border bg-secondary/40 rounded-sm p-3 text-sm text-muted-foreground">{status}</div>}
    </div>
  );
}
