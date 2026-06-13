import { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";

let cachedUser = null;
let cachedCampaign = null;
let listeners = [];
let fetchPromise = null;

function notify() {
  listeners.forEach((fn) => fn({ user: cachedUser, campaign: cachedCampaign }));
}

export function invalidateCampaignCache() {
  cachedUser = null;
  cachedCampaign = null;
  fetchPromise = null;
  notify();
}

async function fetchData() {
  const u = await appClient.auth.me();
  cachedUser = u;
  if (u?.campaign_id) {
    cachedCampaign = await appClient.entities.Campaign.get(u.campaign_id);
  } else {
    cachedCampaign = null;
  }
  notify();
}

function fetchOnce() {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetchData().catch(() => {
    notify();
  });
  return fetchPromise;
}

export function useCampaign() {
  const [state, setState] = useState({ user: cachedUser, campaign: cachedCampaign });

  useEffect(() => {
    const listener = (data) => setState({ ...data });
    listeners.push(listener);
    const unsubscribeCampaign = appClient.entities.Campaign.subscribe(() => {
      fetchData();
    });

    if (cachedUser !== null) {
      setState({ user: cachedUser, campaign: cachedCampaign });
    } else {
      fetchOnce();
    }

    return () => {
      unsubscribeCampaign();
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return state;
}
