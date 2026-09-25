# web/ — landing & doc viewer

Statički Vite SPA koji renderira sve markdown datoteke iz repoa (`SOT.md`,
`ROADMAP.md`, `TODO.md`, `research/*`, `research/cross-check/*`, `sources/*`)
kao klikabilnu dokumentacijsku stranicu sa sidebar navigacijom, Mermaid
dijagramima i internim `[[link]]`-ovima koji rade.

Svaka ruta ima pravi URL (`/radovi/6TVJ3MUHR`) i prerenderirani HTML s naslovom, opisom,
canonicalom i OG karticom. Stari hash linkovi (`/#/radovi/X`) i dalje rade.

Poslužuje ga **Cloudflare Worker `maksimir`** (account D.O.M.) sa statičkim datotekama iz `dist/`.

## Skripte

```bash
npm install            # prvi put
npm run dev            # lokalni dev server (Vite, bez prerendera i Workera)
npm run build          # vite build + SSR build + prerender svih ruta u dist/
npm run dev:worker     # build + wrangler dev na :8787 (kao produkcija)
npm run check -- <url> # regresijska provjera (vidi docs/2026-09-25-regresijske-provjere.md)
npm run deploy         # build + wrangler deploy (produkcija)
npm run deploy:preview # build + wrangler versions upload (preview URL, produkcija netaknuta)
```

## URL-ovi

- **Produkcija:** https://maksimir.domovina.ai
- `stadion-maksimir.domovina.ai` i `stadion-maksimir-8cl.pages.dev` → 301 na produkciju.
- `maksimir.d-o-m.workers.dev` radi, ali s `noindex` (za provjeru, bez Certilia prijave).

Domene su na Worker spojene rutama zone `domovina.ai` (`wrangler.jsonc`). DNS CNAME zapisi i dalje pokazuju
na Pages, a ruta presreće promet prije njih. Deploy, povrat i zamke:
[`docs/2026-09-25-regresijske-provjere.md`](../docs/2026-09-25-regresijske-provjere.md).

## Arhitektura ukratko

- **`src/docs.ts`** — manifest svih markdown datoteka (Vite `?raw` importi).
  Promjena izvora u repou (npr. `SOT.md`) ulazi u sljedeći build automatski.
- **`src/markdown.ts`** — markdown-it (+ anchor + highlight.js) + lazy mermaid
  rendering + rewriter koji relativne `.md` linkove pretvara u `/slug` rute.
- **`src/landing.ts`** — naslovnica (hero, KPI, koraci predaje, ključne brojke).
- **`src/routes.ts`** — `link()` za sve interne URL-ove; **`src/meta.ts`** — naslov, opis, OG i `allRoutes()`.
- **`src/app.ts`** — sidebar, crumbs i iscrtavanje rute (isti kod u pregledniku i prerenderu).
- **`src/main.ts`** — boot u pregledniku: History API ruter, prevođenje starih `#/` linkova.
- **`scripts/prerender.mjs`** — pod happy-domom zapisuje `dist/<ruta>.html`, `404.html`, `_share.html`, sitemap, robots.
- **`worker/`** — Worker: preusmjeravanje hostova, `/g/<id>` OG kartica, ljuska objave, cache zaglavlja.
- **`src/style.css`** — sve stilove (sidebar + hero + markdown body + responzivno).

## Što dodati / ažurirati

- **Nova istraživanja u `research/`** → dodati entry u `src/docs.ts` (jedan import + jedan element u odgovarajućoj sekciji).
- **Naslovnica** → uredi `src/landing.ts`.
- **Stil** → `src/style.css` (CSS varijable na vrhu definiraju cijelu paletu).
