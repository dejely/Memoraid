import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";

import { cn } from "../utils/classnames";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  textClassName?: string;
  icon?: ReactNode;
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  className,
  textClassName,
  icon,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={{ opacity: isDisabled ? 0.55 : 1 }}
      className={cn(
        "min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-4",
        variant === "primary" && "bg-ink-900 dark:bg-sea-500",
        variant === "secondary" && "border border-ink-200 bg-white dark:border-ink-600 dark:bg-ink-700",
        variant === "ghost" && "bg-transparent",
        variant === "danger" && "bg-rose-500",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#172136" : "#ffffff"} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text
            className={cn(
              "text-center text-sm font-semibold",
              variant === "primary" && "text-white",
              variant === "secondary" && "text-ink-900 dark:text-white",
              variant === "ghost" && "text-sea-700 dark:text-sea-300",
              variant === "danger" && "text-white",
              textClassName,
            )}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
