# 2. Relayer i plaćanje gasa

## Može li Safe/Gnosis plaćati gas umjesto nas?

**Ne za ovaj slučaj.** Nije ni potrebno.

- U travnju 2023. Safe i Gnosis pokrenuli su sponzorirane transakcije na Gnosis Chainu preko
  Gelatova *1Balance* relaya, u početku **5 besplatnih transakcija na sat po Safeu**
  ([Gnosis blog](https://www.gnosis.io/blog/free-transactions-on-gnosis-chain-with-safe-wallet)).
  Program pokriva samo **transakcije Safe računa poslane kroz Safe{Wallet}**. Današnje uvjete
  nisam mogao potvrditi; novije Safeove promjene vežu sponzorstvo uz plan *workspacea*
  ([safe-client-gateway #3437](https://github.com/safe-global/safe-client-gateway/pull/3437)).
- Naši pozivi (`register`, `cast`, `share`) nisu transakcije Safea. Glasač nema Safe i ne treba ga.
- Gelato *sponsoredCall* bi radio za bilo koji ugovor, ali je plaćena usluga treće strane,
  skuplja od samog gasa.

Zato imamo **vlastiti relayer**, po uzoru na onaj koji već radi u `pay.domovina.ai`
(`wallet/functions/api/relay.ts`).

## Relayer ne potpisuje ništa u ime glasača

```
POST /register  { commitment, deadline, signature }   ← registrarov EIP-712 potpis
POST /cast      { revision, points, proof }           ← glasačev ZK dokaz
POST /share     { proof }                             ← glasačev ZK dokaz
GET  /status    ugovor, verzija, broj glasača, saldo sponzora
```

Relayer za svaki paket napravi tri koraka:

1. **Provjeri oblik** (`parseCall`): brojevi, 8 točaka dokaza, listić od 88 bajtova ili prazan.
   Ništa ne dodaje i ne mijenja.
2. **Simulira poziv** (`eth_call`, besplatno). Neispravan paket vraća 400 ili 409 s imenom
   greške iz ugovora i ne troši ni gas ni kvotu.
3. **Plati gas**: `writeContract` s ključem sponzora. Kod nonce utrke ponovi pokušaj do 3 puta.

Jedina tajna u Workeru je `SPONSOR_PRIVATE_KEY`: EOA s malo xDAI-a i **bez ikakve uloge u
ugovoru**. Krađa znači gubitak tog xDAI-a, ništa više. Registrarov ključ **nije** u relayeru.

Dnevni limiti u KV-u (50 po IP-u, 5000 ukupno) samo su kočnica troška. Zloupotreba je prirodno
ograničena: svaki uspješan `cast` treba valjan dokaz člana grupe i novu reviziju, `share` troši
nullifier, a `register` registrarov potpis.

## Cijena

Izmjereno stvarnim transakcijama na Chiadu (vidi [01](01-arhitektura.md#izmjereni-gas-chiado-stvarne-transakcije)).
Gnosis i Chiado imaju istu strukturu naknada. Bazna naknada 25.–26. 9. 2026. bila je **7–9 wei**,
a `eth_maxPriorityFeePerGas` vraća 0–1 wei.

| Poziv | Gas | xDAI danas (~10 wei) | xDAI pri 1 gwei |
|---|---:|---:|---:|
| `register` | 152 845 | 0,0000000015 | 0,00015 |
| `cast`, prvi | 481 440 | 0,0000000048 | 0,00048 |
| `cast`, izmjena | 334 188 | 0,0000000033 | 0,00033 |
| `share` | 290 751 | 0,0000000029 | 0,00029 |

Primjer za **10 000 glasača**, svaki s registracijom, listićem i dvije izmjene, uz 30 % koji
objave „glasao sam”: oko 13,9 milijardi gasa. To je **≈ 0,00000014 xDAI po današnjim cijenama**,
a i pri pesimističnih 1 gwei ≈ 14 xDAI (≈ 14 USD). 1 xDAI ≈ 1 USD.

### Stvarno potrošeno na Chiadu

Faucet je dao 0,001 xDAI = 10¹⁵ wei. Dva deploya i dva cijela E2E kruga (16 transakcija)
potrošila su **51 741 831 wei ≈ 0,00000000005 xDAI**, odnosno **0,0000052 %** dobivenog iznosa.

## Testni xDAI (Chiado)

Službeni faucet [faucet.gnosischain.com](https://faucet.gnosischain.com/?chain=chiado) daje
0,001 xDAI tjedno po e-mailu. Po gornjoj tablici to je dovoljno za desetke tisuća transakcija.
Stranica traži e-mail OTP, ALTCHA proof-of-work i potpis walletom, a sve to radi
[`chain/scripts/faucet-chiado.mjs`](../../chain/scripts/faucet-chiado.mjs) bez preglednika:

```sh
cd chain
node scripts/faucet-chiado.mjs send-otp --email ime@gmail.com
node scripts/faucet-chiado.mjs claim    --email ime@gmail.com --otp 123456
```

Isprobano 25. 9. 2026.: proof-of-work je riješen za 320 ms, a 0,001 xDAI je stiglo iz prvog
pokušaja ([tx](https://gnosis-chiado.blockscout.com/tx/0x56518c27f92588eea23e89e7871c2ae1face5d2d68dc691e7248004363eea649)).
Rezervne opcije: [ETHGlobal](https://ethglobal.com/faucet/gnosis-chiado-10200) (0,05 xDAI dnevno
uz prijavu) i [thirdweb](https://thirdweb.com/gnosis-chiado-testnet) (0,01 xDAI dnevno).

## Relayer je ruta u Workeru `maksimir` (26. 9. 2026.)

Prvotno je relayer bio zaseban Worker (`chain/relayer/`), jer se `web/` trebao seliti na Astro.
Astro je odbačen, a Matija je htio da se sve deploya zajedno i atomično. Relayer je zato u
[`web/worker/relayer/`](../../web/worker/relayer/), na putu `/relayer/<chainId>/…` istog hosta:

- isti izvor kao web, pa nema CORS-a (osim za lokalni razvoj, `RELAYER_ALLOWED_ORIGINS`);
- više mreža u jednom Workeru: `RELAYER_CHAINS` (JSON) + tajna `SPONSOR_PRIVATE_KEY_<chainId>`;
  mreža bez tajne vraća 503, a web tada nudi „preuzmi paket i pošalji sam”;
- dnevne kvote po mreži u KV `maksimir-relay`;
- najmanja napojnica validatoru `PRIORITY_FEE_WEI` (zadano 0,01 gwei), jer napojnica 0 zna čekati
  minutama ([I-05](audit/nalazi.md)).
