import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channel } = await req.json();

    if (!channel) {
      return Response.json({ error: "Missing channel" }, { status: 400 });
    }

    if (!user.campaign_id) {
      return Response.json({ error: "No active campaign" }, { status: 403 });
    }

    if (channel !== "group" && channel.includes("|")) {
      const participants = channel.split("|");
      const isAdmin = user.role === "admin";

      if (!isAdmin && !participants.includes(user.email)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const messages = await base44.asServiceRole.entities.Message.filter(
      {
        campaign_id: user.campaign_id,
        channel,
      },
      "created_date",
      500,
    );

    return Response.json({ messages });
  } catch (error) {
    console.error("getMessages error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
