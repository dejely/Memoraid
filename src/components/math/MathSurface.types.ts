export interface SurfaceConfig {
  mode: "render" | "editor" | "draw";
  value: string;
  locked?: boolean;
  busy?: boolean;
  color?: string;
}
export type SurfaceMessage =
  | { type: "ready" }
  | { type: "configured" }
  | { type: "height"; height: number }
  | { type: "change"; value: string }
  | { type: "inkChanged"; revision: number }
  | { type: "recognize"; image: string; revision: number };
export interface MathSurfaceProps {
  config: SurfaceConfig;
  onMessage?: (message: SurfaceMessage) => void;
}

// Reserve keyboard space so asynchronous frame sizing cannot move confirmation buttons during a press.
export const SURFACE_MIN_HEIGHT = { render: 40, editor: 520, draw: 420 } as const;
