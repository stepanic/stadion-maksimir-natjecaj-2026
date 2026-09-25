# Glasanje javnosti: odluke, mjerenja i zamke (25. 9. 2026.)

Kako rad funkcionira i kako se provjerava opisano je u [glasanje/README.md](../glasanje/README.md).
Ovaj dokument bilježi ono što se iz koda ne vidi: zašto je napravljeno baš ovako,
što je odbačeno i što je koštalo vremena.

Status: živo na <https://stadion-maksimir.domovina.ai/#/glasanje> od 25. 9. 2026. Prvi pravi glas
(zapis #1, 50/30/20 za tri nagrađena rada) predan je E2E prijavom eOsobnom. Hash potvrde
poklapa se s neovisnim izračunom u Pythonu.

## Tok

```mermaid
sequenceDiagram
  participant W as web (#/glasanje)
  participant P as certilia.domovina.ai (proxy)
  participant I as idp.certilia.com
  participant F as edge fn certilia
  participant DB as Postgres (api.domovina.ai)
  participant GH as GitHub Action (svaki sat)
  W->>P: initialize + polling/start
  W->>I: popup s authorization_url
  I->>P: callback (code)
  W->>P: polling → code, exchange → id_token
  W->>F: id_token
  F->>DB: upsert_identity_verification (oib_hash)
  F-->>W: email + email_otp
  W->>DB: verifyOtp → sesija; maksimir_cast_ballot(items)
  DB->>DB: listić + red u maksimir_log (hash lanac)
  GH->>DB: maksimir_snapshot() (anon)
  GH->>GH: ots stamp → commit glasanje/checkpoints/
```

## Odluke

| Pitanje | Odluka | Zašto |
|---|---|---|
| Model glasa | 100 bodova po osobi, raspodjela po volji, zbroj točno 100 | Korisnik je htio raspodjelu umjesto "da/ne". Rangiranje 1–88 odbačeno je jer bi korisniku bilo previše posla. Zbroj 100 znači da svaka osoba teži točno jedan glas. |
| Izmjene | Dopuštene do kraja; broji se zadnja verzija | Rok je dug (2027.), pa ljudi moraju moći promijeniti mišljenje. |
| Rezultati | Uživo | Odluka korisnika (preporuka je bila "tek po zatvaranju", da se ne potiče mobilizacija). |
| Radovi | Svih 88, uključujući 3 odbijena | Odluka korisnika. |
| Rok | 31. 12. 2027. 23:59 Europe/Zagreb | Certilia ima više od 700 000 korisnika, a link se širi organski, pa treba vremena. Mijenja se jednim `update`, bez migracije. |
| Mjesto tablica | `domovina_ai.maksimir_*` | Nova shema tražila bi izmjenu `PGRST_DB_SCHEMAS` na Coolifyju i proširenje backupa u `db-migrate.sh`. |
| Integritet | Lanac hasheva + satni snapshot u OpenTimestampsu | Vidi ispod. |
| Javnost lanca | Tijekom glasanja javni su samo vrh lanca i rezultati; cijeli lanac tek po zatvaranju | Pseudonim i vrijeme predaje bi inače omogućili povezivanje listića s osobom (npr. "glasao je u 15:36"). |

### Zašto nije blockchain ni ZK

Glavni rizik centralne baze nije promjena tuđeg glasa, nego to da operater ubaci
izmišljene glasače. Blockchain ni ZK (npr. Semaphore) to ne rješavaju: popis ovlaštenih
glasača i dalje sastavlja operater iz Certilijinih podataka, pa povjerenje ostaje na istom mjestu.

OpenTimestamps plus javni lanac hasheva pokriva naknadno mijenjanje, brisanje i lažiranje
zbroja, uz trivijalan trošak. Za izmišljene glasače jedina zaštita je broj glasača u svakom
satnom snapshotu, pa je nagli skok trajno vidljiv. Snapshot se žigoše **kontinuirano**, ne samo
na kraju, jer je mali, a svaki sat postaje trajni dokaz stanja (prijedlog korisnika).

## Mjerenja

- **Test ponašanja:** `domovina-api/supabase/tests/20260925_maksimir_voting.sql` ima 18 provjera, sve prolaze dvaput zaredom (skripta je idempotentna).
- **Utrka, isti glasač:** 12 paralelnih predaja → 0 grešaka, 1 listić, zbroj 100, `revisions = 12`.
- **Utrka, lanac:** 12 glasača × 2 predaje istodobno → 24 uzastopna zapisa bez rupa. `maksimir_verify.py` se slaže sa snapshotom.
- **Otkrivanje prepravke:** namjerno izmijenjen `items_canon` u jednom redu → verifier javlja 2 greške, exit 1.
- **Trajanje GitHub Actiona:** oko 20 s po runu (uključujući `pip install opentimestamps-client`). Javni repo, pa su minute besplatne.

## Zamke koje su koštale vremena

1. **Cloudflare blokira `Python-urllib/*`.** `api.domovina.ai` je iza Cloudflarea, koji taj User-Agent odbija greškom 1010 (HTTP 403). Prvi run Actiona pao je zbog toga. Svaka skripta prema `api.domovina.ai` mora slati vlastiti UA.
2. **Coolify API ne vraća vrijednosti env varijabli.** Token nema pravo čitanja osjetljivih vrijednosti; `GET …/envs` vraća `value: null`. Stvarnu vrijednost `ALLOWED_ORIGINS` na proxyju potvrdio sam CORS preflightom (204 za dopušteni origin, 500 za ostale). Tek sam onda PATCH-om upisao staru vrijednost plus dvije nove domene. Lokalna kopija je u `flutter_certilia/certilia-server/.coolify-secrets.env` (gitignorirano).
3. **Preview deployevi nemaju prijavu.** `<hash>.stadion-maksimir-8cl.pages.dev` nije u `ALLOWED_ORIGINS`, pa Certilia prijava radi samo na `stadion-maksimir-8cl.pages.dev` i `stadion-maksimir.domovina.ai`.
4. **`db-migrate.sh` bi povukao i tuđe migracije.** Na prodzu su čekale `20260903120000` i `20260903120100` (events/pinka). Primijenio sam samo `20260925120000`, ručno, istim omotačem kao skripta: `begin` → SQL → insert u `schema_migrations` → `commit`, uz backup sheme u `domovina-api/backups/`. Sljedeći `db-migrate.sh` povući će one dvije.
5. **Lokalni Supabase `postgres` nije superuser.** `session_replication_role` se ne može postaviti. Za čišćenje append-only tablice u testu koristi se `alter table … disable trigger user`, što smije vlasnik tablice.
6. **`set local role` i `set_config(…, true)` vrijede samo unutar transakcije.** Izvan `begin`/`commit` psql samo upozori, a test zatim tiho radi kao `postgres`.
7. **Puni re-render ubija fokus.** `draw()` na `change` zamijenio je DOM usred Tab-a, pa je fokus pao na `body` i sljedeći klik promašio. Uhvaćeno u E2E na produkciji. Rješenje: tipkanje ažurira listić na mjestu (`updateBallotInPlace`). `.btn { display: inline-flex }` gazi atribut `hidden`, zato postoji globalno pravilo `[hidden] { display: none !important }`.
8. **Popup mora nastati sinkrono u klik handleru.** `signInWithCertilia` otvara `about:blank` prije prvog `await`, a tek onda postavlja URL. Kad se ne čeka na zatvaranje prozora, nego stanje prati polling, izbjegava se COOP zamka opisana u `flutter_certilia`.

## Otvoreno

- **Zakazani cron.** Dosad su prošli samo ručni runovi (`workflow_dispatch`). Treba potvrditi da se `17 * * * *` stvarno pokreće, a prvi `.ots` treba dobiti Bitcoin atestaciju (`"bitcoin": true` u `index.json`).
- **Prijava s drugačijim e-mailom.** Ako osoba već ima domovina.ai račun s drugim e-mailom nego što ga vraća Certilia, edge funkcija bi mogla pasti na `kyc_store_failed` (unique `oib_hash`). To je zapaženo u kodu, ali nije reproducirano.
- **Provjera `.ots` u pregledniku.** Za sada korisnik provjerava na opentimestamps.org. `cv/web/components/OtsVerify.tsx` može se prenijeti ovamo.
- **DNS i preview.** `stadion-maksimir.domovina.ai` radi. Preview URL-ovi ostaju bez prijave (točka 3).

## Vezani dokumenti

- [glasanje/README.md](../glasanje/README.md): kako radi i kako se provjerava
- `domovina-api/supabase/migrations/20260925120000_maksimir_voting.sql`: ugovor RPC-eva i formula hasha
- [2026-09-25-rezultati-i-svi-radovi.md](2026-09-25-rezultati-i-svi-radovi.md): prethodni korak (svih 88 radova)
