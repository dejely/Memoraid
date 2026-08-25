import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabaseClient } from "../../services/auth/supabase-client";

export function cloudDatabase(): SupabaseClient {
  return getSupabaseClient();
}

export function throwIfCloudError(error: PostgrestError | null, action: string): void {
  if (error) {
    const cause = new Error(`${action}: ${error.message}`);
    cause.name = "CloudDataError";
    throw cause;
  }
}

export async function requireCloudUser(): Promise<User> {
  const client = cloudDatabase();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("Your sign-in session has expired. Sign in again before saving changes.");
  }

  return data.user;
}

export function jsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      return jsonStringArray(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

