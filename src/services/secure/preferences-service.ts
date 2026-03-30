import * as SecureStore from "expo-secure-store";

import type { BackendConfig, ThemePreference } from "../../types/models";

const BACKEND_CONFIG_KEY = "quiztography.backend-config";
const BOOTSTRAP_META_KEY = "quiztography.bootstrap-meta";
const THEME_PREFERENCE_KEY = "quiztography.theme-preference";

const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  aiEnabled: false,
  syncEnabled: false,
  apiBaseUrl: null,
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export async function loadBackendConfig(): Promise<BackendConfig> {
  const rawValue = await SecureStore.getItemAsync(BACKEND_CONFIG_KEY);

  if (!rawValue) {
    await saveBackendConfig(DEFAULT_BACKEND_CONFIG);
    return DEFAULT_BACKEND_CONFIG;
  }

  try {
    return {
      ...DEFAULT_BACKEND_CONFIG,
      ...(JSON.parse(rawValue) as Partial<BackendConfig>),
    };
  } catch {
    return DEFAULT_BACKEND_CONFIG;
  }
}

export async function saveBackendConfig(value: BackendConfig): Promise<void> {
  await SecureStore.setItemAsync(BACKEND_CONFIG_KEY, JSON.stringify(value));
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const storedValue = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);

  if (storedValue === "light" || storedValue === "dark" || storedValue === "system") {
    return storedValue;
  }

  await saveThemePreference(DEFAULT_THEME_PREFERENCE);
  return DEFAULT_THEME_PREFERENCE;
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, value);
}

export async function markBootstrapComplete(version: number): Promise<void> {
  await SecureStore.setItemAsync(
    BOOTSTRAP_META_KEY,
    JSON.stringify({
      version,
      completedAt: new Date().toISOString(),
    }),
  );
}

export async function getBootstrapMeta(): Promise<{ version: number; completedAt: string } | null> {
  const rawValue = await SecureStore.getItemAsync(BOOTSTRAP_META_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as { version: number; completedAt: string };
  } catch {
    return null;
  }
}
