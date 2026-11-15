import { decodeAiConfiguration, type AiCredentials, type AiSettings } from "../ai/config";
const prefix = "memoraid.ai.";
export async function loadAiConfiguration(
  userId: string,
): Promise<{ settings: AiSettings; credentials: AiCredentials }> {
  return decodeAiConfiguration(typeof window === "undefined" ? null : window.sessionStorage.getItem(prefix + userId));
}
export async function saveAiConfiguration(
  userId: string,
  settings: AiSettings,
  credentials: AiCredentials,
): Promise<void> {
  window.sessionStorage.setItem(prefix + userId, JSON.stringify({ settings, credentials }));
}
export async function clearWebAiCredentials(): Promise<void> {
  for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
    const key = window.sessionStorage.key(i);
    if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
  }
}
