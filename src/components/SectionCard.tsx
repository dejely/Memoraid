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
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
    >
      {children}
    </View>
  );
}
