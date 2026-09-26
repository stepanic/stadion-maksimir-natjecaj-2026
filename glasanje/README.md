# Glasanje javnosti — provjerljivi zapis

Neslužbeno glasanje na [/glasanje](https://maksimir.domovina.ai/glasanje). Svaka osoba
potvrđena eOsobnom ili Certilia mobile.ID-jem ima jedan glas od **100 bodova** koje raspoređuje po
88 natječajnih radova. Listić smije mijenjati do **31. 12. 2027. u 23:59** (Europe/Zagreb).
Rezultati su javni uživo. Glasanje nema utjecaja na odluku ocjenjivačkog suda.

> **Faza 1 zatvorena 26. 9. 2026. u 01:20:41 UTC (dan D).** Glasanje se nastavlja na Gnosis Chainu
> (`MaksimirGlasanjeV1` [`0x812960FA1120121DEd82A8806aECE93dcf49E869`](https://gnosisscan.io/address/0x812960FA1120121DEd82A8806aECE93dcf49E869),
> manifest [`chain/deployments/gnosis/v1.json`](../chain/deployments/gnosis/v1.json)). Ovdje opisani
> offchain dio više ne prima listiće; listići faze 1 koji nisu preneseni na lanac i dalje se broje.
> Sažetak: [Dan D](../docs/2026-09-26-dan-d.md); detalji prijelaza: [docs/blockchain/08](../docs/blockchain/08-integracija-s-fazom-1.md).

## Provjera nakon dana D

Zatvoreni lanac faze 1 i zapisnik ZK grupe su u [`faza1/`](faza1/). Završni snapshot faze 1 je
`checkpoints/20260926T012117Z-seq2.json` (`phase1_final: true`). Ukupan rezultat (ostatak faze 1 + lanac):

```sh
python3 scripts/maksimir_verify.py glasanje/faza1/lanac.json glasanje/checkpoints/*.json \
  --zk glasanje/faza1/zk_grupa.json --chain chain/deployments/gnosis/v1.json
```

Skripta treba samo Python (standardna biblioteka) i javni RPC Gnosisa (`--rpc` za drugi). Od dana D
satni snapshot (`maksimir-snapshot/3`) uz vrh faze 1 bilježi i stanje ugovora na Gnosisu u istom bloku.

## Gdje je što

| Dio | Mjesto |
|---|---|
| Baza, pravila, lanac hasheva | `domovina-api`: `supabase/migrations/20260925120000_maksimir_voting.sql` (RPC-evi `domovina_ai.maksimir_*`) |
| Test ponašanja baze | `domovina-api`: `supabase/tests/20260925_maksimir_voting.sql` |
| Prijava (Certilia popup + polling) i RPC pozivi | `web/src/glasanje.ts` |
| Ekran listića, rezultata i potvrde | `web/src/glasanjeView.ts` |
| Satni snapshot → OpenTimestamps | `scripts/maksimir_checkpoint.py`, pokreće ga `.github/workflows/maksimir-checkpoint.yml` |
| Neovisna provjera | `scripts/maksimir_verify.py` |
| Dijeljenje glasa (javno / ZK), zapisnik ZK grupe | `domovina-api`: `supabase/migrations/20260925160000_maksimir_share_zk.sql` |
| ZK dokaz u pregledniku (Semaphore v4) | `web/src/zk.ts`; stranica objave `web/src/shareView.ts`; OG kartica `web/worker/share.ts` |
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
4. **Po zatvaranju** (za fazu 1: od dana D) RPC `maksimir_log()` vraća cijeli lanac. Svatko ga može provjeriti:

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

## Dijeljenje glasa

Nakon predaje glasač može glas podijeliti **javno** (ime iz eOsobne u obliku koji izabere, svi bodovi,
zapis u lancu) ili **anonimno**, sa Semaphore ZK dokazom da je glas predala jedna od N potvrđenih osoba.
Obje objave imaju poveznicu `https://maksimir.domovina.ai/g/<id>` s OG karticom za društvene mreže.
Zapisnik ZK grupe je javan uvijek (`maksimir_zk_group()`) i ulazi u satni snapshot (`maksimir-snapshot/2`):

```
zk hash = sha256(prev_hash|seq|op|commitment)   (op = add | remove, genesis 64 × 0)
```

Detalji, dijagrami i plan za sljedeće faze na blockchainu: [docs/glasanje-kako-radi.md](../docs/glasanje-kako-radi.md).

## Upravljanje

- **Rok:** `update domovina_ai.maksimir_settings set closes_at = '…'`. Promjena ne traži migraciju.
- **Ručni checkpoint:** Actions → maksimir-checkpoint → Run workflow (opcija `force`), ili lokalno
  `pip install opentimestamps-client && python3 scripts/maksimir_checkpoint.py`.
- **Lokalni razvoj:** `web/.env.local` s `VITE_SUPABASE_URL=http://127.0.0.1:55321` i lokalnim anon
  ključem (`supabase status -o env` u `domovina-api`). Certilia prijava lokalno ne radi. Za test se
  koristi korisnik s redom u `identity_verifications` i prijava lozinkom.

## Vezani dokumenti

- [docs/glasanje-kako-radi.md](../docs/glasanje-kako-radi.md) — tehnički proces korak po korak, s dijagramima
- [docs/2026-09-25-glasanje-javnosti.md](../docs/2026-09-25-glasanje-javnosti.md) — odluke, mjerenja, zamke i otvorene stavke
