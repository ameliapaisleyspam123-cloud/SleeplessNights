import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Sword, Copy, Check, LogOut } from "lucide-react";

function makeCode(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1 text-xs text-accent hover:text-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function CampaignLobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignName, setCampaignName] = useState("Sleepless Nights");
  const [displayName, setDisplayName] = useState("Player");
  const [email, setEmail] = useState("");
  const [dmCode, setDmCode] = useState("");
  const [playerCode, setPlayerCode] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [me, allCampaigns] = await Promise.all([appClient.auth.me().catch(() => null), appClient.entities.Campaign.list("-created_date", 100)]);
    setUser(me);
    setCampaigns(allCampaigns);
    if (me) {
      setEmail(me.email || "");
      setDisplayName(me.display_name || me.full_name || "Player");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const currentCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === user?.campaign_id), [campaigns, user]);

  const loginDetails = () => ({
    email: email.trim().toLowerCase(),
    display_name: displayName.trim() || email.trim().toLowerCase(),
  });

  const createCampaign = async () => {
    setMessage("");
    const login = loginDetails();
    if (!login.email) {
      setMessage("Enter an email for the Dungeon Master login.");
      return;
    }
    const campaign = await appClient.entities.Campaign.create({
      name: campaignName.trim() || "Sleepless Nights",
      dm_code: makeCode("DM"),
      player_code: makeCode("PL"),
      dm_email: login.email,
      player_emails: [],
      active: true,
    });
    await appClient.auth.switchCampaign({
      ...login,
      campaign_id: campaign.id,
      campaign_role: "dm",
      role: "admin",
    });
    await load();
    navigate("/");
  };

  const joinWithCode = async (kind) => {
    setMessage("");
    const login = loginDetails();
    if (!login.email) {
      setMessage("Enter an email before joining.");
      return;
    }
    const code = (kind === "dm" ? dmCode : playerCode).trim().toUpperCase();
    const campaign = campaigns.find((item) => (kind === "dm" ? item.dm_code : item.player_code) === code);
    if (!campaign) {
      setMessage(kind === "dm" ? "No campaign found with that DM code." : "No campaign found with that player code.");
      return;
    }

    if (kind === "player" && !campaign.player_emails?.includes(login.email)) {
      await appClient.entities.Campaign.update(campaign.id, {
        player_emails: [...(campaign.player_emails || []), login.email],
      });
    }

    await appClient.auth.switchCampaign({
      ...login,
      campaign_id: campaign.id,
      campaign_role: kind === "dm" ? "dm" : "player",
      role: kind === "dm" ? "admin" : "user",
    });
    await load();
    navigate("/");
  };

  const signOut = () => {
    appClient.auth.logout();
  };

  return (
    <main className="min-h-screen parchment flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-accent mb-3">Campaign Gateway</div>
            <h1 className="font-display text-4xl md:text-5xl leading-tight">Sleepless Nights</h1>
            {currentCampaign && (
              <p className="text-sm text-muted-foreground mt-2">
                Signed in as {user.display_name || user.email} for <span className="text-foreground">{currentCampaign.name}</span>.
              </p>
            )}
          </div>
          {user && (
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Switch login
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <section className="border border-border bg-card p-5 rounded-sm">
            <div className="flex items-center gap-2 text-accent mb-3">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.24em]">Create as DM</span>
            </div>
            <div className="space-y-4">
              <Field label="DM name">
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="DM email">
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Campaign name">
                <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
              </Field>
              <Button className="w-full" onClick={createCampaign}>
                Create campaign
              </Button>
            </div>
          </section>

          <section className="border border-border bg-card p-5 rounded-sm">
            <div className="flex items-center gap-2 text-accent mb-3">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.24em]">DM Login</span>
            </div>
            <div className="space-y-4">
              <Field label="DM name">
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="DM email">
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="DM code">
                <Input value={dmCode} onChange={(event) => setDmCode(event.target.value.toUpperCase())} placeholder="DMNIGHT" />
              </Field>
              <Button variant="outline" className="w-full" onClick={() => joinWithCode("dm")}>
                Enter as DM
              </Button>
            </div>
          </section>

          <section className="border border-border bg-card p-5 rounded-sm">
            <div className="flex items-center gap-2 text-accent mb-3">
              <Sword className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.24em]">Player Login</span>
            </div>
            <div className="space-y-4">
              <Field label="Player name">
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="Player email">
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Player code">
                <Input value={playerCode} onChange={(event) => setPlayerCode(event.target.value.toUpperCase())} placeholder="NIGHTS" />
              </Field>
              <Button variant="outline" className="w-full" onClick={() => joinWithCode("player")}>
                Enter as player
              </Button>
            </div>
          </section>
        </div>

        {message && <div className="mt-4 border border-border bg-secondary/50 rounded-sm p-3 text-sm text-muted-foreground">{message}</div>}

        {currentCampaign && user?.campaign_role === "dm" && (
          <div className="mt-5 border border-accent/30 bg-accent/5 rounded-sm p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-accent mb-3">Current Campaign Codes</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border border-border bg-card/60 rounded-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">DM code</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-lg tracking-[0.18em]">{currentCampaign.dm_code}</span>
                  <CopyButton value={currentCampaign.dm_code} />
                </div>
              </div>
              <div className="border border-border bg-card/60 rounded-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Player code</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-lg tracking-[0.18em]">{currentCampaign.player_code}</span>
                  <CopyButton value={currentCampaign.player_code} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
