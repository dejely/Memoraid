import { Text, View } from "react-native";

import { AppScreen } from "../AppScreen";
import { PrimaryButton } from "../PrimaryButton";
import type { MemoraidAuthError } from "../../services/auth/auth-errors";

function getErrorHeading(error: MemoraidAuthError): string {
  if (error.kind === "configuration") {
    return "Cloud sign-in needs configuration";
  }

  if (error.kind === "invalid-session") {
    return "That session has expired";
  }

  if (error.kind === "network") {
    return "Memoraid is offline";
  }

  return "Sign-in is temporarily unavailable";
}

export function AuthErrorState({
  error,
  onRetry,
  onDismiss,
}: {
  error: MemoraidAuthError;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <AppScreen scroll={false} className="items-center justify-center">
      <View className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-6 shadow-soft dark:border-rose-500/40 dark:bg-ink-800">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-rose-500">Authentication</Text>
        <Text className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">{getErrorHeading(error)}</Text>
        <Text className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-200">{error.message}</Text>
        <View className="mt-6 gap-3">
          {error.retryable && onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}
          {onDismiss ? (
            <PrimaryButton label="Return to sign in" variant="secondary" onPress={onDismiss} />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
