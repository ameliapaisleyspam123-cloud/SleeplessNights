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
        ]).then(([lore, docs, messages, characters, shops]) => {
          const read = JSON.parse(localStorage.getItem("chat_read") || "{}");
          const isDm = currentUser.campaign_role === "dm" || currentUser.role === "admin";
          const newMessages = messages.filter((message) => {
            if (message.created_by === currentUser.email) return false;
            const visible = isDm || message.channel === "group" || message.channel?.split("|").includes(currentUser.email);
            if (!visible) return false;
            const lastRead = read[message.channel] || 0;
            return new Date(message.created_date || 0).getTime() > lastRead;
          });
          setCounts({ lore: lore.filter((entry) => entry.visibility !== "dm_only").length, docs: docs.filter((doc) => doc.visibility === "public").length, messages: newMessages.length, characters: characters.length, shops: shops.length });
        });
      })
      .catch(() => {});
  }, []);

  const isAdmin = user?.campaign_role === "dm" || user?.role === "admin";
  const role = user?.campaign_role;

  const baseTiles = [
    { to: "/lore", icon: ScrollText, title: "Lore & Maps", count: counts.lore, label: "entries", desc: "Chronicle your world, maps, places, and events." },
    { to: "/characters", icon: User, title: "Characters", count: counts.characters, label: "sheets", desc: "Track your party's heroes, stats, and stories." },
    { to: "/chat", icon: MessageSquare, title: "Correspondence", count: counts.messages, label: "new", desc: "New hall messages and whispers since you last checked." },
    { to: "/notes", icon: NotebookPen, title: "Grimoire", count: null, label: "", desc: "Private field notes, session logs, and secrets." },
    { to: "/shop", icon: Store, title: "Shop", count: counts.shops, label: "stores", desc: "Buy supplies, spend coin, and keep a DM receipt trail." },
    { to: "/campaign", icon: Swords, title: "Campaign", count: null, label: "", desc: "Switch realms, join a table, or review your campaign access." },
  ];
  const dmTiles = [
    { to: "/vault", icon: Lock, title: "DM Vault", count: null, label: "", desc: "Sealed documents, past overrides, and campaign management." },
    { to: "/broadcast", icon: Radio, title: "Gamemaster Override", count: null, label: "", desc: "Take command of every viewer's screen.", featured: true },
  ];
  const tiles = isAdmin ? [...baseTiles, ...dmTiles] : baseTiles;
  const tileGridClass = isAdmin ? "grid sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5" : "grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5 max-w-5xl mx-auto";

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

      <div className={tileGridClass}>
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className={`group relative overflow-hidden rounded-sm border transition-all p-4 md:p-6 min-h-[168px] md:min-h-[190px] flex flex-col ${
              tile.featured
                ? "border-accent/50 bg-primary text-primary-foreground hover:border-accent"
                : "border-border bg-card hover:border-accent/60 active:bg-accent/10"
            }`}
          >
            <div className="flex items-start justify-between">
              <tile.icon className={`w-5 h-5 ${tile.featured ? "text-primary-foreground" : "text-accent"}`} strokeWidth={1.5} />
              <ArrowUpRight className={`w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all ${tile.featured ? "text-primary-foreground/70 group-hover:text-primary-foreground" : "text-muted-foreground group-hover:text-accent"}`} />
            </div>
            <div className="mt-auto">
              <div className="font-display text-xl md:text-2xl">{tile.title}</div>
              <p className={`text-xs md:text-sm mt-1 leading-relaxed hidden sm:block ${tile.featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{tile.desc}</p>
              <div className={`mt-2 md:mt-4 text-[11px] uppercase tracking-widest ${tile.featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                {tile.count !== null ? (
                  <>
                    <span className={tile.featured ? "text-primary-foreground font-medium" : "text-foreground font-medium"}>{tile.count}</span> {tile.label}
                  </>
                ) : (
                  <span aria-hidden="true">&nbsp;</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
