import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "nativewind";

import { saveThemePreference } from "../services/secure/preferences-service";
import type { ThemePreference } from "../types/models";

type ThemeContextValue = {
  preference: ThemePreference;
  colorScheme: "light" | "dark";
  setPreference: (value: ThemePreference) => Promise<void>;
  cyclePreference: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getNextPreference(currentPreference: ThemePreference): ThemePreference {
  if (currentPreference === "system") {
    return "dark";
  }

  if (currentPreference === "dark") {
    return "light";
  }

  return "system";
}

export function ThemeProvider({
  children,
  initialPreference,
}: PropsWithChildren<{ initialPreference: ThemePreference }>) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const appliedInitialPreference = useRef<ThemePreference | null>(null);

  useEffect(() => {
    if (appliedInitialPreference.current === initialPreference) {
      return;
    }

    appliedInitialPreference.current = initialPreference;
    setPreferenceState(initialPreference);
    setColorScheme(initialPreference);
  }, [initialPreference]);

  async function applyPreference(value: ThemePreference): Promise<void> {
    setPreferenceState(value);
    setColorScheme(value);
    await saveThemePreference(value);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      colorScheme: colorScheme === "dark" ? "dark" : "light",
      setPreference: applyPreference,
      cyclePreference: () => applyPreference(getNextPreference(preference)),
    }),
    [colorScheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider.");
  }

  return context;
}
