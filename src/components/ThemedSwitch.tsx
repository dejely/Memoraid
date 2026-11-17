import { Switch, type SwitchProps } from "react-native";
import { useThemeColors } from "./ThemeProvider";
export function ThemedSwitch(props: SwitchProps) {
  const colors = useThemeColors();
  return (
    <Switch
      {...props}
      trackColor={
        props.trackColor ?? { false: colors.border, true: colors.primary }
      }
      thumbColor={
        props.thumbColor ??
        (props.value ? colors.primaryForeground : colors.mutedForeground)
      }
      ios_backgroundColor={props.ios_backgroundColor ?? colors.border}
    />
  );
}
