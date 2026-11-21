import { Redirect } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { useAuth } from "../../services/auth/AuthProvider";
import { toMemoraidAuthError } from "../../services/auth/auth-errors";
import {
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "../../services/auth/auth-service";
import { AppScreen } from "../AppScreen";
import { PrimaryButton } from "../PrimaryButton";
import { ScreenHeader } from "../ScreenHeader";

type Mode = "sign-in" | "sign-up" | "reset";

const forms = {
  "sign-in": { title: "Sign in to Memoraid", action: "Sign in" },
  "sign-up": { title: "Create an account", action: "Create account" },
  reset: { title: "Reset your password", action: "Send reset email" },
  recovery: { title: "Choose a new password", action: "Save password" },
};

const fieldClassName = "rounded-2xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 dark:border-ink-600 dark:bg-ink-900 dark:text-white";

export function AndroidPasswordSignIn() {
  const {
    dismissError,
    error: sessionError,
    finishPasswordRecovery,
    isRecoveringPassword,
    session,
    signOut,
  } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && !isRecoveringPassword) return <Redirect href="/" />;

  const form = isRecoveringPassword ? "recovery" : mode;
  const isNewPassword = form === "sign-up" || form === "recovery";
  const visibleError = error ?? (
    sessionError?.kind === "invalid-session"
      ? "This link expired or was already used. Request a fresh reset email to continue."
      : sessionError?.message
  );
  const { title, action } = forms[form];

  function changeMode(next: Mode) {
    setMode(next);
    setPassword("");
    setConfirmation("");
    setError(null);
    setNotice(null);
    dismissError();
  }

  async function submit() {
    if (busy) return;
    setError(null);
    setNotice(null);
    dismissError();

    if (isNewPassword && password !== confirmation) {
      setError("The passwords don’t match.");
      return;
    }

    setBusy(true);
    try {
      switch (form) {
        case "sign-in":
          await signInWithPassword(email, password);
          break;
        case "sign-up": {
          const signedIn = await signUpWithPassword(email, password);
          if (!signedIn) {
            changeMode("sign-in");
            setNotice(`Check ${email.trim()} for a confirmation link. Open it on this device. If you already have an account, use Set or reset password.`);
          }
          break;
        }
        case "reset":
          await sendPasswordReset(email);
          setNotice("If this email has an account, you’ll receive a reset link. Open it on this device to choose a password.");
          break;
        case "recovery":
          await finishPasswordRecovery(password);
          break;
      }
    } catch (cause) {
      const authError = toMemoraidAuthError(cause, "Authentication could not be completed. Try again.");
      setError(
        authError.kind === "rate-limit"
          ? "Too many attempts. Wait a moment and try again."
          : authError.kind === "invalid-session"
            ? "Your session expired. Open a fresh reset or confirmation link."
            : authError.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen contentContainerClassName="min-h-full items-center justify-center py-10">
      <View className="w-full max-w-md rounded-[32px] border border-ink-100 bg-white p-6 shadow-soft dark:border-ink-700 dark:bg-ink-800">
        <ScreenHeader
          eyebrow="Memoraid cloud"
          title={title}
          subtitle={form === "reset" ? "Use the email address on your existing account." : undefined}
        />
        <View className="mt-6 gap-4">
          {form !== "recovery" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Email address</Text>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                className={fieldClassName}
              />
            </View>
          ) : null}
          {form !== "reset" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={isNewPassword ? "new-password" : "current-password"}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                className={fieldClassName}
              />
            </View>
          ) : null}
          {isNewPassword ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Confirm password</Text>
              <TextInput
                accessibilityLabel="Confirm password"
                autoCapitalize="none"
                autoComplete="new-password"
                secureTextEntry
                value={confirmation}
                onChangeText={setConfirmation}
                editable={!busy}
                className={fieldClassName}
              />
            </View>
          ) : null}
          {visibleError ? (
            <Text accessibilityRole="alert" className="text-sm font-semibold text-rose-500">{visibleError}</Text>
          ) : null}
          {notice ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-ink-600 dark:text-ink-200">{notice}</Text>
          ) : null}
          <PrimaryButton
            label={action}
            loading={busy}
            disabled={(form !== "recovery" && !email.trim()) || (form !== "reset" && !password) || (isNewPassword && !confirmation)}
            onPress={() => void submit()}
          />
          {form === "sign-in" ? (
            <>
              <PrimaryButton label="Create an account" variant="secondary" disabled={busy} onPress={() => changeMode("sign-up")} />
              <PrimaryButton label="Set or reset password" variant="ghost" disabled={busy} onPress={() => changeMode("reset")} />
            </>
          ) : (
            <PrimaryButton
              label={form === "recovery" ? "Cancel and sign out" : "Back to sign in"}
              variant="ghost"
              disabled={busy}
              onPress={() => {
                if (form === "recovery") void signOut();
                else changeMode("sign-in");
              }}
            />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
