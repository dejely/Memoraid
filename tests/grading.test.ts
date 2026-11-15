import test from "node:test";
import assert from "node:assert/strict";
import { gradeMath } from "../src/services/math/grading";
test("numeric math accepts equivalent fractions and tolerance boundaries", () => {
  assert.equal(gradeMath("\\(\\frac{1}{2}\\)", "0.5", "numeric", 0), true);
  assert.equal(gradeMath("0.501", "0.5", "numeric", 0.001), true);
  assert.equal(gradeMath("0.502", "0.5", "numeric", 0.001), false);
});
test("symbolic identities and self-review fallback", () => {
  assert.equal(gradeMath("x+x", "2x", "expression"), true);
  assert.equal(gradeMath("x=2", "2", "expression"), null);
  assert.equal(gradeMath("hello world", "2", "numeric"), null);
  assert.equal(gradeMath("\\frac{", "2", "numeric"), null);
  assert.equal(gradeMath("x", "2", "numeric"), null);
  assert.equal(gradeMath("1", "1", "self_review"), null);
  assert.equal(gradeMath("\\infty", "\\infty", "numeric"), null);
});
