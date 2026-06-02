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
  const [sideOpen, setSideOpen] = useState(() => (typeof window === "undefined" ? true : window.innerWidth >= 1024));

  useEffect(() => {
    appClient.auth.me().then(async (user) => {
      setCurrentUser(user);
      const all = await appClient.entities.User.filter({ campaign_id: user.campaign_id }, "display_name", 200);
      setUsers(all);
    });
  }, []);

  const isAdmin = currentUser?.campaign_role === "dm" || currentUser?.role === "admin";

  return (
    <div className="h-[calc(100dvh-3.5rem)] lg:h-screen flex flex-col overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-8 pb-3 border-b border-border/60 shrink-0">
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

      <div className={`min-h-0 flex-1 grid overflow-hidden ${sideOpen ? "grid-cols-1 grid-rows-[auto_minmax(0,1fr)_minmax(16rem,42vh)] lg:grid-rows-none lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,340px)] xl:grid-cols-[minmax(0,296px)_minmax(0,1fr)_minmax(0,376px)]" : "grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-none md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"}`}>
        <aside className="border-b lg:border-b-0 lg:border-r border-border min-h-0 max-h-48 lg:max-h-none overflow-hidden">
          <ChannelList users={users} currentUser={currentUser} activeChannel={activeChannel} onSelect={setActiveChannel} isAdmin={isAdmin} />
        </aside>
        <ChatWindow activeChannel={activeChannel} currentUser={currentUser} users={users} isAdmin={isAdmin} />
        {sideOpen && (
          <aside className="flex min-h-0 border-t lg:border-t-0 lg:border-l border-border bg-card/30 overflow-hidden">
            <LorePanel onClose={() => setSideOpen(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}
