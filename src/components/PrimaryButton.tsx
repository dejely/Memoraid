import { useThemeColors } from "./ThemeProvider";
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
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={{ opacity: isDisabled ? 0.55 : 1 }}
      className={cn(
        "min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-4",
        variant === "primary" && "bg-primary",
        variant === "secondary" && "border border-border bg-secondary",
        variant === "ghost" && "bg-transparent",
        variant === "danger" && "bg-danger",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary"
              ? colors.primaryForeground
              : variant === "danger"
                ? colors.dangerForeground
                : colors.secondaryForeground
          }
        />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text
            className={cn(
              "text-center text-sm font-semibold",
              variant === "primary" && "text-primary-foreground",
              variant === "secondary" && "text-secondary-foreground",
              variant === "ghost" && "text-foreground",
              variant === "danger" && "text-danger-foreground",
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
