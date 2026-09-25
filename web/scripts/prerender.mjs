// Prerender: za svaku rutu zapisuje gotov HTML (sadržaj, navigacija, meta i OG),
// da ga vide tražilice i društvene mreže bez izvođenja JavaScripta.
//
// Pokreće iste funkcije iscrtavanja kao preglednik (src/app.ts, iz SSR builda u
// dist-ssr/) pod happy-domom. Preglednik na učitavanju iscrta istu rutu u isti
// #content, pa nema vidljive razlike ni hidracije.
//
//   node scripts/prerender.mjs [distDir]      (zadano: dist)
//
// Izlaz: <ruta>.html (Worker ga poslužuje na /<ruta>), 404.html, _share.html
// (ljuska za /glasanje/g/<id>, poslužuje je worker/index.ts), sitemap.xml, robots.txt.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(here, "..", "dist"));
const ssrEntry = path.join(here, "..", "dist-ssr", "prerender.js");
const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const window = new Window({
  url: "https://maksimir.domovina.ai/",
  settings: {
    disableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true,
    navigator: { userAgent: "maksimir-prerender" },
  },
});
window.document.write(template);

// app.ts i viewovi koriste globalni DOM kao u pregledniku.
for (const key of [
  "window", "document", "location", "history", "navigator", "localStorage", "sessionStorage",
  "HTMLElement", "HTMLAnchorElement", "Element", "Node", "Event", "CustomEvent", "PopStateEvent",
  "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "scrollTo", "matchMedia",
]) {
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
// Podaci uživo (glasanje, objave) dolaze tek u pregledniku: mreža u prerenderu
// nikad ne odgovara, pa stranica ostaje u početnom stanju („Učitavam…”).
const never = () => new Promise(() => {});
globalThis.fetch = never;
window.fetch = never;
process.on("unhandledRejection", () => {});

const { buildNav, route, allRoutes, pageMeta, SITE, link } = await (await import(pathToFileURL(ssrEntry).href)).load();
const doc = window.document;
const content = doc.getElementById("content");
buildNav();

async function render(routePath) {
  window.history.replaceState(null, "", routePath);
  content.innerHTML = "";
  void route().catch(() => {});
  // Iscrtavanje je sinkrono do prvog await-a (dijagrami, mreža); pričekaj jedan krug.
  await new Promise((r) => setTimeout(r, 0));
  return "<!doctype html>\n" + doc.documentElement.outerHTML + "\n";
}

function write(file, html) {
  const out = path.join(dist, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

const routes = allRoutes();
const seen = new Set();
for (const r of routes) {
  if (seen.has(r)) throw new Error(`Ruta dvaput: ${r}`);
  seen.add(r);
  if (pageMeta(r).index !== true) throw new Error(`Ruta bez sadržaja: ${r}`);
  const html = await render(link(r));
  if (r !== "" && fs.existsSync(path.join(dist, `${r}.html`))) throw new Error(`Već postoji: ${r}.html`);
  write(r === "" ? "index.html" : `${r}.html`, html);
}
write("404.html", await render("/404"));
write("_share.html", await render("/glasanje/g/000000000000"));

write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    routes.map((r) => `  <url><loc>${SITE}${link(r)}</loc></url>`).join("\n") +
    `\n</urlset>\n`
);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`prerender: ${routes.length} ruta + 404 + ljuska objave → ${path.relative(process.cwd(), dist) || "."}`);
await window.happyDOM.abort();
process.exit(0);
