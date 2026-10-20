# chain/ — glasanje javnosti na Gnosis Chainu

**Na produkciji od 26. 9. 2026.:** `MaksimirGlasanjeV1` na Gnosisu
[`0x812960FA1120121DEd82A8806aECE93dcf49E869`](https://gnosisscan.io/address/0x812960FA1120121DEd82A8806aECE93dcf49E869)
([manifest](deployments/gnosis/v1.json), tag `glasanje-v1-gnosis`). Relayer koji plaća gas je ruta
`/relayer/<chainId>/…` Workera `maksimir` ([`web/worker/relayer/`](../web/worker/relayer/)).

Plan, odluke i runbook: [`docs/blockchain/`](../docs/blockchain/README.md). Kontrola glasača:
[06](../docs/blockchain/06-kontrola-glasaca.md). Verzioniranje: [07](../docs/blockchain/07-verzioniranje.md).

| Mapa | Sadržaj |
|---|---|
| `contracts/v1/` | `MaksimirGlasanjeV1` — **zamrznuto** čim postoji `deployments/*/v1.json` |
| `contracts/test/` | samo za testove: Semaphore v4 + verifier + PoseidonT3, `MockSuccessorV2` |
| `client/` | kriptografija glasačeva preglednika: listić, poruka, ZK dokaz, grupa s lanca, EIP-712 registracije |
| `deployments/<mreža>/vN.json` | nepromjenjiv manifest deploya (adresa, tx, argumenti, hash svakog izvora); povučeni u `superseded/` |
| `deployments/<mreža>/safe.json`, `owner.json` | vlasnik ugovora (Safe 2/3) |
| `scripts/deploy-v1.ts` | deploy + manifest |
| `scripts/check-frozen.mjs` | CI: zamrznuti izvor se ne smije promijeniti |
| `scripts/check-coverage.mjs`, `check-client-coverage.mjs` | CI: prag 100 % pokrivenosti ugovora i klijenta |
| `scripts/mutation-test.mjs` | mutacijski testovi (workflow `chain-mutation`) |
| `scripts/safe-chiado.ts`, `safe-gnosis.ts` | Safe 2/3 kao vlasnik |
| `scripts/e2e-chiado.ts` | pravi tok na Chiadu kroz kod relayera |
| `scripts/faucet-chiado.mjs` | testni xDAI sa službenog faucet bez preglednika |

```sh
npm ci && npx hardhat test && npm run check-frozen
cd ../web && npm ci && npm run test:relayer   # relayer
```

`.env.chiado` (gitignorirano) drži **samo testne** ključeve za Chiado.
