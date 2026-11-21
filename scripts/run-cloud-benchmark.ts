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
const models: { provider: "unimernet" | "openrouter"; model: string }[] =
  JSON.parse(readFileSync(modelsPath, "utf8"));
if (
  !samples.length ||
  new Set(samples.map((s) => s.id)).size !== samples.length
)
  throw new Error("Use nonempty unique sample IDs.");
for (const { provider, model } of models) {
  if (
    (provider !== "unimernet" || model !== "unimernet-tiny") &&
    (provider !== "openrouter" || !isFreeOpenRouterModel(model))
  )
    throw new Error("Use unimernet-tiny or a free OpenRouter model.");
}
const openrouterKey = process.env.MEMORAID_OPENROUTER_KEY?.trim() ?? "";
if (models.some((entry) => entry.provider === "openrouter") && !openrouterKey)
  throw new Error("Set MEMORAID_OPENROUTER_KEY to benchmark OpenRouter.");
async function runBenchmark() {
  const records: BenchmarkRecord[] = [];
  writeFileSync(outputPath, "");
  for (const entry of models) {
    const useOpenRouter = entry.provider === "openrouter";
    const firstRecord = records.length;
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
      let returnedProvider: string | undefined;
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
              openrouterModel: useOpenRouter ? entry.model : DEFAULT_AI_SETTINGS.openrouterModel,
              fallbackEnabled: useOpenRouter,
            },
            credentials: {
              gemini: "",
              openrouter: useOpenRouter ? openrouterKey : "",
            },
          }),
        });
        if (!response.ok) throw new Error("Provider request failed");
        const result = await response.json();
        returnedProvider = result.provider;
        prediction = result.latex ?? "";
        model = result.model ?? model;
        failed = !!result.unreadable;
      } catch {
        failed = true;
      } finally {
        clearTimeout(timer);
      }
      if ((!failed || returnedProvider !== undefined) && returnedProvider !== entry.provider)
        throw new Error(
          `Expected ${entry.provider}, got ${returnedProvider ?? "no provider"}. Check the relay configuration.`,
        );
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
        summarizeBenchmark(records.slice(firstRecord)),
      ),
    );
  }
}

void runBenchmark().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Benchmark failed.");
  process.exitCode = 1;
});
