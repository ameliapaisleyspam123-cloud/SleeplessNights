const SUPERUSER_EMAIL = "ameliapaisleyspam123@gmail.com";
const PLAYER_VIEW_KEY_PREFIX = "sleepless_player_view_mode";

export function playerViewStorageKey(user) {
  return `${PLAYER_VIEW_KEY_PREFIX}_${user?.campaign_id || "no_campaign"}_${user?.email || "anonymous"}`;
}

export function isPlayerViewMode(user) {
  if (typeof sessionStorage === "undefined" || !user?.campaign_id) return false;
  return sessionStorage.getItem(playerViewStorageKey(user)) === "true";
}

export function setPlayerViewMode(user, active) {
  if (typeof sessionStorage === "undefined" || !user?.campaign_id) return;
  sessionStorage.setItem(playerViewStorageKey(user), active ? "true" : "false");
  window.dispatchEvent(new Event("player-view-mode-change"));
}

export function isDmUser(user) {
  if (isPlayerViewMode(user)) return false;
  return user?.campaign_role?.toLowerCase?.() === "dm" || user?.role === "admin" || user?.email === SUPERUSER_EMAIL;
}

export function canViewVisibleItem(item, user, isDm = isDmUser(user)) {
  if (!item || item.visibility === "archived") return false;
  if (isDm) return true;
  if (item.visibility === "dm_only") return false;
  if (item.visibility === "specific_players") {
    return Boolean(user?.email && item.allowed_emails?.includes(user.email));
  }
  return true;
}
