# Glasanje javnosti na Gnosis Chainu

> Sažetak sesije, zamke i otvorene stavke: [2026-09-26-glasanje-onchain.md](../2026-09-26-glasanje-onchain.md).

Status 26. 9. 2026.: **`MaksimirGlasanjeV1` je prošao 6 krugova audita (47 testova, 100 % pokrivenosti,
23/23 mutanta ubijena, 800 fuzz koraka), radi na Chiadu (testnet) i prošao je E2E kroz stvarni
kod relayera.** Na Gnosis mainnet još nije deployan. Web još nije spojen; plan spajanja s fazom 1
je u [08](08-integracija-s-fazom-1.md) i **implementiran je** (lokalno + Chiado, 26. 9.; produkcija čeka ok). Web ostaje Vite + Worker (Astro je odbačen,
[odluka](../2026-09-25-web-nice-to-have.md)).

Faza 1 ([glasanje-kako-radi.md](../glasanje-kako-radi.md)) drži listiće u Postgresu, a operater
baze vidi sve. U V1 **glasačev preglednik izrađuje ZK dokaz za svaki listić**. Ugovor ga provjerava
i broji uživo, a relayer na Cloudflare Workeru samo plaća gas za gotov paket. Glasač ne treba
novčanik ni xDAI.

## Dokumenti

| # | Dokument | Sadržaj |
|---|---|---|
| **6** | [06-kontrola-glasaca.md](06-kontrola-glasaca.md) | **glasač ima kontrolu nad svojim glasom**: tko drži koji ključ, tko što može i ne može, granice, dokazi s Chiada |
| **8** | [08-integracija-s-fazom-1.md](08-integracija-s-fazom-1.md) | **plan spajanja s fazom 1**: redoslijed (Chiado → Gnosis), registrar, relayer, web, dan prijelaza, izvor rezultata, `/g/<id>`, povratak, E2E, otvorena pitanja |
| **7** | [07-verzioniranje.md](07-verzioniranje.md) | **V1, V2, V3…** bez proxyja, zamrznut izvor, selidba listića samo uz glasačev dokaz |
| 1 | [01-arhitektura.md](01-arhitektura.md) | ugovor V1 funkciju po funkciju, poruke, zbroj, prijelaz s faze 1 |
| 2 | [02-relayer-i-gas.md](02-relayer-i-gas.md) | zašto ne Safe/Gelato sponzorstvo, relayer, izmjereni gas, faucet |
| 3 | [03-deploy-runbook.md](03-deploy-runbook.md) | Chiado (napravljeno) i Gnosis (sljedeće), korak po korak |
| 4 | [04-web-i-baza.md](04-web-i-baza.md) | što treba u webu i u `domovina-api` (registrar); redoslijed i prijelaz su u [08](08-integracija-s-fazom-1.md) |
| ADR | [adr/0001](adr/0001-kljuc-glasaca-passkey-i-24-rijeci.md) | **ključ glasača**: 24 riječi za oporavak + passkey (PRF) za svakodnevno otključavanje |
| R | [istrazivanja/](istrazivanja/2026-09-26-eip7702-passkey-gnosis.md) | EIP-7702 + passkey na Gnosisu umjesto Safea (provjereno na lancu) |
| A | [audit/](audit/README.md) | **audit**: metode, checklista napada, [nalazi i popravci](audit/nalazi.md), [krugovi](audit/krugovi.md) |
| 5 | [05-sljedece-faze.md](05-sljedece-faze.md) | anonimni upis, ZK-JWT bez registrara, MACI, vlastiti krug |

## Sažetak odluka

| Odluka | Izbor | Zašto |
|---|---|---|
| Mreža | **Gnosis Chain** (100), test na **Chiadu** (10200) | EVM, gas u xDAI, cijene u djelićima centa; Semaphore v4 je već na obje |
| Listić | **Semaphore ZK dokaz iz preglednika**, poruka = hash listića + revizija + ugovor | relayer ne može ništa promijeniti; operater ne zna čiji je koji listić |
| Zbroj | **na lancu, uživo** (`results()`) | provjerljiv bez nas |
| Pravo glasa | registrar (domovina.ai) potpisuje EIP-712 `Register(commitment)` nakon eOsobne, jednom po osobi | jedino mjesto povjerenja; ne može glasati ni vidjeti listiće |
| Gas | **vlastiti relayer** (Cloudflare Worker) bez ikakve uloge u ugovoru | Safeovo sponzorstvo vrijedi samo za Safe račune; paket može poslati i bilo tko drugi |
| Nadogradnja | **bez proxyja**; V2, V3… kao novi ugovori, selidba uz glasačev dokaz | vlasnik ne može promijeniti pravila postojećih listića |
| Izvor | zamrznut: `chain/contracts/v1/` + manifest + CI + verificiran uz adresu | ono što je deployano ostaje čitljivo zauvijek |
| Osobni podaci | **nikad na lancu** | samo commitmenti, nullifieri, bodovi i dokazi |

## Što je gotovo

| Dio | Mjesto | Provjera |
|---|---|---|
| Ugovor V1 | [`chain/contracts/v1/MaksimirGlasanjeV1.sol`](../../chain/contracts/v1/MaksimirGlasanjeV1.sol) | 47 testova s pravim Groth16 dokazima; 100 % naredbi, grana, funkcija i linija; 23/23 mutanta ubijena; [audit](audit/README.md) |
| Klijent (kripto u pregledniku) | [`chain/client/`](../../chain/client/) | isti hash poruke kao ugovor (test); grupa s lanca uz provjeru korijena |
| Relayer | [`web/worker/relayer/`](../../web/worker/relayer/) (ruta `/relayer/<chainId>/…` Workera `maksimir`) | 8 testova, pravi tok na Chiadu |
| Spajanje s fazom 1 | [08](08-integracija-s-fazom-1.md): baza i registrar (`domovina-api`), web tok, snapshot v3, `verify --chain` | E2E u pregledniku 33/33 na Chiadu; SQL 15, Deno 7, Python 9 testova |
| Vlasnik na Chiadu | Safe 2/3 [`0x2B7C…64e9`](https://gnosis-chiado.blockscout.com/address/0x2B7Cd4B94747a1f1FE49FA351aa14CD5a3cf64e9) | 1 potpis i stari vlasnik odbijeni, 2 potpisa rade |
| Deploy + manifest | [`chain/scripts/deploy-v1.ts`](../../chain/scripts/deploy-v1.ts) | [`deployments/chiado/v1.json`](../../chain/deployments/chiado/v1.json) |
| Zamrznut izvor | [`chain/scripts/check-frozen.mjs`](../../chain/scripts/check-frozen.mjs), [`.github/workflows/chain.yml`](../../.github/workflows/chain.yml) | isprobano u oba smjera: nepromijenjen izvor prolazi, jedna promjena pada |
| Faucet bez preglednika | [`chain/scripts/faucet-chiado.mjs`](../../chain/scripts/faucet-chiado.mjs) | 0,001 xDAI stiglo iz prvog pokušaja |
| Chiado E2E | [`chain/scripts/e2e-chiado.ts`](../../chain/scripts/e2e-chiado.ts) | registracija, listić, izmjena, objava; tri podmetanja odbijena |

**Chiado V1**: [`0xe7903145c8F2401fC16D78d9788D34beE0c3e029`](https://gnosis-chiado.blockscout.com/address/0xe7903145c8F2401fC16D78d9788D34beE0c3e029#code)
(verificiran izvor). Testni deployer i sponzor:
[`0x408d…d30C`](https://gnosis-chiado.blockscout.com/address/0x408d1866cda9174A1E1d75bB7cf87ee27561d30C).

## Što preostaje

1. **Odluke** (vidi niže).
2. **Registrar u `domovina-api`**: edge funkcija koja nakon eOsobne potpisuje `Register` jednom po
   osobi ([04](04-web-i-baza.md)).
3. **Gnosis mainnet**: commit, deploy, verifikacija, git tag `glasanje-v1-gnosis`, Worker ([03](03-deploy-runbook.md)).
4. **Web** (Vite + Worker): ključ, dokaz, relayer, rezultati s lanca ([04](04-web-i-baza.md), [08](08-integracija-s-fazom-1.md)).
5. **Prijelaz s faze 1**: faza 1 se zamrzava uz završni OTS snapshot, listići se prenose uz
   glasačev ključ, a glasanje se nastavlja na lancu ([08](08-integracija-s-fazom-1.md#dan-d-prijelaz)).

## Otvorena pitanja za Matiju

- **Vlasnik**: novi Safe 2/3 s istim potpisnicima kao MPT Safe?
- **Javnost listića tijekom glasanja**: u V1 je svaki listić javan pod nullifierom čim je predan.
  To je cijena zbroja provjerljivog uživo. Alternativa je da relayer skuplja pakete i šalje ih u
  satnim serijama, što smanjuje povezivanje po vremenu. Vidi [06](06-kontrola-glasaca.md#iskrene-granice).
- **Izgubljen ključ**: listić ostaje zamrznut, bez oporavka preko nas. Je li to prihvatljivo?
- **Kompajler**: V1 je na solc 0.8.28 (Chiado). Prije mainnet deploya može se prijeći na
  najnoviji 0.8.x, ali to znači novi Chiado deploy. Vidi [03](03-deploy-runbook.md#alati).
