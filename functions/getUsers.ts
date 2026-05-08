import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.campaign_id) {
      return Response.json({ error: "No active campaign" }, { status: 403 });
    }

    const campaigns = await base44.asServiceRole.entities.Campaign.filter({ id: user.campaign_id });
    const campaign = campaigns[0];
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const memberEmails = [campaign.dm_email, ...(campaign.player_emails || [])].filter(Boolean);

    const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 500);
    const users = allUsers.filter((u) => memberEmails.includes(u.email));

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
