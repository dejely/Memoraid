import { useThemeColors } from "./ThemeProvider";
import { ActivityIndicator, Text, View } from "react-native";

import { AppScreen } from "./AppScreen";

export function LoadingState({
  message = "Loading your study space...",
}: {
  message?: string;
}) {
  const colors = useThemeColors();
  return (
    <AppScreen scroll={false} className="items-center justify-center">
      <View className="items-center gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-base text-ink-600 dark:text-ink-200">
          {message}
        </Text>
      </View>
    </AppScreen>
  );
}
