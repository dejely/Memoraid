import { useMemo } from "react";
import { useThemeColors } from "../ThemeProvider";
import type { SurfaceConfig } from "./MathSurface.types";
export function useSurfaceConfig(input: SurfaceConfig): SurfaceConfig {
  const colors = useThemeColors();
  return useMemo(
    () => ({
      ...input,
      color: input.color ?? colors.foreground,
      palette: colors,
    }),
    [input, colors],
  );
}
