import { readFile } from "node:fs/promises";
import { fileURLToPath, URL as NodeUrl } from "node:url";

import { pool } from "./pool.js";

async function run(): Promise<void> {
  const migrationPath = fileURLToPath(new NodeUrl("../../migrations/001_init.sql", import.meta.url));
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
  console.log("Memoraid sync schema is up to date.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
