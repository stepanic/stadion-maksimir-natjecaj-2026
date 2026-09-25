// Cloudflare Worker ispred statičkog sitea (dist/, prerender svih ruta).
//
// Sve ide kroz Worker (run_worker_first u wrangler.jsonc), pa je redoslijed ovdje
// jedino mjesto s pravilima usmjeravanja:
//   1. sporedni hostovi → 301 na kanonski (jedna adresa za tražilice),
//   2. /g/<id> → OG kartica objave glasa (share.ts),
//   3. /glasanje/g/<id> → ljuska objave (_share.html), sadržaj crta preglednik,
//   4. sve ostalo → statičke datoteke; nepoznat put → 404.html sa statusom 404.

import { shareCard } from "./share";

const CANONICAL = "maksimir.domovina.ai";
// Isti sadržaj na drugom hostu Google vidi kao duplikat. *.workers.dev (i preview
// URL-ovi verzija) ostaje za provjeru prije deploya, ali s noindexom; stari
// *.pages.dev preusmjerava zadnji deploy Pages projekta.
const ALIASES = new Set(["stadion-maksimir.domovina.ai"]);

type Env = { ASSETS: { fetch(req: Request | string): Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await handle(request, env);
    if (new URL(request.url).hostname.endsWith(".workers.dev")) {
      const out = new Response(res.body, res);
      out.headers.set("X-Robots-Tag", "noindex");
      return out;
    }
    return res;
  },
};

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (ALIASES.has(url.hostname)) {
    url.hostname = CANONICAL;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.href, 301);
  }

  const g = url.pathname.match(/^\/g\/([^/]*)\/?$/);
  if (g) return shareCard(g[1], url.origin);

  if (/^\/glasanje\/g\/[^/]+\/?$/.test(url.pathname)) {
    const shell = await env.ASSETS.fetch(new URL("/_share", url.origin).href);
    return new Response(shell.body, { status: 200, headers: shell.headers });
  }

  const res = await env.ASSETS.fetch(request);
  // Kanonski oblik puta (/x/ i /x.html → /x) je trajan, kao što je bio na Pagesu (308).
  if (res.status === 307) return new Response(null, { status: 308, headers: res.headers });
  return withCache(res, url.pathname);
}

// HTML se uvijek provjerava (novi deploy vidi se odmah). Vite datoteke u /assets/
// imaju hash u imenu pa se ne mijenjaju; slike i PDF-ovi kao na Pagesu (4 h).
function withCache(res: Response, path: string): Response {
  if (res.status !== 200) return res;
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  if (path.startsWith("/assets/")) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/\.[a-z0-9]+$/i.test(path) && !/\.(xml|txt)$/i.test(path))
    out.headers.set("Cache-Control", "public, max-age=14400, must-revalidate");
  return out;
}
