import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { Users, User } from "lucide-react";

export default function ChannelList({ users, currentUser, activeChannel, onSelect, isAdmin }) {
  const [unread, setUnread] = useState({});

  const others = users.filter((u) => u.email !== currentUser?.email);

  function channelKey(ch, me) {
    if (!me) return null;
    if (ch.type === "group") return "group";
    if (ch.type === "spy") return ch.channel;
    const pair = [me.email, ch.email].sort();
    return `${pair[0]}|${pair[1]}`;
  }

  const markRead = (key) => {
    if (!key) return;
    const stored = JSON.parse(localStorage.getItem("chat_read") || "{}");
    stored[key] = Date.now();
    localStorage.setItem("chat_read", JSON.stringify(stored));
    setUnread((u) => ({ ...u, [key]: false }));
  };

  const handleSelect = (channel) => {
    const key = channelKey(channel, currentUser);
    markRead(key);
    onSelect(channel);
  };

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = appClient.entities.Message.subscribe((event) => {
      if (event.type !== "create" || !event.data) return;
      const msg = event.data;

      if (msg.created_by === currentUser.email) return;

      const stored = JSON.parse(localStorage.getItem("chat_read") || "{}");
      const lastRead = stored[msg.channel] || 0;
      const msgTime = new Date(msg.created_date || Date.now()).getTime();

      if (msgTime > lastRead) {
        setUnread((u) => ({ ...u, [msg.channel]: true }));
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-4 border-b border-border shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Channels
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll">
        <button
          onClick={() => handleSelect({ type: "group" })}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors ${
            activeChannel?.type === "group" ? "bg-secondary" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">The Hall</div>
            <div className="text-xs text-muted-foreground">Everyone</div>
          </div>
        </button>

        <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Whispers
        </div>

        {others.length === 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            No other members yet.
          </div>
        )}

        {others.map((u) => {
          const ch = { type: "dm", email: u.email, name: u.display_name || u.full_name };
          const key = channelKey(ch, currentUser);
          const active = activeChannel?.type === "dm" && activeChannel.email === u.email;
          const hasUnread = unread[key];

          return (
            <button
              key={u.id || u.email}
              onClick={() => handleSelect(ch)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary transition-colors ${
                active ? "bg-secondary" : ""
              }`}
            >
              <div className="relative w-8 h-8 rounded-sm flex items-center justify-center bg-accent/20 text-accent-foreground">
                <User className="w-4 h-4" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-background" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`text-sm truncate ${hasUnread ? "font-semibold text-foreground" : "font-medium"}`}>
                    {u.display_name || u.full_name}
                  </div>

                  {hasUnread && (
                    <span className="text-[9px] uppercase tracking-widest text-accent shrink-0 ml-auto">
                      New
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground truncate">
                  {u.email}
                </div>
              </div>
            </button>
          );
        })}

        {isAdmin && (() => {
          const players = users.filter((u) => u.role !== "admin");
          const pairs = [];

          for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
              pairs.push([players[i], players[j]]);
            }
          }

          if (pairs.length === 0) return null;

          return (
            <>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-t border-border mt-1">
                Player Whispers
              </div>

              {pairs.map(([a, b]) => {
                const ch = [a.email, b.email].sort().join("|");
                const active = activeChannel?.type === "spy" && activeChannel.channel === ch;

                return (
                  <button
                    key={ch}
                    onClick={() =>
                      handleSelect({
                        type: "spy",
                        channel: ch,
                        name: `${a.display_name || a.full_name} ↔ ${b.display_name || b.full_name}`,
                      })
                    }
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors ${
                      active ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">
                        {a.display_name || a.full_name} ↔ {b.display_name || b.full_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Whisper thread
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );
}
