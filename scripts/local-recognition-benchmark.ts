import { readFileSync } from "node:fs";
import {
  benchmarkLocal,
  assessLocalReports,
} from "../src/services/recognition/local-symbols";
const path = process.argv[2];
if (!path)
  throw new Error(
    "Usage: npx tsx scripts/local-recognition-benchmark.ts dataset.json",
  );
const data = JSON.parse(readFileSync(path, "utf8"));
// Desktop CLI timing is diagnostic only and cannot satisfy either physical-device gate.
console.log(
  JSON.stringify(
    {
      diagnostic: benchmarkLocal(data.samples, "other", false, null),
      gate: assessLocalReports(data.reports ?? []),
    },
    null,
    2,
  ),
);
