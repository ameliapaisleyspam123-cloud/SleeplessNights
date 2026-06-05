const SUPERUSER_EMAIL = "ameliapaisleyspam123@gmail.com";

export function isDmUser(user) {
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
