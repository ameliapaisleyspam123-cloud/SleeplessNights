import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import ChannelList from "@/components/chat/ChannelList";
import ChatWindow from "@/components/chat/ChatWindow";
import LorePanel from "@/components/chat/LorePanel";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState({ type: "group" });
  const [sideOpen, setSideOpen] = useState(true);

  useEffect(() => {
    appClient.auth.me().then(async (user) => {
      setCurrentUser(user);
      const all = await appClient.entities.User.filter({ campaign_id: user.campaign_id }, "display_name", 200);
      setUsers(all);
    });
  }, []);

  const isAdmin = currentUser?.campaign_role === "dm" || currentUser?.role === "admin";

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <div className="px-6 lg:px-10 pt-6 lg:pt-8 pb-3 border-b border-border/60 shrink-0">
        <PageHeader
          eyebrow="Correspondence"
          title="Correspondence"
          description="Convene with the hall, or whisper to a single soul."
          action={
            !sideOpen && (
              <Button variant="outline" onClick={() => setSideOpen(true)}>
                <ScrollText className="w-4 h-4" /> Lore & Characters
              </Button>
            )
          }
        />
      </div>

      <div className={`min-h-0 flex-1 grid overflow-x-auto ${sideOpen ? "grid-cols-[240px_minmax(420px,1fr)_340px] xl:grid-cols-[296px_minmax(0,1fr)_376px]" : "grid-cols-[240px_minmax(420px,1fr)] md:grid-cols-[280px_1fr]"}`}>
        <aside className="border-r border-border min-h-0">
          <ChannelList users={users} currentUser={currentUser} activeChannel={activeChannel} onSelect={setActiveChannel} isAdmin={isAdmin} />
        </aside>
        <ChatWindow activeChannel={activeChannel} currentUser={currentUser} users={users} isAdmin={isAdmin} />
        {sideOpen && (
          <aside className="flex min-h-0 border-l border-border bg-card/30">
            <LorePanel onClose={() => setSideOpen(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}
