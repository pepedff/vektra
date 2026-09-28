export type Theme = "dark" | "light";

export type Branding = {
  extensionName: string;
  assistantName: string;
  logoUrl: string | null;
  iconUrl: string | null;
  colorPrimary: string;
  colorSecondary: string;
  gradient: string;
  background: string;
  cards: string;
  inputs: string;
  buttons: string;
  sidebar: string;
  chat: string;
  font: string;
  radius: number;
  glow: boolean;
  theme: Theme;
  messages: string;
  suggestions: string[];
};

export type BrandingKey = keyof Branding;

export const BRANDING_KEYS: BrandingKey[] = [
  "extensionName",
  "assistantName",
  "logoUrl",
  "iconUrl",
  "colorPrimary",
  "colorSecondary",
  "gradient",
  "background",
  "cards",
  "inputs",
  "buttons",
  "sidebar",
  "chat",
  "font",
  "radius",
  "glow",
  "theme",
  "messages",
  "suggestions",
];

export const DEFAULT_BRANDING: Branding = {
  extensionName: "Vektra",
  assistantName: "Assistente",
  logoUrl: null,
  iconUrl: null,
  colorPrimary: "#00a8ff",
  colorSecondary: "#7c3aed",
  gradient: "linear-gradient(135deg, #00a8ff, #7c3aed)",
  background: "#0b1018",
  cards: "#131a26",
  inputs: "#0e131c",
  buttons: "#00a8ff",
  sidebar: "#0d1119",
  chat: "#10151f",
  font: "Geist",
  radius: 14,
  glow: true,
  theme: "dark",
  messages: "Como posso ajudar no seu projeto?",
  suggestions: ["Explique este componente", "Gere um layout", "Revise este arquivo"],
};

export function mergeBranding(base: Branding, override: Partial<Branding> | null): Branding {
  if (!override) return base;
  return { ...base, ...stripEmpty(override) };
}

export function pickAllowed(draft: Partial<Branding>, allowed: readonly string[]): Partial<Branding> {
  const allow = new Set(allowed);
  const out: Partial<Branding> = {};
  for (const key of BRANDING_KEYS) {
    if (allow.has(key) && key in draft) (out as Record<string, unknown>)[key] = draft[key];
  }
  return out;
}

function stripEmpty(partial: Partial<Branding>): Partial<Branding> {
  const out: Partial<Branding> = {};
  for (const key of BRANDING_KEYS) {
    const value = partial[key];
    if (value === undefined || value === "") continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
