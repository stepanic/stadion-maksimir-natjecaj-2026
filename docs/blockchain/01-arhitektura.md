# 1. Arhitektura: `MaksimirGlasanjeV1`

Jedan ugovor ([`chain/contracts/v1/MaksimirGlasanjeV1.sol`](../../chain/contracts/v1/MaksimirGlasanjeV1.sol))
nad kanonskim Semaphore v4 (`0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`, ista adresa na
Gnosisu i Chiadu). Zašto je glasač u kontroli opisano je u [06](06-kontrola-glasaca.md), a
ovdje je *kako* to radi.

## Funkcije

| Funkcija | Tko zove | Što traži | Što radi |
|---|---|---|---|
| `register(commitment, deadline, sig)` | bilo tko (relayer) | registrarov EIP-712 potpis, rok nije istekao, glasanje otvoreno | commitment ulazi u Semaphore grupu |
| `cast(revision, points, proof)` | bilo tko (relayer) | dokaz člana grupe, `scope = BALLOT_SCOPE`, `message = ballotMessage(revision, points)`, `revision = zadnja + 1`, zbroj 100 ili prazno | zamijeni listić tog nullifiera i ažurira zbroj |
| `share(proof)` | bilo tko | dokaz s `"glasao-sam"` / `"maksimir-2026"` | Semaphore trajno bilježi nullifier; događaj `AnonymousShare` |
| `migrate(proof)` | samo `successor` (V2) | glasačev dokaz s `migrateMessage()` | poništi listić ovdje i vrati ga V2 |
| `setRegistrar`, `setMerkleTreeDuration` | vlasnik | — | uprava bez utjecaja na listiće |
| `setSuccessor(v2)` | vlasnik, **jednom** | — | najava V2 i predaja admina grupe |
| `ballotOf`, `results`, `voters`, `registered` | bilo tko | — | čitanje |

Nema `pause`, `upgrade`, `delete` ni funkcije koja vlasniku ili registraru dopušta pisati po listićima.

## Listić

```
points  = 88 bajtova; bajt i = bodovi za i-tu šifru iz chain/client/entries.ts (sortirano)
          ili prazno ("0x") = povlačenje
message = keccak256(abi.encode(keccak256("maksimir-listic"), chainId, adresa ugovora, revision, keccak256(points)))
scope   = bytes32("maksimir-2026-listic")
```

- **Nullifier** = `Poseidon(scope, tajni ključ)` računa krug. Isti je za isti ključ, pa se listić
  može mijenjati. Nitko ga ne može povezati s commitmentom, pa ni registrar ne zna čiji je listić.
- **Revizija** raste za jedan. Relayer ne može podmetnuti stariji listić, a ni preskočiti noviji,
  jer revizija 3 ne prolazi prije revizije 2.
- **`chainId` i adresa** u poruci: dokaz za Chiado ne vrijedi na Gnosisu, a dokaz za V1 ne vrijedi u V2.
- **Popis radova** je u ugovoru kao `entriesHash = keccak256("ŠIFRA1,ŠIFRA2,…")`. Klijent
  provjerava da mu se popis slaže prije slaganja listića.

## Zbroj

`Tally[88]` s `points` i `backers`. Pri svakom `cast` ugovor oduzme bodove starog listića tog
nullifiera i doda nove. `voters` je broj nullifiera s nepraznim listićem. Isto se može izračunati i
iz samih `BallotCast` događaja. To je zbroj koji svatko može provjeriti bez nas.

## Grupa glasača

- Članove dodaje samo ugovor (admin grupe), i to samo uz registrarov potpis.
- Preglednik gradi stablo **s lanca**: `chain/client/group.ts` čita Semaphore događaje
  (`MemberAdded`…) i provjerava da korijen odgovara `getMerkleTreeRoot`. Ne treba naš poslužitelj.
- Semaphore uz trenutni prihvaća i korijen star do `merkleTreeDuration` (1 h), pa novi član ne
  poništava dokaz koji je upravo u izradi.

## Izmjereni gas (Chiado, stvarne transakcije)

| Poziv | Gas |
|---|---:|
| deploy V1 (+ `createGroup`) | 2 133 418 |
| `register` | 152 845 |
| `cast`, prvi listić (3 rada) | 481 440 |
| `cast`, izmjena | 334 188 |
| `share` | 290 751 |

Cijene su u [02](02-relayer-i-gas.md).

## Prijelaz s faze 1

- Faza 1 (Postgres + lanac hasheva + OpenTimestamps) ostaje **zamrznuta i provjerljiva**: zadnji
  satni snapshot prije prelaska ide u Bitcoin, a `maksimir_verify.py` radi kao i dosad.
- Listići iz faze 1 **ne prenose se automatski**, jer ih nije potpisao glasačev ključ. Glasač
  ponovno preda listić na lancu (danas je to jedan listić). Web će ponuditi prijenos jednim klikom:
  stari listić se učita kao nacrt, a glasač ga potvrdi i dokaz se izradi.
- Anonimne objave iz faze 1 ostaju valjane: `SHARE_MESSAGE` i `SHARE_SCOPE` su isti. Ali su
  nad drugom grupom (offchain), pa se provjeravaju kao i dosad, u pregledniku.
- Semaphore ključ iz faze 1 (`maksimir-zk-kljuc.txt`) može postati i ključ za listiće: registrar
  potpiše njegov commitment.
