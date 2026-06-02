import React, { useEffect, useRef, useState } from "react";
import { appClient, isGlobalAdminEmail } from "@/api/appClient";
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
  const [showAdminToast, setShowAdminToast] = useState(false);
  const adminWasActiveRef = useRef(false);

  const loadUsers = async (user) => {
    const all = await appClient.entities.User.filter({ campaign_id: user.campaign_id }, "display_name", 200);
    setUsers(all);
  };

  useEffect(() => {
    appClient.auth.me().then(async (user) => {
      setCurrentUser(user);
      await loadUsers(user);
    });
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let cancelled = false;
    const markActive = async () => {
      const updated = await appClient.auth.updateMe({ last_seen_at: new Date().toISOString() }).catch(() => null);
      if (!cancelled && updated) {
        setCurrentUser(updated);
        await loadUsers(updated);
      }
    };
    markActive();
    const intervalId = window.setInterval(markActive, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.email || isGlobalAdminEmail(currentUser.email)) return undefined;
    const activeCutoff = Date.now() - 2 * 60 * 1000;
    const adminIsActive = users.some((user) => isGlobalAdminEmail(user.email) && Date.parse(user.last_seen_at || "") >= activeCutoff);
    if (!adminIsActive) {
      adminWasActiveRef.current = false;
      return undefined;
    }
    if (adminWasActiveRef.current) return undefined;
    adminWasActiveRef.current = true;
    setShowAdminToast(true);
    const timeoutId = window.setTimeout(() => setShowAdminToast(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [users, currentUser?.email]);

  const isAdmin = currentUser?.campaign_role === "dm" || currentUser?.role === "admin";
  const openSidePanel = () => setSideOpen(true);
  const closeSidePanel = () => setSideOpen(false);

  return (
    <div className="h-[calc(100dvh-3.5rem)] lg:h-screen flex flex-col overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-10 pt-3 lg:pt-8 pb-3 border-b border-border/60 shrink-0">
        <PageHeader
          eyebrow="Correspondence"
          title="Correspondence"
          description="Convene with the hall, or whisper to a single soul."
          action={
            <Button variant="outline" onClick={openSidePanel} className={`${sideOpen ? "lg:hidden" : ""}`}>
                <ScrollText className="w-4 h-4" /> Lore & Characters
              </Button>
          }
        />
      </div>

      <div className={`min-h-0 flex-1 grid overflow-hidden ${sideOpen ? "grid-cols-1 grid-rows-[5.5rem_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,340px)] xl:grid-cols-[minmax(0,296px)_minmax(0,1fr)_minmax(0,376px)]" : "grid-cols-1 grid-rows-[5.5rem_minmax(0,1fr)] md:grid-rows-none md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"}`}>
        <aside className="border-b lg:border-b-0 lg:border-r border-border min-h-0 overflow-hidden">
          <ChannelList users={users} currentUser={currentUser} activeChannel={activeChannel} onSelect={setActiveChannel} isAdmin={isAdmin} />
        </aside>
        <ChatWindow activeChannel={activeChannel} currentUser={currentUser} users={users} isAdmin={isAdmin} />
        {sideOpen && (
          <aside className="hidden lg:flex min-h-0 border-l border-border bg-card/30 overflow-hidden">
            <LorePanel onClose={closeSidePanel} />
          </aside>
        )}
      </div>
      {sideOpen && (
        <div className="fixed inset-0 z-[70] flex lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={closeSidePanel} aria-label="Close lore panel" />
          <aside className="relative ml-auto flex h-full w-[min(24rem,92vw)] min-h-0 border-l border-border bg-background shadow-2xl">
            <LorePanel onClose={closeSidePanel} />
          </aside>
        </div>
      )}
      {showAdminToast && (
        <div className="fixed left-1/2 top-20 z-[80] -translate-x-1/2 rounded-sm border border-accent/60 bg-background/95 px-4 py-3 text-sm font-medium text-foreground shadow-2xl">
          Admin is here
        </div>
      )}
    </div>
  );
}
