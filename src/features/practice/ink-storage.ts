import type { LocalTransaction, Entity } from "../../db/local/types";
import { entityKey } from "../../db/local/types";
import { writeEntity } from "../../db/local/operations";
import type { Ink } from "./ink";
export async function saveInk(tx: LocalTransaction, id: string, ink: Ink) {
  const ids = (await tx.get<string[]>("meta", "inkIds")) ?? [];
  if (!ids.includes(id)) {
    ids.push(id);
    await tx.set("meta", "inkIds", ids);
  }
  await tx.set("meta", `local-ink:${id}`, ink);
  if (await tx.get("meta", "inkSync")) await writeEntity(tx, "ink", id, ink);
}
export async function readInk(tx: LocalTransaction, id: string) {
  const local = await tx.get<Ink>("meta", `local-ink:${id}`);
  if (local) return local;
  const remote = await tx.get<Entity<Ink>>("entities", entityKey("ink", id));
  return remote?.deleted ? undefined : remote?.payload;
}
