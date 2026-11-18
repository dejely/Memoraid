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
    <View className="flex-row flex-wrap items-center justify-between gap-4">
      <View className="min-w-[200px] flex-1 gap-2">
        {eyebrow ? (
          <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-muted-foreground">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
