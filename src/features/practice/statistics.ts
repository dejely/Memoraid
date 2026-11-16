export const concepts = [
  "mean",
  "median",
  "population_variance",
  "sample_variance",
  "population_sd",
  "sample_sd",
  "z_score",
] as const;
export type StatisticsConcept = (typeof concepts)[number];
export interface PracticeProblem {
  id: string;
  cardId: string;
  deckId: string;
  concept: string;
  prompt: string;
  expected: string;
  mode: "numeric" | "expression" | "self_review";
  tolerance: number;
  explanation: string;
  seed?: number;
}
export function statisticsProblem(
  concept: StatisticsConcept,
  seed: number,
): PracticeProblem {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const values = Array.from(
    { length: 4 + Math.floor(random() * 5) },
    () => 1 + Math.floor(random() * 20),
  );
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const ss = values.reduce((sum, x) => sum + (x - mean) ** 2, 0);
  let prompt = "",
    expected = 0,
    explanation = "";
  if (concept === "mean") {
    expected = mean;
    prompt = "Find the arithmetic mean";
    explanation = `Add the ${values.length} values and divide by ${values.length}.`;
  }
  if (concept === "median") {
    const sorted = [...values].sort((a, b) => a - b),
      n = sorted.length;
    expected =
      n % 2
        ? sorted[Math.floor(n / 2)]
        : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    prompt = "Find the median";
    explanation = `Sort: ${sorted.join(", ")}. Use the middle value${n % 2 ? "" : "s and average them"}.`;
  }
  if (concept.includes("variance") || concept.endsWith("_sd")) {
    const sample = concept.startsWith("sample"),
      sd = concept.endsWith("_sd"),
      divisor = values.length - (sample ? 1 : 0);
    expected = ss / divisor;
    if (sd) expected = Math.sqrt(expected);
    prompt = `Find the ${sample ? "sample" : "population"} ${sd ? "standard deviation" : "variance"}`;
    explanation = `Mean = ${mean.toFixed(4)}. Squared deviations sum = ${ss.toFixed(4)}. Divide by ${sample ? "n − 1" : "n"} = ${divisor}${sd ? ", then take the square root" : ""}.`;
  }
  if (concept === "z_score") {
    const mu = 5 + Math.floor(random() * 15),
      sigma = 1 + Math.floor(random() * 5),
      x = mu + (Math.floor(random() * 9) - 4) * sigma;
    expected = (x - mu) / sigma;
    prompt = `Find the z-score for x = ${x}, population mean μ = ${mu}, and population standard deviation σ = ${sigma}.`;
    explanation = `z = (x − μ) / σ = (${x} − ${mu}) / ${sigma}.`;
  } else prompt += ` of: ${values.join(", ")}.`;
  return {
    id: `stats:${concept}:${seed >>> 0}`,
    cardId: `statistics:${concept}`,
    deckId: "statistics",
    concept,
    prompt,
    expected: String(expected),
    mode: "numeric",
    tolerance: 0.001,
    explanation,
    seed: seed >>> 0,
  };
}
export function weakConcept(
  attempts: { concept: string; isCorrect: boolean; createdAt: string }[],
): StatisticsConcept {
  const sorted = [...attempts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
  const scores = concepts.map((concept) => ({
    concept,
    score: sorted
      .filter((a) => a.concept === concept)
      .reduce((n, a) => n + (a.isCorrect ? -1 : 2), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].concept;
}
