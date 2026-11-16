export interface BenchmarkRecord {
  sampleId: string;
  truth: string;
  prediction: string;
  durationMs: number;
  failed?: boolean;
  provider: string;
  model: string;
}
export function normalizeLatex(value: string) {
  return value
    .replace(/\\(?:left|right)|\\[()[\]]|\s+/g, "")
    .replace(/\\dfrac/g, "\\frac");
}
export function summarizeBenchmark(rows: BenchmarkRecord[]) {
  const durations = rows
    .filter((r) => !r.failed)
    .map((r) => r.durationMs)
    .sort((a, b) => a - b);
  const percentile = (p: number) =>
    durations.length
      ? durations[Math.max(0, Math.ceil(durations.length * p) - 1)]
      : null;
  return {
    samples: rows.length,
    accuracy: rows.length
      ? rows.filter(
          (r) =>
            !r.failed &&
            normalizeLatex(r.truth) === normalizeLatex(r.prediction),
        ).length / rows.length
      : 0,
    failureRate: rows.length
      ? rows.filter((r) => r.failed).length / rows.length
      : 0,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
  };
}
