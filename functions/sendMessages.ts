import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, channel, recipient_email, file } = await req.json();

    if ((!content && !file) || !channel) {
      return Response.json({ error: "Missing content or file" }, { status: 400 });
    }

    if (channel !== "group") {
      const participants = channel.split("|");
      if (!participants.includes(user.email)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!user.campaign_id) {
      return Response.json({ error: "No active campaign" }, { status: 403 });
    }

    let file_url = "";
    let file_type = "";

    if (file) {
      console.log("FILE RECEIVED:", {
        name: file?.name,
        type: file?.type,
        size: file?.data?.length,
      });

      if (!file.data) {
        return Response.json({ error: "Invalid file data" }, { status: 400 });
      }

      const MAX_SIZE = 15 * 1024 * 1024;
      const estimatedSize = (file.data.length * 3) / 4;

      if (estimatedSize > MAX_SIZE) {
        return Response.json({ error: "File too large (max 15MB)" }, { status: 400 });
      }

      if (!file.type || !file.type.match(/image|pdf/)) {
        return Response.json({ error: "Only images or PDFs allowed" }, { status: 400 });
      }

      let bytes;
      try {
        bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      } catch (err) {
        console.error("BASE64 DECODE ERROR:", err);
        return Response.json({ error: "File decode failed" }, { status: 400 });
      }

      const upload = await base44.storage.from("chat-files").upload(`${Date.now()}_${file.name}`, bytes, {
        contentType: file.type,
      });

      console.log("UPLOAD RESULT:", upload);

      if (!upload?.data?.publicUrl) {
        console.error("UPLOAD FAILED FULL:", upload);
        return Response.json({ error: "Upload failed" }, { status: 500 });
      }

      file_url = upload.data.publicUrl;
      file_type = file.type.includes("pdf") ? "pdf" : "image";
    }

    const message = await base44.entities.Message.create({
      content: content || "",
      file_url,
      file_type,
      channel,
      recipient_email: recipient_email || "",
      campaign_id: user.campaign_id,
    });

    return Response.json({ message });
  } catch (error) {
    console.error("FULL SEND ERROR:", error);

    return Response.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
});
