import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import DocumentEditor from "@/components/documents/DocumentEditor";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const user = await appClient.auth.me();
    const docs = await appClient.entities.Document.filter({ campaign_id: user.campaign_id }, "-updated_date", 200);
    setDocuments(docs.filter((doc) => doc.visibility === "public" || (doc.visibility === "private" && doc.allowed_emails?.includes(user.email))));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <PageHeader
        eyebrow="Library"
        title="Documents"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer" className="border border-border rounded-sm bg-card p-4 hover:border-accent transition-colors">
            <FileText className="w-5 h-5 text-accent" />
            <div className="font-display text-xl mt-3">{doc.title}</div>
            {doc.description && <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>}
          </a>
        ))}
      </div>
      {documents.length === 0 && <div className="border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">No documents yet.</div>}
      <DocumentEditor open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
