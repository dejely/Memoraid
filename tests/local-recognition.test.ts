import test from "node:test";
import assert from "node:assert/strict";
import {
  trainSymbols,
  predictSymbol,
  assessLocalReports,
  benchmarkLocal,
  type LabeledInk,
} from "../src/services/recognition/local-symbols";
const sample = (
  id: string,
  label: string,
  points: [number, number, number][],
  split: LabeledInk["split"] = "training",
): LabeledInk => ({
  id,
  label,
  split,
  source: "synthetic",
  ink: { width: 1000, height: 400, strokes: [points] },
});
test("local isolated symbols use training only and remain experimental without real device evidence", () => {
  const a = sample("a", "1", [
      [100, 10, 0],
      [100, 100, 1],
    ]),
    b = sample("b", "-", [
      [10, 50, 0],
      [100, 50, 1],
    ]),
    held = sample(
      "held",
      "1",
      [
        [200, 20, 0],
        [200, 200, 1],
      ],
      "heldout",
    );
  const model = trainSymbols([a, b, held]);
  assert.equal(model.length, 2);
  assert.equal(predictSymbol(model, held.ink)[0].latex, "1");
  const report = benchmarkLocal([a, b, held], "other", false, null);
  assert.equal(report.accuracy, 1);
  assert.equal(assessLocalReports([report]).promotable, false);
  assert.throws(
    () => benchmarkLocal([a, { ...held, id: "a" }], "chromium", true, 50),
    /unique/,
  );
});
