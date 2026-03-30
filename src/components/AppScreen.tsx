import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";

import { cn } from "../utils/classnames";

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentContainerClassName?: string;
}> &
  Partial<ScrollViewProps>;

export function AppScreen({
  children,
  scroll = true,
  className,
  contentContainerClassName,
  ...props
}: AppScreenProps) {
  const content = (
    <View className="flex-1">
      <View className="absolute -right-12 -top-14 h-52 w-52 rounded-full bg-sea-200/35 dark:bg-sea-700/25" />
      <View className="absolute left-[-52px] top-40 h-72 w-72 rounded-full bg-amber-100/60 dark:bg-amber-800/20" />
      <View className="absolute bottom-8 right-0 h-44 w-44 rounded-full bg-ink-200/20 dark:bg-ink-300/10" />
      {scroll ? (
        <ScrollView
          {...props}
          className={cn("flex-1", className)}
          contentContainerStyle={{ paddingBottom: 32 }}
          contentContainerClassName={cn("gap-5 px-5 pb-10 pt-4", contentContainerClassName)}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn("flex-1 gap-5 px-5 pb-10 pt-4", className)}>{children}</View>
      )}
    </View>
  );

  return <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">{content}</SafeAreaView>;
}
