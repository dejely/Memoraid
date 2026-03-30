import { View, Text } from "react-native";
import type { ReactNode } from "react";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <View className="flex-1 gap-2">
        {eyebrow ? <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">{eyebrow}</Text> : null}
        <Text className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">{title}</Text>
        {subtitle ? <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{subtitle}</Text> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
