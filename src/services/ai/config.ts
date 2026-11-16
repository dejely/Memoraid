import {
  DEFAULT_FREE_OPENROUTER_MODEL,
  isFreeOpenRouterModel,
} from "../../../supabase/functions/_shared/openrouter-policy";
export type AiProvider = "gemini" | "openrouter";
export interface AiSettings {
  geminiModel: string;
  openrouterModel: string;
  fallbackEnabled: boolean;
}
export interface AiCredentials {
  gemini: string;
  openrouter: string;
}
export const DEFAULT_AI_SETTINGS: AiSettings = {
  geminiModel: "gemini-3.5-flash-lite",
  openrouterModel: DEFAULT_FREE_OPENROUTER_MODEL,
  fallbackEnabled: true,
};
export const EMPTY_CREDENTIALS: AiCredentials = { gemini: "", openrouter: "" };
export interface RecognitionResult {
  requestId?: string;
  timings?: { authMs: number; upstreamMs: number };
  networkMs?: number;
  latex: string;
  unreadable: boolean;
  provider: AiProvider;
  model: string;
}
export function decodeAiConfiguration(raw: string | null): { settings: AiSettings; credentials: AiCredentials } {
  let parsed: any;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  return {
    settings: {
      geminiModel:
        typeof parsed?.settings?.geminiModel === "string"
          ? parsed.settings.geminiModel
          : DEFAULT_AI_SETTINGS.geminiModel,
      openrouterModel:
        typeof parsed?.settings?.openrouterModel === "string" && isFreeOpenRouterModel(parsed.settings.openrouterModel)
          ? parsed.settings.openrouterModel
          : DEFAULT_AI_SETTINGS.openrouterModel,
      fallbackEnabled: typeof parsed?.settings?.fallbackEnabled === "boolean" ? parsed.settings.fallbackEnabled : true,
    },
    credentials: {
      gemini: typeof parsed?.credentials?.gemini === "string" ? parsed.credentials.gemini : "",
      openrouter: typeof parsed?.credentials?.openrouter === "string" ? parsed.credentials.openrouter : "",
    },
  };
}
