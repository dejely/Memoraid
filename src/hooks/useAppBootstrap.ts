import { useEffect, useState } from "react";

import { initializeDatabase } from "../db/client";
import { LATEST_DB_VERSION } from "../db/schema";
import {
  getBootstrapMeta,
  loadBackendConfig,
  loadThemePreference,
  markBootstrapComplete,
} from "../services/secure/preferences-service";
import type { BackendConfig, ThemePreference } from "../types/models";

type BootstrapState = {
  isReady: boolean;
  error: string | null;
  backendConfig: BackendConfig | null;
  bootstrapMeta: { version: number; completedAt: string } | null;
  themePreference: ThemePreference;
};

export function useAppBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({
    isReady: false,
    error: null,
    backendConfig: null,
    bootstrapMeta: null,
    themePreference: "system",
  });

  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      try {
        await initializeDatabase();
        await markBootstrapComplete(LATEST_DB_VERSION);
        const [backendConfig, bootstrapMeta, themePreference] = await Promise.all([
          loadBackendConfig(),
          getBootstrapMeta(),
          loadThemePreference(),
        ]);

        if (!isMounted) {
          return;
        }

        setState({
          isReady: true,
          error: null,
          backendConfig,
          bootstrapMeta,
          themePreference,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          isReady: false,
          error: error instanceof Error ? error.message : "Failed to initialize the app.",
          backendConfig: null,
          bootstrapMeta: null,
          themePreference: "system",
        });
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
