import type { BackendConfig, ThemePreference } from "../../types/models";

const BACKEND_CONFIG_KEY = "quiztography.backend-config";
const BOOTSTRAP_META_KEY = "quiztography.bootstrap-meta";
const THEME_PREFERENCE_KEY = "quiztography.theme-preference";

const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  aiEnabled: false,
  syncEnabled: true,
  apiBaseUrl: null,
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional when browser storage is blocked.
  }
}

export async function loadBackendConfig(): Promise<BackendConfig> {
  const value = read(BACKEND_CONFIG_KEY);

  if (!value) {
    return DEFAULT_BACKEND_CONFIG;
  }

  try {
    return {
      ...DEFAULT_BACKEND_CONFIG,
      ...(JSON.parse(value) as Partial<BackendConfig>),
    };
  } catch {
    return DEFAULT_BACKEND_CONFIG;
  }
}

export async function saveBackendConfig(value: BackendConfig): Promise<void> {
  write(BACKEND_CONFIG_KEY, JSON.stringify(value));
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const value = read(THEME_PREFERENCE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME_PREFERENCE;
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  write(THEME_PREFERENCE_KEY, value);
}

export async function markBootstrapComplete(version: number): Promise<void> {
  write(
    BOOTSTRAP_META_KEY,
    JSON.stringify({
      version,
      completedAt: new Date().toISOString(),
    }),
  );
}

export async function getBootstrapMeta(): Promise<{ version: number; completedAt: string } | null> {
  const value = read(BOOTSTRAP_META_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as { version: number; completedAt: string };
  } catch {
    return null;
  }
}

