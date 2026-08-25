# 07 — Kronologija objava nakon zadnjeg commita (27.5. → 25.8.2026.)

> **Rez:** zadnji commit repoa `d27bb02` — **2026-05-26 23:14**.
> Ovaj dokument bilježi **sve nove javne objave** relevantne za natječaj koje su se pojavile **nakon tog reza**, kronološki, s izvorom i s onim što svaka objava mijenja za repo.
> Status-analiza istih događaja je u [`06-status-natjecaja.md`](06-status-natjecaja.md); ovdje je čisti zapisnik „što je objavljeno i kada".

---

## Sažetak — što je stvarno novo

| # | Datum | Objava | Težina |
|---|---|---|---|
| 1 | 2026-07-06 | DAZ: podsjetnik na rok predaje makete (28.7.) | operativno |
| 2 | **2026-07-17** | **Zatvorena elektronička predaja radova kroz EOJN RH (18:00)** | **prekretnica** |
| 3 | **2026-07-17** | **HKIG uputila dopis gradonačelniku Tomaševiću — osporava vrstu natječaja i sastav ocjenjivačkog suda** | **novo, institucionalno** |
| 4 | 2026-07-27 | DAZ zadnja objava prije godišnjeg (nevezano za Maksimir) — komunikacijska tišina počinje | kontekst |
| 5 | **2026-07-28** | **Zatvorena predaja maketa (18:00)** | **prekretnica** |
| 6 | **2026-08-02** | **construction.hr: „Završen međunarodni natječaj… slijedi ocjenjivanje pristiglih radova"** — potvrda da broj radova još nije objavljen | **prva post-predajna analiza** |
| 7 | 2026-08-18 | index.hr: norveški novinar o stanju postojećeg stadiona uoči Dinamo–Viking | medijski pritisak |
| 8 | 2026-08-25 | Vlastita provjera svih kanala — **rezultati i dalje neobjavljeni** | status |

**Jedina objava koja mijenja strateško čitanje natječaja je #3 (HKIG).** Sve ostalo je potvrda rasporeda.

---

## 1. 2026-07-06 — DAZ: podsjetnik na rok predaje makete

DAZ objavljuje dvojezični podsjetnik: rok predaje makete je **utorak 28. srpnja 2026. do 18:00**, zaprimanje radnim danom 8–16 h na adresi **Avenija Dubrovnik 15, 10020 Zagreb, soba 115 (prvi kat)**. Ista objava paralelno ide na DAZ Facebook i na UHA.

→ *Za repo:* potvrđuje da rok makete nije dodatno pomicán nakon svibanjske izmjene.
→ Izvor: [DAZ, vijest 6615](https://www.d-a-z.hr/hr/vijesti/stadion-maksimir-i-src-svetice---rok-predaje---deadline-reminder,6615.html)

---

## 2. 2026-07-17, 18:00 — zatvorena elektronička predaja

Istekao rok za predaju natječajnih rješenja kroz **EOJN RH**. Nema naknadnog pomicanja — rok koji je 13.5.2026. pomaknut s 24.6. na 17.7. ostao je konačan.

→ *Za repo:* `ROADMAP.md` Faze 0–4 od ovog trenutka su arhiva, ne plan.

---

## 3. 2026-07-17 — HKIG: dopis gradonačelniku Zagreba ⚠️ **najvažnija nova objava**

Istoga dana kad je zatvorena predaja, **Hrvatska komora inženjera građevinarstva (HKIG)** objavila je da je uputila **dopis gradonačelniku Tomislavu Tomaševiću** o ovom natječaju. Sadržaj dopisa:

- Tvrdi da se radi o **složenoj građevini za koju „nije bilo uporišta u važećim propisima" za raspisivanje *arhitektonsko-urbanističkog* natječaja** (umjesto **projektnog** natječaja).
- Stadion od 35.000 mjesta u najvišoj UEFA kategoriji je „iznimno složen infrastrukturni zahvat" — veliki konstruktivni rasponi, tribine, **dinamička stabilnost**, stroge kontrole mehaničke otpornosti i sigurnosti; nužno **aktivno sudjelovanje ovlaštenih inženjera građevinarstva**.
- **Kriteriji natječaja i sastav ocjenjivačkog suda, „u kojem su pretežito zastupljeni arhitekti", ne jamče optimalnu valorizaciju rješenja koja se tiču sigurnosti i nosivih konstrukcija.**
- Arhitektonski koncept se mora temeljiti na **provjerenom konceptu nosive konstrukcije**; izostanak te analize u idejnoj fazi može dovesti do znatnih izmjena u glavnom projektu, **„ugroziti legalnost natječajnog rješenja"** i bitno povećati troškove gradnje.
- Poziva gradske urede da **ubuduće raspisuju projektne natječaje** i osiguraju zastupljenost struka primjerenu složenosti predmeta.

Dopis je dostupan kao PDF na HKIG-ovim stranicama.

**Zašto je ovo važno za repo:**

1. Otvara **formalno-pravni rizik nad ishodom natječaja** koji do sada nije bio u `SOT.md § 7` — ne rizik za pojedini rad, nego za postupak. Formulacija „ugroziti legalnost natječajnog rješenja" je jezik koji prethodi osporavanju.
2. **Potvrđuje težinu konstruktivnog koncepta u ocjeni.** Neovisno o ishodu dopisa, OS je sada javno upozoren da će konstrukcija biti gledana — to pojačava kriterij **C (ekonomičnost ostvarenja)** iz Uvjeta t. 2.3.
3. HKIG je isti pritisak **već jednom uspješno primijenio**: za **Jarunski most** je nakon njihova upozorenja Grad Zagreb odlučio provesti **projektni** natječaj (HKIG je to javno pozdravio). Presedan postoji, što povećava vjerojatnost da dopis dobije odgovor.
4. Otvara pitanje za praćenje: **je li Grad odgovorio i je li DAZ/UHA javno reagirala.** Do 2026-08-25 nije pronađen javni odgovor Grada, DAZ-a ni UHA-e.

→ Izvor: [HKIG, 17.7.2026.](https://hkig.hr/Vijesti-i-najave/Vijesti-i-najave/Vijesti/2026/HKIG-uputila-dopis-gradonacelniku-Grada-Zagreba-vezano-uz-arhitektonsko-urbanisticki-natjecaj-za-stadion-Maksimir/1711) · [PDF dopisa](https://hkig.hr/fdsak3jnFsk1Kfa/novosti/HKIG-Dopis_gradonacelniku_Grada_Zagreba-Arhitektonsko_urbanisticki_natjecaj_za_stadion_Maksimir.pdf) · presedan: [HKIG o Jarunskom mostu](https://hkig.hr/Vijesti-i-najave/Vijesti-i-najave/Vijesti/2026/HKIG-pozdravlja-odluku-Grada-Zagreba-da-za-Jarunski-most-provede-projektni-natjecaj/1684)

---

## 4. 2026-07-27 — DAZ: zadnja objava prije godišnjeg

Zadnja objava na DAZ-ovim vijestima uopće (poziv na izlaganje u Staklenoj sobi 2026./2027.). Nakon toga **DAZ ne objavljuje ništa do 2026-08-25** — ni o Maksimiru ni o čemu drugom.

→ *Za repo:* komunikacijska tišina u kolovozu je **institucionalna, ne signal o ishodu**. Ne izvlačiti zaključke iz nje.

---

## 5. 2026-07-28, 18:00 — zatvorena predaja maketa

Istekao rok za fizičke makete. **Natječaj je time u cijelosti zatvoren za natjecatelje.**

---

## 6. 2026-08-02 — construction.hr: prva post-predajna analiza

Prvi medijski tekst nakon zatvaranja natječaja. Ključne tvrdnje:

- Natječaj je **završen**; OS **započinje pregled** pristiglih prijedloga.
- **„U trenutku završetka natječaja službeni organizatori još nisu objavili konačan broj zaprimljenih natječajnih radova."** Taj podatak dolazi tek nakon **administrativne provjere svih prijava** i početka rada OS-a.
- **„Rezultati natječaja bit će objavljeni po završetku postupka ocjenjivanja."** — bez datuma.
- Ponavlja strukturu: stadion = natječaj za realizaciju, Svetice + Borongaj = anketni dio; 1. nagrada 390.400 € bruto; s prvonagrađenim se ugovara idejni, glavni i izvedbeni projekt; rušenje 2027.

→ *Za repo:* ovo je **izvor koji eksplicitno potvrđuje da broj radova i autorstva nisu javni** — dokaz da odsutnost informacije nije previd u pretrazi.
→ Izvor: [construction.hr, 2.8.2026.](https://www.construction.hr/novosti/zavrsen-medjunarodni-natjecaj-za-novi-stadion-maksimir-slijedi-ocjenjivanje-pristiglih-radova/a/11879)

---

## 7. 2026-08-18 — index.hr: norveški novinar o stanju stadiona

Uoči uzvrata Dinamo–Viking u play-offu Lige prvaka, norveški novinar javno kritizira stanje postojećeg Maksimira. Nije vijest o natječaju, ali je **jedina vijest o Maksimiru u kolovozu** i održava medijski pritisak na dinamiku rušenja.

→ *Za repo:* dopuna `research/05-mediji-politika.md` — narativ „sramota koju treba srušiti" ostaje aktivan i u fazi ocjenjivanja.

---

## 8. 2026-08-25 — vlastita provjera: rezultati neobjavljeni

Provjereni kanali i nalazi u [`06-status-natjecaja.md` § 3](06-status-natjecaja.md). Sažetak: službena stranica (vijesti + tijek događanja + dokumentacija), DAZ (vijesti + **arhiva rezultata**), UHA, EOJN 76778, TED, HR i EN medijske pretrage — **nigdje ni rezultata, ni broja radova, ni imena ureda.**

---

## Kontekst izvan natječaja koji se pomaknuo u istom razdoblju

Ne tiče se natječajnog postupka, ali mijenja raspored realizacije:

- **2026-05-18** *(neposredno prije reza, nije bilo u repou)* — Sportske novosti/Jutarnji: **rok dovršetka Kranjčevićeve pomaknut na 15.3.2027.** Selidba Dinama s Maksimira, planirana kao „fix" za proljetni dio sezone 2026./27., dovodi se u pitanje; izvori iz projekta govore da će **preciznija procjena biti moguća u rujnu 2026.** i da uz samu gradnju ostaju travnjak, uporabne dozvole i licence.
  → **Posljedica za natječaj:** Kranjčevićeva je preduvjet za rušenje Maksimira. Klizanje njezina roka gura i **rušenje 2027.** te sve što slijedi za prvonagrađeni rad.
  → Izvor: [Jutarnji/SN, 18.5.2026.](https://www.jutarnji.hr/sportske/nogomet/nogomet-mix/kranjceviceva-pomaknuti-rok-2027-odgoda-dinamove-selidbe-15709502)
- Otvoreno pitanje **imenovanja** novih stadiona (Kranjčevićeva, Maksimir) — Grad, Odbor za imenovanje naselja, ulica i trgova; za Maksimir „još nije tema", spominje se mogući sponzorski dodatak. Sporedno, ali ulazi u narativni okvir.

---

## Što ostaje pratiti (nadopunjuje checklist iz 06)

- [ ] **Odgovor Grada Zagreba na HKIG-ov dopis** — i eventualna reakcija DAZ-a / UHA-e / HKA-e
- [ ] Je li HKIG-ov prigovor doveo do bilo kakvog postupka (DKOM, upravni nadzor) nad natječajem
- [ ] Rujanska „preciznija procjena" roka Kranjčevićeve — pomiče li se rušenje Maksimira
- [ ] Objava broja pristiglih radova (prvi konkretan podatak koji će izaći)

---

## Metodologija

Kronologija je sastavljena 2026-08-25 pretragom: službene stranice natječaja (vijesti, tijek događanja, dokumentacija), DAZ (vijesti + arhiva rezultata), UHA, HKIG, HKA, EOJN/TED, te HR i EN web/news pretragama po ključnim riječima (rezultati, prvonagrađeni, pristigli radovi, winner, first prize). Datumi su preuzeti s objava; gdje portal ne prikazuje datum, naveden je datum iz metapodataka članka.
