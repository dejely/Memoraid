import { View, type ViewProps } from "react-native";
import type { PropsWithChildren } from "react";

import { cn } from "../utils/classnames";

export function SectionCard({
  children,
  className,
  ...props
}: PropsWithChildren<ViewProps & { className?: string }>) {
  return (
    <View
      {...props}
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-soft dark:border-ink-700/80 dark:bg-ink-800/95",
        className,
      )}
    >
      {children}
    </View>
  );
}
