# 3. Deploy runbook

Redoslijed je uvijek isti: lokalno → Chiado → Gnosis. Na Gnosis ide samo commitan izvor.

## 0. Lokalno

```sh
cd chain && npm ci
npx hardhat test                    # 10 testova, pravi Groth16 dokazi
npm run check-frozen                # zamrznute verzije nisu mijenjane
npx hardhat run scripts/deploy-v1.ts          # lokalni deploy (i Semaphore), bez manifesta
cd relayer && npm ci && npm run typecheck && npm test
```

## 1. Chiado (napravljeno 25.–26. 9. 2026.)

Ključevi su u `chain/.env.chiado` (gitignorirano, **samo testnet**): deployer, koji je i sponzor
relayera, te registrar.

```sh
cd chain
node scripts/faucet-chiado.mjs send-otp --email …   # pa claim --otp …
set -a && . ./.env.chiado && set +a
OWNER=$CHIADO_DEPLOYER_ADDRESS REGISTRAR=$CHIADO_REGISTRAR_ADDRESS DEPLOY_GAS=3000000 \
  npx hardhat run scripts/deploy-v1.ts --network chiado      # → deployments/chiado/v1.json
npx hardhat verify --network chiado --contract contracts/v1/MaksimirGlasanjeV1.sol:MaksimirGlasanjeV1 \
  <adresa> <argumenti iz manifesta>
npx tsx scripts/e2e-chiado.ts
```

`DEPLOY_GAS`: javni Chiado RPC povremeno odbije procjenu gasa porukom „gas required exceeds
999999”, a izričiti limit to zaobilazi.

Rezultat: [`0xe7903145c8F2401fC16D78d9788D34beE0c3e029`](https://gnosis-chiado.blockscout.com/address/0xe7903145c8F2401fC16D78d9788D34beE0c3e029#code).
Raniji nacrti (`0xD4C4…2692` prije A-01, `0x88Bd…3989` prije A-07) arhivirani su u `deployments/chiado/superseded/`
(vidi [audit](audit/nalazi.md): A-01, A-07).

## 2. Gnosis mainnet

### Prije deploya (Matija)

| Što | Kako |
|---|---|
| **vlasnik**: Safe 2/3 | [app.safe.global](https://app.safe.global) → Gnosis Chain → novi Safe (ne MPT Safe `0x449a…` s novcem) |
| **registrar** EOA | novi ključ; ide samo u tajnu edge funkcije u `domovina-api` ([04](04-web-i-baza.md)) |
| **sponzor** EOA | novi ključ; `wrangler secret put SPONSOR_PRIVATE_KEY`; 1–2 xDAI |
| **deployer** EOA | jednokratan; 0,01 xDAI je višestruko dovoljno |
| xDAI | bilo koja mjenjačnica ili most; ukupno ~2 xDAI pokriva cijelo glasanje |

### Deploy

```sh
git status chain/contracts          # mora biti čisto; skripta to i sama provjerava
cd chain
DEPLOYER_PRIVATE_KEY=0x… OWNER=<Safe> REGISTRAR=<registrar> \
  npx hardhat run scripts/deploy-v1.ts --network gnosis     # → deployments/gnosis/v1.json
npx hardhat verify --network gnosis --contract contracts/v1/MaksimirGlasanjeV1.sol:MaksimirGlasanjeV1 <adresa> <argumenti>
#   bez ETHERSCAN_API_KEY → Blockscout (gnosis.blockscout.com); s ključem → Gnosisscan
git add deployments/gnosis/v1.json && git commit -m "deploy(glasanje): V1 na Gnosis"
git tag glasanje-v1-gnosis && git push --follow-tags
```

Provjera: `npm run check-frozen` prolazi, izvor je verificiran uz adresu, a `groupId` i `closesAt`
su u manifestu. Nakon toga deployer se isprazni.

### Vlasnik: Safe 2/3

Na Chiadu isprobano 26. 9. 2026. ([`scripts/safe-chiado.ts`](../../chain/scripts/safe-chiado.ts),
[`deployments/chiado/owner.json`](../../chain/deployments/chiado/owner.json)): Safe v1.3.0 L2
(kanonski, ista adresa na Gnosisu), prag 2/3, `transferOwnership` + `acceptOwnership` iz Safea.
Provjereno: 1 potpis → GS020, stari vlasnik → `OwnableUnauthorizedAccount`, 2 potpisa → uspjeh.
Na Gnosisu se V1 deploya **izravno** s `OWNER=<Safe>`, pa drugi korak nije potreban.

### Relayer (dio Workera `maksimir`)

```sh
cd web
# wrangler.jsonc → vars.RELAYER_CHAINS: dodaj "100": {"contract": "<adresa>", "rpc": "https://rpc.gnosischain.com"}
npx wrangler secret put SPONSOR_PRIVATE_KEY_100      # EOA sponzora, 1 xDAI
npm run check -- http://localhost:8787               # prije deploya (docs/2026-09-25-regresijske-provjere.md)
npm run deploy
curl https://maksimir.domovina.ai/relayer/100/status
```

KV `maksimir-relay` (kvote) već postoji i vezan je u `wrangler.jsonc`.

### Gnosis, 26. 9. 2026. (napravljeno)

| Što | Vrijednost |
|---|---|
| V1 | [`0xC9E6bB402293645C99d32cb41d125fEbB9F7507B`](https://gnosisscan.io/address/0xC9E6bB402293645C99d32cb41d125fEbB9F7507B), blok 48439703, `groupId` 248 |
| vlasnik | Safe 2/3 [`0xfb1b7a0e5d43e2B92d1956C70018e2eE53B2c576`](https://app.safe.global/home?safe=gno:0xfb1b7a0e5d43e2B92d1956C70018e2eE53B2c576) (potpisnici kao MPT Safe; `scripts/safe-gnosis.ts`, `deployments/gnosis/safe.json`) |
| registrar | `0x0F81daa9A724eAe838BE22dd446fcdB7Fbfa5374` (ključ u `chain/.env.gnosis`, gitignorirano) |
| izvor | Sourcify **exact_match** (creation + runtime); tag `glasanje-v1-gnosis` |

Zamke tog dana:

- **`gnosis.blockscout.com` sada preusmjerava (301) na Gnosisscan**, koji traži Etherscan API ključ
  (v2). Bez ključa verifikacija ide izravno preko Sourcify API-ja v2 (hardhat plugin za Sourcify pada):

  ```sh
  # standardni JSON ulaz iz build-infoa (artifacts/…/MaksimirGlasanjeV1.dbg.json → buildInfo)
  curl -X POST https://sourcify.dev/server/v2/verify/100/<adresa> -H 'Content-Type: application/json' \
    -d '{"stdJsonInput": <input>, "compilerVersion": "0.8.28+commit.7893614a",
         "contractIdentifier": "contracts/v1/MaksimirGlasanjeV1.sol:MaksimirGlasanjeV1"}'
  curl https://sourcify.dev/server/v2/verify/<verificationId>      # čekaj isJobCompleted
  ```
- **Finalized blok kasni ~2 min**; odmah nakon deploya `verify --chain` i checkpoint lanac preskaču.
- Deploy skripta šalje napojnicu 0,01 gwei (procjena daje 0, [I-05](audit/nalazi.md)).

## Alati

Stanje 25. 9. 2026.:

| Alat | Lokalno | Najnovije | Treba li nadogradnja |
|---|---|---|---|
| Hardhat | 2.29.1 | 3.18.0 | **ne**; 2.x radi sve što treba (test, deploy, verify). Hardhat 3 je druga arhitektura. Prelazak nema koristi za ovaj projekt |
| hardhat-toolbox-viem | 3.0.0 | 5.0.7 | ne (verzija 5 je za Hardhat 3) |
| solc (ugovor) | **0.8.28** (zaključano u `hardhat.config.ts`) | 0.8.37 | po želji **prije** mainnet deploya; nakon deploya nikad za V1 |
| viem, OpenZeppelin 5.6.1, Semaphore 4.14.3, wrangler, tsx | najnovije | — | ne |
| Foundry | nije instaliran | — | ne treba |

Paket `solc` 0.8.26 u `node_modules` samo je pomoćna ovisnost, a ugovor kompajlira 0.8.28 koji
Hardhat preuzme sam. Sourcify verifikacija iz Hardhata 2 pada na promijenjenom Sourcifyjevu API-ju.
Blockscout i Gnosisscan rade.

## Nakon deploya

- [ ] adresa u ovu mapu (README) i u `docs/glasanje-kako-radi.md`
- [ ] registrar u `domovina-api` i redak u `maksimir_chains` ([08](08-integracija-s-fazom-1.md#put-do-produkcije))
- [ ] web: zastavica `chain_from` ([08](08-integracija-s-fazom-1.md#put-do-produkcije))
- [ ] uzbuna kad saldo sponzora padne ispod 0,2 xDAI (`/status`)

## Oporavak

| Situacija | Što napraviti |
|---|---|
| Ukraden ključ registrara | Safe: `setRegistrar(novi)`. Napadač je mogao samo registrirati izmišljene članove (vidljivo u `Registered` događajima) |
| Ukraden ključ sponzora | novi ključ u Worker; gubitak je samo xDAI na starom |
| Relayer ne radi | glasači šalju paket sami ili preko drugog relayera; ugovor to ne razlikuje |
| Greška u V1 | V2 + `setSuccessor` + dobrovoljna selidba ([07](07-verzioniranje.md)) |
