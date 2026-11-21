import { useThemeColors } from "../src/components/ThemeProvider";
import { Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppScreen } from "../src/components/AppScreen";
import { LoadingState } from "../src/components/LoadingState";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ScreenHeader } from "../src/components/ScreenHeader";
import {
  MemoraidAuthError,
  toMemoraidAuthError,
} from "../src/services/auth/auth-errors";
import { useAuth } from "../src/services/auth/AuthProvider";
import { canSignInWithGoogle } from "../src/services/auth/android-google-sign-in";

export default function SignInScreen() {
  const themeColors = useThemeColors();
  const {
    dismissError,
    error: sessionError,
    isLoading,
    retrySession,
    sendMagicLink,
    session,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<MemoraidAuthError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [useEmail, setUseEmail] = useState(false);

  if (isLoading) {
    return <LoadingState message="Checking your sign-in..." />;
  }

  if (session) {
    return <Redirect href="/" />;
  }

  const visibleError = formError ?? sessionError;
  const showGoogle = canSignInWithGoogle && !useEmail;

  async function handleGoogleSignIn(): Promise<void> {
    setIsSigningInWithGoogle(true);
    setFormError(null);
    dismissError();

    try {
      await signInWithGoogle();
    } catch (error) {
      const authError = toMemoraidAuthError(error, "Google sign-in could not be completed.");
      if (authError.kind === "invalid-session" || authError.kind === "rate-limit") {
        setFormError(new MemoraidAuthError(
          authError.kind,
          authError.kind === "rate-limit"
            ? "Too many sign-in attempts. Wait a moment and try again."
            : "Your Google sign-in expired. Try again.",
        ));
      } else {
        setFormError(authError);
      }
    } finally {
      setIsSigningInWithGoogle(false);
    }
  }

  async function handleSendMagicLink(): Promise<void> {
    setIsSending(true);
    setFormError(null);
    dismissError();

    try {
      const normalizedEmail = await sendMagicLink(email);
      setSentTo(normalizedEmail);
    } catch (error) {
      setFormError(
        toMemoraidAuthError(error, "The magic link could not be sent."),
      );
    } finally {
      setIsSending(false);
    }
  }

  function editEmail(): void {
    setSentTo(null);
    setFormError(null);
    dismissError();
  }

  return (
    <AppScreen contentContainerClassName="min-h-full items-center justify-center py-10">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full max-w-md"
      >
        <View className="rounded-[32px] border border-ink-100 bg-white p-6 shadow-soft dark:border-ink-700 dark:bg-ink-800">
          <ScreenHeader
            eyebrow="Memoraid cloud"
            title={sentTo ? "Check your inbox" : "Sign in to study anywhere"}
            subtitle={
              sentTo
                ? `We sent a secure sign-in link to ${sentTo}. Open it on this device to continue.`
                : showGoogle
                  ? "Already use Memoraid? Choose the Google account with the same email."
                  : "Enter your email and we’ll send you a password-free magic link."
            }
          />

          {visibleError ? (
            <View className="mt-5 rounded-2xl border border-rose-200 bg-rose-500/5 p-4 dark:border-rose-500/40">
              <Text
                accessibilityRole="alert"
                className="text-sm font-semibold text-rose-500"
              >
                {visibleError.message}
              </Text>
              {visibleError.kind === "network" && !(showGoogle && formError) ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 self-start"
                  onPress={() => {
                    setFormError(null);
                    void retrySession();
                  }}
                >
                  <Text className="text-sm font-semibold text-sea-700 dark:text-sea-300">
                    Check again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {showGoogle ? (
            <View className="mt-6 gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                accessibilityState={{
                  busy: isSigningInWithGoogle,
                  disabled: isSigningInWithGoogle,
                }}
                className="min-h-12 items-center justify-center self-center"
                disabled={isSigningInWithGoogle}
                onPress={() => void handleGoogleSignIn()}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                {isSigningInWithGoogle ? (
                  <ActivityIndicator color={themeColors.primary} />
                ) : (
                  <Image
                    source={require("../assets/google-sign-in-android.png")}
                    style={{ width: 180, height: 40 }}
                  />
                )}
              </Pressable>
              <PrimaryButton
                disabled={isSigningInWithGoogle}
                label="Use an email link"
                variant="secondary"
                onPress={() => {
                  editEmail();
                  setUseEmail(true);
                }}
              />
            </View>
          ) : sentTo ? (
            <View className="mt-6 gap-3">
              <PrimaryButton
                label="Send another link"
                loading={isSending}
                onPress={() => void handleSendMagicLink()}
              />
              <PrimaryButton
                label="Use a different email"
                variant="secondary"
                onPress={editEmail}
              />
            </View>
          ) : (
            <View className="mt-6 gap-5">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">
                  Email address
                </Text>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  inputMode="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={themeColors.mutedForeground}
                  returnKeyType="send"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setFormError(null);
                  }}
                  onSubmitEditing={() => void handleSendMagicLink()}
                  className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
                />
              </View>
              <PrimaryButton
                disabled={!email.trim()}
                label="Email me a magic link"
                loading={isSending}
                onPress={() => void handleSendMagicLink()}
              />
            </View>
          )}

          {canSignInWithGoogle && useEmail ? (
            <View className="mt-3">
              <PrimaryButton
                disabled={isSending}
                label="Back to Google sign-in"
                variant="secondary"
                onPress={() => {
                  editEmail();
                  setUseEmail(false);
                }}
              />
            </View>
          ) : null}

          <Text className="mt-6 text-xs leading-5 text-ink-500 dark:text-ink-300">
            Your browser or device keeps a sign-in session so your private study
            data can sync across devices.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
