import { Text, View } from "react-native";

import { AppScreen } from "./AppScreen";
import { PrimaryButton } from "./PrimaryButton";

export function DataErrorState({
  message = "Memoraid could not reach your study library. Check your connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <AppScreen scroll={false} className="items-center justify-center">
      <View className="w-full max-w-md rounded-[32px] border border-amber-200 bg-white p-6 dark:border-amber-500/40 dark:bg-ink-800">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-amber-700 dark:text-amber-200">
          Connection needed
        </Text>
        <Text className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">Your data did not load</Text>
        <Text accessibilityRole="alert" className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-200">
          {message}
        </Text>
        <PrimaryButton className="mt-6" label="Try again" onPress={onRetry} />
      </View>
    </AppScreen>
  );
}

