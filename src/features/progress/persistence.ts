import type { LocalTransaction } from "../../db/local/types";
import { entities } from "../../db/local/operations";
import type { ReviewEvent } from "./model";
import { rebuildProjection, type ProgressProjection } from "./projection";
/** A review may arrive before the dashboard has ever opened (including after migration). */
export async function storedProjection(
  tx: LocalTransaction,
): Promise<ProgressProjection> {
  return (
    (await tx.get<ProgressProjection>("meta", "progress")) ??
    rebuildProjection(
      (await entities<ReviewEvent>(tx, "review")).map((e) => e.payload),
    )
  );
}
