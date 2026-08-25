# web/ — landing & doc viewer

Statički Vite SPA koji renderira sve markdown datoteke iz repoa (`SOT.md`,
`ROADMAP.md`, `TODO.md`, `research/*`, `research/cross-check/*`, `sources/*`)
kao klikabilnu dokumentacijsku stranicu sa sidebar navigacijom, Mermaid
dijagramima i internim `[[link]]`-ovima koji rade.

Deployed na **Cloudflare Pages** (account D.O.M.) kao projekt `stadion-maksimir`.

## Skripte

```bash
npm install           # prvi put
npm run dev           # lokalni dev server (Vite)
npm run build         # produkcijski build u dist/
npm run deploy        # build + wrangler pages deploy --branch main (produkcija)
npm run deploy:preview # build + wrangler pages deploy (preview, ne-produkcijska grana)
```

## URL-ovi

- **Produkcija:** https://stadion-maksimir-8cl.pages.dev
- **Custom domain (kad se DNS namjesti):** https://stadion-maksimir.domovina.ai

> Cloudflare je projektu dodao sufiks `-8cl` jer je `stadion-maksimir` globalno
> zauzet u Pages namespaceu; canonical produkcijski URL je
> `stadion-maksimir-8cl.pages.dev`.

## Custom domain — koraci

1. Domena je registrirana na Pages strani API-jem (`POST /pages/projects/.../domains`),
   ali DNS CNAME treba dodati ručno jer wrangler OAuth token nema `dns:write` scope.
2. U Cloudflare dashboardu → zona `domovina.ai` → DNS → dodati:
   - **Type:** `CNAME`
   - **Name:** `stadion-maksimir`
   - **Target:** `stadion-maksimir-8cl.pages.dev`
   - **Proxy status:** `Proxied` (narančasti oblačić)
3. Validacija na Pages strani je u tijeku — provjeriti:
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/accounts/7dc7167b7e2e00923bfa7cd697df14e4/pages/projects/stadion-maksimir/domains/stadion-maksimir.domovina.ai" \
     -H "Authorization: Bearer $(grep oauth_token ~/Library/Preferences/.wrangler/config/default.toml | sed 's/.*"\(.*\)".*/\1/')"
   ```
   Status mora prijeći iz `pending` → `active`.

## Arhitektura ukratko

- **`src/docs.ts`** — manifest svih markdown datoteka (Vite `?raw` importi).
  Promjena izvora u repou (npr. `SOT.md`) ulazi u sljedeći build automatski.
- **`src/markdown.ts`** — markdown-it (+ anchor + highlight.js) + lazy mermaid
  rendering + rewriter koji relativne `.md` linkove pretvara u `#/slug` hash rute.
- **`src/landing.ts`** — naslovnica (hero, KPI, koraci predaje, ključne brojke).
- **`src/main.ts`** — sidebar build, hash routing, crumbs.
- **`src/style.css`** — sve stilove (sidebar + hero + markdown body + responzivno).

## Što dodati / ažurirati

- **Nova istraživanja u `research/`** → dodati entry u `src/docs.ts` (jedan import + jedan element u odgovarajućoj sekciji).
- **Naslovnica** → uredi `src/landing.ts`.
- **Stil** → `src/style.css` (CSS varijable na vrhu definiraju cijelu paletu).
