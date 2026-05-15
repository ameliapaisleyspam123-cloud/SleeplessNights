import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import ChannelList from "@/components/chat/ChannelList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState({ type: "group" });

  useEffect(() => {
    appClient.auth.me().then(async (user) => {
      setCurrentUser(user);
      const all = await appClient.entities.User.filter({ campaign_id: user.campaign_id }, "display_name", 200);
      setUsers(all);
    });
  }, []);

  const isAdmin = currentUser?.campaign_role === "dm" || currentUser?.role === "admin";

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen grid md:grid-cols-[280px_1fr]">
      <aside className="border-r border-border min-h-0">
        <ChannelList users={users} currentUser={currentUser} activeChannel={activeChannel} onSelect={setActiveChannel} isAdmin={isAdmin} />
      </aside>
      <ChatWindow activeChannel={activeChannel} currentUser={currentUser} users={users} isAdmin={isAdmin} />
    </div>
  );
}
