import * as SecureStore from "expo-secure-store";
import { decodeAiConfiguration, type AiCredentials, type AiSettings } from "../ai/config";
const key = (userId: string) => `memoraid.ai.${userId}`;
export async function loadAiConfiguration(
  userId: string,
): Promise<{ settings: AiSettings; credentials: AiCredentials }> {
  const raw = await SecureStore.getItemAsync(key(userId));
  return decodeAiConfiguration(raw);
}
export async function saveAiConfiguration(
  userId: string,
  settings: AiSettings,
  credentials: AiCredentials,
): Promise<void> {
  await SecureStore.setItemAsync(key(userId), JSON.stringify({ settings, credentials }), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}
export async function clearWebAiCredentials(): Promise<void> {
  /* Mobile keys remain account-scoped on device. */
}
