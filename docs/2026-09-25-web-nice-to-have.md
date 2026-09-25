# Web: nice-to-have (odgođeno)

*2026-09-25. Ideje nakon prelaska na prave rute, prerender i Cloudflare Worker. **Ništa od ovoga nije potrebno sada.**
Site radi, SEO je riješen, a regresijska provjera postoji. Ovo je popis za neki budući trenutak.*

Prije i poslije svake stavke vrijedi isto pravilo: `npm run check` (vidi
[`2026-09-25-regresijske-provjere.md`](2026-09-25-regresijske-provjere.md)).

## Stanje u trenutku pisanja

- Svaka stranica učitava **`index-*.js` od 2,27 MB (735 KB gzip)**. U njemu je sav markdown iz repoa (~652 KB,
  `?raw` importi u `docs.ts`), markdown-it, highlight.js i klijent za glasanje. Mermaid (~600 KB) i ZK (~460 KB)
  već su zasebni chunkovi koji se učitavaju po potrebi.
- Sadržaj je prerenderiran, pa ga korisnik i crawler vide prije JS-a. Trošak je parsiranje JS-a na mobitelu
  (TBT/INP), a ne vidljivost sadržaja.

## TODO

- [ ] **Izmjeriti prije i poslije.** Lighthouse (mobile) za `/`, `/radovi`, jedan rad i jedan dugi dokument.
  Bez broja nema smisla optimizirati.
- [ ] **Markdown po ruti, ne u glavnom bundleu.** `import.meta.glob("../../**/*.md", { query: "?raw" })` s lazy
  importom: svaki dokument postaje svoj chunk. Očekivano je da glavni JS padne za ~650 KB.
- [ ] **Ne crtati ponovno prerenderiranu stranicu.** Na prvom učitavanju klijent danas iscrta rutu u `#content`,
  iako je HTML već isti. Dovoljno je preuzeti navigaciju i dodati samo žive dijelove (panel glasanja na radu,
  Mermaid, `/glasanje`). Tada markdown-it i highlight.js trebaju samo za navigaciju na drugi dokument, pa i oni
  mogu u lazy chunk.
- [ ] **Supabase i klijent glasanja samo na `/glasanje` i stranici rada.** Dinamički import u `app.ts`.
- [ ] **`docs.ts` bez ručnog manifesta.** Glob plus frontmatter (naslov, podnaslov, sekcija) u samim `.md`
  datotekama. Nestaje zamka „novi dokument se tiho ne pojavi”.
- [ ] **Slike radova u buildu.** `sharp`: responzivne veličine i AVIF/WebP za 88 slika i nagrađene panele,
  `srcset` u `radoviView.ts`.
- [ ] **JSON-LD `CreativeWork`** za radove (bilo je neobavezno u planu, faza 3).

## Astro: zašto ne sada i kada ponovno

Razmatrano 25. 9. 2026. nakon refaktora. **Zaključak: ne migrirati sada.**

- Astro bi dao isto što već imamo: prave rute, prerender, meta, sitemap i Workers deploy (Astro je od 2026.
  Cloudflareov, adapter je prvorazredan).
- Njegova jedina stvarna prednost ovdje je nula JS-a na sadržajnim stranicama po defaultu. To se u Viteu dobiva
  gornjim stavkama, uz oko dan rada, bez selidbe.
- Postojeće rješenje je u nekim dijelovima jednostavnije: sva pravila usmjeravanja su u jednom malom Workeru,
  navigacija je bez ponovnog učitavanja bez `ClientRoutera`, a glasanje (Certilia, Supabase, ZK) je ionako čisti
  klijentski kod, u Astru jedan veliki island.
- Selidba bi značila prepisati ~3600 linija viewova u `.astro` komponente.

**Ponovno razmotriti ako:** site dobije englesku verziju (i18n), blog ili puno više sadržajnih stranica, pa
content collections i pipeline za slike vrijede više od cijene selidbe. Tada selidbu raditi ruta po ruta, s
`npm run check -- <preview> --baseline <produkcija>` kao dokazom da se ništa nije promijenilo.
