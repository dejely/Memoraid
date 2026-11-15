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
  openrouterModel: "anthropic/claude-sonnet-4.5",
  fallbackEnabled: true,
};
export const EMPTY_CREDENTIALS: AiCredentials = { gemini: "", openrouter: "" };
export interface RecognitionResult {
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
        typeof parsed?.settings?.openrouterModel === "string"
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
