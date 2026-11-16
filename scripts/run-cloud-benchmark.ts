import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { isFreeOpenRouterModel } from "../supabase/functions/_shared/openrouter-policy";
import { DEFAULT_AI_SETTINGS } from "../src/services/ai/config";
import {
  summarizeBenchmark,
  type BenchmarkRecord,
} from "../src/services/recognition/benchmark";
const [corpusPath, modelsPath, outputPath] = process.argv.slice(2);
if (!corpusPath || !modelsPath || !outputPath)
  throw new Error(
    "Usage: npx tsx scripts/run-cloud-benchmark.ts corpus.json models.json report.jsonl",
  );
const url = process.env.EXPO_PUBLIC_SUPABASE_URL,
  anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  token = process.env.MEMORAID_ACCESS_TOKEN;
if (!url || !anon || !token)
  throw new Error(
    "Set the public Supabase URL/key and MEMORAID_ACCESS_TOKEN in your environment.",
  );
const samples: { id: string; truth: string; imagePath: string }[] = JSON.parse(
  readFileSync(corpusPath, "utf8"),
);
const models: { provider: "gemini" | "openrouter"; model: string }[] =
  JSON.parse(readFileSync(modelsPath, "utf8"));
if (
  !samples.length ||
  new Set(samples.map((s) => s.id)).size !== samples.length
)
  throw new Error("Use nonempty unique sample IDs.");
for (const entry of models)
  if (
    !["gemini", "openrouter"].includes(entry.provider) ||
    (entry.provider === "openrouter" && !isFreeOpenRouterModel(entry.model))
  )
    throw new Error("Only free OpenRouter models are allowed.");
const records: BenchmarkRecord[] = [];
writeFileSync(outputPath, "");
for (const entry of models) {
  const key =
    entry.provider === "gemini"
      ? process.env.MEMORAID_GEMINI_KEY
      : process.env.MEMORAID_OPENROUTER_KEY;
  if (!key) throw new Error(`Missing environment key for ${entry.provider}.`);
  for (const sample of samples) {
    const png = readFileSync(resolve(dirname(corpusPath), sample.imagePath));
    if (
      png.length > 1500000 ||
      png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    )
      throw new Error("Corpus images must be bounded cropped PNGs.");
    const started = performance.now();
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 45000);
    let prediction = "",
      model = entry.model,
      failed = false;
    try {
      const response = await fetch(`${url}/functions/v1/study-ai`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          apikey: anon,
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          operation: "recognizeMath",
          requestId: `bench-${Date.now()}`,
          image: `data:image/png;base64,${png.toString("base64")}`,
          settings: {
            ...DEFAULT_AI_SETTINGS,
            [entry.provider === "gemini" ? "geminiModel" : "openrouterModel"]:
              entry.model,
            fallbackEnabled: false,
          },
          credentials: {
            gemini: entry.provider === "gemini" ? key : "",
            openrouter: entry.provider === "openrouter" ? key : "",
          },
        }),
      });
      if (!response.ok) throw new Error("Provider request failed");
      const result = await response.json();
      prediction = result.latex ?? "";
      model = result.model ?? model;
      failed = !!result.unreadable;
    } catch {
      failed = true;
    } finally {
      clearTimeout(timer);
    }
    const record = {
      sampleId: sample.id,
      truth: sample.truth,
      prediction,
      durationMs: performance.now() - started,
      failed,
      provider: entry.provider,
      model,
    };
    records.push(record);
    appendFileSync(outputPath, JSON.stringify(record) + "\n");
  }
  console.log(
    `${entry.provider}/${entry.model}`,
    JSON.stringify(
      summarizeBenchmark(records.filter((r) => r.provider === entry.provider)),
    ),
  );
}
