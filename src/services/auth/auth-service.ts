import type { Session, SupabaseClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { MemoraidAuthError, toMemoraidAuthError } from "./auth-errors";
import { getSupabaseClient } from "./supabase-client";

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readUrlParameter(url: string, name: string): string | null {
  const match = new RegExp(`[?#&]${name}=([^&#]*)`, "i").exec(url);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

export function normalizeSignInEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();

  if (!SIMPLE_EMAIL_PATTERN.test(normalizedEmail)) {
    throw new MemoraidAuthError("validation", "Enter a valid email address.");
  }

  return normalizedEmail;
}

export function getMagicLinkRedirectUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return new URL("/sign-in", window.location.origin).toString();
  }

  return Linking.createURL("/sign-in");
}

export async function requestMagicLink(email: string, client = getSupabaseClient()): Promise<string> {
  const normalizedEmail = normalizeSignInEmail(email);
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: getMagicLinkRedirectUrl(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw toMemoraidAuthError(error, "The magic link could not be sent.");
  }

  return normalizedEmail;
}

export async function getStoredSession(client = getSupabaseClient()): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw toMemoraidAuthError(error, "Your saved sign-in session could not be restored.");
  }

  return data.session;
}

export function isAuthCallbackUrl(url: string): boolean {
  return Boolean(
    readUrlParameter(url, "code") ||
      readUrlParameter(url, "access_token") ||
      readUrlParameter(url, "error") ||
      readUrlParameter(url, "error_code") ||
      readUrlParameter(url, "error_description"),
  );
}

export function isAuthErrorCallbackUrl(url: string): boolean {
  return Boolean(
    readUrlParameter(url, "error") ||
      readUrlParameter(url, "error_code") ||
      readUrlParameter(url, "error_description"),
  );
}

export async function consumeAuthCallback(
  url: string,
  client = getSupabaseClient(),
): Promise<Session | null> {
  const callbackError = readUrlParameter(url, "error_description") ?? readUrlParameter(url, "error");

  if (callbackError) {
    throw new MemoraidAuthError(
      "invalid-session",
      "This sign-in link has expired or was already used. Request a fresh link to continue.",
      { retryable: true, cause: callbackError },
    );
  }

  const code = readUrlParameter(url, "code");

  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);

    if (error) {
      throw toMemoraidAuthError(error, "The sign-in link could not be verified.");
    }

    return data.session;
  }

  const accessToken = readUrlParameter(url, "access_token");
  const refreshToken = readUrlParameter(url, "refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw toMemoraidAuthError(error, "The sign-in link could not be verified.");
    }

    return data.session;
  }

  return null;
}

export async function clearLocalSession(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut({ scope: "local" });

  if (error) {
    throw toMemoraidAuthError(error, "The saved session could not be cleared.");
  }
}
