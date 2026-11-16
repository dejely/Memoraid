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
writeFileSync(
  "dist/sw.js",
  `const CACHE='memoraid-shell-${version}';const ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('memoraid-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')).then(r=>r||fetch(event.request)));return;}if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(c=>c.match(url.pathname)).then(r=>r||fetch(event.request)));});`,
);
console.log(
  `Offline shell: ${assets.length} static assets (${version}). Authentication and API responses are excluded.`,
);
