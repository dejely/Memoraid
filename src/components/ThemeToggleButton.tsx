import { Text } from "react-native";

import { useAppTheme } from "./ThemeProvider";
import { PrimaryButton } from "./PrimaryButton";

function getThemeLabel(preference: "system" | "light" | "dark"): string {
  if (preference === "system") {
    return "Theme: System";
  }

  if (preference === "dark") {
    return "Theme: Dark";
  }

  return "Theme: Light";
}

export function ThemeToggleButton() {
  const theme = useAppTheme();

  return (
    <PrimaryButton
      label={getThemeLabel(theme.preference)}
      variant="secondary"
      onPress={() => {
        void theme.cyclePreference();
      }}
      className="px-3"
      textClassName="text-xs"
      icon={<Text className="text-xs text-ink-700 dark:text-ink-100">◐</Text>}
    />
  );
}
