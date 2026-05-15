import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Broadcast() {
  const [broadcast, setBroadcast] = useState({ title: "", message: "", image_url: "", video_url: "", active: false });

  const load = async () => {
    const list = await appClient.entities.Broadcast.list("-updated_date", 1);
    if (list[0]) setBroadcast(list[0]);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (active = broadcast.active) => {
    const payload = { ...broadcast, active };
    const saved = broadcast.id ? await appClient.entities.Broadcast.update(broadcast.id, payload) : await appClient.entities.Broadcast.create(payload);
    setBroadcast(saved);
  };

  return (
    <div className="p-6 lg:p-10">
      <PageHeader eyebrow="Gamemaster" title="Broadcast Override" description="Send a full-screen announcement to the table." />
      <div className="max-w-2xl space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={broadcast.title || ""} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={broadcast.message || ""} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} />
        </div>
        <div>
          <Label>Image URL</Label>
          <Input value={broadcast.image_url || ""} onChange={(e) => setBroadcast({ ...broadcast, image_url: e.target.value })} />
        </div>
        <div>
          <Label>Video URL</Label>
          <Input value={broadcast.video_url || ""} onChange={(e) => setBroadcast({ ...broadcast, video_url: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save(true)}>Activate</Button>
          <Button variant="outline" onClick={() => save(false)}>Deactivate</Button>
        </div>
      </div>
    </div>
  );
}
