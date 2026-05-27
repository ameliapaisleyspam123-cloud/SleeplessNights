const SUPERUSER_EMAIL = "ameliapaisleyspam123@gmail.com";

export function isDmUser(user) {
  const dmOverride = localStorage.getItem("dm_override") === "true";
  return user?.campaign_role === "dm" || (user?.email === SUPERUSER_EMAIL && dmOverride);
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
