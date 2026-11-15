import { Text } from "react-native";
import { useAppTheme } from "../ThemeProvider";
import { MathSurface } from "./MathSurface";
export function MathContent({ children, className, color }: { children: string; className?: string; color?: string }) {
  const theme = useAppTheme();
  if (!/\\[([]/.test(children)) return <Text className={className}>{children}</Text>;
  return (
    <MathSurface
      config={{
        mode: "render",
        value: children,
        color: color ?? (theme.colorScheme === "dark" ? "#ffffff" : "#172136"),
      }}
    />
  );
}
