export function sortClaimedCharactersFirst(characters = [], userEmail = "") {
  const email = String(userEmail || "").toLowerCase();
  return [...characters].sort((a, b) => {
    const aMine = String(a.assigned_to_email || "").toLowerCase() === email ? 0 : 1;
    const bMine = String(b.assigned_to_email || "").toLowerCase() === email ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;
    const aAssigned = a.assigned_to_email ? 0 : 1;
    const bAssigned = b.assigned_to_email ? 0 : 1;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}
