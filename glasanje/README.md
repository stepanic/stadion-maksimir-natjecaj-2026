# Glasanje javnosti — provjerljivi zapis

Neslužbeno glasanje na [#/glasanje](https://stadion-maksimir-8cl.pages.dev/#/glasanje). Svaka osoba
potvrđena eOsobnom ili Certilia mobile.ID-jem ima jedan glas od **100 bodova** koje raspoređuje po
88 natječajnih radova. Listić smije mijenjati do **31. 12. 2027. u 23:59** (Europe/Zagreb).
Rezultati su javni uživo. Glasanje nema utjecaja na odluku ocjenjivačkog suda.

## Gdje je što

| Dio | Mjesto |
|---|---|
| Baza, pravila, lanac hasheva | `domovina-api`: `supabase/migrations/20260925120000_maksimir_voting.sql` (RPC-evi `domovina_ai.maksimir_*`) |
| Test ponašanja baze | `domovina-api`: `supabase/tests/20260925_maksimir_voting.sql` |
| Prijava (Certilia popup + polling) i RPC pozivi | `web/src/glasanje.ts` |
| Ekran listića, rezultata i potvrde | `web/src/glasanjeView.ts` |
| Satni snapshot → OpenTimestamps | `scripts/maksimir_checkpoint.py`, pokreće ga `.github/workflows/maksimir-checkpoint.yml` |
| Neovisna provjera | `scripts/maksimir_verify.py` |
| Snapshotovi i `.ots` dokazi | `glasanje/checkpoints/` (ova mapa) |

Prijava koristi istu infrastrukturu kao domovina.ai: Certilia proxy `certilia.domovina.ai`, edge funkciju
`certilia` i tablicu `public.identity_verifications` na `api.domovina.ai`. Jedna osoba znači jedan
`oib_hash`. Listić se veže na trajni pseudonim (`maksimir_voters`), pa ni brisanje i ponovno
otvaranje računa ne daje drugi listić.

## Kako je zaštićen integritet

1. **Lanac hasheva.** Svaka predaja, izmjena ili povlačenje dodaje red u `maksimir_log`.
   Trigger u bazi odbija `UPDATE`, `DELETE` i `TRUNCATE` nad tim redovima. Hash reda računa se ovako:

   ```
   hash = sha256(prev_hash|seq|pseudonym|revision|ts_ms|items_canon)   (hex, UTF-8)
   ```

   - `prev_hash` prvog reda je 64 × `0`.
   - `pseudonym = sha256("maksimir:" + voter_id)`.
   - `items_canon = "ŠIFRA:bodovi,…"`, sortirano po šifri; prazan niz znači povlačenje (revision 0).
2. **Potvrda.** Nakon predaje glasač preuzme JSON sa svojim redom lanca.
3. **Satni snapshot u Bitcoinu.** Svaki sat Action pročita `maksimir_snapshot()`. To je vrh lanca i
   trenutni rezultati, pročitani u istoj transakciji. Ako se vrh promijenio, Action zapiše
   `checkpoints/<UTC>-seq<N>.json` i žigoše ga (`ots stamp`). Ranije dokaze nadograđuje
   (`ots upgrade`) dok ne dobiju Bitcoin atestaciju.
4. **Po zatvaranju** RPC `maksimir_log()` vraća cijeli lanac. Svatko ga može provjeriti:

   ```sh
   python3 scripts/maksimir_verify.py lanac.json glasanje/checkpoints/*.json --receipt moja-potvrda.json
   ```

   Skripta ponovno izračuna svaki hash i provjeri da snapshot iz svakog sata odgovara prefiksu
   lanca do svog `seq`, da se broj glasača i bodovi po radu slažu, te da je potvrda u lancu.

Pojedinačni snapshot može se provjeriti i na <https://opentimestamps.org>: spusti par `.json` + `.ots`,
ili pokreni `ots verify checkpoints/<datoteka>.json.ots`.

**Što ovo ne rješava:** operater baze može teoretski upisati izmišljene glasače, jer pravo glasa
potvrđuje Certilia preko našeg poslužitelja. Zato je broj glasača u svakom satnom snapshotu, pa je
svaki nagli skok trajno zabilježen. Glasanje nije tajno prema operateru baze (veza `voter_id → oib_hash`
postoji u bazi). Javni su samo agregati i, po zatvaranju, lanac pod pseudonimima.

## Upravljanje

- **Rok:** `update domovina_ai.maksimir_settings set closes_at = '…'`. Promjena ne traži migraciju.
- **Ručni checkpoint:** Actions → maksimir-checkpoint → Run workflow (opcija `force`), ili lokalno
  `pip install opentimestamps-client && python3 scripts/maksimir_checkpoint.py`.
- **Lokalni razvoj:** `web/.env.local` s `VITE_SUPABASE_URL=http://127.0.0.1:55321` i lokalnim anon
  ključem (`supabase status -o env` u `domovina-api`). Certilia prijava lokalno ne radi. Za test se
  koristi korisnik s redom u `identity_verifications` i prijava lozinkom.

## Vezani dokumenti

- [docs/2026-09-25-glasanje-javnosti.md](../docs/2026-09-25-glasanje-javnosti.md) — odluke, mjerenja, zamke i otvorene stavke
