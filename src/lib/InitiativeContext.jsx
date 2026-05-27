import React, { createContext, useContext, useState } from "react";

const InitiativeContext = createContext({
  splitOpen: false,
  setSplitOpen: () => {},
  campaignId: null,
  setCampaignId: () => {},
  isDM: false,
});

export function InitiativeProvider({ children, user }) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(null);

  const isDM =
    user?.campaign_role === "dm" ||
    user?.campaign_role === "DM" ||
    user?.role === "admin";

  const openInitiative = (id) => {
    if (!isDM) return;

    setCampaignId(id);
    setSplitOpen(true);
  };

  const closeInitiative = () => {
    setSplitOpen(false);
  };

  return (
    <InitiativeContext.Provider
      value={{
        splitOpen,
        setSplitOpen,
        campaignId,
        setCampaignId,
        openInitiative,
        closeInitiative,
        isDM,
      }}
    >
      {children}
    </InitiativeContext.Provider>
  );
}

export function useInitiative() {
  return useContext(InitiativeContext);
}
