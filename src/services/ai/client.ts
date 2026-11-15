import { getSupabaseClient } from "../auth/supabase-client";
import { loadAiConfiguration } from "../secure/ai-storage";
import type { AiCredentials, AiProvider, AiSettings, RecognitionResult } from "./config";

export async function callAiRelay(
  input: {
    operation: "recognizeMath" | "testConnection";
    settings: AiSettings;
    credentials: AiCredentials;
    provider?: AiProvider;
    image?: string;
  },
  signal?: AbortSignal,
): Promise<RecognitionResult> {
  const client = getSupabaseClient();
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError || !data.session) throw new Error("Sign in again before using recognition.");
  // Keep credentials out of URLs, public environment variables and persisted query caches.
  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/study-ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify(input),
    signal,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Recognition service is unavailable. Check its deployment.");
  }
  if (!response.ok)
    throw new Error(
      typeof result.error === "string" ? result.error : "Recognition failed. Check Settings and try again.",
    );
  return result as RecognitionResult;
}
export async function recognizeMath(image: string, signal: AbortSignal): Promise<RecognitionResult> {
  const { data } = await getSupabaseClient().auth.getSession();
  if (!data.session) throw new Error("Sign in before recognizing handwriting.");
  const config = await loadAiConfiguration(data.session.user.id);
  if (!config.credentials.gemini.trim() && !config.credentials.openrouter.trim())
    throw new Error("Add an API key in Settings before recognizing handwriting.");
  return callAiRelay({ operation: "recognizeMath", ...config, image }, signal);
}
