# chain/ — glasanje javnosti na Gnosis Chainu

Plan, odluke i runbook: [`docs/blockchain/`](../docs/blockchain/README.md). Kontrola glasača:
[06](../docs/blockchain/06-kontrola-glasaca.md). Verzioniranje: [07](../docs/blockchain/07-verzioniranje.md).

| Mapa | Sadržaj |
|---|---|
| `contracts/v1/` | `MaksimirGlasanjeV1` — **zamrznuto** čim postoji `deployments/*/v1.json` |
| `contracts/test/` | samo za testove: Semaphore v4 + verifier + PoseidonT3, `MockSuccessorV2` |
| `client/` | kriptografija glasačeva preglednika: listić, poruka, ZK dokaz, grupa s lanca, EIP-712 registracije |
| `relayer/` | Cloudflare Worker `maksimir-relayer`: prosljeđuje gotove pakete i plaća gas |
| `deployments/<mreža>/vN.json` | nepromjenjiv manifest deploya (adresa, tx, argumenti, hash svakog izvora) |
| `scripts/deploy-v1.ts` | deploy + manifest |
| `scripts/check-frozen.mjs` | CI: zamrznuti izvor se ne smije promijeniti |
| `scripts/e2e-chiado.ts` | pravi tok na Chiadu kroz kod relayera |
| `scripts/faucet-chiado.mjs` | testni xDAI sa službenog faucet bez preglednika |

```sh
npm ci && npx hardhat test && npm run check-frozen
cd relayer && npm ci && npm run typecheck && npm test
```

`.env.chiado` (gitignorirano) drži **samo testne** ključeve za Chiado.
