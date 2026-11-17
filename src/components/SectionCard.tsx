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
        "rounded-[28px] border border-border bg-card p-4 shadow-soft",
        className,
      )}
    >
      {children}
    </View>
  );
}
