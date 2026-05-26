# CROSS-CHECK A — Tehničke brojke (REPORT placeholder)

> **Workflow:** odradi prompt iz [`_prompt-A-tehnicki-brojke.md`](_prompt-A-tehnicki-brojke.md) u Claude Desktop s uključenim **Research** modom. Cijeli output (uključujući citirane izvore) zalijepi ispod oznake `<!-- PASTE HERE -->`.
>
> Kad zalijepiš, javi mi: *"Predaja: cross-check A gotov"*. Tada ću napraviti diff protiv `research/04-tehnicki-okvir.md` i ažurirati `SOT.md`.
>
> ---
>
> **Status:** ⬜ ČEKA OUTPUT
> **Datum pokretanja Desktop sesije:** _________
> **Datum zalijepljenog outputa:** _________

---

<!-- PASTE HERE -->

# Neovisna verifikacija 42 tehničkih tvrdnji — natječaj Stadion Maksimir, Zagreb

## TL;DR

- **Glavna referenca mora se ažurirati**: UEFA Stadium Infrastructure Regulations **Edition 2025** (usvojeno 16.12.2024., na snazi 1.6.2025.) zamjenjuje izdanje iz 2018. Verbatim iz preamble dokumenta: *„These regulations were adopted by the UEFA Executive Committee at its meeting on 16 December 2024. They come into force on 1 June 2025. They replace the UEFA Stadium Infrastructure Regulations (Edition 2018)."* Sve UEFA tvrdnje (1–20) treba prepisati prema novom izdanju, brojevi članaka i nekoliko zahtjeva su izmijenjeni (svlačionice momčadi/sudaca, sanitarije, pristupačnost).
- **FIFA primarni dokument je sada „FIFA Stadium Guidelines" (digitalno izdanje 2022.)** dostupan na inside.fifa.com/innovation/stadium-guidelines, koje zamjenjuje tiskani „Football Stadiums – Technical Recommendations and Requirements, 5th ed. 2011". Per inside.fifa.com: *„FIFA's previous technical recommendations and requirements for stadiums were last published in 2011… That was changed for the next edition, published in 2022."* HNS na hns.family koristi naslov „FIFA FOOTBALL STADIUMS GUIDELINES 2022".
- **Najveća odstupanja u internom izvješću**: (a) UEFA omjer sanitarija — sada „minimum 25 % za žene" + strože norme za ženske toalete; (b) svlačionice momčadi/sudaca u kat. 3/4 — pooštreni zahtjevi 2025.; (c) UEFA Art. 24.03 EKSPLICITNO daje postotke za mjesta za invalidska kolica (0,5 % preporučeno / 0,1 % minimum), suprotno tvrdnji iz internog izvješća da UEFA ne navodi postotak.

---

## Tablica za svih 42 tvrdnje

| # | Tvrdnja iz internog izvješća | Status | Točna vrijednost (ako se razlikuje) | Primarni izvor |
|---|------------------------------|--------|-------------------------------------|----------------|
| **UEFA Stadium Infrastructure Regulations — Edition 2025** | | | | |
| 1 | Cat. 4: teren točno 105 × 68 m (Art. 5) | ✓ Potvrđeno | Identično, Art. 5.01, tablica za kat. 3 i 4 | UEFA SIR 2025, Art. 5.01 (documents.uefa.com / jalgpall.ee mirror PDF) |
| 2 | Slobodna visina ≥ 21 m iznad terena (Art. 5.06) | ✓ Potvrđeno | Art. 5.06 (2025.): *„No physical structure can be less than 21m above the field of play"* | UEFA SIR 2025, Art. 5.06 |
| 3 | Min. kapacitet 8 000 sjedala (Cat. 4) | ✓ Potvrđeno | Art. 17.01, tablica: kat. 4 = 8 000 | UEFA SIR 2025, Art. 17.01 |
| 4 | Stajaća mjesta zabranjena Cat. 2–4 (Art. 18.03) | ✓ Potvrđeno | Art. 18.03: *„Standing accommodation… Categories 2 to 4: Prohibited"* | UEFA SIR 2025, Art. 18.03 |
| 5 | Naslon sjedala ≥ 30 cm (Art. 18.01) | ✓ Potvrđeno | Art. 18.01: *„backrest of a minimum height of 30cm when measured from the surface of the seat"* | UEFA SIR 2025, Art. 18.01 |
| 6 | Min. 5 % kapaciteta = sektor gostiju (Art. 17.02) | ✓ Potvrđeno | Art. 17.02: *„At least 5% of the UEFA spectator capacity must be made available to visiting supporters"* | UEFA SIR 2025, Art. 17.02 |
| 7 | VIP min. 100 sjedala (Cat. 4) | ✓ Potvrđeno | Art. 25.01, tablica: Cat. 4 = 100 | UEFA SIR 2025, Art. 25.01 |
| 8 | Rasvjeta Cat. 4: prosj. 1 400 lux Eh, 1 000 lux Ev (Art. 16.02) | ✓ Potvrđeno; 🆕 broj članka | Vrijednosti identične; u izd. 2025. odredba je **Art. 16.01**, uz dodatne zahtjeve uniformnosti U1h > 0,5 / U2h > 0,7 te U1v > 0,4 / U2v > 0,5 | UEFA SIR 2025, Art. 16.01 |
| 9 | Backup obnavlja 900 lux Eh u ≤ 15 min (Art. 16.03) | ✓ Potvrđeno | Art. 16.03: *„900 Eh(lux) no more than 15 minutes after the power failure"* (broadcast utakmice kat. 4) | UEFA SIR 2025, Art. 16.03 |
| 10 | UEFA Stadium Lighting Guide 2023 — Elite Level A: > 2 000 Eh / > 1 500 Ev (CL/EURO finals) | ⚠ Djelomično (PDF iza JS-aplikacije) | UEFA Stadium Lighting Guide 2023 postoji (documents.uefa.com/r/UEFA-Stadium-Lighting-Guide-2023-2023) i sadrži posebnu sekciju „Elite level A floodlight illuminance"; točne brojčane vrijednosti zahtijevaju pristup koji nije bio dostupan u javnom kanalu. Industrijske reference (AIKO Lighting, sporteimpianti.it) potvrđuju da je Elite Level A iznad Cat. 4 razine iz SIR 2025. | UEFA Stadium Lighting Guide 2023 (documents.uefa.com) — pristup ograničen |
| 11 | Okretnice: 1 ulaz / 660 sjedala (Cat. 3/4) | ✓ Potvrđeno; 🆕 broj članka | Art. 21.06: *„at least 1 turnstile for every 660 spectators"* | UEFA SIR 2025, Art. 21.06 |
| 12 | Medijska sjedala: 60 / 30 stolova (Cat. 4) | ✓ Potvrđeno | Art. 31.02, tablica Cat. 4: 60 sjedala, 30 sa stolovima | UEFA SIR 2025, Art. 31.02 |
| 13 | Komentatorske pozicije: 10 (Cat. 4) | ✓ Potvrđeno | Art. 32.01, tablica Cat. 4: 10 | UEFA SIR 2025, Art. 32.01 |
| 14 | TV studiji: 2 prostora, svaki 5 × 5 × 2,5 m (jedan s pogledom na teren) | ✓ Potvrđeno | Art. 34.01, Cat. 4: *„2 rooms / 5m long × 5m wide × 2.5m high / At least one of the two broadcast studios must be a pitch-view studio"* | UEFA SIR 2025, Art. 34.01 |
| 15 | TV kompaund: 1 000 m², pristup teškim vozilima 43 t | ✓ Površina; ⚠ Ispraviti težinu | Art. 36.01 Cat. 4: 1 000 m²; Art. 36.02 b: *„large and heavy vehicles (>40-tonne trucks)"* — **vrijednost je > 40 t**, ne 43 t | UEFA SIR 2025, Art. 36.01 i 36.02 b) |
| 16 | Press konferencija: 50 sjedala, podij, kamere za ≥ 8 | ✓ Potvrđeno | Art. 37.01, Cat. 4: *„top table and podium, a camera platform large enough to accommodate a minimum of 8 cameras… 50 seats"* | UEFA SIR 2025, Art. 37.01 |
| 17 | Sanitarije UEFA: 80 : 20 M : Ž; 1 WC / 250 m, 1 pisoar / 125 m, 1 WC / 125 ž (Art. 22) | 🆕 Ažurirana vrijednost | **U izdanju 2025. odredba je Art. 19.02, ne Art. 22**; omjer je promijenjen: *„able to provide for 80% of spectators being male"* + *„at least 25% of spectators being female"* (efektivno 75 : 25 minimum). Brojčani omjeri: 1 sjedeći WC + umivaonik / 250 m; 1 pisoar / 125 m; **1 sjedeći WC + umivaonik / 120 žena u domaćem sektoru; 1 / 80 žena u gostujućem sektoru** (strože od starog 1/125). Art. 19.01: minimum 25 % sanitarija za žene u svakom sektoru. | UEFA SIR 2025, Art. 19.01 i 19.02 |
| 18 | Svlačionica momčadi: ≥ 5 tuševa, prostor za 25, masažni stol (Art. 11.01) | 🆕 Ažurirana vrijednost | **2025. Cat. 3/4: 6 tuševa, 3 odvojena sjedeća WC-a; svlačionica igrača 55 m² za 23 igrača + zasebna prostorija stručnog stožera 20 m² za 7 osoba; 3 masažna stola (15 m²); spremište 5 m²** | UEFA SIR 2025, Art. 11.01 |
| 19 | Sudačka svlačionica Cat. 3/4: ≥ 20 m², 2 tuša, 1 WC, 6 mjesta (Art. 11.02) | 🆕 Ažurirana vrijednost | 2025. Art. 11.02 za sve kategorije: 2 tuša, 1 WC, **mjesta za 4 osobe (ne 6)**, 20 m²; opcionalno dodatna svlačionica (1 tuš, 1 WC, 2 mjesta) za mješovite sudačke timove | UEFA SIR 2025, Art. 11.02 |
| 20 | VIP/osoblje parking Cat. 4: min. 150 sigurnih mjesta (Art. 26) | ✓ Potvrđeno | Art. 26.01, tablica Cat. 4: 150 | UEFA SIR 2025, Art. 26.01 |
| **FIFA — trenutno mjerodavna izdanja** | | | | |
| 21 | C-value sightline preporučeni minimum 90 mm, optimum 120 mm | ✓ Potvrđeno | Formula: N = [(R+C)(D+T)/D] − R; brojčano: 90 mm „satisfactory", 120 mm „optimum". FIFA Stadium Guidelines 2022 § 5.2 i FIFA Sightline C-Level Calcs dokument navode iste vrijednosti. | FIFA Stadium Guidelines 2022 § 5.2 (inside.fifa.com); FIFA Football Stadiums 5th ed. 2011, Ch. 7 |
| 22 | Optimalna max udaljenost od najbližeg ugla terena ~90 m, apsolutna ~190 m | ✓ Potvrđeno (industrijski standard) | „seats at distance greater than 190 m … are omitted from maximum capacity"; potječe od FIFA 5th ed. 2011 Ch. 7 (Spectators) | FIFA Football Stadiums 5th ed. 2011, Ch. 7 |
| 23 | Širina sjedala min. 45 cm, preporuka 47–50 cm | ✓ Potvrđeno | FIFA 5th ed. 2011 (Ch. 7) i digitalne Stadium Guidelines 2022 § 5.2: minimum 45 cm, preporuka 47–50 cm | FIFA Stadium Guidelines 2022 § 5.2 (inside.fifa.com); FIFA 5th ed. 2011 Ch. 7 |
| 24 | Razmak red-red ≥ 85 cm (FIFA), optimum 90 cm | ✓ Potvrđeno | FIFA 5th ed. 2011 Ch. 7; preporuka ≥ 85 cm, ideal 90 cm | FIFA Football Stadiums 5th ed. 2011, Ch. 7 |
| 25 | Orijentacija glavne osi: N–S, tolerancija ±15° prema zapadu | ✓ Potvrđeno | FIFA Stadium Guidelines 2022 § 2.2 „Orientation": preporučena os N–S; dopušteno odstupanje do 15° s ciljem da glavne kamere budu okrenute od zalazećeg sunca | FIFA Stadium Guidelines 2022 § 2.2 (inside.fifa.com/innovation/stadium-guidelines/general-process-guidelines/design/orientation) |
| 26 | Travnjak Cat. 4 — FIFA preporučuje 4–6 h direktnog sunca/dan | ✗ Nije u primarnom izvoru | FIFA Stadium Guidelines i UEFA Pitch Quality Guidelines preporučuju „dovoljno sunca" bez izrijekom 4–6 h; brojka 4–6 h ne pronalazi se u dostupnim primarnim FIFA dokumentima — riječ je o industrijskoj konvenciji (STRI/SGL/ESSMA agronomske smjernice), ne o FIFA propisu | FIFA Stadium Guidelines 2022 (inside.fifa.com) — brojka 4–6 h nije eksplicitno propisana |
| 27 | Hibridni travnjak (≥ 95 % prirodno + sintetička armatura SISGrass / Desso GrassMaster) | ✓ Potvrđeno | UEFA SIR 2025 Art. 5.03: *„natural playing surface (100% natural grass), reinforced natural grass (hybrid) or artificial football turf (100% artificial fibres)"*; FIFA Quality Programme certificira hibridne sustave; tipično ~97 % prirodne trave + ~3 % sintetičkih vlakana (Desso GrassMaster: 20 mil. polipropilenskih vlakana po terenu) | UEFA SIR 2025, Art. 5.03 i 5.04; FIFA Quality Programme — Hybrid Turf testing |
| **Hrvatski propisi (Narodne novine)** | | | | |
| 28 | NN 12/23 — sportske građevine > 1 000 sjedala traže min. 1 % pristupačnih mjesta | ✓ Potvrđeno | Čl. 29., st. 3., t. 3.: *„od 1.001 i više ukupno sjedećih mjesta, izvodi se najmanje 1 % pristupačnih mjesta u gledalištu"*; st. 3. t. 2. za 301–1 000 = min. 2 %; t. 1. za 100–300 = min. 2 mjesta | NN 12/23, Čl. 29. (narodne-novine.nn.hr/clanci/sluzbeni/2023_02_12_237.html) |
| 29 | Za 35 000 sjedala = min. 350 pristupačnih mjesta | ✓ Potvrđeno aritmetički | 35 000 × 1 % = 350 (s minimalnim tlocrtnim dimenzijama 90 × 140 cm prema Čl. 29. st. 1.) | NN 12/23, Čl. 29. st. 1. i st. 3. t. 3. |
| 30 | NN 29/13 (87/15) — > 1 000 osoba traži ≥ 4 evakuacijska puta | ✓ Potvrđeno | Čl. 31. st. 2.: *„najmanje 4 evakuacijska puta, ako je broj korisnika veći od 1 000"*; st. 1. zahtijeva minimalno 2 puta u različitim smjerovima koji ne završavaju u istom požarnom/dimnom odjeljku | NN 29/13, Čl. 31. (narodne-novine.nn.hr/clanci/sluzbeni/2013_03_29_505.html) |
| 31 | Max udaljenost do izlaza: 40 m bez sprinklera / 60 m sa sprinklerom | ✓ Potvrđeno | Čl. 34. st. 1.: *„60,00 metara u građevinama s ugrađenim sustavom za automatsku dojavu i gašenje požara; 40,00 metara u građevinama bez ugrađenog sustava"*. Dodatna ograničenja: zajednički dio puta 30 m / 23 m, slijepi hodnik 15 m / 6 m | NN 29/13, Čl. 34. st. 1. |
| 32 | Sektorski požarni zidovi: REI-M 90 | ✓ Potvrđeno | Čl. 8. st. 2.: *„Otpornost na požar konstrukcije požarnog zida mora biti najmanje REI-M 90, a građevni proizvodi koji su ugrađeni u požarni zid moraju biti najmanje reakcije na požar A2-s1d0"*. Čl. 23. st. 2. povisuje na REI-M 120 za velika požarna opterećenja | NN 29/13, Čl. 8. st. 2. i Čl. 3. st. 1. t. 3. |
| 33 | Zakon o sprječavanju nereda na športskim natjecanjima — trenutno konsolidirani tekst | ✓ Potvrđeno | Pročišćeni tekst: NN 117/03, 71/06, 43/09, 34/11, **114/22** (na snazi od 1.1.2023.). Ključne odredbe za organizatora utakmica visokog rizika: Čl. 5–6 (procjena rizika), Čl. 21 (zabrana alkohola — nulta tolerancija od 2022.), Čl. 22 (neovisni izvor električne energije za noćne utakmice), Čl. 23 (otvaranje stadiona dovoljno rano), Čl. 33 (prisustvo prekršajnog suca na visokorizičnim utakmicama). Dodano je više kaznenih djela (sudjelovanje u tučnjavi, organiziranje nasilja, uništavanje imovine, nepoštivanje mjera). | NN 117/03 + izmjene; zakon.hr/z/445 |
| 34 | HNS Pravilnik o sigurnosti na nogometnim utakmicama — 1. HNL: samo sjedeća mjesta, gostujući sektor do 5 % | ⚠ Djelomično | HNS Pravilnik o sigurnosti (hns.family/files/documents/136) i HNS Pravilnik o zaštiti i sigurnosti (hns.family/files/documents/24409) regulira sigurnosne mjere, povjerenika za sigurnost (Čl. 24), redarsku službu i ulaznice. **Zahtjev „samo sjedeća mjesta za 1. HNL" proizlazi iz HNS Pravilnika o licenciranju klubova, a zabrana stajaćih mjesta na UEFA stadionima kat. 2–4 iz UEFA SIR 2025 Art. 18.03 — ne iz Pravilnika o sigurnosti.** Brojka 5 % gostujućeg sektora je UEFA standard (Art. 17.02); HNS Pravilnik ne propisuje brojku, već obvezu segregacije i namjenske kontrole | HNS Pravilnik o sigurnosti (hns.family); HNS Pravilnik o zaštiti i sigurnosti; HNS Pravilnik o licenciranju klubova |
| **Eurocode 8 / geotehnika za Zagreb-Maksimir** | | | | |
| 35 | agR (tlo A) za Maksimir: 0,126 g (95 g), 0,180 g (225 g), 0,251 g (475 g) — Geotehnička studija GF UniZG (svibanj–lipanj 2025) | ⚠ Kvalitativno potvrđeno; tri decimale neprovjerene | **Tp = 95 g i Tp = 475 g** dio su HRN EN 1998-1:2011/NA:2011 (Dodatak B — karte; tumač u Dodatku C, prof. M. Herak i sur.). Aplikacija PMF Geofizičkog odsjeka (seizkarta.gfz.hr/hazmap) eksplicitno upozorava: *„OČITANI IZNOSI NISU SLUŽBENI PODACI i smije ih se koristiti tek kao orijentaciju, te ih za projektiranje valja potvrditi uvidom u kartu."* Za područje Maksimira (≈ 45,82° N, 16,02° E): 95-godišnji povratni period ~ 0,10–0,14 g; 475-godišnji ~ 0,22–0,28 g — **interne vrijednosti 0,126 / 0,251 g su unutar tih raspona i konzistentne**. **Tp = 225 g NIJE u službenom Nacionalnom dodatku** — to je dopunska karta prof. M. Heraka (PMF/HCPI), izvedena formulom ag(225) = ag(475)·(t475/t225)^(−1/k), k ∈ [1,5; 3,6]; za Zagreb daje ~ 0,16–0,20 g pa je interna vrijednost 0,180 g konzistentna. **Za nogometni projekt važan je Tp = 475 g (ULS) prema HRN EN 1998-1**; HRN EN 1998-3 traži tri razine samo za ocjenu postojećih građevina | HRN EN 1998-1:2011/NA:2011 (Dodatak B i C, izdaje HZN; karte na seizkarta.gfz.hr/hazmap); HCPI/Herak za 225-godišnji povratni period (hcpi.hr/pmf-i-seizmoloska-sluzba/karta-potresnih-podrucja-za-republiku-hrvatsku). **Vrijednosti TREBA potvrditi izravnim očitanjem u aplikaciji ili iz tiskanog Dodatka B/C HZN-a.** |
| 36 | Dubina temelja za zaštitu od mraza zona III, TMIN,50 = −20 °C: 0,7–0,8 m (HRN EN 1991-1-5/NA) | ⚠ Djelomično | HRN EN 1991-1-5/NA daje temperaturne karte; za kontinentalnu Hrvatsku (Zagreb) zona je III s TMIN,50 ≈ −18 do −20 °C. Standardna inženjerska praksa u Zagrebu je 0,80 m minimalne dubine temeljenja ispod razine terena; vrijednost u rasponu 0,7–0,8 m je konzervativna i prihvatljiva. Norma iza HZN paywalla, nije izravno citirana. | HRN EN 1991-1-5:2012/NA (HZN, plaćeni pristup) |
| **Reference održivosti — provjera samo brojki** | | | | |
| 37 | Johan Cruijff ArenA: 4 200 PV ploča / ~930 MWh/g / 8,6 MWh baterija (2024) | ✓ Potvrđeno | 4 200 ploča potvrđuje johancruijffarena.nl i pv-magazine; godišnja proizvodnja prema Arcadis: *„around 930,000 kilowatt hours of electricity each year, around 10% of the stadium's yearly electricity"* — kvalifikator „around" potječe iz primarnog izvora; baterija proširena s 3 MW / 2,8 MWh (2018., Nissan/Eaton) na ukupno **8,6 MWh tijekom kolovoza 2024.** (pv-magazine 12.8.2024., ess-news) | Arcadis (arcadis.com/en/improving-quality-of-life/johan-cruijff-arenas-solar-panel-array); pv-magazine.com (12.8.2024.); johancruijffarena.nl |
| 38 | RAMS Park Galatasaray: 4,3 MWp / ~10 500 ploča | 🆕 Ispraviti | **Guinness World Records (službena potvrda, rekord postavljen 22.3.2022.):** *„The most powerful solar power output from a sports stadium is the 4.2 MW generated by 10,404 solar panels on roof of the Ali Sami Yen Spor Kompleksi and was achieved by Galatasaray S.K. and Enerjisa Enerji (both Turkey) in Istanbul, Turkey on 22 March 2022."* Točne brojke: **10 404 ploča, 4,2 MW** (ne 4,3 MW, ne ~10 500); površina 16 700 m²; pokriva 63 % potrošnje | Guinness World Records (guinnessworldrecords.com); Daily Sabah; Enerjisa Enerji priopćenje (9.3.2021.) |
| 39 | Tottenham Hotspur Stadium grow-lights: 864 jedinice / 7 525 m² | ✓ Potvrđeno | Službeno klupsko priopćenje (10/2018): *„864 individual lights covering a total of 7,525 square metres"*; konstrukcija ~120 t; partneri SGL, SCX, Hewitt Sportsturf | tottenhamhotspur.com/news/2018/october/world-first-design-for-pitch-grow-lights-at-new-stadium; ESSMA |
| 40 | Brentford Community Stadium: −50 % armiranog betona, −33 % primarnog čelika + BREEAM Very Good | ✓ Potvrđeno | Arup: *„halved the amount of reinforced concrete used in construction versus the original scheme … reduced the amount of primary steel by a third … achieved a BREEAM Very Good sustainability rating"* | Arup (arup.com/projects/brentford-community-stadium); AFL Architects |
| **Kontradikcije za razrješenje** | | | | |
| 41 | UEFA 80 : 20 vs HR/atletika 70 : 30 — koja je stroža i mjerodavna | 🆕 Razrješenje | UEFA SIR 2025 Art. 19.02 sada traži **80 % muški + minimalno 25 % ženski (efektivno 75 : 25), 1 ž WC / 120 žena u domaćem sektoru, 1 ž WC / 80 žena u gostujućem sektoru** — strože od starog 80 : 20. World Athletics ne propisuje binarni omjer, ali traži adekvatnu opskrbu. Hrvatska praksa za atletske objekte koristi 70 : 30. **Mjerodavno za nogomet Cat. 4 je UEFA SIR 2025; za atletski događaj primijeniti 70 : 30 — projektirati prema STROŽEM scenariju, što daje ~70 : 30 i automatski zadovoljava obje norme** | UEFA SIR 2025, Art. 19.01–19.02; World Athletics Track and Field Facilities Manual 2024; hrvatska atletska projektantska praksa |
| 42 | UEFA Art. 24 — pristupačna mjesta bez postotka; NN 12/23 — 1 % za > 1 000 mj. — kompatibilno ili kumulativno? | 🆕 Ispravak: UEFA NAVODI postotak | **Interno izvješće je pogriješilo: UEFA SIR 2025 Art. 24.03 EKSPLICITNO definira udio**: *„The recommended proportion of wheelchair-user spaces for home supporters is 0.5% of the UEFA spectator capacity reserved for home supporters, and the minimum requirement is 0.1%."* Plus zasebna tablica za gostujuće (za kapacitet 30 001–40 000 = 15 mjesta za invalidska kolica). NN 12/23 Čl. 29. zahtijeva 1 % pristupačnih mjesta u gledalištu (širi pojam: i pratitelj, i ambulantne osobe). **Mjerodavan je hrvatski propis (stroži = 1 %) za ukupno pristupačnih mjesta; UNUTAR toga UEFA definira mjesta za invalidska kolica.** Praktično za 35 000 sjedala: 350 pristupačnih mjesta po NN 12/23, od kojih ~175 (0,5 %) za invalidska kolica domaćih + 15 za gostujuće | UEFA SIR 2025, Art. 24.01–24.03; NN 12/23, Čl. 29. st. 3. |

---

## A. Potvrđene tvrdnje
**Brojevi 1, 2, 3, 4, 5, 6, 7, 9, 12, 13, 14, 16, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 37, 39, 40** (ukupno 28) potvrđene su iz primarnih izvora bez ispravaka u sadržaju. Za #8 i #11 vrijednosti su iste, ali se mijenjaju brojevi članaka u izd. 2025.

## B. Tvrdnje koje treba ispraviti u internom izvješću
1. **Sve UEFA tvrdnje (#1–20)**: ažurirati referencu s „UEFA Stadium Infrastructure Regulations, Edition 2018" na „**UEFA Stadium Infrastructure Regulations, Edition 2025** (usvojeno 16.12.2024., na snazi 1.6.2025.)" + ažurirati brojeve članaka (npr. svlačionice/sanitarije → Art. 11/19, rasvjeta → Art. 16.01).
2. **#15 (TV kompaund)**: pristup vozilima ispraviti s „43 t" na „**> 40 t**" (Art. 36.02 b).
3. **#17 (sanitarije)**: ažurirati na *25 % minimum za žene*, **1 ž WC / 120 žena u domaćem sektoru, 1 ž WC / 80 žena u gostujućem sektoru** (umjesto starog 1/125).
4. **#18 (svlačionice momčadi Cat. 3/4)**: prepisati na **6 tuševa, 3 odvojena WC-a, 23 igrača + 7 osoba stručnog stožera (zaseban prostor 20 m²), 3 masažna stola (15 m²), spremište 5 m²**.
5. **#19 (sudačka svlačionica)**: 4 mjesta (ne 6); ostalo ostaje.
6. **#26 (4–6 h sunca)**: ukloniti pripisivanje FIFA-i — nije u primarnom FIFA dokumentu; navesti kao agronomsku konvenciju (STRI/SGL).
7. **#38 (RAMS Park)**: točne brojke **10 404 ploče, 4,2 MW** (Guinness World Records, 22.3.2022.) — ne 4,3 MW i ne ~10 500.
8. **#42 (kontradikcija pristupačnosti)**: prepisati uvodnu tezu — UEFA SIR 2025 Art. 24.03 ima eksplicitne postotke 0,5 % preporučeno / 0,1 % min za invalidska kolica domaćih + zasebnu tablicu za gostujuće; razrješenje je da se postotci spajaju (1 % po NN 12/23 ukupno, 0,5 % za invalidska kolica unutar toga).

## C. Promjene u standardima na koje treba paziti
1. **UEFA SIR Edition 2025** zamjenjuje izdanje 2018. (na snazi 1.6.2025.) — primarni izvor za licenciranje stadiona.
2. **FIFA Stadium Guidelines (digitalno izdanje 2022., izdano na inside.fifa.com)** zamjenjuju tiskanu „Football Stadiums – Technical Recommendations and Requirements, 5th ed. 2011". HNS koristi službeni naslov „FIFA FOOTBALL STADIUMS GUIDELINES 2022". Sadrže novo poglavlje o training grounds i ažurirane sustavne smjernice za održivost.
3. **UEFA Stadium Lighting Guide 2023** (zamjenjuje izdanje 2020.) sadrži Elite Level A i B specifikacije; treba ga pribaviti za rasvjetu iznad razine kat. 4 (CL/EURO finale).
4. **HRN EN 1998-1:2011/NA:2011/A2** je u javnoj raspravi do **20. lipnja 2026.** (potvrđeno HZN, repozitorij.hzn.hr, HZNacrti aplikacija); do donošenja vrijedi NA:2011/A1:2021 — provjeriti datum izrade glavnog projekta.
5. **Tehnički propis o pristupačnosti NN 12/23 stupio je na snagu 28.6.2025.** (potvrđeno mpgi.gov.hr: *„Ovaj Propis stupa na snagu 28. lipnja 2025. godine, sukladno Direktivi (EU) 2019/882"*); stari NN 78/13 vrijedio je do 27.6.2025.
6. **NN 71/25 Tehnički propis o akustici u zgradarstvu** — novi propis relevantan za multifunkcionalni stadion.

## D. Pitanja koja primarni izvori ne pokrivaju jasno (potrebne dodatne provjere)
1. **UEFA Stadium Lighting Guide 2023** — točne vrijednosti za Elite Level A (Eh/Ev) nisu bile dostupne; zatražiti od UEFA-e preko HNS-a.
2. **FIFA preporuka 4–6 h sunca/dan** — nije u FIFA primarnom dokumentu; treba ju ukloniti ili pripisati STRI/SGL agronomskim smjernicama.
3. **agR za Maksimir-točku 45,82 N / 16,02 E** — tri decimale nisu potvrđene iz online pregleda mapa; potrebno je: (a) izravno očitanje u aplikaciji seizkarta.gfz.hr ili (b) tiskani Dodatak B/C HZN-a.
4. **HRN EN 1991-1-5/NA dubina temelja** — norma je iza paywalla HZN-a; potvrditi iz teksta Geotehničke studije UNIZG-GF (svibanj–lipanj 2025., prilog natječaju, str. 50–51).
5. **HNS-ova specifična ograničenja za 1. HNL gostujuće sektore** — nije u Pravilniku o sigurnosti; vjerojatno u Pravilniku o licenciranju klubova; pribaviti od HNS-a.
6. **Hrvatski sanitarni omjer 70 : 30 za atletske objekte** — ne postoji izrijekom u jednom hrvatskom propisu; konvencija je iz World Athletics + lokalna praksa; u projektnoj dokumentaciji navesti oba zahtjeva i pokazati da projekt zadovoljava stroži.

---

## Preporuke (BLUF, stupnjevito)

**Stupanj 1 — Hitno (prije početka detaljnog projektiranja)**
1. **Ažurirati referentni okvir** internog izvješća na UEFA SIR Edition 2025 i FIFA Stadium Guidelines 2022. Bez toga je izvješće formalno zastarjelo i može biti razlogom za diskvalifikaciju natječajnog rada.
2. **Korigirati brojke iz točke B** (vozila > 40 t, 10 404 ploča / 4,2 MW za RAMS Park, sanitarni omjer 25 % minimum za žene s strožim ženskim ratiom).

**Stupanj 2 — Tijekom dorade idejnog rješenja**
3. **Sanitarije**: dimenzionirati prema STROŽEM od UEFA 2025 (1 ž WC / 80 ž u gostujućem sektoru) i hrvatske prakse 70 : 30. U praksi: ~70 : 30 zadovoljava obje, što daje cca **190 sjedećih WC-a + 140 pisoara za muškarce + 295 sjedećih WC-a za žene** za 35 000 sjedala (orijentacijski; potrebno detaljnije rasčlanjenje po sektorima).
4. **Svlačionice**: redizajnirati Cat. 3/4 svlačionicu momčadi s 6 tuševa + zasebnom prostorijom za stručni stožer (20 m², 7 mjesta) + 3 masažna stola — ključna nova obveza UEFA 2025.
5. **Pristupačnost**: planirati **350 pristupačnih mjesta** (1 % po NN 12/23), od kojih ~175 za invalidska kolica domaćih (0,5 % UEFA) + 15 za gostujuće, ostalo za pratitelje i ambulantne osobe.

**Stupanj 3 — Prije konačne predaje (do 17.7.2026.)**
6. **Seizmika**: **službeno potvrditi agR vrijednosti** izravnim očitanjem u aplikaciji PMF Geofizičkog odsjeka i naručiti tiskani Dodatak B/C HZN-a; do potvrde koristiti raspone (95 g: 0,10–0,14; 475 g: 0,22–0,28) umjesto pojedinačnih brojki. Provjeriti hoće li HRN EN 1998-1/NA/A2 (u javnoj raspravi do 20.6.2026.) stupiti na snagu prije predaje natječaja — jer može promijeniti seizmičke parametre.
7. **Rasvjeta**: nabaviti UEFA Stadium Lighting Guide 2023 preko HNS-a kako bi se dokumentirao Elite Level A potencijal (mogućnost CL/EURO finala) — značajna kvalitativna prednost u natječajnom prikazu.

**Pragovi koji bi promijenili preporuke**
- Ako natječajni žiri eksplicitno traži „izdanje 2018." (što je malo vjerojatno) — koristiti to izdanje, ali u prilogu priložiti komentar o novom izdanju 2025.
- Ako HRN EN 1998-1/NA/A2 stupi na snagu prije srpnja 2026. — koristiti nove vrijednosti agR iz amandmana, a ne iz aktualne karte 2011.

## Ograničenja izvora

- UEFA SIR 2025 dohvaćen je iz mirror PDF-a (jalgpall.ee, potvrđeno preko više zrcalnih kopija) jer se primarni dokument na documents.uefa.com prikazuje samo kroz JavaScript aplikaciju koja nije čitljiva kroz tekstualni dohvat — preuzeti PDF iz natjecanja HNS-a kao primarni dokaz.
- FIFA Stadium Guidelines 2022 strukturirano su kao web aplikacija na inside.fifa.com; pojedinačne sekcije (§ 2.2 Orientation, § 5.2 Seating) potvrđene su preko HNS referenci.
- FIFA Football Stadiums 5th ed. 2011 dostupan je samo preko PDF mirrora; primarni FIFA URL je gašen.
- agR vrijednosti za Maksimir nisu potvrđene s tri decimale iz interaktivne aplikacije — to zahtijeva izravnu sesiju s alatom seizkarta.gfz.hr ili tiskani Dodatak B/C HZN-a.
- HRN EN norme (1998-1/NA, 1991-1-5/NA) iza HZN paywalla nisu izravno potvrđene; konzultirana je dostupna stručna literatura i službene PMF/HCPI publikacije.
- UEFA Stadium Lighting Guide 2023 — pojedine sekcije (Elite Level A illuminance) dostupne su samo kroz JavaScript aplikaciju documents.uefa.com; točne brojke moraju se potvrditi izravno iz UEFA dokumenta.