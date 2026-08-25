# SOT — Stadion Maksimir & SRC Svetice (Natječaj 2026.)

> **Single Source of Truth** za pripremu natječajnog rješenja.
> Sažetak činjenica, ključni rokovi, navigacija po istraživanju, konsolidirane strateške direktive i ažuriranja iz nezavisne cross-check verifikacije.
>
> *Posljednje ažuriranje: **2026-08-25 (v3 — status nakon isteka rokova predaje)**. Sadržaj se temelji na službenoj natječajnoj dokumentaciji (Uvjeti, Program, mirror `stadion-maksimir.zagreb.hr`), 5 paralelnih deep-research izvještaja, 3 nezavisne Claude Desktop Research verifikacije (vidi `research/cross-check/SYNTHESIS.md`) i provjeri stanja natječaja od 2026-08-25 (vidi `research/06-status-natjecaja.md`).*

---

> ## ⚠️ STATUS NA DAN 2026-08-25
>
> **Natječaj je ZATVOREN. Rokovi predaje su prošli** — elektronička predaja 17.7.2026. u 18:00, makete 28.7.2026. u 18:00.
> **Ocjenjivački sud je u postupku ocjenjivanja. Rezultati NISU objavljeni.**
>
> Na dan 2026-08-25 nigdje nije objavljen ni **konačan broj pristiglih radova**, ni **nagrađeni radovi**, ni **imena autora / arhitektonskih ureda**. Natječaj je **anoniman**, pa se identiteti natjecatelja otvaraju tek uz objavu rezultata.
> Javno predstavljanje i izložba natječajnih radova planirani su **ne prije 15.9.2026.**
>
> **→ Detaljan status, provjereni izvori i popis za praćenje: [`research/06-status-natjecaja.md`](research/06-status-natjecaja.md).**
> **→ Kronologija svih novih objava od 27.5. do 25.8.2026.: [`research/07-kronologija-objava.md`](research/07-kronologija-objava.md).**
> Sve niže u ovom dokumentu (§ 4–8, ROADMAP, TODO) odnosi se na **pripremnu fazu koja je završena** i sada služi kao arhiva metodologije i kontrolnih brojki — ne kao aktivni plan.

---

## 1. Brzi pregled (jednostranica)

| | |
|---|---|
| **Predmet** | Međunarodni arhitektonsko-urbanistički natječaj za novi stadion Maksimir + SRC Svetice (Zagreb) |
| **Vrsta** | Otvoreni, jednostupanjski; **C = realizacija** (stadion), **A+D = anketni** (Svetice + Borongaj) |
| **Naručitelj** | Grad Zagreb + Vlada RH (50:50) |
| **Provoditelj** | Društvo arhitekata Zagreb (DAZ) — Ana Boljar, predsjednica |
| **Investicija** | ~204,225 mil. € (bez PDV-a) za zonu C; **~5.830 €/sjedalo** (niže od europskog prosjeka novogradnji top divizije ~15.000–20.000 €) |
| **Kapacitet** | **35.000 natkrivenih sjedećih mjesta**; UEFA Category 4 (Elite) |
| **Pravni okvir** | NN 154/2025 (Pravilnik o natječajima); EOJN tender **76778** |
| **Nagradni fond** | bruto **976.000 €** (5 nagrada; 1. = 390.400 € bruto) |

### Ključni datumi

| Datum | Događaj | Status (2026-08-25) |
|---|---|---|
| **2026-03-20** | Početak natječaja (službena objava) | ✅ prošlo |
| **2026-04-21** | Rok za stručna pitanja (~300 zaprimljenih upita) | ✅ prošlo |
| **2026-05-13** | Objavljeni odgovori na stručna pitanja na EOJN-u; **rok predaje pomaknut** s 24.6. na 17.7. | ✅ prošlo |
| **2026-07-17, 18:00** | Rok predaje radova kroz EOJN | ✅ **zatvoreno** |
| **2026-07-28, 18:00** | Rok predaje **makete** izvan EOJN (Av. Dubrovnik 15, soba 115) | ✅ **zatvoreno** |
| **kraj 2026-07 →** | Odluka Ocjenjivačkog suda | 🔄 **u tijeku, još nije objavljena** |
| **≥ 2026-09-15** | Javno predstavljanje rezultata i izložba natječajnih radova | 📅 čeka se |
| **2027.** (planirano) | Početak rušenja postojećeg stadiona (projekt uklanjanja: EURCO d.d. + RESPECT-ING d.o.o.) | 📅 |
| **2029.** (planirano) | Dovršetak novogradnje (Boban javno procjenjuje kraj 2030.) | 📅 |
| **EURO 2032.** | Kandidatura HR + IT (UEFA odluka 2026./2027.) — vanjski rok-pritisak | 📅 |

### Kriteriji ocjenjivanja (Uvjeti t. 2.3)

- **A.** Uspješnost u savladavanju prostorno-programskih uvjeta (težište: nogometni kompleks).
- **B.** Cjelovitost urbanističko-arhitektonske ideje (SRC Svetice + stadion).
- **C.** Mogućnost **ekonomičnog ostvarenja** u zadanom okviru.
- **D.** Doprinos vrsnoći građenja — javni prostori i **održivost / energetska učinkovitost**.

---

> **Operativno:** strategijski roadmap u [`ROADMAP.md`](ROADMAP.md) (mermaid Gantt, tok zavisnosti, swimlanes); granularni checklist u [`TODO.md`](TODO.md).

## 2. Sadržaj repozitorija (navigacija)

### Originalni izvori — `sources/`
- [`00-sazetak-cinjenica.md`](sources/00-sazetak-cinjenica.md) — sažetak natječaja iz uvodnih MD-ova
- [`uvjeti-natjecaja.md`](sources/uvjeti-natjecaja.md) — Uvjeti natječaja, 26 str. (puni tekst)
- [`program-natjecaja.md`](sources/program-natjecaja.md) — Natjecajni program, ~92 kB (puni tekst)
- [`extracted/`](sources/extracted/) — clean MD svih stranica i PDF-ova s `stadion-maksimir.zagreb.hr` (HR + EN)
- [`manifest.tsv`](sources/manifest.tsv) — mapiranje URL → lokalna putanja za sve dohvaćene resurse
- `_prompt-01..05` — izvorni deep-research promptovi (referenca)

Cijeli mirror stranice (HTML + PDF-ovi + slike, 193 MB) nalazi se izvan repoa:
`/Users/ms/Downloads/files-stadion/stadion-maksimir-arhiv/`
(`site/UserDocsImages/dokumenti/` — originalni PDF-ovi; `site/UserDocsImages/` — povijesne fotografije 1887.–2025., zone, portreti suda).

### Deep research izvještaji — `research/`
1. [`01-ocjenjivacki-sud.md`](research/01-ocjenjivacki-sud.md) — **Ukus i opus suda** (3.170 riječi)
2. [`02-referentni-stadioni.md`](research/02-referentni-stadioni.md) — **Benchmark 30–55k stadiona** (3.345 riječi)
3. [`03-lokacija-povijest.md`](research/03-lokacija-povijest.md) — **Lokacija, povijest, konzervatorski okvir** (2.870 riječi)
4. [`04-tehnicki-okvir.md`](research/04-tehnicki-okvir.md) — **UEFA Cat 4, FIFA, HR propisi, održivost** (5.214 riječi, sa kontrolnom listom)
5. [`05-mediji-politika.md`](research/05-mediji-politika.md) — **Javni narativ, kontroverze, konkurencija** (3.775 riječi)
6. **[`06-status-natjecaja.md`](research/06-status-natjecaja.md)** — **Živi log stanja nakon isteka rokova** (kronologija ožujak→kolovoz 2026., što je provjereno i gdje, popis za praćenje objave rezultata)
7. **[`07-kronologija-objava.md`](research/07-kronologija-objava.md)** — **Sve nove javne objave nakon zadnjeg commita** (27.5.→25.8.2026.), uklj. **HKIG-ov dopis gradonačelniku**

### Cross-check (Claude Desktop Research) — `research/cross-check/`
- [`SYNTHESIS.md`](research/cross-check/SYNTHESIS.md) — **Diff cross-checka protiv `01-05`** (28/42 podudaranja, 8 substantivnih tehničkih ispravaka, 4 konzervatorska ispravka, 18 novih strateških uvida)
- [`A-tehnicki-brojke-REPORT.md`](research/cross-check/A-tehnicki-brojke-REPORT.md) — verifikacija 42 tehničkih tvrdnji (otkriva UEFA SIR 2025 zamjenu, FIFA Guidelines 2022, sanitarije 75:25)
- [`B-plejic-perovic-REPORT.md`](research/cross-check/B-plejic-perovic-REPORT.md) — dublji profil predsjednika i dopredsjednika (otkriva Plejić = predsjednik UHA-e, Mies 2009 Perović-Plejić poveznicu, mono-volume citat)
- [`C-konzervatorski-REPORT.md`](research/cross-check/C-konzervatorski-REPORT.md) — operativni okvir (otkriva da je preventivna zaštita stadiona istekla, Z-1528 = 278,93 ha, manifest sjevernog ruba)

---

## 3. Ocjenjivački sud (sažetak)

**Arhitekti:** Toma Plejić — Studio UP (PREDSJEDNIK) · Vasa Perović — Bevk Perović (DOPREDSJEDNIK) · François Chas — NP2F · Kersten Geers — OFFICE KGDVS · Nenad Fabijanić · Mia Roth-Čerina.
**Zamjenici (arhitekti):** Vjera Bakić · Iva Hudan.
**Predstavnici:** Zvonimir Boban (HNS) · Tonči Glavina (Vlada/sport) · Tomislav Tomašević (Grad) · Luka Korlaet (Grad/arhitekt).

**Zajednički nazivnik:** suzdržanost preko spektakla, tipološka jasnoća, geometrijska disciplina, materijalna iskrenost (beton/kamen/drvo), krajobraz kao ravnopravan partner, javni prostor kao primarni proizvod, niskougljičnost. Pet od šest glavnih ima Mies van der Rohe povijest. **Eksplicitno anti-parametricizam, anti-LED-fasada, anti-„ikonički" spektakl.**

→ Puna analiza: [`research/01-ocjenjivacki-sud.md`](research/01-ocjenjivacki-sud.md)

---

## 4. Strateška sinteza (cross-cutting)

### Jedna velika ideja koja prolazi kroz sva 5 istraživanja

> **„Stadion u parku, ne nasuprot parku."**
> Topografska, polu-otvorena, niskougljična intervencija koja vraća Turinin manifest iz 1946. (otvoreno borilište okrenuto šumi), eliminira monolitnu sjevernu tribinu Filipović/Kincl iz 1990-ih, i tretira SRC Svetice + park kao **jedan sustav s 365-dnevnim životom**.

### Top 10 direktiva za koncept (konsolidirano iz 5 izvještaja)

1. **Sjeverna fasada kao konzervatorska gesta.** Porozna, niska prema parku. Eliminirati pretjerani gabarit Filipović/Kincl (1990-e). Vratiti vizuru prema šumi. *(03, 01, 04)*
2. **Topografija/landform kao prvi potez.** Zakopati servise u zelenu padinu (referenca: Bevk Perović Brdo; Sadar+Vuga Stožice). Stadionski volumen čita se kao reljefni element, ne objekt. *(01, 02, 03)*
3. **Kompaktan bowl bez atletske staze + jedna jednoslojna „domaća" tribina od 12–16k** za atmosferu (sjever, BBB). Atletika fizički u zonu A/Svetice (Program to već nalaže). Referenca: Tottenham South Stand (17.500 jednoslojnih), Dortmund Südtribüne, AS Roma Curva. *(02, 05)*
4. **Reverzibilni kapacitet 28k → 35k.** Gornji prsten kao otvoren/demontažan za male utakmice — Dinamo u 443 domaće utakmice imao 25.000+ samo 17 puta (3,84%). Argumenti spajaju Bobana, BBB-e, UEFA i ekonomiju u jedan narativ. *(05)*
5. **Otvoreno prizemlje + kontinuirani concourse 1. kata** kao gradski javni prostor (Bordeaux, Feyenoord, AS Roma). Brisanje granice između parka i borilišta. **Bez „zida prema Maksimirskoj cesti"**. *(02, 01)*
6. **„Lean structure":** –30% armiranog betona, –20% primarnog čelika (Brentford model). Niskougljični beton (CEM III, GGBS), lokalno hrastovo/jelovo glulam za sekundarnu konstrukciju, drveni krovni filteri. Eksplicitno kvantificirati ugljik u knjižici — Chas (NP2F) će to direktno tražiti. *(02, 04, 01)*
7. **Krov kao integrirana PV ploha** (cilj 3–5 MWp; referenca Johan Cruijff ArenA 930 MWh/god, RAMS Park 4,3 MWp). Otvoreni središnji oval iznad terena ili ETFE pojas za PAR. Hibridni travnjak + grow-lights infrastruktura od dana 1. *(04, 02)*
8. **Materijalna paleta s hrvatskim utemeljenjem** — kamen (Fabijanić!), eksponirani beton, drvo, polutransparentni metalni filtri. **Nikad LED-medijska fasada, nikad parametrička ovojnica.** *(01)*
9. **Tramvajska os Borongaj–stadion–park kao kralježnica.** Multimodalni hub Borongaj (zona D) preuzima ~70% dolaska; sjeverno okretište (kod parka) ostaje pješački/svečani ulaz. Parking podzemno ili u kontaktnoj zoni (čl. 65. iznimka GUP-a). *(03, 05)*
10. **Memorijalna ekonomija** — Sokolska svečana loža Dryaka (1934., preživjeli fragment) reinkorpoirana kao ulazni paviljon; „Bacač diska" Vanje Radauša (1957., Z-6940) ostaje na mikrolokaciji kao forum; spomen-obilježje BBB-ovima na dostojnoj novoj mikrolokaciji. *(03, 05)*

### Sedam stvari koje treba izbjegavati (sumirano)

- Parametricizam, „blob" geometrija, LED-medijske fasade tipa Allianz Arena.
- Atletska staza unutar nogometnog bowl-a (atletika ide u zonu A).
- Stajaća mjesta (zabranjeno UEFA Cat 2–4 i HNS pravilnikom).
- Privatizacija prizemlja u veliki shopping (Tomašević administracija to ne podržava).
- Imitacija povijesnog stadiona / nostalgična retro-arhitektura.
- Uvlačivi krov ili uvlačiv pitch (proračun ~5.830 €/sjedalo to ne podnosi).
- „Mega-parking" pred glavnim ulazom — pritisak na park je crvena linija.

---

## 5. Tvrde brojke koje crtež mora zadovoljiti

> **Referentni okvir (ažuriran):** **UEFA Stadium Infrastructure Regulations Edition 2025** (na snazi 1.6.2025., zamjenjuje 2018) + **FIFA Stadium Guidelines 2022** (digitalno, zamjenjuje 5th ed. 2011) + UEFA Stadium Lighting Guide 2023.
>
> Kompletna kontrolna lista u [`research/04-tehnicki-okvir.md` § Tehnička kontrolna lista](research/04-tehnicki-okvir.md#tehnička-kontrolna-lista-za-rješenje); ispravci iz cross-checka detaljno u [`research/cross-check/SYNTHESIS.md`](research/cross-check/SYNTHESIS.md) § A.

**Teren i geometrija (UEFA Cat 4 / FIFA):**
- Teren **105 × 68 m** točno; run-off ≥ 5 m; ukupni gabarit ≈ 125 × 85 m
- Slobodna visina ≥ **21 m** iznad terena (Art. 5.06)
- Orijentacija osi ≈ N–S, max ±15° prema zapadu
- Sightline C-value ≥ 90 mm (optimum 120 mm); max viewing distance < 190 m

**Kapacitet i sjedala:**
- 35.000 individualnih sjedala, naslon ≥ 30 cm
- **5% (1.750) gostujući sektor** s vlastitim ulazom (Art. 17.02)
- **350 pristupačnih mjesta** (1% NN 12/23) — od kojih ~175 za invalidska kolica domaćih (0,5% UEFA Art. 24.03 preporučeno; min 0,1%) + 15 za gostujuće (UEFA tablica za 30.001–40.000)
- Širina sjedala ≥ 47 cm; red-to-red ≥ 85 cm

**Svlačionice (UEFA SIR 2025 Cat. 3/4 — ažurirano):**
- Svlačionica momčadi: **6 tuševa, 3 odvojena WC-a**, 55 m² za 23 igrača **+ zasebna prostorija stručnog stožera 20 m² za 7 osoba**, **3 masažna stola** (15 m²), spremište 5 m² (Art. 11.01)
- Svlačionica sudaca: ≥ 20 m², 2 tuša, 1 WC, **4 mjesta** (Art. 11.02), opcionalno dodatna mala za mješoviti sudački tim

**Rasvjeta:** 1.400 lux Eh / 1.000 lux Ev (Cat 4, Art. 16.01); za finala Elite A >2.000/1.500 lux (UEFA Lighting Guide 2023); backup vraća 900 lux u ≤15 min (Art. 16.03).

**Sanitarije (UEFA SIR 2025 — ažurirano):** min **25% za žene** (efektivno 75:25); 1 sjedeći WC + umivaonik / 250 m; 1 pisoar / 125 m; **1 sjedeći WC / 120 žena u domaćem sektoru; 1 / 80 žena u gostujućem sektoru** (Art. 19.01–02). *Hrvatska atletska praksa 70:30 — projektirati prema strožem od dva (~70:30 zadovoljava obje norme).*

**Mediji:** TV compound 1.000 m², pristup **vozilima > 40 t** (ne 43 t); 10 komentatorskih, 60 media seats, 2 TV studija (5×5×2,5 m), glavna kamera 6×2 m, press konferencija 50 mjesta + 8 kamera.

**Sigurnost:** 1 turnstile / 660 sjedala ≈ 53 (Art. 21.06); ≥ 4 evakuacijska pravca (NN 29/13 čl. 31); REI-M 90 (čl. 8); evakuacija ~8 min (Green Guide).

**Seizmika:** **agR = 0,251 g** (475 god., ULS prema HRN EN 1998-1) iz Geotehničkog elaborata. **Vrijednost je unutar očekivanog raspona (0,22–0,28 g) ali tri decimale treba potvrditi izravno** u seizkarta.gfz.hr ili tiskanom HZN Dodatku B/C prije predaje. Zagreb 2020. potres mjerodavan. Duboko temeljenje (piloti) za masivne konstrukcije.

**⚠ Standardi u prijelazu — paziti pred predaju:**
- **HRN EN 1998-1:2011/NA:2011/A2** je u javnoj raspravi do **20.6.2026.** — ako stupi na snagu prije 17.7.2026. (rok predaje), koristiti nove seizmičke parametre.
- **Tehnički propis o pristupačnosti NN 12/23** stupio na snagu **28.6.2025.** (zamjenjuje NN 78/13).
- **NN 71/25 Tehnički propis o akustici u zgradarstvu** — novi propis 2025., relevantan za multifunkcionalnost stadiona.

**Energetske reference (potvrđeno):**
- Johan Cruijff ArenA: **4.200 PV ploča, ~930 MWh/god, 8,6 MWh baterija** (kolovoz 2024.)
- RAMS Park (Galatasaray): **10.404 ploča, 4,2 MWp** (ne 4,3) — Guinness World Records, 22.3.2022.
- Tottenham grow-lights: 864 jedinice, 7.525 m²
- Brentford Community Stadium: −50% armiranog betona, −33% primarnog čelika, BREEAM Very Good

---

## 6. Konkurencija (sažetak)

**Domaći (vjerojatni natjecatelji):** 3LHD · Produkcija 004 · Njirić+ (povratak nakon „Plavog vulkana" 2008.) · PROARCH (Mateković) · Sangrad+AVP · Penezić & Rogina.

**Regionalni favoriti:** **SADAR+VUGA (Ljubljana) — autori Stožica, tipološki najjača referenca**. OFIS Arhitekti, Dekleva Gregorič.

**Globalni potencijalni:** Herzog & de Meuron, Populous, AFL, GMP, HOK — vjerojatno u konzorcijima s domaćim uredima.

**Isključeni (članovi OS):** Studio UP (Plejić), Bevk Perović (Perović), NP2F (Chas), OFFICE KGDVS (Geers), Studio Fabijanić, Roth & Čerina, Bakić & Kulstrunk (zamjena, ali postojeći susjedni objekt na lokaciji — bazenski kompleks Svetice).

→ Detalj: [`research/05-mediji-politika.md` §5](research/05-mediji-politika.md)

---

## 7. Glavni rizici i otvorena pitanja

### Postupovni rizik — HKIG (novo, 17.7.2026.)

**Hrvatska komora inženjera građevinarstva uputila je dopis gradonačelniku Tomaševiću** tvrdeći da za ovako složenu građevinu **„nije bilo uporišta u važećim propisima" za raspisivanje arhitektonsko-urbanističkog (umjesto projektnog) natječaja**, te da sastav OS-a „u kojem su pretežito zastupljeni arhitekti" ne jamči valorizaciju sigurnosti i nosive konstrukcije. Upozorava da izostanak konstruktivne analize u idejnoj fazi može **„ugroziti legalnost natječajnog rješenja"** i bitno povećati troškove.

Presedan: nakon istog tipa upozorenja Grad Zagreb je za **Jarunski most** proveo **projektni** natječaj. Do 2026-08-25 nema javnog odgovora Grada, DAZ-a ni UHA-e. Detalji i izvori: [`research/07-kronologija-objava.md` § 3](research/07-kronologija-objava.md).

### Politički rizici
- Lokalni izbori u Zagrebu (proljeće 2026./2029.); promjena gradske vlasti.
- Parlamentarni izbori 2027./2028.; promjena državne vlasti.
- Konzervatorska struka (HRZ, Ministarstvo kulture) dosad medijski šuti — javit će se tek nakon natječaja, što može izmijeniti pobjedničko rješenje.
- Ekološke udruge (Zelena akcija, Sindikat biciklista) za sada šute — rizik tihog mobiliziranja.

### Pragovi koji mijenjaju strategiju (iz cross-checka)
- **Ako MKM proglasi trajnu zaštitu stadiona Maksimir** tijekom 2026./2027. (po uzoru na Poljud Z-6644 iz 2015.) → rušenje pravno blokirano, vratiti se modelu konzervatorske rekonstrukcije zapadne tribine Turina.
- **Ako Z-1530 (Železnička kolonija) dobije širu kontaktnu zonu** → južna fasada se mora reducirati (preporuka: P+2 max).
- **Ako JU "Maksimir — Priroda Grada Zagreba" izda negativno mišljenje o utjecaju na SPA** → koncesijsko odobrenje neće biti dano i postupak će biti obustavljen.
- **Ako HRN EN 1998-1/NA/A2 stupi na snagu prije 17.7.2026.** → koristiti nove seizmičke parametre, ne aktualne karte 2011.

### Operativni rizici
- **Gdje Dinamo i reprezentacija igraju 2027.–2029.?** Otvoreno — Kranjčevićeva (rekonstrukcija u tijeku), Rujevica, Opus Arena, Aldo Drosina.
- Rast cijena građenja (204 mil. € je već procjena na dan objave).
- Trošak SRC Svetice (atletski stadion, dvorane) **nije uključen** u 204 mil. € — nepoznati daljnji javni trošak.

### Otvorena dokumentacija (treba ručno preuzeti)
- **Kompletna dokumentacija o nabavi** (geodetske/katastarske podloge, DWG prilozi, obrasci) je na **EOJN RH https://eojn.hr/tender-eo/76778** — zahtijeva registraciju/prijavu i blokira automatsko preuzimanje (robots.txt).

### Praznine u istraživanju (pratiti)
- Jutarnji/Večernji (paywall) — politička nijansiranija percepcija.
- Arhitektura.hr / Oris / ČIP — kritička struka recepcija stiže nakon rujna 2026.
- Detaljni Bobanovi intervjui o Maksimiru (HNS arhive).
- Direktan kontakt s DAZ-om (Ana Boljar) — za konkretne natjecateljske interese.

---

## 8. Predaja — tehnički uvjeti (Uvjeti t. 3.1)

- Predaja **dijelom kroz EOJN RH** (grafički + tekstualni prilozi, autorska prava, dokazi stručnosti) i **dijelom izvan EOJN RH** (obvezna **maketa**).
- **Anonimnost:** datoteke bez imena/oznaka koje upućuju na identitet; EOJN automatski šifrira.
- **Plakati:** svaki plakat zaseban *.pdf, max 100 MB.
- **Knjižica:** jedinstveni *.pdf (sve stranice), max 100 MB.
- Svaki natjecatelj sudjeluje **samo s jednim** rješenjem.

---

## 9. Memorije (long-term context)

Persistentne bilješke ovog projekta nalaze se u
`~/.claude/projects/-Users-ms-git-stadion-maksimir-stadion-maksimir-natjecaj-2026/memory/`
(projekt, jezik, lokalni arhiv, ključni ispravci iz cross-checka). Pri sljedećoj sesiji automatski se učitavaju u kontekst.

---

## 10. Cross-check ažuriranja (nakon Desktop Research, svibanj 2026.)

> Tri nezavisne Claude Desktop Research verifikacije proizvele su ispravke i nove uvide koji ovdje konsolidirano stoje. Puni diff: [`research/cross-check/SYNTHESIS.md`](research/cross-check/SYNTHESIS.md).

### 10.1 Tri citatne kotve za tekst obrazloženja

Eksplicitno (preformulirano vlastitim riječima, ne kao prepisivanje) iskoristiti u opisu rješenja:

1. **Mono-volumen** — Toma Plejić u *Journal of Architectural Education* 75/1, 2021.: *„We made a mistake, a productive mistake, by combining the gymnasium and sport hall into one mono-volume."* Direktan poziv da se stadion + trenažni + servisni programi tretiraju kao jedan koherentan dijagram.
2. **Conditionalism** — Vasa Perović u *El Croquis* 160, 2012.: *„All we find are conditions."* Projekt kao odgovor na uvjete (park, propisi, klima, seizmika, ekonomija), ne kao stilska gesta.
3. **Dublji slojevi preko vizualnog efekta** — Plejić-Pelivan u najavi Oris predavanja "ZONAR / STELLAR" (13.4.2026.) + Perović u "Much Ado About Nothing" (aut. Innsbruck, 25.1.2024.): anti-spektakularna programska kotva.

**Dodatna težina kompasa para Plejić-Perović:** Mies van der Rohe Award 2009. — Perović je bio u žiriju koji je dao **Studio UP-u Specijalno priznanje** za Gimnaziju u Koprivnici. Dokumentirana profesionalna naklonost, i to *upravo za sportsku tipologiju*. **Toma Plejić je i trenutni predsjednik UHA-e** — institucionalni potpisnik cijelog DAZ/UHA ciklusa.

### 10.2 Manifest sjevernog ruba (7+1 konkretnih ograničenja)

Iz cross-check C (operativni konzervatorski okvir). Implementirati eksplicitno kao formalni dio idejnog rješenja (presjeci s kotama, vizurni koridori, opis u knjižici):

1. **Visina sjeverne fasade ≤ prosjek krošnje stoljetnih hrastova lužnjaka** na južnom rubu Z-1528 (mjereno na liniji Maksimirske ceste). Sadašnja sjeverna tribina Filipović/Kincl krši taj kriterij — rušenje i niža, porozna nova tribina je minimalna konzervatorska gesta.
2. **Servisni sadržaji i parking ukopani ili pokriveni ozelenjenim padom prema parku** (Stožice "stadion-krater" model).
3. **Sjeverna fasada porozna**, omjer prozirno : zatvoreno ≥ **60 %**; isključiti reflektirajuće ostakljenje prema parku zbog avifaune Z-1528 (113 zabilježenih vrsta, 55 se gnijezdi — Janev Hutinec, JU Maksimir).
4. **Regulacijska linija prema Maksimirskoj cesti** — povući od one iz 1998. (koja je tribinu postavila praktički na nogostup); minimalni odmak za drvored / linearni park.
5. **Materijalnost**: dominacija beton/drvo/zelenilo; isključiti kompozitne aluminijske obloge sjajne boje; krov u prirodnim tonovima neisticavim u panoramskoj vizuri sa Sljemena.
6. **Obvezna dendrološka studija** prije rušenja; korijenske zone stabala u pojasu 10 m od fasade ne smiju biti pogođene iskopima (Plan upravljanja SPA Maksimir 2022./2024.).
7. **Bacač diska + Sokolska svečana loža Dryaka (1934.)** ostaju in situ na mikrolokaciji; zaseban konzervatorski elaborat za parterno uređenje uz križanje Maksimirske i Svetica (čl. 44. ZZOKD).
8. **Vizurni koridor istok–zapad** preko stadiona prema istočnim dijelovima grada — pobjedničko rješenje treba eksplicitno otvoriti "velika vrata" na osi glavnog ulaza u park.

### 10.3 Imenovani konzervatorski akteri (potencijalni javni komentatori)

| Tko | Pozicija | Kontakt / adresa |
|---|---|---|
| **Eva Radolović** | Pročelnica KO Zagreb (MKM) — *operativno najvažnija osoba* (izdaje posebne uvjete za Z-1528, Z-1530, Z-6940) | Runjaninova 2; tel. 01 4866 609; ured.zagreb.grad@min-kulture.hr |
| **Mr. sc. Lana Križaj** | Pročelnica Gradskog ureda za kulturnu baštinu i prirodu (imenovana 2022. od Tomaševića) | Kuševićeva 2/II |
| **Krešimir Galović** | Povjesničar arhitekture; autor kanonskog teksta "Stadion nad Zagrebom" (Vijenac 176, 2000.) | Matica hrvatska |
| **Krešimir Ivaniš** | Sportski arhitekt (Rijeka); kritičar mjerila i materijalnosti (Kantrida 2023.) | — |
| **Igor Maraković / HRZ** | Služba za baštinu 20. stoljeća — adresat za pitanja konzerviranja Turininih fragmenata | Hrvatski restauratorski zavod |

Sekundarno u javnoj raspravi: **Maroje Mrduljaš** (Oris/ČIP), **Saša Begović** (3LHD/DAZ), **dr. Biljana Janev Hutinec** (JU Maksimir, ornitologinja).

### 10.4 Hitne akcije (svibanj–lipanj 2026.)

1. **Tri paralelna zahtjeva za pristup informacijama** prema Zakonu o pravu na pristup informacijama:
   - (a) **MKM / KO Zagreb** (Runjaninova 2) — preslika rješenja Z-1528, Z-1530, Z-6940 + status preventivne zaštite stadiona iz 1985./1988. (potvrditi je li dosje zatvoren).
   - (b) **Gradski ured za kulturnu baštinu i prirodu** (Kuševićeva 2/II) — mapa kontaktnih zona Z-1528 i Z-1530.
   - (c) **JU "Maksimir — Priroda Grada Zagreba"** (Maksimirski perivoj 1) — stav o intervenciji na južnom rubu SPA + Plan upravljanja 2024. (cijeli) + dendrološka studija stoljetnih hrastova.
2. **Ažurirati referentni okvir** u tekstu — UEFA SIR Edition 2025, FIFA Stadium Guidelines 2022, UEFA Stadium Lighting Guide 2023.
3. **Korigirati 8 substantivnih brojki** iz cross-check A (sanitarije 75:25 + 1/120 + 1/80, svlačionica momčadi 6 tuševa + 20 m² stručni stožer, sudac 4 mjesta, TV vozila > 40 t, RAMS Park 4,2 MWp / 10.404 ploča, atribucija osunčanja agronomskoj konvenciji, pristupačnost s eksplicitnim UEFA Art. 24.03 postocima).
4. **Citiranje "pragmatic dreamers"** — koristiti oprezno, atribuirati novinarskom portretu (Klobučar Srbić, dblog.hr), ne kao direktnu izjavu Plejić-Pelivan.
5. **Autorstvo Sportskog centra NZS Brdo** — provjeriti podjelu Bevk Perović vs. ARK Arhitektura Krušec prije citiranja kao Perovićev presedan.

### 10.5 Otvorena pitanja (ostaju nakon cross-checka)

- **UEFA Stadium Lighting Guide 2023** — točne brojke za Elite Level A (Eh/Ev) iza JS-aplikacije documents.uefa.com; pribaviti preko HNS-a.
- **Izravno očitanje agR** u aplikaciji seizkarta.gfz.hr — pristup nije moguć preko teksta; treba interaktivna sesija ili tiskani Dodatak B/C HZN-a.
- **Z-6940 (Bacač diska)** — registracijski broj nije neovisno potvrđen u javnim NN izvodima; tražiti pisanu potvrdu KO Zagreb.
- **Sokolska svečana loža (1934.)** — nije pronađena kao samostalan upis u Registru; pisana potvrda KO Zagreb.
- **HRN EN 1998-1/NA/A2** — pratiti ishod javne rasprave do 20.6.2026.

---

## 11. Status nakon predaje (ažurirano 2026-08-25)

> Puni log s izvorima i checklistom za praćenje: [`research/06-status-natjecaja.md`](research/06-status-natjecaja.md).

### 11.1 Gdje je natječaj sada

Natječaj je **završen i zatvoren**. Elektronička predaja kroz EOJN RH zatvorena je **17.7.2026. u 18:00**, predaja maketa **28.7.2026. u 18:00**. Ocjenjivački sud je nakon toga započeo pregled i ocjenjivanje pristiglih prijedloga.

**Rezultati nisu objavljeni.** Provjereno 2026-08-25 na svim relevantnim kanalima:

| Kanal | Nalaz |
|---|---|
| Službena stranica — vijesti | Zadnja objava i dalje *„Obavijest natjecateljima – upute za predaju kroz EOJN RH"*. Nema rezultata. |
| Službena stranica — tijek događanja | Jedini upisani događaj i dalje **20.03.2026. Objava natječaja**. |
| DAZ — vijesti | Zadnja objava 27.7.2026.; zadnja o Maksimiru je podsjetnik na rok od 6.7.2026. |
| DAZ — arhiva rezultata natječaja | **Maksimir se ne pojavljuje.** |
| EOJN 76778 / TED | Postoji samo izvorna obavijest o natječaju (TED 4093-2026). Nema obavijesti o ishodu. |
| Mediji (HR + EN) | Najsvježije: construction.hr — *„Završen međunarodni natječaj… slijedi ocjenjivanje pristiglih radova"*, uz izričitu napomenu da **ni konačan broj zaprimljenih radova još nije objavljen**. |

### 11.2 Zašto se ne zna tko je predao

Natječaj je **međunarodni, otvoreni, anoniman i jednostupanjski**. Radovi se predaju pod šifrom, a izjava o autorstvu se u EOJN-u otvara tek nakon rangiranja. **Popis natjecatelja i njihovih ureda po definiciji ne postoji javno prije objave rezultata** — to nije informacija koja se „negdje propustila", nego je zaključana pravilima postupka. Isto vrijedi i za ukupan broj radova: construction.hr izrijekom navodi da se objavljuje nakon administrativne provjere svih prijava.

### 11.3 Što postaje javno u trenutku objave

- ukupan broj pristiglih radova,
- rangiranje i **5 nagrađenih** (390.400 / 244.000 / 146.400 / 117.120 / 78.080 € bruto),
- **imena autora i arhitektonskih ureda**,
- **Zapisnik o radu ocjenjivačkog suda** s obrazloženjima po radu — dokument s najvećom analitičkom vrijednošću (pokazuje kako su kriteriji A–D stvarno primijenjeni),
- izložba natječajnih radova (**≥ 15.9.2026.**) — jedina prilika da se vide i nenagrađeni radovi.

S autorom prvonagrađenog rada ugovara se izrada idejnog, glavnog i izvedbenog projekta.

### 11.4 Prioritet praćenja (rujan 2026.)

1. `stadion-maksimir.zagreb.hr/hr/vijesti-34/34` — prva instanca objave
2. `d-a-z.hr/hr/natjecaji/rezultati/` — ovdje ide Zapisnik OS-a + vizuali nagrađenih
3. `eojn.hr/tender-eo/76778` — formalna obavijest o ishodu
4. `zagreb.hr` priopćenja — politička komunikacija rezultata
5. Datum, mjesto i trajanje izložbe

### 11.5 Kontekst koji se pomaknuo izvan natječaja

- **Projekt uklanjanja stadiona** deblokiran nakon što je DKOM 2.2.2026. odbio žalbu tvrtke Smagra; posao potvrđen zajednici **EURCO d.d. + RESPECT-ING d.o.o.** (22.222,22 € pri procijenjenih 100.000 €). Rušenje i dalje najavljeno za **2027.**
- **Kranjčevićeva** (privremeni dom Dinama) — rekonstrukcija u tijeku, dovršetak najavljen za **kraj 2026.**; preduvjet za rušenje Maksimira.
- **Rok dovršetka** — službeno 2029., Boban javno procjenjuje **kraj 2030.**
