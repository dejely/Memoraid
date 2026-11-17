import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform, View } from "react-native";
import { useColorScheme, vars } from "nativewind";
import {
  saveThemePreference,
  saveThemePalette,
} from "../services/secure/preferences-service";
import {
  DEFAULT_COLORS,
  themeColors,
  themeVariables,
  type ThemePalette,
  type ThemeColors,
} from "../theme/palettes";
import type { ThemePreference } from "../types/models";
type ThemeContextValue = {
  preference: ThemePreference;
  palette: ThemePalette;
  colors: ThemeColors;
  colorScheme: "light" | "dark";
  setPreference: (value: ThemePreference) => Promise<void>;
  setPalette: (value: ThemePalette) => Promise<void>;
  cyclePreference: () => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
function nextPreference(value: ThemePreference): ThemePreference {
  return value === "system" ? "dark" : value === "dark" ? "light" : "system";
}
export function ThemeProvider({
  children,
  initialPreference,
  initialPalette = "classic",
}: PropsWithChildren<{
  initialPreference: ThemePreference;
  initialPalette?: ThemePalette;
}>) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState(initialPreference),
    [palette, setPaletteState] = useState(initialPalette);
  const applied = useRef<ThemePreference | null>(null),
    writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (applied.current === initialPreference) return;
    applied.current = initialPreference;
    setPreferenceState(initialPreference);
    setColorScheme(initialPreference);
  }, [initialPreference]);
  const mode = colorScheme === "dark" ? "dark" : "light";
  const colors = useMemo(() => themeColors(palette, mode), [palette, mode]);
  const variables = useMemo(() => themeVariables(colors, mode), [colors, mode]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    // Web Modals are portalled to body; apply tokens at the document as well.
    for (const [name, value] of Object.entries(variables))
      document.documentElement.style.setProperty(name, value);
    document.documentElement.style.colorScheme = mode;
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.dataset.theme = palette;
    document.body.style.backgroundColor = colors.background;
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.append(meta);
    }
    meta.content = colors.background;
  }, [variables, mode, palette, colors.background]);
  function persist(write: () => Promise<void>) {
    const pending = writes.current.then(write);
    writes.current = pending.catch(() => {});
    return pending;
  }
  async function setPreference(value: ThemePreference) {
    setPreferenceState(value);
    setColorScheme(value);
    await persist(() => saveThemePreference(value));
  }
  async function setPalette(value: ThemePalette) {
    setPaletteState(value);
    await persist(() => saveThemePalette(value));
  }
  const context = useMemo<ThemeContextValue>(
    () => ({
      preference,
      palette,
      colors,
      colorScheme: mode,
      setPreference,
      setPalette,
      cyclePreference: () => setPreference(nextPreference(preference)),
    }),
    [preference, palette, colors, mode],
  );
  return (
    <ThemeContext.Provider value={context}>
      <View
        style={[
          { flex: 1, backgroundColor: colors.background },
          vars(variables),
        ]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useAppTheme must be used within ThemeProvider.");
  return context;
}
export function useThemeColors() {
  return useContext(ThemeContext)?.colors ?? DEFAULT_COLORS;
}
