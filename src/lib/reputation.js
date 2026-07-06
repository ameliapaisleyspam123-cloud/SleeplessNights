export const REPUTATION_MIN = -3;
export const REPUTATION_MAX = 3;
export const REPUTATION_VALUES = [-3, -2, -1, 0, 1, 2, 3];

export const defaultReputation = {
  grid: {
    x: 0,
    y: 0,
    xMinLabel: "Feared",
    xMaxLabel: "Trusted",
    yMinLabel: "Unruly",
    yMaxLabel: "Honorable",
  },
  opinions: [
    { id: "crown", name: "Crown", value: 0, minLabel: "-3", maxLabel: "+3" },
    { id: "people", name: "People", value: 0, minLabel: "-3", maxLabel: "+3" },
    { id: "foreigners", name: "Foreigners", value: 0, minLabel: "-3", maxLabel: "+3" },
    { id: "rival", name: "Rival", value: 0, minLabel: "-3", maxLabel: "+3" },
  ],
};

export function clampReputationValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, Math.round(number)));
}

export function normalizeReputation(reputation) {
  const grid = reputation?.grid || {};
  const opinions = Array.isArray(reputation?.opinions) && reputation.opinions.length > 0
    ? reputation.opinions
    : defaultReputation.opinions;

  return {
    grid: {
      ...defaultReputation.grid,
      ...grid,
      x: clampReputationValue(grid.x),
      y: clampReputationValue(grid.y),
    },
    opinions: opinions.map((opinion, index) => ({
      id: opinion.id || `opinion-${index + 1}`,
      name: opinion.name || `Opinion ${index + 1}`,
      value: clampReputationValue(opinion.value),
      minLabel: opinion.minLabel || "-3",
      maxLabel: opinion.maxLabel || "+3",
    })),
  };
}

export function makeOpinionId(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `opinion-${slug}-${Date.now().toString(36)}` : `opinion-${Date.now().toString(36)}`;
}
