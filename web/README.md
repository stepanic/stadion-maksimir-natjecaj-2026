# web/ — stranica maksimir.domovina.ai

Vite + TypeScript SPA: naslovnica, nagrađeni radovi (`/rezultati`), svih 88 radova s 3D modelom gdje postoji
(`/radovi`), glasanje javnosti (`/glasanje`, `/glasaj`, objave `/g/<id>`) i markdown dokumenti iz repoa
(`SOT.md`, `research/*`, `docs/*`, `sources/*`… prema ručnom manifestu `src/docs.ts`) sa sidebar navigacijom,
Mermaid dijagramima i internim linkovima.

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
npm run typecheck      # tsc
npm run test:glasanje  # testovi raspodjele bodova (ballotMath)
npm run test:relayer   # testovi relayera u Workeru
npm run test:paritet   # isti tok predaje nad /glasanje i /glasaj (treba npx vite --port 5173)
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
- **`src/rezultatiView.ts`**, **`src/rezultati.ts`** — nagrađeni radovi, paneli u `public/rezultati/<n>/`.
- **`src/radoviView.ts`** — svih 88 radova iz `sources/radovi.json` (`scripts/build_radovi.py`).
- **`src/model3dViewer.ts`**, **`src/modeli3d.ts`** — three.js prikaz 3D modela (podaci u `public/modeli3d/`, fork sa zagreb.lol).
- **`src/glasanje.ts`**, **`src/glasanjeView.ts`** — prijava (Certilia), listić, rezultati; **`src/glasajView.ts`** + **`src/ballotMath.ts`** — jednostavnije sučelje nad istim tokom.
- **`src/chainVote.ts`**, **`src/chainVoteView.ts`** — glasanje na Gnosisu (ključ, ZK dokaz, relayer), dinamički chunk; **`src/zk.ts`**, **`src/shareView.ts`** — dijeljenje glasa.
- **`worker/`** — Worker: preusmjeravanje hostova, `/g/<id>` OG kartica, ljuska objave, cache zaglavlja; **`worker/relayer/`** — relayer `/relayer/<chainId>/…` koji plaća gas.
- **`scripts/`** — `prerender.mjs`, `regression.mjs` (`npm run check`), E2E i paritetni testovi glasanja.
- **`src/style.css`** — sve stilove (sidebar + hero + markdown body + responzivno).

## Što dodati / ažurirati

- **Novi `.md` bilo gdje u repou** → dodati entry u `src/docs.ts` (jedan import + jedan element u odgovarajućoj sekciji). Bez toga build prolazi, ali dokumenta nema na stranici.
- **Naslovnica** → uredi `src/landing.ts`.
- **Stil** → `src/style.css` (CSS varijable na vrhu definiraju cijelu paletu).
