import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const googleSignIn = Platform.OS === "android"
  ? requireOptionalNativeModule<{
      signIn(webClientId: string): Promise<{ token: string; nonce: string } | null>;
      clearCredentialState(): Promise<void>;
    }>("MemoraidGoogleSignIn")
  : null;

export const canSignInWithGoogle = Boolean(webClientId && googleSignIn);

export async function getGoogleCredential() {
  if (!googleSignIn || !webClientId) {
    throw new Error("Google sign-in is unavailable in this build.");
  }

  return googleSignIn.signIn(webClientId);
}

export async function clearGoogleCredentialState(): Promise<void> {
  if (webClientId) {
    await googleSignIn?.clearCredentialState();
  }
}
