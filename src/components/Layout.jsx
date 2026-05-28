import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, Navigate, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import {
  ScrollText,
  MessageSquare,
  Radio,
  Home,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sword,
  User,
  Lock,
  Swords,
  Pencil,
  Settings,
  NotebookPen,
  Columns,
  Dices,
  Store,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BroadcastOverlay from "./broadcast/BroadcastOverlay";
import CombatTurnIndicator from "./initiative/CombatTurnIndicator";
import InitiativeTracker from "./initiative/InitiativeTracker";
import DiceRoller from "./DiceRoller";
import ProfileNameModal from "./ProfileNameModal";
import CampaignSettingsModal from "./CampaignSettingsModal";
import ThemeSettingsModal from "./ThemeSettingsModal";
import { InitiativeProvider, useInitiative } from "@/lib/InitiativeContext";

const PLAYER_NAV = [
  { to: "/", label: "Hearth", icon: Home },
  { to: "/characters", label: "Characters", icon: User },
  { to: "/chat", label: "Correspondence", icon: MessageSquare },
  { to: "/lore", label: "Lore & Maps", icon: ScrollText },
  { to: "/notes", label: "Grimoire", icon: NotebookPen },
  { to: "/shop", label: "Shop", icon: Store },
];

const GM_NAV = [
  { to: "/", label: "Hearth", icon: Home },
  { to: "/broadcast", label: "Override", icon: Radio, gmOnly: true },
  { to: "/characters", label: "Characters", icon: User },
  { to: "/chat", label: "Correspondence", icon: MessageSquare },
  { to: "/lore", label: "Lore & Maps", icon: ScrollText },
  { to: "/notes", label: "Grimoire", icon: NotebookPen },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/vault", label: "DM Vault", icon: Lock, gmOnly: true },
];

export default function Layout() {
  return (
    <InitiativeProvider>
      <LayoutInner />
    </InitiativeProvider>
  );
}

function LayoutInner() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const location = useLocation();
  const { splitOpen, setSplitOpen, setCampaignId, campaignId } = useInitiative();

  const loadUser = () =>
    appClient.auth
      .me()
      .then((u) => {
        setUser(u);
        setUserLoaded(true);
        return u;
      })
      .catch(() => setUserLoaded(true));

  const loadCampaign = (u) => {
    if (!u?.campaign_id) return;
    setCampaignId(u.campaign_id);
    appClient.entities.Campaign.list("-created_date", 50)
      .then((all) => setCampaign(all.find((c) => c.id === u.campaign_id) || null))
      .catch(() => {});
  };

  useEffect(() => {
    loadUser().then((u) => {
      if (u) loadCampaign(u);
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const toggleDice = () => setDiceOpen((open) => !open);
    window.addEventListener("toggle-dice-roller", toggleDice);
    return () => window.removeEventListener("toggle-dice-roller", toggleDice);
  }, []);

  const SUPERUSER_EMAIL = "ameliapaisleyspam123@gmail.com";
  const isSuperuser = user?.email === SUPERUSER_EMAIL;
  const isAdmin = user?.campaign_role === "dm" || user?.role === "admin" || isSuperuser;
  const NAV = isAdmin ? GM_NAV : PLAYER_NAV;

  if (!userLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.campaign_id) return <Navigate to="/campaign" replace />;

  const handleCampaignSaved = () => {
    loadUser().then((u) => {
      if (u) loadCampaign(u);
    });
  };

  const sidebarProps = {
    isAdmin,
    user,
    campaign,
    nav: NAV,
    collapsed,
    onToggleCollapse: () => setCollapsed((c) => !c),
    onEditName: () => setNameModalOpen(true),
    onCampaignSettings: () => setCampaignModalOpen(true),
    onThemeSettings: () => setThemeModalOpen(true),
  };

  return (
    <div className="h-screen overflow-hidden parchment flex">
      <aside className={`hidden lg:flex shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-sm transition-all duration-300 sticky top-0 h-screen overflow-hidden ${collapsed ? "w-[80px]" : "w-[280px]"}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-display text-lg shrink-0">⚔</div>
          <span className="font-display text-base tracking-wide truncate">{campaign?.name || "The Grimoire"}</span>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setMobileOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-80 max-w-[85vw] bg-card border-r border-border flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-display text-lg shrink-0">⚔</div>
                <span className="font-display text-base truncate">{campaign?.name || "The Grimoire"}</span>
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <Button variant="ghost" size="icon" onClick={() => setCampaignModalOpen(true)} title="Campaign Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setThemeModalOpen(true)} title="Colour Scheme">
                  <Palette className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll">
              <SidebarContent {...sidebarProps} collapsed={false} onToggleCollapse={() => {}} />
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>

      {isAdmin && splitOpen && campaignId && (
        <aside className="hidden lg:flex flex-col w-[400px] shrink-0 border-l border-border bg-card/40 backdrop-blur-sm sticky top-0 h-screen overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 shrink-0">
            <span className="text-sm font-medium text-accent flex items-center gap-2">
              <Swords className="w-4 h-4" /> Initiative Tracker
            </span>
            <button onClick={() => setSplitOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll p-4">
            <InitiativeTracker campaignId={campaignId} />
          </div>
        </aside>
      )}

      <BroadcastOverlay user={user} />
      <CombatTurnIndicator currentUser={user} sidebarCollapsed={collapsed} />
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setSplitOpen((open) => !open)}
            className={`hidden lg:flex h-11 px-4 rounded-sm border shadow-lg items-center gap-2 text-sm font-medium transition-all ${
              splitOpen ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:border-accent/70 hover:text-accent"
            }`}
            title="Toggle initiative tracker"
          >
            <Columns className="w-4 h-4" />
            Initiative
          </button>
        )}
        <button
          type="button"
          onClick={() => setDiceOpen((open) => !open)}
          className={`h-11 px-4 rounded-sm border shadow-lg flex items-center gap-2 text-sm font-medium transition-all ${
            diceOpen ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:border-accent/70 hover:text-accent"
          }`}
          title="Open dice roller"
        >
          <Dices className="w-4 h-4" />
          Dice
        </button>
      </div>
      {diceOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] h-[min(38rem,calc(100vh-6rem))] overflow-hidden rounded-sm border border-border bg-card shadow-2xl sculk-glow">
          <DiceRoller onClose={() => setDiceOpen(false)} />
        </div>
      )}
      <ProfileNameModal open={nameModalOpen} onOpenChange={setNameModalOpen} currentUser={user} onSaved={loadUser} />
      {isAdmin && <CampaignSettingsModal open={campaignModalOpen} onOpenChange={setCampaignModalOpen} campaign={campaign} onSaved={handleCampaignSaved} />}
      <ThemeSettingsModal open={themeModalOpen} onOpenChange={setThemeModalOpen} />
    </div>
  );
}

function SidebarContent({
  isAdmin,
  user,
  campaign,
  nav,
  collapsed,
  onToggleCollapse,
  onEditName,
  onCampaignSettings,
  onThemeSettings,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`hidden lg:flex items-center border-b border-border/60 shrink-0 ${collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-display text-lg shrink-0">⚔</div>
            <div className="min-w-0">
              <div className="font-display text-base leading-none truncate">{campaign?.name || "The Grimoire"}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Campaign Hub</div>
            </div>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-display text-lg">⚔</div>}
        <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground transition-colors" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className={`mx-3 mt-3 mb-1 px-3 py-2 rounded-sm flex items-center gap-2 shrink-0 ${isAdmin ? "bg-accent/10 border border-accent/30" : "bg-secondary border border-border"}`}>
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-accent shrink-0" /> : <Sword className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className={`text-[10px] uppercase tracking-widest font-medium ${isAdmin ? "text-accent" : "text-muted-foreground"}`}>
              {isAdmin ? "Gamemaster" : "Player"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 mb-2">
            {isAdmin && (
              <button onClick={onCampaignSettings} className="text-muted-foreground hover:text-accent transition-colors" title="Campaign Settings">
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={onThemeSettings} className="text-muted-foreground hover:text-accent transition-colors" title="Colour Scheme">
              <Palette className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {collapsed && isAdmin && (
        <div className="flex justify-center mt-3 mb-1 shrink-0">
          <Shield className="w-4 h-4 text-accent" />
        </div>
      )}

      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-sm text-sm transition-all ${collapsed ? "justify-center px-2 py-3" : "px-3 py-2"} ${
                isActive ? "bg-primary text-primary-foreground sculk-glow" : "text-foreground/70 hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span>{item.label}</span>
                {item.gmOnly && <span className="ml-auto text-[9px] uppercase tracking-widest opacity-60">DM</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`mt-auto border-t border-border/60 bg-card/30 p-3 shrink-0 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <div className="flex items-center gap-1 group">
              <div className="text-sm font-medium truncate flex-1">{user.display_name || user.full_name}</div>
              <button onClick={onEditName} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <div className={`text-[9px] uppercase tracking-widest font-medium mt-0.5 ${isAdmin ? "text-accent" : "text-muted-foreground"}`}>
              {isAdmin ? "⚔ DM" : "Player"}
            </div>
          </div>
        )}

        <Link to="/campaign" className={`flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors mb-1 px-1 ${collapsed ? "justify-center" : ""}`} title="Switch Campaign">
          <Swords className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>Switch Campaign</span>}
        </Link>
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className={`text-muted-foreground ${collapsed ? "" : "w-full justify-start"}`} onClick={() => appClient.auth.logout()} title="Depart">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Depart</span>}
        </Button>
      </div>
    </div>
  );
}
