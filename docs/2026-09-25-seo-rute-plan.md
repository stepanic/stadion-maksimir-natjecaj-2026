# Plan: prave SEO rute umjesto hash ruta

*2026-09-25. Plan refaktora `web/`. Glasanje je živo, ali je korisnik jedini glasač, pa refaktor ne čeka zatvaranje.*

## Cilj

Svaka stranica dobiva pravi URL koji crawler vidi kao zasebnu stranicu, s vlastitim naslovom, opisom,
canonicalom, OG karticom i već renderiranim sadržajem u HTML-u:

| Sada | Poslije |
|---|---|
| `/#/` | `/` |
| `/#/radovi`, `/#/radovi/6TVJ3MUHR` | `/radovi`, `/radovi/6TVJ3MUHR` |
| `/#/rezultati`, `/#/rezultati/1` | `/rezultati`, `/rezultati/1` |
| `/#/glasanje`, `/#/glasanje/g/<id>` | `/glasanje`, `/glasanje/g/<id>` (javna poveznica ostaje `/g/<id>`) |
| `/#/sot`, `/#/research-08-rezultati#sidro` | `/sot`, `/research-08-rezultati#sidro` |

Sve ostalo ostaje isto: izgled, sadržaj, ponašanje glasanja, prijava, ZK ključ u `localStorage`, podaci i backend.

## Odluka: bez Astra, ostaje Vite

- Najveća vrijednost (indeksiranje 88 radova i dokumenata, OG po stranici) dobiva se prerenderom u postojećem
  Vite buildu. Za to Astro ne treba.
- Glasanje (Certilia polling, Supabase, Semaphore ZK) je interaktivni kod koji se izvršava na klijentu. U Astru bi bio
  jedan veliki island, dakle isti kod u novoj ljusci.
- Prepisivanje oko 3000 linija u `.astro` komponente nosi rizik vizualnih i funkcionalnih regresija. Invarijanta
  „ništa drugo se ne mijenja” time bi bila teško provjerljiva.
- Astro se ponovno razmatra samo ako sadržajni dio (radovi, research, docs) nastavi rasti i ručni `docs.ts`
  postane teret.

## Invarijante (moraju vrijediti nakon svake faze)

1. `#content` za svaku rutu daje isti DOM kao danas. Jedina razlika su `href` vrijednosti (`#/x` → `/x`).
2. Vizualno ista stranica na 390 px i 1280 px širine.
3. Stare hash poveznice rade: `/#/radovi/X` na učitavanju prelazi na `/radovi/X` (`replaceState`, bez novog unosa u povijesti).
   Poslužitelj hash ne vidi, pa ovo mora raditi na klijentu.
4. `/g/<id>` i dalje daje OG karticu i vodi na objavu glasa.
5. Glasanje: prijava, listić, predaja, povlačenje, javna i ZK objava, uvoz/izvoz ključa i potvrda rade bez promjene.
   Ključ `maksimir-zk-identity` ostaje na istom originu i neće se izgubiti.
6. Sidra unutar dokumenata (`#naslov`) rade, uključujući dolazak na stranicu izravno sa sidrom.

## Faze

### Faza 1: jedan izvor URL-ova (bez promjene ponašanja)

- Novi `web/src/routes.ts` s funkcijom `href(path)` i popisom svih ruta (`allRoutes()`: naslovnica, dokumenti iz
  `docs.ts`, `radovi` + 88 šifri, `rezultati` + 5 nagrada, `glasanje`).
- Svi `href="#/…"` literali u `landing.ts`, `radoviView.ts`, `rezultatiView.ts`, `glasanjeView.ts`, `shareView.ts`,
  `main.ts` i rewriter u `markdown.ts` idu kroz `href()`. `location.hash = …` u `glasanjeView.ts` postaje `navigate()`.
- U ovoj fazi `href()` i dalje vraća `#/…`, pa se ništa vidljivo ne mijenja. Tako je refaktor mehanički i lako se provjerava.

### Faza 2: History API ruter

- `href()` vraća `/…`. `main.ts` čita `location.pathname` umjesto `location.hash`. Klikovi na interne `<a>` presreću se
  jednim delegiranim listenerom (`pushState` + `route()`), `popstate` zamjenjuje `hashchange`.
- Sidra: `/slug#sidro` koristi pravi fragment. Rewriter u `markdown.ts` više ne treba oblik `#/slug#sidro`.
- Stari hash (`#/…`) se na bootu prevodi u put (invarijanta 3). Postojeći prijelaz `/g/<id>` → hash postaje
  `/g/<id>` → `/glasanje/g/<id>`.
- `document.title` i `<meta name="description">` postavljaju se po ruti, iz istog izvora koji koristi prerender.

### Faza 3: prerender u buildu

- `vite build` ostaje. Dodaje se SSR build (`vite build --ssr src/prerender.ts`) i skripta `scripts/prerender.mjs`
  koja pod `happy-dom` pokreće iste view funkcije (`renderRad`, `renderAward`, `renderDoc`…). Za svaku rutu iz
  `allRoutes()` zapisuje `dist/<ruta>.html` s:
  - popunjenim `#nav`, `#crumbs` i `#content`,
  - `<title>`, `description`, `<link rel="canonical">`, OG/Twitter meta (slika: naslovnica rada ili nagrade, inače `og-glasanje.png`),
  - JSON-LD `CreativeWork` za radove (neobavezno).
- Mermaid se ne prerenderira; kao i sada, crta se na klijentu. `/glasanje` se prerenderira samo kao ljuska s meta
  podacima (sadržaj ovisi o Supabaseu).
- Klijent na bootu normalno renderira rutu u `#content`. Kako je HTML isti, nema vidljivog treptaja. Hidracija nije potrebna.
- `dist/sitemap.xml`, `dist/robots.txt` i `dist/404.html` (pravi 404 status umjesto SPA fallbacka za nepoznate puteve).
- Datoteke kao `radovi/X.html` (a ne `radovi/X/index.html`), pa je canonical bez završne kose crte u skladu s
  Pagesovim `auto-trailing-slash`.

### Faza 4: Pages Function i domena

- `functions/g/[id].ts`: cilj preusmjeravanja postaje `/glasanje/g/<id>`.
- Canonical origin je `https://maksimir.domovina.ai`. `stadion-maksimir.domovina.ai` i `*.pages.dev` danas vraćaju
  200 s istim sadržajem (duplikat za Google). Oni dobivaju 301 na canonical, preko Bulk Redirects ili provjere hosta
  u `_middleware.ts`.

### Faza 5 (neobavezno, zasebno): Pages → Workers static assets

`wrangler.jsonc` s `assets.directory = "dist"`, `html_handling = "auto-trailing-slash"`,
`not_found_handling = "404-page"` i malim Worker entrypointom koji preuzima `/g/<id>` i preusmjeravanje hostova.
Ne utječe na SEO. Radi se samo ako zatreba nešto što Pages ne nudi.

## Provjera

Za svaku fazu, prije deploya:

1. **DOM diff** (Playwright): za svaku rutu iz `allRoutes()` uzima se `#content.innerHTML` s produkcije
   (stari hash URL) i s lokalnog `vite preview` (novi URL). Nakon normalizacije `href="#/x"` → `href="/x"` moraju biti
   identični.
2. **Screenshot diff** na 390 px i 1280 px za naslovnicu, `radovi`, jedan rad, `rezultati/1`, jedan dokument s
   Mermaidom i `glasanje`.
3. **Bez JavaScripta**: `curl /radovi/6TVJ3MUHR` vraća HTML s nazivom rada, opisom i canonicalom.
4. **Kompatibilnost**: `/#/radovi/X`, `/#/sot#sidro`, `/g/<id>` (crawler UA dobiva karticu, preglednik stiže na
   objavu), povratak unatrag nakon navigacije i izravan ulaz na duboku rutu.
5. **Glasanje**: postojeći E2E tok (vidi `docs/2026-09-25-glasanje-javnosti.md`) na preview deployu. Ne dira se
   korisnikov `localStorage` u produkciji, prema pravilu o testiranju.
6. `npm run build` bez grešaka. `tsc --noEmit` danas pada zbog 13 postojećih grešaka tipova u `markdown.ts`
   (markdown-it bez anotacija). Popravljaju se u fazi 1, kako bi `tsc` od tada bio pouzdana provjera.

Deploy ide najprije na `deploy:preview` URL, provjera 1–5 ponovi se tamo, a tek onda slijedi `npm run deploy`.

## Povrat

Svaka faza je zaseban commit. Povrat je `git revert` + `npm run deploy`. Stare hash poveznice rade i u starom i u
novom kodu, pa povrat ne kvari podijeljene linkove, osim linkova novog oblika `/radovi/X` podijeljenih u međuvremenu.
