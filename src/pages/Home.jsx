import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { ScrollText, MessageSquare, Radio, ArrowUpRight, User, Lock, Swords, NotebookPen, Store } from "lucide-react";
import { useCampaign } from "@/hooks/useCampaign";
import PageHeader from "@/components/PageHeader";

export default function Home() {
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState({ lore: 0, docs: 0, messages: 0, characters: 0, shops: 0 });
  const { campaign } = useCampaign();

  useEffect(() => {
    appClient.auth.me()
      .then((currentUser) => {
        setUser(currentUser);
        if (!currentUser?.campaign_id) return;
        const cid = currentUser.campaign_id;
        Promise.all([
          appClient.entities.LoreEntry.filter({ campaign_id: cid }, "-created_date", 500),
          appClient.entities.Document.filter({ campaign_id: cid }, "-created_date", 500),
          appClient.entities.Message.filter({ campaign_id: cid }, "-created_date", 500),
          appClient.entities.CharacterSheet.filter({ campaign_id: cid }, "-created_date", 500),
          appClient.entities.Shop.filter({ campaign_id: cid }, "-created_date", 500),
        ]).then(([lore, docs, messages, characters, shops]) => setCounts({ lore: lore.length, docs: docs.length, messages: messages.length, characters: characters.length, shops: shops.length }));
      })
      .catch(() => {});
  }, []);

  const isAdmin = user?.campaign_role === "dm";
  const role = user?.campaign_role;

  const tiles = [
    { to: "/lore", icon: ScrollText, title: "Lore & Maps", count: counts.lore, label: "entries", desc: "Chronicle your world, maps, places, and events." },
    { to: "/characters", icon: User, title: "Characters", count: counts.characters, label: "sheets", desc: "Track your party's heroes, stats, and stories." },
    { to: "/shop", icon: Store, title: "Shop", count: counts.shops, label: "stores", desc: "Buy supplies, spend coin, and keep a DM receipt trail." },
    { to: "/chat", icon: MessageSquare, title: "Correspondence", count: counts.messages, label: "messages", desc: "Speak to the assembly or whisper to one." },
    { to: "/notes", icon: NotebookPen, title: "Grimoire", count: null, label: "", desc: "Private field notes, session logs, and secrets." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-10 py-8 md:py-16">
      <PageHeader
        eyebrow={campaign ? `Campaign: ${campaign.name}` : ""}
        title={<>Hail, <em className="font-medium">{user?.display_name || user?.full_name?.split(" ")[0] || "Adventurer"}</em>.</>}
        description={role === "dm" ? "You are the Dungeon Master. Your word shapes the world." : "Your hall of records, lore, archives, and counsel await."}
      />

      {!campaign && (
        <div className="mb-6 border border-dashed border-accent/40 rounded-sm p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg">No campaign active</div>
            <p className="text-sm text-muted-foreground mt-0.5">Create or join a campaign to get started.</p>
          </div>
          <Link to="/campaign" className="text-sm px-4 py-2 rounded-sm border border-accent/50 text-accent hover:bg-accent/10 transition-all whitespace-nowrap">
            <Swords className="w-4 h-4 inline mr-1.5" /> Campaign
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {tiles.map((tile, index) => (
          <Link key={tile.to} to={tile.to} className={`group relative overflow-hidden rounded-sm border border-border bg-card hover:border-accent/60 active:bg-accent/10 transition-all p-4 md:p-6 min-h-[140px] md:min-h-[180px] flex flex-col ${tiles.length % 4 !== 0 && index === tiles.length - 1 ? "lg:col-span-2" : ""}`}>
            <div className="flex items-start justify-between">
              <tile.icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-auto">
              <div className="font-display text-xl md:text-2xl">{tile.title}</div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed hidden sm:block">{tile.desc}</p>
              <div className="mt-2 md:mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
                {tile.count !== null ? (
                  <>
                    <span className="text-foreground font-medium">{tile.count}</span> {tile.label}
                  </>
                ) : (
                  <span className="invisible">0 entries</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-3 md:mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
          <Link to="/vault" className="group relative overflow-hidden rounded-sm border border-border bg-card hover:border-accent/60 active:bg-accent/10 transition-all p-4 md:p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Lock className="w-5 h-5 text-accent shrink-0" />
              <div>
                <div className="font-display text-lg md:text-xl">DM Vault</div>
                <div className="text-xs md:text-sm opacity-70 text-muted-foreground">Sealed documents, your eyes only.</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
          <Link to="/broadcast" className="group relative overflow-hidden rounded-sm border border-accent/40 bg-primary text-primary-foreground p-4 md:p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Radio className="w-5 h-5 text-accent shrink-0" />
              <div>
                <div className="font-display text-lg md:text-xl">Gamemaster Override</div>
                <div className="text-xs md:text-sm opacity-70">Take command of every viewer's screen.</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}
