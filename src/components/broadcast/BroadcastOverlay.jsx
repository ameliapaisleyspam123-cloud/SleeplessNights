import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { Radio } from "lucide-react";

export default function BroadcastOverlay({ user }) {
  const [broadcast, setBroadcast] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    appClient.entities.Broadcast.list("-updated_date", 1).then((list) => {
      const active = list[0]?.active ? list[0] : null;
      setBroadcast(active);
    });

    const unsubscribe = appClient.entities.Broadcast.subscribe(() => {
      appClient.entities.Broadcast.list("-updated_date", 1).then((list) => {
        const active = list[0]?.active ? list[0] : null;
        setBroadcast(active);
        if (!active) setDismissed(false);
      });
    });

    return () => unsubscribe();
  }, []);

  if (!broadcast || dismissed) return null;

  const isAdmin = user?.role === "admin";
  if (!isAdmin && broadcast.target_emails?.length > 0 && !broadcast.target_emails.includes(user?.email)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-background/97 backdrop-blur-md" />

      <div
        className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto thin-scroll rounded-sm shadow-2xl sculk-pulse"
        style={{ border: "1px solid hsl(190 100% 38% / 0.5)", background: "hsl(222 42% 9%)" }}
      >
        <div
          className="px-6 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "hsl(190 100% 38% / 0.3)", background: "hsl(190 100% 38% / 0.06)" }}
        >
          <Radio className="w-4 h-4 animate-pulse" style={{ color: "hsl(190 100% 38%)" }} />
          <span className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "hsl(190 100% 38%)" }}>
            Gamemaster Override
          </span>
        </div>

        {broadcast.video_url && (
          <div className="bg-black">
            <video src={broadcast.video_url} autoPlay controls className="w-full max-h-[55vh]" />
          </div>
        )}

        {!broadcast.video_url && broadcast.image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-muted">
            <img src={broadcast.image_url} alt={broadcast.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 md:p-10">
          {broadcast.title && (
            <h2 className="font-display text-3xl md:text-5xl leading-tight" style={{ color: "hsl(195 70% 85%)" }}>
              {broadcast.title}
            </h2>
          )}
          {broadcast.message && (
            <div className="mt-5 text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(195 70% 75%)" }}>
              {broadcast.message}
            </div>
          )}

          {isAdmin ? (
            <div className="mt-8 pt-5 flex justify-end" style={{ borderTop: "1px solid hsl(222 35% 16%)" }}>
              <button
                onClick={() => setDismissed(true)}
                className="text-sm px-5 py-2 rounded-sm font-medium transition-all hover:opacity-80"
                style={{ background: "hsl(190 100% 38%)", color: "hsl(222 45% 5%)" }}
              >
                Close Preview
              </button>
            </div>
          ) : (
            <div
              className="mt-8 pt-5 text-xs text-center"
              style={{ borderTop: "1px solid hsl(222 35% 16%)", color: "hsl(210 25% 48%)" }}
            >
              Awaiting the Gamemaster's release...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
