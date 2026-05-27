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
    mode: "dark",
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
    mode: "light",
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
    mode: "light",
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
    mode: "light",
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
    id: "rose-quartz",
    name: "Rose Quartz",
    mode: "light",
    description: "Blush marble, charcoal text, sage panels, and garnet ink.",
    colors: {
      background: "#f7edf0",
      foreground: "#2b2529",
      card: "#fff8fa",
      secondary: "#e9ded2",
      muted: "#d9cdc5",
      mutedForeground: "#746269",
      border: "#bda6ab",
      primary: "#6c4f5f",
      primaryForeground: "#fff7fb",
      accent: "#9b3f52",
      accentForeground: "#fff7f8",
      destructive: "#b4323f",
      destructiveForeground: "#fff7f8",
    },
  },
  {
    id: "seabreeze-ledger",
    name: "Seabreeze Ledger",
    mode: "light",
    description: "Bright paper, aqua glass, navy ink, and coral marks.",
    colors: {
      background: "#eff8f6",
      foreground: "#18323b",
      card: "#fbfffd",
      secondary: "#d8eee8",
      muted: "#c8ddd8",
      mutedForeground: "#597178",
      border: "#94b7b5",
      primary: "#255d73",
      primaryForeground: "#f7fcff",
      accent: "#d46d4d",
      accentForeground: "#fff7f2",
      destructive: "#ad3846",
      destructiveForeground: "#fff8fa",
    },
  },
  {
    id: "lavender-field",
    name: "Lavender Field",
    mode: "light",
    description: "Pale lavender, plum script, moss panels, and amber seals.",
    colors: {
      background: "#f2eef9",
      foreground: "#2b2637",
      card: "#fbf8ff",
      secondary: "#e4ebd8",
      muted: "#d7d0e5",
      mutedForeground: "#655d73",
      border: "#afa4c4",
      primary: "#5b4f79",
      primaryForeground: "#faf7ff",
      accent: "#a46828",
      accentForeground: "#fff8ed",
      destructive: "#a7354e",
      destructiveForeground: "#fff7fa",
    },
  },
  {
    id: "sunlit-atelier",
    name: "Sunlit Atelier",
    mode: "light",
    description: "Canvas white, studio blue, ochre panels, and vermilion accents.",
    colors: {
      background: "#f8f2df",
      foreground: "#29313b",
      card: "#fffaf0",
      secondary: "#e8dfbd",
      muted: "#d8d0b1",
      mutedForeground: "#6f654f",
      border: "#b9a978",
      primary: "#365a7a",
      primaryForeground: "#f8fbff",
      accent: "#c7522f",
      accentForeground: "#fff7f2",
      destructive: "#a93232",
      destructiveForeground: "#fff8f5",
    },
  },
  {
    id: "moonlit",
    name: "Moonlit Violet",
    mode: "dark",
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
    mode: "dark",
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
  {
    id: "starless-pine",
    name: "Starless Pine",
    mode: "dark",
    description: "Evergreen black, pale mist, antique brass, and ember warnings.",
    colors: {
      background: "#071412",
      foreground: "#e3eee8",
      card: "#0d1f1a",
      secondary: "#162b23",
      muted: "#20382f",
      mutedForeground: "#a0b7ab",
      border: "#35594a",
      primary: "#6aa68b",
      primaryForeground: "#071412",
      accent: "#d6a64b",
      accentForeground: "#151006",
      destructive: "#d14b3c",
      destructiveForeground: "#ffffff",
    },
  },
  {
    id: "blood-moon",
    name: "Blood Moon",
    mode: "dark",
    description: "Black cherry, bone text, smoked violet, and moonlit red.",
    colors: {
      background: "#170b13",
      foreground: "#f4e5df",
      card: "#24111d",
      secondary: "#301a2b",
      muted: "#412436",
      mutedForeground: "#c5a0ad",
      border: "#65374c",
      primary: "#bf5260",
      primaryForeground: "#fff4f4",
      accent: "#e6b56e",
      accentForeground: "#201008",
      destructive: "#dc3449",
      destructiveForeground: "#ffffff",
    },
  },
  {
    id: "deep-ocean",
    name: "Deep Ocean",
    mode: "dark",
    description: "Abyss blue, seafoam text, steel panels, and signal amber.",
    colors: {
      background: "#07111f",
      foreground: "#dceef2",
      card: "#0c1b2d",
      secondary: "#13283c",
      muted: "#1d344b",
      mutedForeground: "#9eb8c6",
      border: "#34536a",
      primary: "#4aa3b8",
      primaryForeground: "#06131a",
      accent: "#e5a84a",
      accentForeground: "#1b1004",
      destructive: "#d04458",
      destructiveForeground: "#ffffff",
    },
  },
  {
    id: "royal-nocturne",
    name: "Royal Nocturne",
    mode: "dark",
    description: "Midnight indigo, ivory type, old gold, and bright amethyst.",
    colors: {
      background: "#0d0b1d",
      foreground: "#eee8ff",
      card: "#17142a",
      secondary: "#221d3c",
      muted: "#2d284c",
      mutedForeground: "#b3a9d0",
      border: "#4e4476",
      primary: "#9d7cff",
      primaryForeground: "#120d22",
      accent: "#d9a441",
      accentForeground: "#1b1204",
      destructive: "#d44862",
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
