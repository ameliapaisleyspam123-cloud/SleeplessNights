import React, { createContext, useContext, useState } from "react";

const InitiativeContext = createContext(null);

export function InitiativeProvider({ children }) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(null);

  return (
    <InitiativeContext.Provider value={{ splitOpen, setSplitOpen, campaignId, setCampaignId }}>
      {children}
    </InitiativeContext.Provider>
  );
}

export function useInitiative() {
  return useContext(InitiativeContext);
}
