import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { Radio } from "lucide-react";

function videoSource(url = "") {
  const clean = url.trim();
  if (!clean) return null;
  const directVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(clean) || clean.startsWith("data:video/");
  if (directVideo) return { type: "video", url: clean };

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return { type: "embed", url: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
    }
    if (host.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return { type: "embed", url: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
    }
    if (host.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return { type: "embed", url: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }
  } catch {
    return { type: "video", url: clean };
  }

  return { type: "video", url: clean };
}

export default function BroadcastOverlay({ user }) {
  const [broadcast, setBroadcast] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    appClient.entities.Broadcast.list("-updated_date", 100).then((list) => {
      const active = list.find((item) => item.active) || null;
      setBroadcast(active);
    });

    const unsubscribe = appClient.entities.Broadcast.subscribe(() => {
      appClient.entities.Broadcast.list("-updated_date", 100).then((list) => {
        const active = list.find((item) => item.active) || null;
        setBroadcast(active);
        if (!active) setDismissed(false);
      });
    });

    return () => unsubscribe();
  }, []);

  if (!broadcast || dismissed) return null;

  const isAdmin = user?.role === "admin" || user?.campaign_role === "dm";
  if (!isAdmin && broadcast.target_emails?.length > 0 && !broadcast.target_emails.includes(user?.email)) {
    return null;
  }

  const video = videoSource(broadcast.video_url);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-background/97 backdrop-blur-md" />

      <div
        className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto thin-scroll rounded-sm shadow-2xl sculk-pulse"
        style={{ border: "1px solid hsl(var(--accent) / 0.5)", background: "hsl(var(--card))" }}
      >
        <div
          className="px-6 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "hsl(var(--accent) / 0.3)", background: "hsl(var(--accent) / 0.06)" }}
        >
          <Radio className="w-4 h-4 animate-pulse" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "hsl(var(--accent))" }}>
            Gamemaster Override
          </span>
        </div>

        {video?.type === "video" && (
          <div className="bg-black">
            <video src={video.url} autoPlay controls playsInline className="w-full max-h-[55vh]" />
          </div>
        )}

        {video?.type === "embed" && (
          <div className="aspect-video bg-black">
            <iframe
              src={video.url}
              title={broadcast.title || "Broadcast video"}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}

        {!video && broadcast.image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-muted">
            <img src={broadcast.image_url} alt={broadcast.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 md:p-10">
          {broadcast.title && (
            <h2 className="font-display text-3xl md:text-5xl leading-tight" style={{ color: "hsl(var(--foreground))" }}>
              {broadcast.title}
            </h2>
          )}
          {broadcast.message && (
            <div className="mt-5 text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(var(--foreground) / 0.82)" }}>
              {broadcast.message}
            </div>
          )}

          {isAdmin ? (
            <div className="mt-8 pt-5 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <button
                onClick={() => setDismissed(true)}
                className="text-sm px-5 py-2 rounded-sm font-medium transition-all hover:opacity-80"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                Close Preview
              </button>
            </div>
          ) : (
            <div
              className="mt-8 pt-5 text-xs text-center"
              style={{ borderTop: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
            >
              Awaiting the Gamemaster's release...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
