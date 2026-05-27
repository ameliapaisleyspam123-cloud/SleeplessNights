export const THEME_STORAGE_KEY = "sleepless_nights_theme_v1";

export const THEME_COLOR_FIELDS = [
  ["background", "Background"],
  ["foreground", "Text"],
  ["card", "Cards"],
  ["secondary", "Panels"],
  ["muted", "Muted"],
  ["mutedForeground", "Muted Text"],
  ["border", "Borders"],
  ["primary", "Primary"],
  ["primaryForeground", "Primary Text"],
  ["accent", "Accent"],
  ["accentForeground", "Accent Text"],
  ["destructive", "Danger"],
  ["destructiveForeground", "Danger Text"],
];

export const THEME_PRESETS = [
  {
    id: "sculk",
    name: "Sleepless Sculk",
    description: "Deep teal, glowing cyan, and shadowed stone.",
    colors: {
      background: "#06191f",
      foreground: "#d8ecea",
      card: "#0b2128",
      secondary: "#112c33",
      muted: "#15343a",
      mutedForeground: "#8fb1b0",
      border: "#214a50",
      primary: "#06aeba",
      primaryForeground: "#06191f",
      accent: "#00f5df",
      accentForeground: "#06191f",
      destructive: "#d82020",
      destructiveForeground: "#ffffff",
    },
  },
  {
    id: "parchment",
    name: "Parchment",
    description: "Warm paper, ink, brass, and candlelight.",
    colors: {
      background: "#f3e2bb",
      foreground: "#2b2118",
      card: "#f8ebcf",
      secondary: "#e5c995",
      muted: "#d9bc82",
      mutedForeground: "#6e5740",
      border: "#a88352",
      primary: "#6f3f20",
      primaryForeground: "#fff4dc",
      accent: "#b66a24",
      accentForeground: "#fff4dc",
      destructive: "#9d2f24",
      destructiveForeground: "#fff7ea",
    },
  },
  {
    id: "morning-archive",
    name: "Morning Archive",
    description: "Soft ivory, library green, walnut ink, and gold leaf.",
    colors: {
      background: "#f7f1e4",
      foreground: "#243027",
      card: "#fffaf0",
      secondary: "#e6eddc",
      muted: "#d8e0cb",
      mutedForeground: "#62705f",
      border: "#aeb89e",
      primary: "#38634b",
      primaryForeground: "#fbf7ed",
      accent: "#b3832f",
      accentForeground: "#fff8e8",
      destructive: "#a83e36",
      destructiveForeground: "#fff7ef",
    },
  },
  {
    id: "winterglass",
    name: "Winterglass",
    description: "Clear daylight, blue-grey panels, and crisp arcane teal.",
    colors: {
      background: "#eef5f7",
      foreground: "#1c2d35",
      card: "#fbfeff",
      secondary: "#dce9ee",
      muted: "#cbdce3",
      mutedForeground: "#5a707a",
      border: "#9fb4bd",
      primary: "#2f6270",
      primaryForeground: "#f6fcff",
      accent: "#168c8c",
      accentForeground: "#f7ffff",
      destructive: "#b33a4a",
      destructiveForeground: "#fff8fa",
    },
  },
  {
    id: "moonlit",
    name: "Moonlit Violet",
    description: "Cool night colors with silver-violet accents.",
    colors: {
      background: "#11121f",
      foreground: "#ebe8ff",
      card: "#1b1b30",
      secondary: "#242541",
      muted: "#2e2f4f",
      mutedForeground: "#aaa6cf",
      border: "#45466a",
      primary: "#8d8cff",
      primaryForeground: "#0f1020",
      accent: "#f0c6ff",
      accentForeground: "#171225",
      destructive: "#d94a64",
      destructiveForeground: "#ffffff",
    },
  },
  {
    id: "ember",
    name: "Ember Keep",
    description: "Dark stone, warm fire, and molten highlights.",
    colors: {
      background: "#17110f",
      foreground: "#f8e7d5",
      card: "#241815",
      secondary: "#33211b",
      muted: "#432a22",
      mutedForeground: "#c59c83",
      border: "#684331",
      primary: "#d1622b",
      primaryForeground: "#fff3e5",
      accent: "#ffb347",
      accentForeground: "#21130c",
      destructive: "#c7352f",
      destructiveForeground: "#ffffff",
    },
  },
];

export const DEFAULT_THEME = THEME_PRESETS[0];

function hexToHslTriplet(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function resolveTheme(theme) {
  const preset = THEME_PRESETS.find((item) => item.id === theme?.presetId) || THEME_PRESETS.find((item) => item.id === theme?.id);
  if (theme?.presetId === "custom") return { id: "custom", name: theme.name || "Custom", colors: { ...DEFAULT_THEME.colors, ...theme.colors } };
  return preset || DEFAULT_THEME;
}

export function getStoredTheme() {
  try {
    return JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  applyTheme(theme);
}

export function applyTheme(theme = getStoredTheme()) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  const colors = resolved.colors;
  const varNames = {
    primaryForeground: "primary-foreground",
    mutedForeground: "muted-foreground",
    accentForeground: "accent-foreground",
    destructiveForeground: "destructive-foreground",
  };

  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${varNames[key] || key}`, hexToHslTriplet(value));
  }
  root.dataset.theme = resolved.id;
}
