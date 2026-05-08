import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Users, User, Paperclip } from "lucide-react";

function channelKey(activeChannel, me) {
  if (activeChannel.type === "group") return "group";
  if (activeChannel.type === "spy") return activeChannel.channel;
  const pair = [me.email, activeChannel.email].sort();
  return `${pair[0]}|${pair[1]}`;
}

export default function ChatWindow({ activeChannel, currentUser, users, isAdmin }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const bottomRef = useRef(null);

  const userByEmail = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.email] = u;
    });
    return map;
  }, [users]);

  const key = currentUser ? channelKey(activeChannel, currentUser) : null;

  const load = async () => {
    if (!key) return;
    const res = await base44.functions.invoke("getMessages", { channel: key });
    setMessages(res.data?.messages || []);
  };

  useEffect(() => {
    load();
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel === key || event.type === "delete") {
        load();
      }
    });
    return () => unsubscribe();
  }, [key]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.match(/image|pdf/)) {
      alert("Only images or PDFs allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({
        url: reader.result,
        type: file.type,
        name: file.name,
      });

      setFileData({
        name: file.name,
        type: file.type,
        data: reader.result.split(",")[1],
      });
    };

    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    for (const item of e.clipboardData.items) {
      if (item.type.includes("image")) {
        processFile(item.getAsFile());
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (["dragenter", "dragover"].includes(e.type)) setDragActive(true);
    else setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFile(e.dataTransfer.files[0]);
  };

  const send = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !fileData) || !currentUser) return;

    await base44.functions.invoke("sendMessages", {
      content: text.trim(),
      channel: key,
      recipient_email: activeChannel.type === "dm" ? activeChannel.email : "",
      file: fileData || null,
    });

    setText("");
    setFilePreview(null);
    setFileData(null);
    load();
  };

  const header =
    activeChannel.type === "group"
      ? { icon: Users, title: "The Hall", subtitle: "All members can read" }
      : activeChannel.type === "spy"
        ? { icon: Users, title: activeChannel.name || "Player Whisper", subtitle: "DM view — read only" }
        : { icon: User, title: activeChannel.name || activeChannel.email, subtitle: isAdmin ? "Whisper — visible to GM" : "Private whisper" };

  return (
    <div
      className="flex flex-col h-full"
      onPaste={handlePaste}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center">
          <header.icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-display text-lg leading-tight">{header.title}</div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{header.subtitle}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-5 py-2 space-y-4 relative">
        {dragActive && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white z-10">
            Drop file here
          </div>
        )}

        {messages.map((m) => {
          const mine = m.created_by === currentUser?.email;
          const sender = userByEmail[m.created_by];
          const name = sender?.display_name || sender?.full_name || m.created_by;

          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%] flex flex-col">
                {!mine && <div className="text-xs mb-1">{name}</div>}

                <div className={`px-4 py-2 rounded ${mine ? "bg-primary text-white" : "bg-card border"}`}>
                  {m.content}

                  {m.file_url && m.file_type === "image" && (
                    <img src={m.file_url} alt={m.content || "Chat attachment"} className="mt-2 max-w-xs rounded" />
                  )}

                  {m.file_url && m.file_type === "pdf" && (
                    <a href={m.file_url} target="_blank" rel="noreferrer">
                      Open PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {activeChannel.type !== "spy" && (
        <form onSubmit={send} className="border-t p-3 flex flex-col gap-2">
          {filePreview && (
            <div className="border p-2 rounded">
              {filePreview.type.includes("image") ? (
                <img src={filePreview.url} alt={filePreview.name} className="max-h-40 rounded" />
              ) : (
                <div>{filePreview.name}</div>
              )}
              <button
                type="button"
                onClick={() => {
                  setFilePreview(null);
                  setFileData(null);
                }}
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              type="file"
              id="fileUpload"
              className="hidden"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => processFile(e.target.files[0])}
            />
            <label htmlFor="fileUpload" className="cursor-pointer">
              <Paperclip className="w-4 h-4" />
            </label>

            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />

            <Button type="submit">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
