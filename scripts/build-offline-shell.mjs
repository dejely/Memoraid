import { createOfflineWorker } from "./offline-worker.cjs";
import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(`${path}/${e.name}`) : [`${path}/${e.name}`],
  );
}
const assets = files("dist").filter(
  (p) =>
    /\.(?:html|js|css|woff2?|ttf|png|ico)$/.test(p) && !p.endsWith("/sw.js"),
);
const version = createHash("sha256")
  .update(
    assets
      .map((p) => readFileSync(p))
      .map((b) => createHash("sha256").update(b).digest("hex"))
      .join(""),
  )
  .digest("hex")
  .slice(0, 16);
const paths = assets.map((p) => "/" + p.slice(5));
writeFileSync("dist/sw.js", createOfflineWorker(version, paths));
console.log(
  `Offline shell: ${assets.length} static assets (${version}). Authentication and API responses are excluded.`,
);
