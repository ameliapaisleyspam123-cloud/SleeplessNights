import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import PlayerNotesPanel from "@/components/chat/PlayerNotesPanel";

export default function Notes() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    appClient.auth.me().then(setUser);
  }, []);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
      <PlayerNotesPanel currentUser={user} />
    </div>
  );
}
