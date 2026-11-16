import type { Ink } from "../../features/practice/ink";
import { normalizeLatex, summarizeBenchmark } from "./benchmark";
export interface LabeledInk {
  id: string;
  label: string;
  ink: Ink;
  split: "training" | "heldout";
  source: "stylus" | "synthetic";
}
// An order-sensitive nearest-template experiment for isolated symbols, not equation OCR.
function descriptor(ink: Ink): number[] {
  const points = ink.strokes.flat();
  if (!points.length) throw new Error("Draw a symbol first.");
  const minX = Math.min(...points.map((p) => p[0])),
    minY = Math.min(...points.map((p) => p[1]));
  const width = Math.max(...points.map((p) => p[0])) - minX,
    height = Math.max(...points.map((p) => p[1])) - minY,
    scale = Math.max(width, height, 1);
  const segments = ink.strokes
    .flatMap((s) =>
      s
        .slice(1)
        .map((p, i) => ({
          a: s[i],
          b: p,
          length: Math.hypot(p[0] - s[i][0], p[1] - s[i][1]),
        })),
    )
    .filter((s) => s.length > 0);
  const total = segments.reduce((n, s) => n + s.length, 0),
    values: number[] = [];
  for (let i = 0; i < 64; i++) {
    let offset = (total * i) / 63,
      selected = segments[segments.length - 1];
    for (const s of segments) {
      selected = s;
      if (offset <= s.length) break;
      offset -= s.length;
    }
    const ratio = selected ? Math.min(1, offset / selected.length) : 0;
    const x = selected
      ? selected.a[0] + (selected.b[0] - selected.a[0]) * ratio
      : points[0][0];
    const y = selected
      ? selected.a[1] + (selected.b[1] - selected.a[1]) * ratio
      : points[0][1];
    values.push((x - minX) / scale, (y - minY) / scale);
  }
  values.push(
    Math.min(ink.strokes.length, 10) / 10,
    width / scale,
    height / scale,
  );
  return values;
}
export function trainSymbols(samples: LabeledInk[]) {
  return samples
    .filter((s) => s.split === "training")
    .map((s) => ({ id: s.id, label: s.label, features: descriptor(s.ink) }));
}
export function predictSymbol(
  model: ReturnType<typeof trainSymbols>,
  ink: Ink,
) {
  const vector = descriptor(ink),
    byLabel = new Map<string, number>();
  for (const template of model) {
    const distance = Math.sqrt(
      template.features.reduce((sum, v, i) => sum + (v - vector[i]) ** 2, 0) /
        vector.length,
    );
    byLabel.set(
      template.label,
      Math.min(byLabel.get(template.label) ?? Infinity, distance),
    );
  }
  return [...byLabel]
    .map(([latex, distance]) => ({ latex, distance }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}
export interface LocalReport {
  device: "chromium" | "android-physical" | "other";
  physicalStylus: boolean;
  heldoutIds: string[];
  trainingIds: string[];
  realSamples: number;
  samples: number;
  accuracy: number;
  p95Ms: number | null;
  modelBytes: number;
  extraMemoryMB: number | null;
}
export function benchmarkLocal(
  samples: LabeledInk[],
  device: LocalReport["device"],
  physicalStylus: boolean,
  extraMemoryMB: number | null,
): LocalReport {
  const training = samples.filter((s) => s.split === "training"),
    heldout = samples.filter((s) => s.split === "heldout"),
    model = trainSymbols(training);
  if (!model.length || !heldout.length)
    throw new Error("Collect separate training and held-out samples first.");
  if (new Set(samples.map((s) => s.id)).size !== samples.length)
    throw new Error("Training and held-out sample IDs must be unique.");
  predictSymbol(model, heldout[0].ink); // warm-up excluded from timing
  const rows = heldout.map((sample) => {
    const start = performance.now();
    const prediction = predictSymbol(model, sample.ink)[0]?.latex ?? "";
    return {
      sampleId: sample.id,
      truth: sample.label,
      prediction,
      durationMs: performance.now() - start,
      provider: "local",
      model: "symbol-templates-v1",
    };
  });
  const summary = summarizeBenchmark(rows);
  return {
    device,
    physicalStylus,
    heldoutIds: heldout.map((s) => s.id),
    trainingIds: training.map((s) => s.id),
    realSamples: heldout.filter((s) => s.source === "stylus").length,
    samples: summary.samples,
    accuracy: summary.accuracy,
    p95Ms: summary.p95Ms,
    modelBytes: encodeURIComponent(JSON.stringify(model)).replace(
      /%[A-F0-9]{2}/g,
      "x",
    ).length,
    extraMemoryMB,
  };
}
export function assessLocalReports(reports: LocalReport[]) {
  const reasons: string[] = [];
  for (const device of ["chromium", "android-physical"] as const) {
    const r = reports.find((r) => r.device === device);
    if (!r) {
      reasons.push(`${device}: missing physical stylus report`);
      continue;
    }
    if (
      !r.physicalStylus ||
      r.samples < 100 ||
      r.realSamples < 100 ||
      new Set(r.heldoutIds).size < 100 ||
      r.trainingIds.some((id) => r.heldoutIds.includes(id))
    )
      reasons.push(`${device}: need 100 disjoint real held-out stylus samples`);
    if (r.accuracy < 0.95 || r.p95Ms === null || r.p95Ms > 1000)
      reasons.push(`${device}: accuracy or warm latency gate failed`);
    if (
      r.modelBytes > 25 * 1024 * 1024 ||
      r.extraMemoryMB === null ||
      r.extraMemoryMB > 150 ||
      r.extraMemoryMB < 0
    )
      reasons.push(`${device}: model size or measured memory gate failed`);
  }
  return { promotable: reasons.length === 0, reasons };
}
