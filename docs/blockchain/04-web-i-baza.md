# 4. Promjene u webu i u `domovina-api`

> **Web čeka prelazak na Astro.** `web/` se refaktorira u drugoj sesiji (Vite + Pages → Astro +
> Workers), pa ovdje nijedna web promjena nije napravljena. Sva kriptografija koju web treba
> već postoji u [`chain/client/`](../../chain/client/), neovisno o frameworku, i testirana je.

## Registrar (`domovina-api`)

Jedini novi poslužiteljski dio. Nova edge funkcija, npr. `maksimir-register`:

```
POST /functions/v1/maksimir-register   (Authorization: Bearer <sesija nakon eOsobne>)
{ "commitment": "…" }
→ { "commitment", "deadline", "signature", "contract", "chainId" }
```

1. Sesija mora imati red u `identity_verifications` (eOsobna ili mobile.ID).
2. **Jednom po osobi**: nova tablica `maksimir_chain_registrations(oib_hash unique, commitment,
   created_at)`. Drugi zahtjev iste osobe vraća **isti** potpis za isti commitment, a za drugi
   commitment vraća grešku `already_registered`. Zato izgubljen ključ ne donosi drugi glas.
3. Potpis: `registerTypedData({ chainId, contract, commitment, deadline })` iz
   `chain/client/ballot.ts` (viem `signTypedData`, radi i u Denou), rok 1 h.
4. Tajna `MAKSIMIR_REGISTRAR_KEY` postoji samo u edge funkciji.

Registrar ne šalje transakciju. Potpis vraća pregledniku, a preglednik ga šalje relayeru ili sam.

## Web (nakon Astro migracije)

### Ključ

Isti Semaphore ključ kao u fazi 1 (`maksimir-zk-identity` u `localStorage` + preuzimanje
datoteke). Tko ga već ima, registrira njegov commitment. Ključ se nudi za preuzimanje **prije**
prve predaje, jer bez njega nema izmjene listića ([06](06-kontrola-glasaca.md#iskrene-granice)).

### Predaja listića

```ts
import { encodePoints, proveBallot, registerTypedData, toJson } from "chain/client/ballot";
import { fetchGroup } from "chain/client/group";

// 1. jednom: pravo glasa
const reg = await fetch(REGISTRAR_URL, { method: "POST", headers: auth, body: toJson({ commitment: id.commitment }) }).then((r) => r.json());
await fetch(`${RELAYER_URL}/register`, { method: "POST", body: toJson(reg) });

// 2. svaki put: listić → dokaz → relayer
const group = await fetchGroup(publicClient, SEMAPHORE, GROUP_ID, DEPLOY_BLOCK);
const points = encodePoints(nacrt);                              // {ŠIFRA: bodovi}, zbroj 100
const revision = (await ballotOf(nullifier)).revision + 1;
const proof = await proveBallot(id, group, { chainId, contract, revision, points });
await fetch(`${RELAYER_URL}/cast`, { method: "POST", body: toJson({ revision, points, proof }) });
```

- **Nullifier** za „moj listić” daje `ballotNullifier(id, group)`. Pamti se lokalno, a iz njega se
  čitaju `ballotOf` i revizija.
- **Gumb „preuzmi paket”** uz „predaj” daje isti JSON za slanje bez našeg relayera.
- Relayerova greška 409 `BadRevision` znači da je listić već predan s drugog uređaja. Tada se
  ponovno pročita `ballotOf` i izradi nova revizija.

### Rezultati i provjera

- Rezultati: `results()` sa svih verzija iz `chain/deployments/` (danas samo V1), zbrojeni.
- Stranica „Kako radi”: poveznice na verificiran izvor, zadnje `BallotCast` događaje i na [06](06-kontrola-glasaca.md).
- `web/src/docs.ts` je ručni manifest dokumenata. `docs/blockchain/*.md` ondje treba dodati da se
  prikažu na `#/dokumenti`, u obliku koji Astro migracija uvede.

### Konfiguracija

Adresa ugovora, `chainId`, blok deploya, `groupId`, URL relayera i registrara. Sve osim URL-ova
čita se iz `chain/deployments/<mreža>/v1.json`.

## Faza 1 u bazi

- Nakon prelaska `maksimir_cast_ballot` se zatvara (`closes_at` = trenutak prelaska ili nova
  zastavica). Zadnji satni snapshot ide u Bitcoin kao završno stanje faze 1.
- Javne objave s imenom (`/g/<id>`) ostaju u bazi, jer ime nikad ne ide na lanac. Za objavu
  listića s lanca `maksimir_set_public` bilježi nullifier umjesto `voter_id`. Nullifier tada
  postaje javno povezan s imenom, ali samo po izboru glasača.
