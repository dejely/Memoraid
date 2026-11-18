import { useThemeColors } from "./ThemeProvider";
import { Text, TextInput, View } from "react-native";

import { cn } from "../utils/classnames";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  className,
}: FormFieldProps) {
  const themeColors = useThemeColors();
  return (
    <View className={cn("gap-2", className)}>
      <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={cn(
          "min-h-12 rounded-xl border border-border bg-input px-4 py-3 text-base text-foreground",
          multiline && "min-h-28",
        )}
      />
    </View>
  );
}
