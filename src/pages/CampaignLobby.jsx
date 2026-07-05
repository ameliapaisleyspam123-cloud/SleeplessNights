import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appClient, isGlobalAdminEmail } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Check, Copy, Dices, LogIn, RefreshCw, Shield, Swords, UserPlus } from "lucide-react";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CAMPAIGN_PLAYERS = 18;

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function uniqueEmails(emails = []) {
  return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
}

function makeCode() {
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-base text-foreground font-semibold">{label}</Label>
      <div className="mt-2">{children}</div>
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
        setTimeout(() => setCopied(false), 1400);
      }}
      className="inline-flex items-center gap-1 text-xs text-accent hover:text-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeCard({ label, value }) {
  return (
    <div className="border border-border bg-background/55 rounded-sm px-4 py-4 min-w-0">
      <div className="text-[11px] uppercase tracking-[0.24em] text-accent mb-2">{label}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-xl font-bold tracking-[0.16em] text-foreground">{value}</div>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export default function CampaignLobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [mode, setMode] = useState("join");
  const [accountMode, setAccountMode] = useState("create");
  const [campaignName, setCampaignName] = useState("Sleepless Nights");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("Player");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [dmCode, setDmCode] = useState(() => makeCode());
  const [playerCode, setPlayerCode] = useState(() => makeCode());
  const [message, setMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);

  const load = async () => {
    const [me, allCampaigns] = await Promise.all([appClient.auth.me().catch(() => null), appClient.entities.Campaign.list("-created_date", 100)]);
    setSyncStatus(appClient.system.getSyncStatus());
    setUser(me);
    setCampaigns(allCampaigns);
    if (me) {
      setEmail(me.email || "");
      setDisplayName(me.display_name || me.full_name || "Player");
      setAccountMode("signed-in");
    }
  };

  useEffect(() => {
    const remembered = appClient.auth.rememberedAccount();
    if (remembered) {
      setEmail(remembered.email || "");
      setPassword(remembered.password || "");
      setConfirmPassword(remembered.password || "");
      setDisplayName(remembered.display_name || remembered.email || "Player");
      setKeepSignedIn(true);
      setAccountMode("sign-in");
    }
    load();
  }, []);

  const activeEmail = user?.email || "";
  const isGlobalAdmin = isGlobalAdminEmail(activeEmail);
  const yourCampaigns = useMemo(() => {
    if (!activeEmail) return [];
    if (isGlobalAdmin) return campaigns;
    return campaigns.filter((campaign) => campaign.dm_email === activeEmail || campaign.player_emails?.includes(activeEmail) || campaign.id === user?.campaign_id);
  }, [activeEmail, campaigns, user, isGlobalAdmin]);
  const joinPreviewCampaign = useMemo(() => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return null;
    return campaigns.find((item) => item.dm_code === code || item.player_code === code) || null;
  }, [campaigns, joinCode]);

  const loginDetails = () => ({
    email: user?.email || email.trim().toLowerCase(),
    display_name: displayName.trim() || user?.display_name || user?.full_name || email.trim().toLowerCase(),
  });

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || cleanEmail;

    if (!cleanEmail) {
      setMessage("Enter an email for your account.");
      return;
    }

    try {
      const nextUser =
        accountMode === "create"
          ? await appClient.auth.createAccount({
              email: cleanEmail,
              password,
              full_name: cleanName,
              display_name: cleanName,
              keepSignedIn,
            })
          : await appClient.auth.login({
              email: cleanEmail,
              password,
              full_name: cleanName,
              display_name: cleanName,
              keepSignedIn,
            });

      setUser(nextUser);
      setDisplayName(nextUser.display_name || nextUser.full_name || cleanName);
      setPassword("");
      setConfirmPassword("");
      setAccountMode("signed-in");
      await load();
    } catch (error) {
      setMessage(error.message || "Something went wrong with your account.");
    }
  };

  const createAccount = async (event) => {
    if (accountMode === "create" && password !== confirmPassword) {
      event.preventDefault();
      setMessage("Passwords need to match.");
      return;
    }
    await handleAccountSubmit(event);
  };

  const enterCampaign = async (campaign, role) => {
    const login = loginDetails();
    if (!login.email) {
      setMessage("Create or sign in to an account first.");
      return;
    }
    await appClient.auth.switchCampaign({
      ...login,
      campaign_id: campaign.id,
      campaign_role: role,
      role: role === "dm" ? "admin" : "user",
    });
    await load();
    navigate("/");
  };

  const enterKnownCampaign = (campaign) => {
    const role = isGlobalAdmin || campaign.dm_email === activeEmail || user?.campaign_role === "dm" ? "dm" : "player";
    enterCampaign(campaign, role);
  };

  const createCampaign = async () => {
    setMessage("");
    const login = loginDetails();
    if (!login.email) {
      setMessage("Create or sign in to an account first.");
      return;
    }
    const campaign = await appClient.entities.Campaign.create({
      name: campaignName.trim() || "Sleepless Nights",
      description: description.trim(),
      dm_code: dmCode,
      player_code: playerCode,
      dm_email: login.email,
      player_emails: [],
      active: true,
    });
    await enterCampaign(campaign, "dm");
  };

  const joinCampaign = async () => {
    setMessage("");
    const login = loginDetails();
    if (!login.email) {
      setMessage("Create or sign in to an account before joining.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    const campaign = campaigns.find((item) => item.dm_code === code || item.player_code === code);
    if (!campaign) {
      setMessage("No campaign found with that code.");
      return;
    }

    const role = campaign.dm_code === code ? "dm" : "player";
    const playerEmails = uniqueEmails(campaign.player_emails || []);
    if (role === "player" && !playerEmails.includes(login.email) && playerEmails.length >= MAX_CAMPAIGN_PLAYERS) {
      setMessage(`This campaign already has the maximum of ${MAX_CAMPAIGN_PLAYERS} players.`);
      return;
    }
    if (role === "player" && !playerEmails.includes(login.email)) {
      await appClient.entities.Campaign.update(campaign.id, {
        player_emails: [...playerEmails, login.email],
      });
    } else if (role === "player" && playerEmails.length !== (campaign.player_emails || []).length) {
      await appClient.entities.Campaign.update(campaign.id, { player_emails: playerEmails });
    }

    await enterCampaign(campaign, role);
  };

  const regenerateCodes = () => {
    setDmCode(makeCode());
    setPlayerCode(makeCode());
  };

  return (
    <main className="min-h-screen parchment flex justify-center px-5 py-10">
      <div className="w-full max-w-[560px]">
        <header className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-sm bg-primary text-primary-foreground flex items-center justify-center sculk-glow mb-5">
            <Swords className="w-9 h-9" strokeWidth={1.8} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl leading-tight text-foreground">The Grimoire</h1>
          <p className="text-muted-foreground text-lg mt-2">Your D&D campaign hub</p>
        </header>

        {syncStatus && !syncStatus.connected && (
          <div className="mb-6 border border-destructive/40 bg-destructive/10 rounded-sm p-3 text-sm text-foreground">
            <div className="font-semibold">Shared storage is offline</div>
            <div className="text-muted-foreground mt-1">{syncStatus.message}</div>
          </div>
        )}

        <section className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-3">Create Account</div>
          <div className="border border-border bg-card/70 rounded-sm p-4 md:p-5">
            {user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-foreground truncate">{user.display_name || user.full_name || "Adventurer"}</div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                </div>
                <Button variant="outline" onClick={() => appClient.auth.logout()} className="shrink-0">
                  Sign Out
                </Button>
              </div>
            ) : (
              <form onSubmit={createAccount} className="space-y-4">
                <div className="grid grid-cols-2 border border-border rounded-sm overflow-hidden">
                  <button type="button" onClick={() => setAccountMode("create")} className={`h-11 text-sm font-semibold transition-colors ${accountMode === "create" ? "bg-primary text-primary-foreground" : "bg-background/35 text-muted-foreground hover:text-foreground"}`}>
                    Create
                  </button>
                  <button type="button" onClick={() => setAccountMode("sign-in")} className={`h-11 text-sm font-semibold transition-colors ${accountMode === "sign-in" ? "bg-primary text-primary-foreground" : "bg-background/35 text-muted-foreground hover:text-foreground"}`}>
                    Sign In
                  </button>
                </div>

                <Field label="Display Name">
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Amelia" />
                </Field>
                <Field label="Email">
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="Password">
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choose a password" />
                </Field>
                {accountMode === "create" && (
                  <Field label="Confirm Password">
                    <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your password" />
                  </Field>
                )}
                <button
                  type="button"
                  onClick={() => setKeepSignedIn((value) => !value)}
                  className={`w-full h-11 rounded-sm border flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    keepSignedIn ? "border-accent bg-accent/10 text-accent" : "border-border bg-background/35 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className={`w-4 h-4 ${keepSignedIn ? "opacity-100" : "opacity-30"}`} />
                  Keep me signed in
                </button>
                <Button className="w-full h-12 text-base" type="submit">
                  {accountMode === "create" ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  {accountMode === "create" ? "Create Account" : "Sign In"}
                </Button>
              </form>
            )}
          </div>
        </section>

        {user && (
          <section className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-3">Your Campaigns</div>
          <div className="space-y-2.5">
            {yourCampaigns.length === 0 && (
              <div className="border border-border bg-card/70 rounded-sm p-4 text-sm text-muted-foreground">No campaigns yet. Create one or enter a code below.</div>
            )}
            {yourCampaigns.map((campaign) => {
              const role = isGlobalAdmin ? "Admin" : campaign.dm_email === activeEmail ? "Dungeon Master" : "Player";
              return (
                <button key={campaign.id} onClick={() => enterKnownCampaign(campaign)} className="w-full border border-border bg-card/70 hover:border-accent/60 hover:bg-secondary/70 rounded-sm p-4 text-left transition-colors flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-foreground leading-snug">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{role}</div>
                    {campaign.description?.trim() && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
          </section>
        )}

        {user && (
          <>
            <div className="grid grid-cols-2 border border-border rounded-sm overflow-hidden mb-8">
              <button onClick={() => setMode("join")} className={`h-12 text-base font-semibold transition-colors ${mode === "join" ? "bg-primary text-primary-foreground" : "bg-card/50 text-muted-foreground hover:text-foreground"}`}>
                Join Campaign
              </button>
              <button onClick={() => setMode("create")} className={`h-12 text-base font-semibold transition-colors ${mode === "create" ? "bg-primary text-primary-foreground" : "bg-card/50 text-muted-foreground hover:text-foreground"}`}>
                Create Campaign
              </button>
            </div>

            <div className="space-y-5">
              <div className="border border-border bg-card/50 rounded-sm p-4 text-sm text-muted-foreground">
                Campaign access will use <span className="text-foreground font-medium">{user.display_name || user.full_name}</span> at <span className="text-foreground font-medium">{user.email}</span>.
              </div>

              {mode === "join" ? (
                <>
                  <Field label="Enter Code">
                    <Input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABCXYZ" className="text-center font-mono tracking-[0.35em] uppercase" />
                  </Field>
                  {joinPreviewCampaign && (
                    <div className="border border-border bg-card/70 rounded-sm p-4">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-accent mb-1">Campaign Preview</div>
                      <div className="text-lg font-semibold text-foreground">{joinPreviewCampaign.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Players: {uniqueEmails(joinPreviewCampaign.player_emails || []).length}/{MAX_CAMPAIGN_PLAYERS}
                      </div>
                      {joinPreviewCampaign.description?.trim() ? (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{joinPreviewCampaign.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2 italic">No description provided.</p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">DM code joins as Dungeon Master. Player code joins as a Player.</p>
                  <Button className="w-full h-12 text-base" onClick={joinCampaign}>
                    <Dices className="w-5 h-5" /> Enter the Realm
                  </Button>
                </>
              ) : (
                <>
                  <Field label="Campaign Name">
                    <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="The Curse of Strahd..." />
                  </Field>
                  <Field label="Description (optional)">
                    <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A gothic horror adventure..." className="min-h-[74px]" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <CodeCard label="DM Code" value={dmCode} />
                    <CodeCard label="Player Code" value={playerCode} />
                  </div>
                  <Button variant="outline" className="w-full h-10" onClick={regenerateCodes}>
                    <RefreshCw className="w-4 h-4" /> Regenerate Codes
                  </Button>
                  <Button className="w-full h-12 text-base" onClick={createCampaign}>
                    <Shield className="w-5 h-5" /> Forge Campaign
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {message && <div className="mt-5 border border-border bg-secondary/50 rounded-sm p-3 text-sm text-muted-foreground">{message}</div>}
      </div>
    </main>
  );
}
