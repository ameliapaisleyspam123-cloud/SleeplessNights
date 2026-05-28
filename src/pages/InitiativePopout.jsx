import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ExternalLink, Swords, X } from "lucide-react";
import { appClient } from "@/api/appClient";
import InitiativeTracker from "@/components/initiative/InitiativeTracker";

export default function InitiativePopout() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const campaignId = searchParams.get("campaign") || user?.campaign_id || "";

  useEffect(() => {
    appClient.auth
      .me()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const isDM = useMemo(() => user?.campaign_role === "dm" || user?.campaign_role === "DM" || user?.role === "admin", [user]);

  useEffect(() => {
    if (!loaded || !campaignId) return;
    document.title = "Initiative Tracker";
  }, [loaded, campaignId]);

  if (!loaded) {
    return (
      <div className="min-h-screen parchment flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.campaign_id) return <Navigate to="/campaign" replace />;
  if (!isDM || !campaignId) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen parchment flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-accent flex items-center gap-2">
            <Swords className="w-4 h-4 shrink-0" />
            <span className="truncate">Initiative Tracker</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Pop-out window</div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-sm border border-border bg-card text-muted-foreground hover:text-accent hover:border-accent/70 flex items-center justify-center transition-colors"
            title="Open campaign hub"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => window.close()}
            className="h-9 w-9 rounded-sm border border-border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title="Close pop-out"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto thin-scroll p-4">
        <InitiativeTracker campaignId={campaignId} splitscreen />
      </main>
    </div>
  );
}
