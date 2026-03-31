import { Text, TextInput, View } from "react-native";

import { cn } from "../utils/classnames";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  className?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = "sentences",
  autoCorrect = false,
  className,
}: FormFieldProps) {
  return (
    <View className={cn("gap-2", className)}>
      <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6f88b7"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        textAlignVertical={multiline ? "top" : "center"}
        className={cn(
          "rounded-2xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 dark:border-ink-600 dark:bg-ink-800 dark:text-white",
          multiline && "min-h-28",
        )}
      />
    </View>
  );
}
