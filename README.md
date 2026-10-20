# Stadion Maksimir & SRC Svetice — Natječaj 2026.

Otvoreni arhiv i analiza međunarodnog arhitektonsko-urbanističkog natječaja za novi stadion Maksimir i
SRC Svetice (**Grad Zagreb + Vlada RH, provedba DAZ**, raspisan 20. 3. 2026.), uz **neslužbeno, provjerljivo
glasanje javnosti** o svih 88 radova.

**Stranica: <https://maksimir.domovina.ai>**. Sve iz ovog repozitorija se ondje prikazuje (dokumenti, radovi, glasanje).

---

> ### Stanje 20. 10. 2026.
>
> - **Rezultati su objavljeni 24. 9. 2026.** Stiglo je **88 radova** iz više od 20 zemalja, a dodijeljeno je 5 nagrada.
>   **1. nagradu** dobio je **VG13 Architects** (Milano), zatim XDGA, Plan Común / Studio Muoto / DATA, njiric plus i LAN / P2PA.
>   → [`research/08-rezultati-natjecaja.md`](research/08-rezultati-natjecaja.md)
> - **Svih 88 radova je javno.** Naručitelj je 25. 9. na EOJN-u objavio zapisnike i Prilog III (slika i ocjena suda za svaki rad).
>   Na stranici su pod [/radovi](https://maksimir.domovina.ai/radovi), popis po rangu je u [`research/09-svi-radovi.md`](research/09-svi-radovi.md).
> - **Glasanje javnosti** ([/glasanje](https://maksimir.domovina.ai/glasanje) ili jednostavnije [/glasaj](https://maksimir.domovina.ai/glasaj))
>   radi od 25. 9. Od **26. 9. 2026.** (dan D) listići se predaju na **Gnosis Chainu**, u ugovor `MaksimirGlasanjeV1`. Listić se smije mijenjati do 31. 12. 2027.
> - **Izložba** svih radova s maketama najavljena je za kraj listopada ili početak studenoga 2026. Datum i mjesto još nisu objavljeni.
>
> Pripremna faza (SoT, roadmap i checklist za predaju, svibanj–srpanj 2026.) je završena i ostaje kao arhiva metodologije.

---

## Na stranici

| | |
|---|---|
| [Rezultati](https://maksimir.domovina.ai/rezultati) | 5 nagrađenih radova, paneli iz službenih PDF-ova |
| [Svi radovi](https://maksimir.domovina.ai/radovi) | 88 radova po rangu, ocjena suda, autori, 3D model gdje postoji |
| [Glasanje](https://maksimir.domovina.ai/glasanje) · [Glasaj](https://maksimir.domovina.ai/glasaj) | 100 bodova po osobi, prijava eOsobnom ili Certilia mobile.ID-jem, rezultati uživo |
| [Dan D](https://maksimir.domovina.ai/glasanje-dan-d) | prijelaz glasanja na Gnosis Chain i kako to sam provjeriti |
| [Medijski arhiv](https://maksimir.domovina.ai/research-11-medijski-arhiv) | sve javne objave o natječaju na jednom mjestu |

Glasanje je neslužbeno i ne utječe na odluku ocjenjivačkog suda.

## Sadržaj repozitorija

| Mapa / datoteka | Što je |
|---|---|
| [`research/`](research/) | **01–05** dubinska istraživanja (sud, referentni stadioni, lokacija, tehnički okvir, mediji); **06** živi status; **07** kronologija objava (uklj. HKIG-ov dopis); **08** rezultati; **09** svih 88 radova; **10** javnost, ankete i slični projekti; **11** medijski arhiv |
| [`research/cross-check/`](research/cross-check/) | četiri nezavisne Desktop Research provjere (A–D) i [`SYNTHESIS.md`](research/cross-check/SYNTHESIS.md) |
| [`sources/`](sources/) | službeni izvori (Uvjeti, Program, izvučeni MD-ovi), `radovi.json` (svih 88 radova), `mediji.tsv` (medijski arhiv) |
| [`SOT.md`](SOT.md) · [`ROADMAP.md`](ROADMAP.md) · [`TODO.md`](TODO.md) | sažetak, plan i checklist pripremne faze (arhiva) |
| [`web/`](web/) | stranica: Vite + TypeScript, prerender svih ruta, Cloudflare Worker `maksimir` (uklj. relayer za glasanje) |
| [`chain/`](chain/) | ugovor `MaksimirGlasanjeV1` (Solidity, Semaphore v4), klijentska kriptografija, deploy manifesti |
| [`glasanje/`](glasanje/) | provjerljivi zapis glasanja: satni snapshotovi s OpenTimestamps dokazima, zatvoreni lanac faze 1 |
| [`scripts/`](scripts/) | Python alati: snapshot i neovisna provjera glasanja, izrada `radovi.json` i medijskog arhiva, 3D modeli |
| [`docs/`](docs/) | operativno znanje i odluke s datumom: deploy, regresijske provjere, glasanje, onchain, UX |
| [`docs/blockchain/`](docs/blockchain/README.md) | arhitektura glasanja na lancu, relayer, runbook, verzioniranje, plan V2, audit |
| [`docs/review/`](docs/review/README.md) | neovisni sigurnosni pregledi (drugi model, zamrznut commit, tag `audit-*`) |
| [`prototipi/`](prototipi/) | UX prototipi glasanja |

## Glasanje ukratko

- **Pravo glasa:** jedna osoba potvrđena eOsobnom ili Certilia mobile.ID-jem ima jedan listić. Registrar
  (domovina.ai) potpisuje samo pravo glasa i ne vidi listiće.
- **Listić:** preglednik izrađuje Semaphore ZK dokaz. Ugovor na Gnosisu ga provjerava i broji uživo. Relayer
  (ruta `/relayer/<chainId>/…` Workera) samo plaća gas, a glasač ne treba novčanik.
- **Ugovor:** [`0x812960FA1120121DEd82A8806aECE93dcf49E869`](https://gnosisscan.io/address/0x812960FA1120121DEd82A8806aECE93dcf49E869),
  izvor verificiran (Sourcify), vlasnik Safe 2/3, manifest [`chain/deployments/gnosis/v1.json`](chain/deployments/gnosis/v1.json).
  Bez proxyja: V2 bi bio novi ugovor, a listić se seli samo glasačevim dokazom.
- **Faza 1** (25.–26. 9., u bazi) zatvorena je lancem hasheva i satnim snapshotovima žigosanima u Bitcoinu.
  Ukupan rezultat (faza 1 + lanac) svatko može provjeriti:

  ```sh
  python3 scripts/maksimir_verify.py glasanje/faza1/lanac.json glasanje/checkpoints/*.json \
    --zk glasanje/faza1/zk_grupa.json --chain chain/deployments/gnosis/v1.json
  ```

Detalji: [`docs/glasanje-kako-radi.md`](docs/glasanje-kako-radi.md), [`glasanje/README.md`](glasanje/README.md),
[`docs/blockchain/README.md`](docs/blockchain/README.md). Opći model glasovanja (udruge, stranke, referendum) dalje
se razvija u [zajedno.domovina.ai](https://github.com/domovinatv/zajedno.domovina.ai); ovdje ostaje stadionska izvedba.

## Razvoj

```sh
# stranica
cd web && npm ci
npm run dev                 # lokalno (Vite)
npm run build               # build + prerender u dist/
npm run typecheck && npm run test:glasanje && npm run test:relayer
npm run check -- <url>      # regresijska provjera prije i poslije deploya

# ugovor
cd chain && npm ci && npx hardhat test && npm run check-frozen
```

Deploy, povrat i zamke: [`docs/2026-09-25-regresijske-provjere.md`](docs/2026-09-25-regresijske-provjere.md).
Novi `.md` dokument se na stranici pojavi tek kad se doda u ručni manifest [`web/src/docs.ts`](web/src/docs.ts).

CI ([`.github/workflows/`](.github/workflows/)): `chain` (testovi, 100 % pokrivenost, zamrznut izvor, relayer),
`chain-mutation` (mutacijski testovi, ručno), `maksimir-checkpoint` (satni snapshot glasanja + OpenTimestamps).

## Ključne činjenice

| | |
|---|---|
| Natječaj raspisan | 20. 3. 2026. |
| Predaja (EOJN / maketa) | 17. 7. / 28. 7. 2026. ✅ |
| Rezultati | 24. 9. 2026. ✅, 88 radova, 5 nagrada |
| 1. nagrada | VG13 Architects (Milano) |
| Kapacitet stadiona | 35.000 (UEFA kategorija 4) |
| Investicija zona C | ~204 mil. € |
| Nagradni fond | bruto 976.000 € |
| Predsjednik ocjenjivačkog suda | Toma Plejić (Studio UP) |
| EOJN | <https://eojn.hr/tender-eo/76778> |
| Službena stranica | <https://stadion-maksimir.zagreb.hr> |

## Licenca

[MIT](LICENSE) vrijedi za sve što je autorski rad ovog repozitorija: kod, tekstove, istraživanja, podatke i
skripte. Ne vrijedi za tuđe materijale koji su ovdje preuzeti ili povezani. Oni ostaju pod pravima svojih
autora: natječajni radovi i paneli, dokumentacija natječaja, 3D model sa zagreb.lol (Strahimir Stribor) te
citirani i povezani medijski sadržaji.
