import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image, Loader2, Radio, Users, Video, X } from "lucide-react";

function videoPreview(url = "") {
  const clean = url.trim();
  if (!clean) return null;
  const directVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(clean) || clean.startsWith("data:video/");
  if (directVideo) return { type: "video", url: clean };
  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return { type: "embed", url: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return { type: "embed", url: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return { type: "embed", url: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    return { type: "video", url: clean };
  }
  return { type: "video", url: clean };
}

export default function Broadcast() {
  const [broadcast, setBroadcast] = useState({ title: "", message: "", image_url: "", video_url: "", active: false });
  const [users, setUsers] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [list, me] = await Promise.all([
      appClient.entities.Broadcast.list("-updated_date", 1),
      appClient.auth.me().catch(() => null),
    ]);
    if (list[0]) setBroadcast(list[0]);
    if (me?.campaign_id) {
      const allUsers = await appClient.entities.User.filter({ campaign_id: me.campaign_id }, "display_name", 200).catch(() => []);
      setUsers(allUsers.filter((user) => user.email !== me.email && user.role !== "admin"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (active = broadcast.active) => {
    const payload = { ...broadcast, active };
    const saved = broadcast.id ? await appClient.entities.Broadcast.update(broadcast.id, payload) : await appClient.entities.Broadcast.create(payload);
    setBroadcast(saved);
  };

  const set = (key, value) => setBroadcast((current) => ({ ...current, [key]: value }));
  const targets = broadcast.target_emails || [];

  const toggleTarget = (email) => {
    set("target_emails", targets.includes(email) ? targets.filter((target) => target !== email) : [...targets, email]);
  };

  const uploadMedia = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      if (file.type.startsWith("video/")) {
        setBroadcast((current) => ({ ...current, video_url: file_url, image_url: "" }));
      } else {
        setBroadcast((current) => ({ ...current, image_url: file_url, video_url: "" }));
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const clearMedia = () => setBroadcast((current) => ({ ...current, image_url: "", video_url: "" }));
  const hasMedia = broadcast.image_url || broadcast.video_url;
  const video = videoPreview(broadcast.video_url || "");

  return (
    <div className="p-6 lg:p-10">
      <PageHeader eyebrow="Gamemaster" title="Override Broadcast" description="Push a message, image, video, or alert to all players - or select specific ones." />

      <div className="max-w-4xl border border-border bg-card/45 rounded-sm p-4 md:p-6 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Title</Label>
          <Input
            value={broadcast.title || ""}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Scene change, announcement..."
            className="h-11 bg-background/70 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Message</Label>
          <Textarea
            value={broadcast.message || ""}
            onChange={(event) => set("message", event.target.value)}
            placeholder="The ancient doors creak open, revealing..."
            className="min-h-[122px] bg-secondary/60 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Image / Video</Label>
          {hasMedia ? (
            <div className="relative rounded-sm overflow-hidden border border-border bg-background/70">
              {video?.type === "video" ? (
                <video src={video.url} controls playsInline className="w-full max-h-[360px] bg-black" />
              ) : video?.type === "embed" ? (
                <div className="aspect-video bg-black">
                  <iframe src={video.url} title="Broadcast video preview" allow="encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full border-0" />
                </div>
              ) : (
                <img src={broadcast.image_url} alt={broadcast.title || "Broadcast media"} className="w-full max-h-[360px] object-cover" />
              )}
              <button type="button" onClick={clearMedia} className="absolute top-2 right-2 h-8 px-2 rounded-sm bg-background/90 border border-border text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 min-h-[72px] rounded-sm border border-dashed border-border bg-background/35 px-5 cursor-pointer hover:border-accent/70 hover:bg-accent/5 transition-all text-muted-foreground">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Image className="w-5 h-5 text-accent" />}
              <span>{uploading ? "Uploading..." : "Click to upload an image or video"}</span>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
            </label>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              value={broadcast.image_url || ""}
              onChange={(event) => setBroadcast((current) => ({ ...current, image_url: event.target.value, video_url: event.target.value ? "" : current.video_url }))}
              placeholder="Paste image URL..."
              className="bg-background/60"
            />
            <Input
              value={broadcast.video_url || ""}
              onChange={(event) => setBroadcast((current) => ({ ...current, video_url: event.target.value, image_url: event.target.value ? "" : current.image_url }))}
              placeholder="Paste video URL..."
              className="bg-background/60"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            Target Players <span className="normal-case tracking-normal">(leave empty = everyone)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {users.length === 0 && <div className="text-sm text-muted-foreground">No players found.</div>}
            {users.map((user) => {
              const selected = targets.includes(user.email);
              return (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => toggleTarget(user.email)}
                  className={`px-3 py-2 rounded-sm border text-sm transition-all ${
                    selected ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-accent/60"
                  }`}
                >
                  {user.display_name || user.full_name || user.email}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => save(true)} className="flex-1 h-11 text-base">
            <Radio className="w-4 h-4" /> Broadcast Override
          </Button>
          <Button variant="outline" onClick={() => save(false)} className="h-11">
            Deactivate
          </Button>
          <div className={`px-3 h-11 rounded-sm border flex items-center justify-center gap-2 text-sm ${broadcast.active ? "border-accent/60 text-accent bg-accent/10" : "border-border text-muted-foreground"}`}>
            {broadcast.active ? <Video className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            {broadcast.active ? "Live" : "Inactive"}
          </div>
        </div>
      </div>
    </div>
  );
}
