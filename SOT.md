# SOT — Stadion Maksimir & SRC Svetice (Natječaj 2026.)

> **Single Source of Truth** za pripremu natječajnog rješenja.
> Sažetak činjenica, ključni rokovi, navigacija po istraživanju i konsolidirane strateške direktive.
>
> *Posljednje ažuriranje: 2026-05-26. Sadržaj se temelji na službenoj natječajnoj dokumentaciji (Uvjeti, Program, mirror `stadion-maksimir.zagreb.hr`) i 5 paralelnih deep-research izvještaja.*

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

| Datum | Događaj |
|---|---|
| **2026-03-20** | ✅ Početak natječaja (službena objava) |
| **2026-04-21** | Rok za stručna pitanja |
| **2026-07-17** | Rok predaje radova kroz EOJN |
| **2026-07-28** | Rok predaje **makete** izvan EOJN |
| **kraj 2026-07** | Odluka Ocjenjivačkog suda |
| **≥ 2026-09-15** | Javno predstavljanje i izložba |
| **2027.** (planirano) | Početak rušenja postojećeg stadiona |
| **2029.** (planirano) | Dovršetak novogradnje |
| **EURO 2032.** | Kandidatura HR + IT (UEFA odluka 2026./2027.) — vanjski rok-pritisak |

### Kriteriji ocjenjivanja (Uvjeti t. 2.3)

- **A.** Uspješnost u savladavanju prostorno-programskih uvjeta (težište: nogometni kompleks).
- **B.** Cjelovitost urbanističko-arhitektonske ideje (SRC Svetice + stadion).
- **C.** Mogućnost **ekonomičnog ostvarenja** u zadanom okviru.
- **D.** Doprinos vrsnoći građenja — javni prostori i **održivost / energetska učinkovitost**.

---

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

> Kompletna kontrolna lista: [`research/04-tehnicki-okvir.md` § Tehnička kontrolna lista](research/04-tehnicki-okvir.md#tehnička-kontrolna-lista-za-rješenje)

**Teren i geometrija (UEFA Cat 4 / FIFA):**
- Teren **105 × 68 m** točno; run-off ≥ 5 m; ukupni gabarit ≈ 125 × 85 m
- Slobodna visina ≥ **21 m** iznad terena
- Orijentacija osi ≈ N–S, max ±15° prema zapadu
- Sightline C-value ≥ 90 mm (optimum 120 mm); max viewing distance < 190 m

**Kapacitet i sjedala:**
- 35.000 individualnih sjedala, naslon ≥ 30 cm
- **5% (1.750) gostujući sektor** s vlastitim ulazom
- **1% (350) pristupačnih mjesta** (NN 12/23)
- Širina sjedala ≥ 47 cm; red-to-red ≥ 85 cm

**Rasvjeta:** 1.400 lux Eh / 1.000 lux Ev (Cat 4); za finala Elite A >2.000/1.500 lux; backup vraća 900 lux u ≤15 min.

**Mediji:** TV compound 1.000 m²; 10 komentatorskih, 60 media seats, 2 TV studija (5×5×2,5 m), glavna kamera 6×2 m.

**Sigurnost:** 1 turnstile / 660 sjedala ≈ 53; ≥ 4 evakuacijska pravca; REI-M 90; evakuacija ~8 min (Green Guide).

**Seizmika:** **agR = 0,251 g** (475 god., ULS prema HRN EN 1998-3) iz Geotehničkog elaborata. Zagreb 2020. potres mjerodavan. Duboko temeljenje (piloti) za masivne konstrukcije.

**Kontradikcija koju treba riješiti:** UEFA traži 80:20 m:ž omjer sanitarija, hrvatska praksa u Programu koristi 70:30 — projekt mora kombinirati strože.

---

## 6. Konkurencija (sažetak)

**Domaći (vjerojatni natjecatelji):** 3LHD · Produkcija 004 · Njirić+ (povratak nakon „Plavog vulkana" 2008.) · PROARCH (Mateković) · Sangrad+AVP · Penezić & Rogina.

**Regionalni favoriti:** **SADAR+VUGA (Ljubljana) — autori Stožica, tipološki najjača referenca**. OFIS Arhitekti, Dekleva Gregorič.

**Globalni potencijalni:** Herzog & de Meuron, Populous, AFL, GMP, HOK — vjerojatno u konzorcijima s domaćim uredima.

**Isključeni (članovi OS):** Studio UP (Plejić), Bevk Perović (Perović), NP2F (Chas), OFFICE KGDVS (Geers), Studio Fabijanić, Roth & Čerina, Bakić & Kulstrunk (zamjena, ali postojeći susjedni objekt na lokaciji — bazenski kompleks Svetice).

→ Detalj: [`research/05-mediji-politika.md` §5](research/05-mediji-politika.md)

---

## 7. Glavni rizici i otvorena pitanja

### Politički rizici
- Lokalni izbori u Zagrebu (proljeće 2026./2029.); promjena gradske vlasti.
- Parlamentarni izbori 2027./2028.; promjena državne vlasti.
- Konzervatorska struka (HRZ, Ministarstvo kulture) dosad medijski šuti — javit će se tek nakon natječaja, što može izmijeniti pobjedničko rješenje.
- Ekološke udruge (Zelena akcija, Sindikat biciklista) za sada šute — rizik tihog mobiliziranja.

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
(projekt, jezik, lokalni arhiv). Pri sljedećoj sesiji automatski se učitavaju u kontekst.
