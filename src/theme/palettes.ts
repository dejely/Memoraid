import { REFERENCE_PALETTES } from "./reference-palettes";
export type ThemePalette = "classic" | "pink" | "designbyte";
export type ColorMode = "light" | "dark";
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  danger: string;
  dangerForeground: string;
}
export const THEME_OPTIONS = [
  { id: "classic", label: "Classic", description: "Original navy and teal" },
  {
    id: "pink",
    label: "Pink",
    description: "Pastel rose by day, cherry and mint by night",
  },
  {
    id: "designbyte",
    label: "Designbyte",
    description: "Clean monochrome with mint accents",
  },
] as const;
const CLASSIC: Record<ColorMode, ThemeColors> = {
  light: {
    background: "#f5f7fb",
    foreground: "#172136",
    card: "#ffffff",
    primary: "#0b1220",
    primaryForeground: "#ffffff",
    secondary: "#f1fbfa",
    secondaryForeground: "#146660",
    muted: "#e8edf6",
    mutedForeground: "#3c5179",
    accent: "#d4f4f1",
    accentForeground: "#146660",
    border: "#cbd6ea",
    input: "#ffffff",
    ring: "#1b9f93",
    danger: "#d15d76",
    dangerForeground: "#ffffff",
  },
  dark: {
    background: "#0b1220",
    foreground: "#e8edf6",
    card: "#172136",
    primary: "#1b9f93",
    primaryForeground: "#ffffff",
    secondary: "#2a3a59",
    secondaryForeground: "#e8edf6",
    muted: "#2a3a59",
    mutedForeground: "#a7b8d7",
    accent: "#134f4c",
    accentForeground: "#d4f4f1",
    border: "#3c5179",
    input: "#172136",
    ring: "#77d4cb",
    danger: "#d15d76",
    dangerForeground: "#ffffff",
  },
};
export function decodeThemePalette(value: string | null): ThemePalette {
  return value === "pink" || value === "designbyte" ? value : "classic";
}
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function mixColor(a: string, b: string, amount: number) {
  return (
    "#" +
    rgb(a)
      .map((v, i) =>
        Math.round(v + (rgb(b)[i] - v) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string) {
  return rgb(hex)
    .map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function readable(text: string, background: string, preferred: string) {
  if (contrast(text, background) >= 4.5) return text;
  const target =
    contrast(preferred, background) >= 4.5
      ? preferred
      : contrast("#000000", background) > contrast("#ffffff", background)
        ? "#000000"
        : "#ffffff";
  for (let step = 1; step <= 20; step++) {
    const next = mixColor(text, target, step / 20);
    if (contrast(next, background) >= 4.5) return next;
  }
  return target;
}
export function themeColors(
  palette: ThemePalette,
  mode: ColorMode,
): ThemeColors {
  const c: ThemeColors = {
    ...(palette === "classic"
      ? CLASSIC[mode]
      : REFERENCE_PALETTES[palette][mode]),
  };
  // Retain reference fills while giving labels readable contrast in both modes.
  c.primaryForeground = readable(c.primaryForeground, c.primary, c.foreground);
  c.secondaryForeground = readable(
    c.secondaryForeground,
    c.secondary,
    c.foreground,
  );
  c.accentForeground = readable(c.accentForeground, c.accent, c.foreground);
  c.dangerForeground = readable(c.dangerForeground, c.danger, c.foreground);
  c.mutedForeground = readable(c.mutedForeground, c.background, c.foreground);
  c.mutedForeground = readable(c.mutedForeground, c.card, c.foreground);
  return c;
}
export function themeAccentInk(colors: ThemeColors) {
  return readable(
    readable(colors.primary, colors.background, colors.foreground),
    colors.card,
    colors.foreground,
  );
}
const channels = (hex: string) => rgb(hex).join(" ");
export function themeVariables(
  colors: ThemeColors,
  mode: ColorMode,
): Record<string, string> {
  const c = colors,
    dark = mode === "dark";
  const variables: Record<string, string> = {};
  for (const [key, value] of Object.entries(c))
    variables[
      "--color-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())
    ] = channels(value);
  variables["--color-danger-ink"] = channels(
    readable(
      readable(c.danger, c.background, c.foreground),
      c.card,
      c.foreground,
    ),
  );
  // Compatibility for existing NativeWind utilities across the study screens.
  const ink = {
    50: dark ? c.foreground : c.background,
    100: dark ? c.foreground : c.muted,
    200: dark ? c.mutedForeground : c.border,
    300: c.mutedForeground,
    400: c.mutedForeground,
    500: c.mutedForeground,
    600: dark ? c.border : c.mutedForeground,
    700: dark ? c.muted : c.foreground,
    800: dark ? c.card : c.foreground,
    900: dark ? c.background : c.foreground,
  };
  for (const [shade, value] of Object.entries(ink))
    variables[`--color-ink-${shade}`] = channels(value);
  const brandText = themeAccentInk(c);
  const sea = {
    50: dark ? c.foreground : mixColor(c.background, c.primary, 0.06),
    100: dark ? c.foreground : mixColor(c.background, c.primary, 0.12),
    200: mixColor(c.background, c.primary, 0.25),
    300: dark ? brandText : mixColor(c.background, c.primary, 0.5),
    400: brandText,
    500: c.primary,
    600: brandText,
    700: dark ? c.muted : brandText,
    800: dark ? c.muted : brandText,
    900: dark ? c.muted : brandText,
  };
  for (const [shade, value] of Object.entries(sea))
    variables[`--color-sea-${shade}`] = channels(value);
  variables["--color-paper"] = channels(dark ? c.foreground : c.card);
  return variables;
}
export const DEFAULT_COLORS = themeColors("classic", "light");
