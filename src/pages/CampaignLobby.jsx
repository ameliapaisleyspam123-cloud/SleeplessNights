import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function makeCode(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default function CampaignLobby() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState("Sleepless Nights");
  const [playerName, setPlayerName] = useState("Player");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const load = async () => {
    const [me, allCampaigns] = await Promise.all([appClient.auth.me(), appClient.entities.Campaign.list("-created_date", 100)]);
    setUser(me);
    setEmail(me.email || "");
    setPlayerName(me.display_name || me.full_name || "Player");
    setCampaigns(allCampaigns);
  };

  useEffect(() => {
    load();
  }, []);

  if (user?.campaign_id) return <Navigate to="/" replace />;

  const createCampaign = async () => {
    const campaign = await appClient.entities.Campaign.create({
      name: name.trim() || "Sleepless Nights",
      dm_code: makeCode("DM"),
      player_code: makeCode("PL"),
      dm_email: email,
      player_emails: [],
      active: true,
    });
    await appClient.auth.updateMe({
      email,
      full_name: playerName,
      display_name: playerName,
      campaign_id: campaign.id,
      campaign_role: "dm",
      role: "admin",
    });
    load();
  };

  const joinCampaign = async () => {
    const campaign = campaigns.find((c) => c.player_code === code.trim() || c.dm_code === code.trim());
    if (!campaign) return;
    const isDm = campaign.dm_code === code.trim();
    await appClient.auth.updateMe({
      email,
      full_name: playerName,
      display_name: playerName,
      campaign_id: campaign.id,
      campaign_role: isDm ? "dm" : "player",
      role: isDm ? "admin" : "user",
    });
    load();
  };

  return (
    <main className="min-h-screen parchment flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <section className="border border-border bg-card p-6 rounded-sm">
          <div className="text-[10px] uppercase tracking-[0.28em] text-accent mb-3">Create</div>
          <h1 className="font-display text-4xl leading-tight">Sleepless Nights</h1>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Your name</Label>
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Campaign name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={createCampaign}>
              Create campaign
            </Button>
          </div>
        </section>

        <section className="border border-border bg-card p-6 rounded-sm">
          <div className="text-[10px] uppercase tracking-[0.28em] text-accent mb-3">Join</div>
          <h2 className="font-display text-3xl leading-tight">Enter a campaign code</h2>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Your name</Label>
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Invite code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <Button variant="outline" className="w-full" onClick={joinCampaign}>
              Join campaign
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
