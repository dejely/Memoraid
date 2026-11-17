import { useMemo } from "react";
import { useAppTheme } from "../ThemeProvider";
import type { SurfaceConfig } from "./MathSurface.types";
export function useSurfaceConfig(input: SurfaceConfig): SurfaceConfig {
  const { colors, colorScheme } = useAppTheme();
  return useMemo(
    () => ({
      ...input,
      color: input.color ?? colors.foreground,
      colorScheme,
      palette: colors,
    }),
    [input, colors, colorScheme],
  );
}
