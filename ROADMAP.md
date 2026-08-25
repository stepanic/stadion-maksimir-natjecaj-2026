# Roadmap — od SoT-a (26.5.2026.) do predaje (17.–28.7.2026.)

> ## 🔒 ARHIVIRANO — rokovi su prošli (status 2026-08-25)
>
> **Ovaj roadmap je izvršen do kraja svog horizonta. Rokovi predaje su prošli: EOJN 17.7.2026. u 18:00, maketa 28.7.2026. u 18:00.**
> Faze 0–4 nisu više aktivan plan; ostaju kao **arhiva metodologije** (raspored, kritični put, rizici) primjenjiva na sljedeći natječaj sličnog opsega.
> **Aktivna je jedino Faza 5 — praćenje objave rezultata**, ispod ažurirana. Status i checklist praćenja: [`research/06-status-natjecaja.md`](research/06-status-natjecaja.md), sažetak u [`SOT.md` § 11](SOT.md#11-status-nakon-predaje-ažurirano-2026-08-25).

> Strategijski pregled. Operativna checklist-verzija u [`TODO.md`](TODO.md). Sav sadržaj se naslanja na [`SOT.md`](SOT.md) i [`research/`](research/).

## Sažetak vremena

*Tablica prikazuje stanje na dan pisanja roadmapa (2026-05-26); desni stupac je naknadni ishod.*

| | | Ishod (2026-08-25) |
|---|---|---|
| **Danas (u trenutku pisanja)** | **2026-05-26** | — |
| **Rok EOJN (grafika + tekst)** | 2026-07-17 → **52 dana** | ✅ prošlo, zatvoreno u 18:00 |
| **Rok makete (izvan EOJN-a)** | 2026-07-28 → **63 dana** | ✅ prošlo, zatvoreno u 18:00 |
| **Očekivana odluka OS-a** | kraj 7/2026 | 🔄 ocjenjivanje u tijeku, odluka **još nije objavljena** |
| **Javno predstavljanje** | ≥ 2026-09-15 | 📅 čeka se |

Tijesno ali izvedivo — SoT je gotov, sad je sve operativa. **Kritični put su plakati, knjižica, anonimnost i fizička maketa.**

---

## Mermaid 1 — Gantt timeline

```mermaid
gantt
    title Stadion Maksimir — natječajna prijava (predaja 17.–28.7.2026.)
    dateFormat YYYY-MM-DD
    axisFormat %d.%m
    todayMarker on

    section Faza 0 — Setup
    SoT i istraživanje (gotovo)         :done, p0a, 2026-05-20, 2026-05-26
    EOJN registracija + DWG preuzimanje :crit, p0b, 2026-05-27, 4d
    FOI zahtjevi (MKM, GU KBP, JU)      :p0c, 2026-05-27, 3d
    Formacija konzorcija / sukob int.   :crit, p0d, 2026-05-27, 7d

    section Faza 1 — Koncept
    Big idea, site analysis             :p1a, 2026-06-03, 7d
    Sun + vizurne studije               :p1b, 2026-06-05, 5d
    Mass studije 3-5 alternativa        :p1c, 2026-06-07, 7d
    Interni izbor finalne alternative   :milestone, m1, 2026-06-15, 0d

    section Faza 2 — Design Development
    Bowl geometry + sightlines          :p2a, 2026-06-16, 10d
    Tlocrti / presjeci / fasade         :crit, p2b, 2026-06-16, 19d
    Konstrukcija + lean structure       :p2c, 2026-06-18, 14d
    Manifest sjevernog ruba (7+1)       :p2d, 2026-06-18, 10d
    Održivost + PV + travnjak           :p2e, 2026-06-22, 12d
    Program + multifunkcionalnost       :p2f, 2026-06-22, 12d
    Prometno rješenje + parking         :p2g, 2026-06-25, 8d
    Anketni dio A+D (Svetice/Borongaj)  :p2h, 2026-06-25, 10d

    section Faza 3 — Dokumentacija
    Plakati 5× PDF (≤100 MB)            :crit, p3a, 2026-07-01, 13d
    Knjižica PDF (≤100 MB)              :crit, p3b, 2026-07-03, 12d
    Tekst obrazloženja                  :p3c, 2026-07-05, 8d
    Tehnička kontrolna lista verifik.   :p3d, 2026-07-08, 4d
    Procjena troška ~5830€/sjedalo      :p3e, 2026-07-08, 5d

    section Maketa (paralelno)
    Izvođač/dobavljač makete            :crit, m1a, 2026-06-15, 5d
    Izrada makete                       :crit, m1b, 2026-06-22, 32d
    Predaja makete                      :milestone, m2, 2026-07-28, 0d

    section Faza 4 — Predaja
    T-2 interna prezentacija            :p4a, 2026-07-15, 1d
    Anonimnost — provjera               :crit, p4b, 2026-07-16, 1d
    EOJN upload                         :milestone, m3, 2026-07-17, 0d

    section Faza 5 — Post
    Odluka OS                           :milestone, m4, 2026-07-31, 0d
    Javna izložba                       :p5a, 2026-09-15, 14d
```

---

## Mermaid 2 — Tok zavisnosti

```mermaid
flowchart TD
    A[SoT spreman<br/>26.5.2026.] --> B0[FOI 3 zahtjeva]
    A --> B1[EOJN registracija + DWG]
    A --> B2[Team / konzorcij]

    B0 --> C[Konzervatorska podloga<br/>+ manifest 7+1]
    B1 --> D[Geodetska / katastarska podloga]
    B2 --> E[Provjera sukoba interesa s OS]

    C --> F{KONCEPT<br/>big idea u 1 rečenici}
    D --> F
    E --> F

    F --> G1[Bowl + sightlines]
    F --> G2[Tlocrti/presjeci/fasade]
    F --> G3[Konstrukcija + održivost]
    F --> G4[Program + tokovi]
    F --> G5[Sjeverni rub — manifest]
    F --> H[Maketa<br/>start 22.6.]

    G1 --> I[Plakati 5×]
    G2 --> I
    G3 --> I
    G4 --> I
    G5 --> I

    G1 --> J[Knjižica]
    G2 --> J
    G3 --> J
    G4 --> J
    G5 --> J

    I --> K[Tekst obrazloženja]
    J --> K

    K --> L[Anonimnost check]
    I --> L
    J --> L

    L --> M(((EOJN upload<br/>17.7.2026.)))
    H --> N(((Predaja makete<br/>28.7.2026.)))

    M --> O[Odluka OS<br/>kraj 7/2026]
    N --> O
    O --> P[Javna izložba<br/>≥ 15.9.2026.]

    style F fill:#fff3cd,stroke:#856404,stroke-width:3px
    style M fill:#d1ecf1,stroke:#0c5460,stroke-width:3px
    style N fill:#d1ecf1,stroke:#0c5460,stroke-width:3px
    style O fill:#d4edda,stroke:#155724,stroke-width:3px
```

---

## Mermaid 3 — Stablo predaje (što fizički mora postojati)

```mermaid
mindmap
  root((Predaja<br/>17.+28.7.))
    EOJN do 17.7.
      Grafički prilozi
        Plakat 1: Urban + masterplan
        Plakat 2: Tlocrti
        Plakat 3: Presjeci + fasade
        Plakat 4: Konstrukcija + održivost
        Plakat 5: Atmosfera + materijal
      Knjižica jedinstveni PDF
        Koncept i obrazloženje
        Tlocrti smanjeni
        Tehnička kontrolna lista
        Energetska bilanca
        Manifest sjevernog ruba
        Procjena troška
      Pravni i administrativni
        Autorska prava obrazac
        Dokazi stručnosti
        Anonimnost potvrđena
    Izvan EOJN do 28.7.
      Maketa fizička
        Stadion
        SRC Svetice kontekst
        Park Maksimir kontekst
        Borongaj kontekst
```

---

## Mermaid 4 — Kritični put i swimlanes

```mermaid
flowchart LR
    subgraph Arhitekt
      A1[Koncept] --> A2[DD plans] --> A3[DD sections] --> A4[Plakati] --> A5[EOJN]
    end
    subgraph Statičar
      S1[Konstr. strategija] --> S2[Lean structure] --> S3[Krov] --> S4[Spec. kontr.]
    end
    subgraph Održivost
      H1[PV layout] --> H2[Travnjak/krov] --> H3[BREEAM target]
    end
    subgraph Krajobraz
      K1[Manifest 7+1] --> K2[Dendrologija] --> K3[SRC Svetice anketni]
    end
    subgraph Promet
      P1[Tramvaj Borongaj] --> P2[Pješak/bicikl] --> P3[Garaža]
    end
    subgraph Makete
      M1[Izvođač] --> M2[Izrada 5 tjedana] --> M3[Predaja]
    end
    subgraph Pravno
      R1[FOI] --> R2[EOJN reg] --> R3[Autorska prava] --> R4[Anonimnost]
    end

    A2 -.podaci.-> S1
    A2 -.podaci.-> H1
    A2 -.podaci.-> K2
    A2 -.podaci.-> P1
    A2 -.podaci.-> M1
    S4 -.unos.-> A4
    H3 -.unos.-> A4
    K2 -.unos.-> A4
    P3 -.unos.-> A4
    A5 ==> X(((PREDAJA)))
    M3 ==> X
    R4 -.uvjet.-> A5
```

---

## Faze — kratak opis

### Faza 0 — Operacije i podloge (2026-05-27 → 2026-06-02)
**Cilj:** maknuti sve administrativno i pribavljanje podataka prije nego što počne kreativni rad.

**Ključni isporučiteljnji:**
- EOJN pristup + svi DWG/geodetski prilozi
- 3 FOI zahtjeva poslana (MKM/KO Zagreb, GU KBP, JU Maksimir)
- Konzorcij definiran, ugovori potpisani, sukob interesa s OS provjeren
- Datum kick-off radionice

### Faza 1 — Koncept (2026-06-03 → 2026-06-15)
**Cilj:** jedna velika ideja koja se može izreći u jednoj rečenici, kalibrirana prema tri citatne kotve (mono-volumen / Conditionalism / dublji slojevi). Vidi [`SOT.md` § 10.1](SOT.md#101-tri-citatne-kotve-za-tekst-obrazloženja).

**Ključni isporučiteljnji:**
- Big idea formulirana
- Site analysis (sve 4 zone)
- Sun studije za popodnevni kick-off (16-21h)
- 3-5 mass alternativa
- Interni review i izbor finale

**Milestone M1 (15.6.):** finalna alternativa odabrana → DD može krenuti.

### Faza 2 — Design Development (2026-06-16 → 2026-07-05)
**Cilj:** sve crteže, sustave i konzervatorsku gestu razraditi do nivoa koji se može publicirati na plakatima.

**Paralelno radi 6 tracka** (vidi swimlanes iznad). Najsporiji = bowl geometry + sightline validacija. Manifest sjevernog ruba mora biti formaliziran do kraja Faze 2.

### Faza 3 — Dokumentacija (2026-07-01 → 2026-07-15)
**Cilj:** sve fizički postoji u PDF-ovima ≤100 MB.

**Plakati** počinju paralelno s krajem DD-a (preklop 5 dana). **Maketa** je već u izradi 2 tjedna prije (start 2026-06-22).

### Faza 4 — Predaja (2026-07-15 → 2026-07-17)
**Cilj:** EOJN upload bez panike, T-1 dan, ne zadnji sat.

**T-2 prezentacija:** interna kontrola svih datoteka.
**T-1 anonimnost:** sustavna provjera (filename, metadata, vidljivi tekst, file properties, vizure koje otkrivaju autora).
**T-0 EOJN upload:** s rezervom od 24 sata.

### Faza 5 — Post (2026-07-31 → objava rezultata) — **JEDINA AKTIVNA FAZA**

**Stanje 2026-08-25:** predaja zatvorena, ocjenjivački sud u postupku ocjenjivanja, **rezultati neobjavljeni**. Ni konačan broj pristiglih radova ni imena natjecatelja nisu javni — natječaj je anoniman, pa se autorstva otvaraju tek uz objavu rezultata. Kolovoz je institucionalni zastoj (DAZ i službena stranica bez objava nakon 27.7.); realan prozor za objavu je **rujan 2026.**, uz izložbu vezanu uz **≥ 15.9.2026.**

Aktivni zadaci:

1. **Tjedno praćenje kanala objave** (redoslijedom vjerojatnosti prve objave): službena stranica → vijesti; `d-a-z.hr/hr/natjecaji/rezultati/`; EOJN 76778 (obavijest o ishodu); `zagreb.hr` priopćenja; UHA.
2. **Kad rezultati izađu — preuzeti odmah:** Zapisnik o radu OS-a (obrazloženja po radu), popis svih nagrađenih i otkupljenih radova s autorima i uredima, ukupan broj pristiglih radova.
3. **Izložba (≥ 15.9.)** — otići uživo; jedina prilika da se vide i nenagrađeni radovi. Fotografirati postav, zabilježiti tipologije rješenja sjevernog ruba.
4. **Ako pobjeda** — kreće konzervatorska procedura iz [`SOT.md` § 10.4](SOT.md#104-hitne-akcije-svibanj-lipanj-2026) (posebni uvjeti čl. 43–44 ZZOKD, OPUO/PUO) i ugovaranje idejnog + glavnog + izvedbenog projekta.
5. **Neovisno o ishodu** — napraviti post-mortem protiv kriterija A–D iz Zapisnika; to je najvrjedniji ulaz za sljedeći natječaj.

---

## Kritični rizici i mitigacije

| Rizik | Vjerojatnost | Utjecaj | Mitigacija |
|---|---|---|---|
| Maketa ne stigne na 28.7. | srednja | total fail | Ugovoriti izvođača do **15.6.**, ne kasnije |
| EOJN tehničke greške | niska | kritičan | Probni upload tjedan ranije; backup 2 računa |
| Anonimnost slučajno narušena | srednja | diskvalifikacija | T-1 dan sustavna provjera kroz svaki file |
| FOI zahtjevi ne stignu na vrijeme | visoka | srednji | Ne čekati — koristiti javne izvore (Plan upravljanja SPA, NN izvodi); FOI input se može unijeti naknadno za konzervatorski elaborat |
| Sukob interesa s OS (Plejić, Perović, Chas, Geers, Fabijanić, Roth-Čerina, Bakić) | niska | diskvalifikacija | Provjeriti svaki član tima do **2.6.**; nijedan partner ne smije biti formalno povezan |
| Big idea ne uvjeri tim u Fazi 1 | srednja | gubitak vremena | Interni review M1 (15.6.) je tvrdi prag — ako big idea ne stoji, do tog dana se mijenja |
| Kasna izmjena propisa (HRN EN 1998-1/NA/A2) | niska | srednji | Pratiti javnu raspravu do 20.6.2026.; ako stupi na snagu, primijeniti nove agR |

---

## Tjedni heartbeat

Preporuka: **petkom u 17:00** kratak status meeting (max 30 min) — što je gotovo, što kasni, što treba odlučiti do sljedećeg petka. Otkucavati u [`TODO.md`](TODO.md).

Tjedni ciljevi (T = tjedan):

| T | Tjedan | Cilj |
|---|---|---|
| T-7 | 27.5.–2.6. | Setup zatvoren |
| T-6 | 3.6.–9.6. | Big idea, site analysis |
| T-5 | 10.6.–16.6. | Mass + M1 milestone |
| T-4 | 17.6.–23.6. | Bowl + tlocrti razrađeni; maketa start |
| T-3 | 24.6.–30.6. | Presjeci + fasade + manifest 7+1 |
| T-2 | 1.7.–7.7. | Plakati draft 1; knjižica draft 1 |
| T-1 | 8.7.–14.7. | Plakati draft 2; tehnička provjera; tekst |
| T-0 | 15.7.–17.7. | Anonimnost + EOJN upload |
| T+1 | 18.7.–28.7. | Maketa predana |
| T+2 → | od 29.7. | **Praćenje objave rezultata** (aktivno) |
| T+1 | 18.7.–28.7. | Maketa finalizacija + predaja |
