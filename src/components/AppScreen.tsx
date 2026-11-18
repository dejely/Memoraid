import {
  ScrollView,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from "react-native";
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
  const { width } = useWindowDimensions();
  const padding = width >= 768 ? 32 : 20;
  const content = (
    <View className="flex-1">
      {scroll ? (
        <ScrollView
          {...props}
          className={cn("flex-1", className)}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: padding,
            paddingTop: padding,
            paddingBottom: 40,
          }}
          contentContainerClassName="gap-6"
          showsVerticalScrollIndicator={false}
        >
          <View
            className={cn(
              "mx-auto w-full max-w-[1180px] gap-6",
              contentContainerClassName,
            )}
          >
            {children}
          </View>
        </ScrollView>
      ) : (
        <View
          style={{ padding }}
          className={cn(
            "mx-auto w-full max-w-[1180px] flex-1 gap-6",
            className,
          )}
        >
          {children}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">{content}</SafeAreaView>
  );
}
