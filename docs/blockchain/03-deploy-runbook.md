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

### Relayer

```sh
cd chain/relayer
npx wrangler kv namespace create RELAY_KV        # id u wrangler.toml
# wrangler.toml: CONTRACT_ADDRESS = <adresa>, CHAIN_ID = "100"
npx wrangler secret put SPONSOR_PRIVATE_KEY
npx wrangler deploy
curl https://maksimir-relayer.<račun>.workers.dev/status
```

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
- [ ] registrar u `domovina-api` ([04](04-web-i-baza.md))
- [ ] web nakon Astro migracije ([04](04-web-i-baza.md))
- [ ] uzbuna kad saldo sponzora padne ispod 0,2 xDAI (`/status`)

## Oporavak

| Situacija | Što napraviti |
|---|---|
| Ukraden ključ registrara | Safe: `setRegistrar(novi)`. Napadač je mogao samo registrirati izmišljene članove (vidljivo u `Registered` događajima) |
| Ukraden ključ sponzora | novi ključ u Worker; gubitak je samo xDAI na starom |
| Relayer ne radi | glasači šalju paket sami ili preko drugog relayera; ugovor to ne razlikuje |
| Greška u V1 | V2 + `setSuccessor` + dobrovoljna selidba ([07](07-verzioniranje.md)) |
