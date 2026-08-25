import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

import { MemoraidAuthError } from "./auth-errors";
import { authStorage } from "./auth-storage";

let client: SupabaseClient | null = null;

function getPublicConfiguration(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    throw new MemoraidAuthError(
      "configuration",
      "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then rebuild the app.",
    );
  }

  try {
    const parsedUrl = new URL(url);
    const isSecureRemote = parsedUrl.protocol === "https:";
    const isLocalDevelopment =
      parsedUrl.protocol === "http:" && (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1");

    if (!isSecureRemote && !isLocalDevelopment) {
      throw new Error("Supabase URL must use HTTPS outside local development.");
    }
  } catch (error) {
    throw new MemoraidAuthError(
      "configuration",
      "EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS URL (or an HTTP localhost URL for development).",
      { cause: error },
    );
  }

  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const { url, anonKey } = getPublicConfiguration();

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === "web",
      flowType: "pkce",
      persistSession: true,
      storage: authStorage,
    },
  });

  return client;
}
