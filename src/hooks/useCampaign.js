import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
  const u = await base44.auth.me();
  cachedUser = u;
  if (u?.campaign_id) {
    const camps = await base44.entities.Campaign.list("-created_date", 50);
    cachedCampaign = camps.find((c) => c.id === u.campaign_id) || null;
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

    if (cachedUser !== null) {
      setState({ user: cachedUser, campaign: cachedCampaign });
    } else {
      fetchOnce();
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return state;
}
