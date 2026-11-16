export type InkPoint = [x: number, y: number, t: number, pressure?: number];
export interface Ink {
  width: number;
  height: number;
  strokes: InkPoint[][];
}
export const PREPROCESSING_VERSION = "padded-bounds-v1";
export function inkBounds(ink: Ink, padding = 24) {
  const points = ink.strokes.flat();
  if (!points.length) return null;
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = Math.max(0, Math.floor(Math.min(...xs) - padding));
  const y = Math.max(0, Math.floor(Math.min(...ys) - padding));
  return {
    x,
    y,
    width: Math.max(
      1,
      Math.min(ink.width, Math.ceil(Math.max(...xs) + padding)) - x,
    ),
    height: Math.max(
      1,
      Math.min(ink.height, Math.ceil(Math.max(...ys) + padding)) - y,
    ),
  };
}
