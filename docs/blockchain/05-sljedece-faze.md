# 5. Sljedeće faze (V2 i dalje)

V1 rješava integritet i kontrolu glasača nad listićem ([06](06-kontrola-glasaca.md)). Preostaju
tri granice: registrar kao čuvar prava glasa, javnost listića po vremenu i prisila. Svaka
promjena ugovora ide kao nova verzija ([07](07-verzioniranje.md)).

## Pravo glasa bez registrara: ZK dokaz nad eOsobnom

Certilijin `id_token` je JWT potpisan RS256. Glasač bi u pregledniku mogao izraditi ZK dokaz:
„imam valjan Certilijin JWT; `sub` (OIB) daje ovaj `personTag`; ovo je moj commitment”, a da OIB
ne otkrije. Ugovor bi provjerio dokaz i jedinstvenost `personTag`. Registrar tada više ne postoji.
Nema ni izmišljenih glasača, jer ih ni mi ne bismo mogli stvoriti.

- Postojeći radovi: zkLogin (Sui), zkEmail, Anon Aadhaar. Svi dokazuju RSA potpis nad JWT-om ili
  dokumentom u krugu.
- Otvoreno: rotira li Certilia ključeve (JWKS)? Ugovor bi morao znati važeće javne ključeve.
- `personTag` mora biti hash OIB-a s tajnom koju ne zna nitko. Inače se OIB-i mogu isprobati
  (ima ih samo ~10⁸). Rješenje je nullifier iz kruga ili MPC, i to je pravi istraživački dio.

Trud: velik, ali ovo je jedini put do glasanja bez ikakvog povjerenja u nas.

## Anonimna registracija (manji korak)

Registrar danas zna koji commitment pripada kojoj osobi (ne i koji listić). Uz **slijepi potpis**
(RSA blind signature) registrar potpisuje, a ne vidi commitment. Commitment ide na lanac s drugog
konteksta. Onchain provjera RSA potpisa je jeftina (precompile `modexp`).

Trud: srednji.

## Tajni listić (MACI)

[MACI](https://maci.pse.dev): listići su šifrirani na lancu, a koordinator objavljuje zbroj sa ZK
dokazom točnosti. Rješava javnost listića po vremenu i prisilu (glasač ne može dokazati kako je
glasao). Cijena je koordinator i zbroj koji nije vidljiv uživo, nego tek po obradi.

Trud: velik. Ima smisla ako glasanje dobije stvarnu težinu.

## Serijsko slanje (mali korak, bez novog ugovora)

Relayer skuplja pakete i šalje ih u satnim serijama. To smanjuje povezivanje listića s vremenom
glasanja. Ugovor se ne mijenja. Glasač i dalje može poslati sam, odmah.

## Vlastiti krug: „dao sam ≥ X bodova radu Y”

Dokaz o dijelu listića bez otkrivanja ostatka. Traži vlastiti Circom krug i ceremoniju (ili
PLONK s univerzalnim parametrima).

## Veza s DOMOVINA blockchainom

`domovinatv/domovina-blockchain` opisuje vlastiti EVM lanac po uzoru na Gnosis. V1 ne ovisi ni o
čemu specifičnom za Gnosis osim adrese Semaphorea. Deploy skripta lokalno već deploya i Semaphore,
pa je prijenos na drugi EVM lanac isti postupak.
