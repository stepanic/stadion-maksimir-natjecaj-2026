// Regresijska provjera sitea (routing, prerender, stari linkovi, statusi).
// Ne dira glasanje ni localStorage: samo čita stranice. Upute: docs/2026-09-25-regresijske-provjere.md
//
//   node scripts/regression.mjs <baseUrl> [--alias <host>]
//   npm run check -- http://localhost:8787
//   npm run check -- https://maksimir.domovina.ai --alias https://stadion-maksimir.domovina.ai
//   npm run check -- http://localhost:8787 --baseline https://dd23a1dd.stadion-maksimir-8cl.pages.dev
//
// Rute čita iz <baseUrl>/sitemap.xml. Izlazni kod 1 ako ijedna provjera padne.

import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const args = process.argv.slice(2);
const BASE = (args[0] ?? "http://localhost:8787").replace(/\/$/, "");
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1].replace(/\/$/, "") : null);
const ALIAS = opt("--alias");
// Stari deploy (hash rute, prije refaktora): sadržaj svake rute mora biti isti.
const BASELINE = opt("--baseline");
const RAD = "0ZUFNG8CC";

const fails = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
  return cond;
};
const get = (url, opts = {}) => fetch(url, { redirect: "manual", ...opts });

// 1. HTTP: statusi, preusmjeravanja i meta u HTML-u (bez JavaScripta)
const sm = await (await get(`${BASE}/sitemap.xml`)).text();
const paths = [...sm.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1]);
ok(paths.length >= 120, `sitemap ima samo ${paths.length} ruta`);

const expect = [
  ["/", 200],
  [`/radovi/${RAD}`, 200],
  [`/radovi/${RAD}/`, 308, `/radovi/${RAD}`],
  [`/radovi/${RAD}.html`, 308, `/radovi/${RAD}`],
  ["/index.html", 308, "/"],
  ["/nepostoji", 404],
  [`/radovi/NEPOSTOJI`, 404],
  ["/glasanje/g/abcdefabcdef", 200],
  ["/g/abcdefabcdef", 200],
  ["/g/nevaljan", 302, "/glasanje"],
  [`/radovi/${RAD}.jpg`, 200],
  ["/robots.txt", 200],
  ["/og-glasanje.png", 200],
];
for (const [p, status, loc] of expect) {
  const r = await get(BASE + p);
  const where = r.headers.get("location");
  ok(r.status === status, `HTTP ${p}: ${r.status}, očekivano ${status}`);
  if (loc) ok(where && new URL(where, BASE).pathname === loc, `HTTP ${p}: Location ${where}, očekivano ${loc}`);
}
{
  const html = await (await get(`${BASE}/radovi/${RAD}`)).text();
  ok(html.includes(`<link rel="canonical" href="https://maksimir.domovina.ai/radovi/${RAD}">`), "canonical rada");
  ok(/<meta property="og:image" content="https:\/\/maksimir\.domovina\.ai\/radovi\/[^"]+\.jpg">/.test(html), "og:image rada");
  ok(/<h1 class="doc-title">[^<]+<\/h1>/.test(html), "prerenderirani h1 rada");
  const nf = await (await get(`${BASE}/nepostoji`)).text();
  ok(nf.includes('content="noindex"'), "404 bez noindexa");
  const bot = await (await get(`${BASE}/g/abcdefabcdef`, { headers: { "User-Agent": "facebookexternalhit/1.1" } })).text();
  ok(bot.includes('property="og:title"') && bot.includes('location.replace("/glasanje/g/abcdefabcdef")'), "/g/<id> kartica");
}
if (ALIAS) {
  const r = await get(`${ALIAS}/radovi/${RAD}?x=1#a`);
  ok(r.status === 301 && r.headers.get("location") === `https://maksimir.domovina.ai/radovi/${RAD}?x=1`,
    `alias ${ALIAS}: ${r.status} ${r.headers.get("location")}`);
}
console.log(`HTTP: ${expect.length} putova${ALIAS ? " + alias" : ""}`);

// 2. Preglednik: sadržaj nakon JavaScripta jednak je prerenderu na svakoj ruti
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: ${m.text()}`));

// Razlikuju se samo dijelovi koji dolaze uživo ili ih crta preglednik:
// panel glasanja na radu (Supabase), sadržaj /glasanje i Mermaid dijagrami
// (prerender ima izvor, preglednik SVG). Njih praznimo prije usporedbe.
const contentOf = (html) =>
  page.evaluate((h) => {
    const doc = h ? new DOMParser().parseFromString(h, "text/html") : document;
    const c = doc.getElementById("content").cloneNode(true);
    c.querySelectorAll("#gl-rad-panel").forEach((e) => (e.innerHTML = ""));
    c.querySelectorAll('[class*="mermaid"]').forEach((e) => e.replaceWith("[mermaid]"));
    return c.innerHTML.replace(/\s+/g, " ").trim();
  }, html);

// /glasanje i objave pune se uživo; dokumenti /glasanje-* su obični dokumenti.
const isLive = (p) => p === "/glasanje" || p.startsWith("/glasanje/");
const newSinceBaseline = [];
for (const p of paths) {
  const raw = await (await get(BASE + p)).text();
  const a = await contentOf(raw);
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  const b = await contentOf(null);
  if (!isLive(p) && a !== b) {
    let i = 0;
    while (a[i] === b[i]) i++;
    fails.push(`DOM ${p}\n    prerender: …${a.slice(Math.max(0, i - 60), i + 100)}\n    preglednik: …${b.slice(Math.max(0, i - 60), i + 100)}`);
  }
  ok((await page.title()).includes("DOMOVINA"), `naslov ${p}: ${await page.title()}`);
  ok(new URL(page.url()).pathname === p, `${p} završio na ${page.url()}`);
  // Cijela stranica (i ljuska iz index.html, ne samo #content): nijedan link u starom obliku.
  const legacyHrefs = await page.$$eval('a[href^="#/"]', (as) => as.map((a) => a.outerHTML.slice(0, 80)));
  ok(legacyHrefs.length === 0, `${p}: link u starom obliku #/: ${legacyHrefs.join(" | ")}`);
  if (BASELINE && !isLive(p)) {
    await page.goto(`${BASELINE}/#${p}`, { waitUntil: "networkidle" });
    // Jedina dopuštena razlika: href="#/x" → href="/x".
    const old = (await contentOf(null)).replace(/href="#\//g, 'href="/');
    // Stranica koja na baselineu još ne postoji (novi dokument) nije regresija.
    if (old.includes('class="notfound"') && !b.includes('class="notfound"')) newSinceBaseline.push(p);
    else if (old !== b) {
      let i = 0;
      while (old[i] === b[i]) i++;
      fails.push(`BASELINE ${p}\n    staro: …${old.slice(Math.max(0, i - 60), i + 100)}\n    novo:  …${b.slice(Math.max(0, i - 60), i + 100)}`);
    }
  }
}
console.log(`DOM: ${paths.length} ruta${BASELINE ? `, usporedba sa ${BASELINE}` : ""}`);
if (newSinceBaseline.length) console.log(`  nove od baselinea (ne uspoređuju se): ${newSinceBaseline.join(", ")}`);

// 3. Stari hash linkovi (svi oblici koji su kružili prije prelaska na prave rute)
const legacy = [
  ...paths.map((p) => [`/#${p}`, p, ""]),
  ["/#/research-08-rezultati#3-pobjednicki-rad-vg13", "/research-08-rezultati", "#3-pobjednicki-rad-vg13"],
  ["/#/glasanje/g/abcdefabcdef", "/glasanje/g/abcdefabcdef", ""],
];
for (const [from, path, hash] of legacy) {
  await page.goto(BASE + from, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !location.hash.startsWith("#/"));
  const u = new URL(page.url());
  ok(u.pathname === path && u.hash === hash, `stari link ${from} → ${u.pathname}${u.hash}`);
}
console.log(`stari linkovi: ${legacy.length}`);

// 4. Navigacija unutar stranice: klik, natrag, naprijed, bez ponovnog učitavanja
await page.goto(`${BASE}/radovi`, { waitUntil: "networkidle" });
await page.evaluate(() => (window.__sameDoc = true));
await page.click(`a[href="/radovi/${RAD}"]`);
await page.waitForURL(`**/radovi/${RAD}`);
ok((await page.title()).includes(RAD), "klik na rad: naslov");
await page.goBack();
await page.waitForURL("**/radovi");
await page.goForward();
await page.waitForURL(`**/radovi/${RAD}`);
await page.click('a[href="/rezultati"]');
await page.waitForURL("**/rezultati");
ok(await page.evaluate(() => window.__sameDoc === true), "navigacija je ponovno učitala stranicu");
// sidro u dokumentu
await page.goto(`${BASE}/research-08-rezultati#3-pobjednicki-rad-vg13`, { waitUntil: "networkidle" });
ok(await page.evaluate(() => Math.abs(document.getElementById("3-pobjednicki-rad-vg13")?.getBoundingClientRect().top ?? 999) < 150),
  "izravan ulaz sa sidrom ne skrola do sidra");
// Mermaid se crta u pregledniku
await page.goto(`${BASE}/glasanje-kako-radi`, { waitUntil: "networkidle" });
ok((await page.$$("#content svg")).length > 0, "Mermaid dijagrami nisu iscrtani na /glasanje-kako-radi");
console.log("navigacija: klik, natrag, naprijed, sidro, Mermaid");

// 5. Bez JavaScripta
const nojs = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
await nojs.goto(`${BASE}/rezultati/1`);
ok(((await nojs.$eval("#content h1", (e) => e.textContent)) ?? "").length > 3, "bez JS-a: h1 na /rezultati/1");
ok((await nojs.$$eval("#nav a", (a) => a.length)) > 20, "bez JS-a: navigacija");

// 6. Izgled: screenshot iste stranice na baselineu i ovdje, 390 i 1280 px.
if (BASELINE) {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const out = fs.mkdtempSync(`${os.tmpdir()}/maksimir-shots-`);
  const shots = ["/", "/radovi", `/radovi/${RAD}`, "/rezultati/1", "/sot", "/glasanje-kako-radi"];
  let differ = 0;
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const shotPage = await ctx.newPage();
    const shot = async (url) => {
      await shotPage.goto(url, { waitUntil: "networkidle" });
      await shotPage.waitForTimeout(500);
      return shotPage.screenshot();
    };
    for (const p of shots) {
      const [now, then] = [await shot(BASE + p), await shot(`${BASELINE}/#${p}`)];
      // Bajtovi PNG-a se razlikuju i kad je slika ista (šum pri kodiranju),
      // pa se broje pikseli koji se vidljivo razlikuju.
      const [a, b] = [PNG.sync.read(now), PNG.sync.read(then)];
      const same = a.width === b.width && a.height === b.height &&
        pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 }) === 0;
      if (!same) {
        differ++;
        const name = `${width}${p.replace(/\//g, "_") || "_"}`;
        fs.writeFileSync(`${out}/${name}-novo.png`, now);
        fs.writeFileSync(`${out}/${name}-staro.png`, then);
      }
    }
    await ctx.close();
  }
  ok(differ === 0, `screenshotovi: ${differ} različitih, parovi za pregled u ${out}`);
  console.log(`izgled: ${shots.length} stranica × 390/1280 px`);
}

ok(errors.length === 0, `greške u konzoli:\n    ${errors.slice(0, 10).join("\n    ")}`);
await browser.close();

if (fails.length) {
  console.log(`\nPALO (${fails.length}):\n  ` + fails.join("\n  "));
  process.exit(1);
}
console.log("\nSve provjere prošle.");
