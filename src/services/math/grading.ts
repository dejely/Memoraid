import { ComputeEngine } from "@cortex-js/compute-engine";
export type GradingMode = "self_review" | "numeric" | "expression";
export type GradingMethod = "automatic" | "self_review";
export function stripMath(value: string): string {
  return value
    .trim()
    .replace(/^\\[([]/, "")
    .replace(/\\[)\]]$/, "")
    .trim();
}
export function gradeMath(
  actual: string,
  expected: string,
  mode: GradingMode = "self_review",
  tolerance = 0.001,
): boolean | null {
  if (mode === "self_review" || !actual.trim() || !expected.trim() || actual.length > 2000 || expected.length > 2000)
    return null;
  try {
    const engine = new ComputeEngine();
    const left = engine.parse(stripMath(actual)),
      right = engine.parse(stripMath(expected));
    if (!left.isValid || !right.isValid) return null;
    // Relations, assignments, collections and free-form prose are outside v1 scalar grading.
    const unsupported =
      /"(?:Equal|NotEqual|Less|Greater|LessEqual|GreaterEqual|List|Tuple|Set|Matrix|Error|Sequence|Assign|Function|Integrate|Sum|Product|Limit|Derivative|D|Piecewise|Text)"/;
    if (unsupported.test(JSON.stringify(left.json)) || unsupported.test(JSON.stringify(right.json))) return null;
    if (mode === "numeric") {
      if (!Number.isFinite(tolerance) || tolerance < 0 || left.unknowns.length || right.unknowns.length) return null;
      const leftNumber = left.N(),
        rightNumber = right.N();
      if (leftNumber.im !== 0 || rightNumber.im !== 0) return null;
      const a = leftNumber.re,
        b = rightNumber.re;
      return typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)
        ? Math.abs(a - b) <= tolerance + Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b))
        : null;
    }
    // Identity comparison avoids treating equality at one numeric substitution as proof.
    const result = left.isIdenticallyEqual(right);
    return typeof result === "boolean" ? result : null;
  } catch {
    return null;
  }
}
