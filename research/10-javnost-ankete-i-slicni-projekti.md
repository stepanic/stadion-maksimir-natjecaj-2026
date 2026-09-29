# 10 — Javnost: ankete portala, peticije i slični nezavisni projekti

*Stanje 28. 9. 2026., četiri dana nakon objave rezultata (24. 9.). Izvori su javne stranice koje su otvorene i pročitane,
a za ankete i izvorni kod widgeta. Ni u jednoj anketi nije glasano. Što nije provjereno, tako je i označeno.
Brojevi su ponovno provjereni 28. 9. oko 17:30 UTC (druga, detaljnija provjera).*

## Ukratko

- Sve pojedinačne objave (1.013, od najave 2025. do 28. 9. 2026.) su u medijskom arhivu
  [`11-medijski-arhiv.md`](11-medijski-arhiv.md) (`sources/mediji.tsv`).

- Portali su u prva dva dana pokrenuli **najmanje 16 anketa**. U svim anketama o izabranom rješenju negativnih je
  **74–90 %**. Najveća je Indexova, sa 147.538 glasova.
- **Nijedna anketa, peticija ni neslužbeno glasanje nema autorizaciju ni neporecivost.** Glasovi nisu vezani uz
  identitet, nisu potpisani i nema javnog zapisa koji bi netko treći mogao provjeriti. Ponovno glasanje u najboljem
  slučaju sprječava kolačić, localStorage ili ograničenje po IP-u. Brojeve zna samo poslužitelj portala ili vanjskog
  servisa.
- Nastalo je **pet nezavisnih digitalnih projekata**. Samo jedan ima glasanje (maksimirski-stadion.org), ali bez
  provjere identiteta i bez objavljenog koda.
- **Premijer Plenković je 28. 9. zatražio da se provjere pravne pretpostavke za poništenje natječaja**
  (vidi odjeljak 4).
- Ovaj projekt ([`maksimir.domovina.ai/glasanje`](https://maksimir.domovina.ai/glasanje)) je, koliko je poznato,
  **jedino glasanje s provjerom identiteta (Certilia), lancem hasheva, OpenTimestampsom i glasovima na javnom lancu**.
  Ujedno je jedino kojemu je sav kod otvoren ([MIT](../LICENSE)).

```mermaid
flowchart LR
  subgraph C["Centralizirano, bez provjere"]
    P["Ankete portala<br/>(Index, 24sata, Jutarnji, HRT …)"]
    M["maksimirski-stadion.org<br/>(1 glas po pregledniku, Turnstile)"]
    PE["Peticije<br/>(peticije.hr, peticijeonline)"]
  end
  subgraph V["Provjerivo"]
    D["maksimir.domovina.ai/glasanje<br/>Certilia + lanac hasheva + OTS + Gnosis"]
  end
  P -->|"broj zna samo poslužitelj"| X(("?"))
  M -->|"HMAC oznake preglednika"| X
  PE -->|"e-mail ili ništa"| X
  D -->|"svatko može ponoviti izračun"| OK(("✓"))
```

## 1. Ankete portala

Oznake: **V** = vidljivo u kodu stranice ili widgeta, **Z** = zaključak.

| # | Portal | Pitanje | Rezultat | Mehanizam |
|---|---|---|---|---|
| 1 | [Index.hr](https://www.index.hr/sport/clanak/anketa-svidja-li-vam-se-novi-maksimir/2838314.aspx) | Sviđa li vam se dizajn novog Maksimira? | Da 21 % · Ne 79 % · **147.538 glasova** | V: vlastiti widget (Blazor u iframeu), bez prijave. Poslužitelj izdaje tajni ID glasača koji se sprema u kolačić i localStorage, uz provjeru IP-a. |
| 2 | [Index.hr](https://www.index.hr/sport/clanak/anketa-koji-vam-se-od-5-nagradjenih-radova-za-stadion-u-maksimiru-najvise-svidja/2838345.aspx) | Koje rješenje je najbolje? (strelica gore/dolje) | 2. nagrada 13.351↑/1.975↓ … **pobjednički 2.675↑/10.775↓, zadnji** | Isti widget |
| 3 | [Gol.hr (Nova TV)](https://gol.dnevnik.hr/clanak/rubrika/nogomet/anketa-kako-vam-se-svidja-novi-maksimir-glasajte-u-anketi---1003589.html) | Kako vam se sviđa projekt? | ne sviđa mi se 84,3 % · **19.504 glasa** | V: vlastita anketa, localStorage + provjera na poslužitelju, bez prijave |
| 4 | [24sata](https://www.24sata.hr/sport/anketa-svida-li-vam-se-dizajn-novog-stadiona-maksimir-1156587) | Sviđa li vam se dizajn? | NE 89,9 % · **29.899 glasova** (HTML članka je keširan i pokazuje 15.801) | V: vlastiti API, token samo za prijavljene. Z: anonimni glas je dopušten. |
| 5 | [Večernji](https://www.vecernji.hr/sport/anketa-svida-li-vam-se-kako-ce-izgledati-novi-maksimir-1998197) | Sviđa li vam se? | uopće mi se ne sviđa 59,9 % (+18,6 % očekivao više) · 6.090 glasova | V: na odgovor 403 skripta šalje na login. Z: možda traži prijavu, nije provjereno. |
| 6 | [Večernji](https://www.vecernji.hr/sport/anketa-koji-je-za-vas-projekt-maksimirskog-stadiona-idealan-1998235) | Koje rješenje je najbolje? | br. 2 = **XDGA 35,1 %**, br. 1 = VG13 17,6 %, br. 4 njiric+, br. 3 Plan Común, br. 5 LAN/P2PA · 1.444 glasa | Kao #5. Brojeve radova daju opisi slika u galeriji članka. |
| 7 | [tportal](https://www.tportal.hr/vijesti/clanak/foto-kako-vam-se-svida-novi-maksimir-glasajte-u-anketi-foto-20260924) | Kako vam se sviđa pobjedničko rješenje? | ne sviđa mi se 78,5 % · 6.238 glasova (izvedeno iz postotaka) | V: obrazac s CSRF tokenom, bez prijave. CSRF nije autorizacija. |
| 8 | [tportal](https://www.tportal.hr/vijesti/clanak/foto-ovi-stadioni-nisu-prosli-pogledajte-kako-je-sve-mogao-izgledati-novi-maksimir-foto-20260924) | Koje rješenje vam se najviše sviđa? | **XDGA 26,3 %**, nijedno 25,3 %, njiric+ 22 %, VG13 11,8 % · 3.679 glasova (izvedeno) | Kao #7 |
| 9 | [Jutarnji](https://www.jutarnji.hr/vijesti/zagreb/anketa-83-posto-protiv-pobjednickog-projekta-novog-maksimira-15749634) | Kako vam se sviđa pobjednički projekt? | ne sviđa + moglo bolje 83 % · 12.163 glasa (prema samom Jutarnjem) | V: Riddle.com iframe, rezultati nisu javni. Anketa je u [članku 15749489](https://www.jutarnji.hr/vijesti/zagreb/prvonagradeni-projekt-novi-stadion-maksimir-i-src-svetice-15749489), a linkani članak donosi rezultate. |
| 10 | [HRT Sport](https://sport.hrt.hr/hrvatski-nogomet/predstavljanje-izgleda-novog-maksimira-12923504) | Vaše mišljenje? | katastrofa 67 % · **1.070 glasova** (broj je javan preko API-ja Opinion Stagea) | V: Opinion Stage s `recaptcha:false` i `answers_expire_hour`: **isti preglednik može glasati ponovno svakih sat vremena** |
| 11 | [Sportklub](https://sportklub.hr/nogomet/anketa-kako-vam-se-svida-novi-stadion-maksimir/) | Kako vam se sviđa izgled? | ne sviđa mi se 74 % · 1.091 glas ([rezultati](https://poll-maker.com/results5869202xCeD74848-169)) | V: besplatni poll-maker.com, obični POST, bez captche |
| 12 | [Direktno](https://direktno.hr/sport/ovako-ce-izgledati-novi-stadion-u-maksimiru-svida-li-vam-se-ovo-rjesenje-404979/) | Sviđa li vam se dizajn? | „Ne, što je njima?” 82 % | V: obrazac `?action=vote`, bez prijave i tokena |
| 13 | [Klikni.hr](https://www.klikni.hr/aktualno/2026/09/25/svida-li-vam-se-idejno-rjesenje-novog-dinamovog-stadiona-na-maksimiru/) | Sviđa li vam se? | Ne 80,7 % · 57 glasova | V: WordPress YOP Poll, `access=guest`, bez captche |
| 14 | [Index.hr](https://www.index.hr/sport/clanak/anketa-vjerujete-li-da-ce-novi-maksimir-biti-gradjen-u-najavljenim-rokovima/2838340.aspx) | Vjerujete li u rokove? | Ne 81 % · 1.295 glasova | Kao #1 |
| 15 | Sportnet | ? | „gotovo 90 %” negativno, prema [kolumni](https://sportnet.hr/kolumne/originalno/90-posto-vas-mrzi-novi-maksimir-evo-zasto-mislim-da-cete-promijeniti-misljenje-kad-ga-izgrade/632477/) | Anketa „Sviđa li vam se idejno rješenje novog Maksimira?” bila je u [članku 632416](https://sportnet.hr/vijesti/nogomet-supersport-hnl/predstavljeno-idejno-rjesenje-novog-maksimira-milanski-studio-i-talijanski-arhitekti-odnijeli-pobjedu/632416/), a zatim je **uklonjena** i vidi se samo u [Wayback snimci od 25. 9.](http://web.archive.org/web/20260925072916/https://sportnet.hr/vijesti/nogomet-supersport-hnl/predstavljeno-idejno-rjesenje-novog-maksimira-milanski-studio-i-talijanski-arhitekti-odnijeli-pobjedu/632416/). V: POST bez tokena i captche. |
| 16 | [Index.hr](https://www.index.hr/sport/clanak/ovo-je-maksimir-kakav-biste-htjeli-projekt-nije-usao-ni-u-top-5-kod-zirija/2838804.aspx) | Koji vam je dizajn najbolji, a koji najlošiji? (9 radova, strelice) | **zatvorena**, 74.906 glasova: 3LHD prvi (10.364↑/1.658↓), **VG13 zadnji, 9. od 9** (1.790↑/9.226↓) | Kao #1 |

Ankete se međusobno ne mogu zbrajati: isti čovjek je mogao glasati na svima, a na nekima i više puta.

## 2. Peticije

| Peticija | Potpisa (28. 9.) | Provjera potpisa |
|---|---|---|
| [peticije.hr #143](https://peticije.hr/inicijativa/0/peticija/143/stadion-maksimir) — opoziv rješenja | 30.218 (cilj 100.000) | Potpis se broji tek nakon potvrde e-mailom. Obvezni telefon se ne provjerava, uz to captcha. Nema OIB-a ni eID-a. |
| [peticijeonline.com](https://www.peticijeonline.com/ne_gradnji_stadiona_u_maksimiru_po_postojeem_rjeenju) — „NE! gradnji …” | 3.601 | Potvrda e-mailom, Cloudflare Turnstile |
| [change.org](https://www.change.org/p/peticija-za-novi-arhitektonski-natje%C4%8Daj-za-stadion-u-maksimiru) — novi natječaj | 237 | Račun ili e-mail na change.org |

## 3. Nezavisni digitalni projekti

| Projekt | Tko (javno) | Kod | Glasanje | Što radi |
|---|---|---|---|---|
| [maksimirski-stadion.org](https://www.maksimirski-stadion.org/hr) | „Neovisna građanska inicijativa”. U izjavi o privatnosti kao voditelj obrade stoji **Nenad Bakić**. Promovira je [@nbakic](https://x.com/nbakic/status/2104196425986793769). | **Zatvoren**, bez repozitorija | Da. Glas za točno 3 rada, bez prijave, jedan glas po pregledniku (nasumična oznaka u localStorage, a poslužitelj čuva samo njen HMAC), Cloudflare Turnstile i ograničenje po mreži. **Sami je zovu „zabavnom anketom bez provjere identiteta”.** | Svih 88 radova i rubrika „Pitanja i dileme” s 21 pitanjem. Next.js na Vercelu, Supabase. Domena je registrirana 27. 9. 2026. Dana 28. 9. u 17:39 UTC imala je 5.037 glasača: 3LHD vodi s 1.683 glasa, a VG13 je 13. s 384 (ujutro 3.718 glasača, VG13 15.). |
| [Maksimir pod kišom](https://ivanrezic.github.io/maksimir-pod-kisom/) | **Ivan Rezić**, [github.com/ivanrezic](https://github.com/ivanrezic) | **[Otvoren, MIT](https://github.com/ivanrezic/maksimir-pod-kisom)** | Ne | Postojeći stadion i VG13 u 3D, s GPU simulacijom vjetra (Lattice-Boltzmann D3Q19) i kiše po gledateljima. Napravljeno uz AI, repo od 25. 9. |
| [Stadium Overlay](https://stadion.nezn.am) | **Marko Banušić / Ne Znam**, [github.com/ne-znam](https://github.com/ne-znam) | [Javan, bez licence](https://github.com/ne-znam/stadion) | Ne | Tlocrti svjetskih stadiona iz OSM-a u stvarnom mjerilu preko Maksimira. Repo od 27. 9. |
| [zagreb.lol — 3D model VG13](https://zagreb.lol/zgrade/modeli/?id=stadion-maksimir-novi) | **Strahimir Stribor** (zagreb.lol, GitHub [Poglavar](https://github.com/Poglavar)) | Djelomično javan, bez licence (npr. [zagreb-buildings](https://github.com/Poglavar/zagreb-buildings)) | Ne | 3D rekonstrukcija pobjedničkog rada iz panela, i [u kontekstu grada](https://zagreb.lol/sloboda/@45.818441,16.017643/?lang=hr&heading=13.3&pitch=-0.0). **Ugrađeno na [`/radovi/6TVJ3MUHR`](https://maksimir.domovina.ai/radovi/6TVJ3MUHR) uz atribuciju.** |
| [maksimir.netlify.app](https://maksimir.netlify.app) | **Nepoznat**, bez kontakta | Nema repozitorija (jedna HTML datoteka od 12,8 MB) | Ne | Dvojezični (HR/EN) katalog svih 88 radova po krugovima eliminacije, s obrazloženjima žirija, ocjenama finalista, mišljenjem savjetnika za konstrukciju, vremenima predaje iz EOJN-a i dopunama nakon otkrivanja identiteta. Sadržajem najbliži ovom repou. Datum objave nepoznat, u pretragama se ne pojavljuje. |

Pretraga GitHuba 28. 9. (javni API; pojmovi `maksimir`, `stadion maksimir`, `maksimirski`, `maksimir stadium`,
`dinamo stadion`, `VG13`) osim ovih je vratila samo ovaj repozitorij. Ponovljena s prijavom, uključujući pretragu po
kodu, nije dala ništa novo.

## 4. Društvene mreže i Dinamo

- **GNK Dinamo, [27. 9. u 18:05 UTC](https://x.com/gnkdinamo/status/2104271303708701182).** Klub ne brani izbor, nego
  objavljuje pismo predsjednika Zvonimira Bobana, koji je i član žirija. Boban ostaje pri svom glasu („Duboko ostajem pri
  tom uvjerenju”), ali priznaje da „velika većina vas, Dinamovih navijača, smatra da to nije dobra odluka”. Obećava da
  će se klub boriti da se ideje navijača „čuju i respektiraju”, a posao ostavlja investitorima, Gradu, Vladi i žiriju.
  Pismo je odgovor na priopćenje BBB-a na njihovu Telegram kanalu: rješenje „nije u skladu s nekim osnovnim načelima
  tog prijedloga (zatvoren stadion te spojene tribine) i kao takvo ga ne možemo podržati”. „Ovakav stadion ne možemo
  podržati” je naslov [HRT-a](https://sport.hrt.hr/hrvatski-nogomet/bad-blue-boysi-ovakav-stadion-ne-mozemo-podrzati-12928245),
  ne doslovni citat.
  Post je 28. 9. navečer imao oko 26.000 pregleda, 278 lajkova i 62 odgovora.
- **Žiri** ostaje pri odluci. Plejić je rješenje nazvao „genijalnim rješenjem, remek-djelom”
  ([Telegram](https://www.telegram.hr/vijesti/sef-zirija-za-novi-maksimir-odgovorio-kriticarima-duboko-smo-uvjereni-da-je-ovo-genijalno-rjesenje-remek-djelo/)),
  a Fabijanić kaže da promjena odluke pod pritiskom javnosti „ne dolazi u obzir”
  ([N1](https://n1info.hr/vijesti/clan-zirija-za-novi-maksimir-zamjena-rada-ne-dolazi-u-obzir-krafne-ili-palacinke-nisu-nam-potrebne/)).
- **VG13** kaže da su „brojni aspekti projekta ostali nevidljivi” i najavljuje predstavljanje u Zagrebu
  ([N1](https://n1info.hr/vijesti/oglasili-se-arhitekti-koji-ce-graditi-novi-stadion-maksimir-kritike-ce-biti-kljucne-za-daljnji-razvoj/)).
- **Premijer Plenković, 28. 9.** Prvi put se javno izjasnio: „nije zadovoljan” rješenjem, Vlada provjerava postoje li
  pravne pretpostavke za poništenje natječaja, a cilj bi bio „drugi, možda i pozivni natječaj”
  ([N1](https://n1info.hr/vijesti/plenkovic-o-stadionu-maksimir-vidjet-cemo-postoje-li-pravne-pretpostavke-za-ponistavanje-natjecaja/),
  [24sata](https://www.24sata.hr/sport/premijer-plenkovic-direktno-o-novom-maksimiru-mislim-da-je-najbolje-ponistiti-natjecaj-1157336),
  [Jutarnji](https://www.jutarnji.hr/vijesti/hrvatska/plenkovic-nezadovoljan-projektom-stadiona-maksimir-razmatra-rusenje-natjecaja-15750729)).
- **Referendum i e-izjašnjavanje.** Drito je 26. 9. najavio lokalni referendum: prvo traži trećinu gradskih
  zastupnika, inače će skupljati potpise ([tportal](https://www.tportal.hr/vijesti/clanak/drito-protiv-rjesenja-za-maksimir-traze-referendum-o-stadionu-foto-20260926)).
  Domovinski pokret 27. 9. traži **elektroničko izjašnjavanje građana** prije konačne odluke
  ([Cronika](https://cronika.hr/istaknuto/2026/domovinski-pokret-trazi-izjasnjavanje-gradana-o-novom-stadionu-na-maksimiru/)),
  što je izravno tema provjerivog glasanja.
- **Politika, ranije.** Tomašević je 24. 9. podržao rješenje („Mogli smo imati nekakvu našu Allianz Arenu, ali nismo
  htjeli”, [Direktno](https://direktno.hr/sport/tomasevic-o-kritikama-novog-maksimira-mogli-smo-imati-nasu-allianz-arenu-ali-nismo-htjeli-405014/)).
  HDZ je podijeljen: ministar Glavina u žiriju je glasao za VG13, šef zagrebačkog HDZ-a Matijević piše „Propuh za 200
  milijuna eura našeg novca!”, a glavni tajnik Katičić kaže da to „nije konačni odabir” i da HDZ „osluškuje”
  ([tportal](https://www.tportal.hr/vijesti/clanak/novi-stadion-izazvao-pomutnju-u-hdz-u-ministar-podrzao-projekt-sef-zagrebackog-hdz-a-ga-sasjekao-foto-20260925),
  [N1](https://n1info.hr/vijesti/hdz-o-novom-maksimiru-osluskujemo-respektiramo-reakciju-gradjana/)).
  Predsjednik Gradske skupštine Mišić (SDP) traži širu javnu raspravu i korekcije
  ([01portal](https://01portal.hr/tek-je-predstavljen-a-vec-izazvao-buru-tko-brani-a-tko-osporava-novi-maksimir/)),
  Marija Selak Raspudić govori o „estetskoj uvredi”
  ([Dalmatinski portal](https://dalmatinskiportal.hr/selak-raspudic-kritizirala-tomasevica-zbog-novog-maksimira-osim-sto-predstavlja-estetsku-uvredu-ne-zadovoljava-ni-osnovne-funkcije)),
  a zagrebački Most traži odgovornost ako se od rješenja odustane
  ([HRT](https://vijesti.hrt.hr/hrvatska/zagrebacki-most-trazi-odgovornost-ako-se-odustane-od-rjesenja-za-novi-maksimir-12928201)).
- **Najavljeno, bez datuma.** Dinamova članska tribina s Bobanom i predsjednikom žirija, prema Indexu najvjerojatnije
  1. ili 2. 10. ([Index](https://www.index.hr/sport/clanak/dinamo-najavio-clansku-tribinu-o-stadionu-pa-utihnuo-evo-sto-se-dogadja/2838975.aspx));
  predstavljanje VG13 u Zagrebu „u idućim tjednima”; izložba svih 88 radova s maketama „za otprilike mjesec dana”
  (predsjednica DAZ-a Ana Boljar na predstavljanju 24. 9., vidi [`08`](08-rezultati-natjecaja.md)).
- **Reddit** (r/dinamo, r/croatia, r/zagreb_no1). Megathread i vlastite varijante VG13 sa zatvorenim kutovima.
  U [r/zagreb_no1](https://reddit.com/r/zagreb_no1/comments/1wqncef/) je 26. 9. objava „Javno glasanje o rješenjima za
  Maksimir” korisnika u/samouprava, s linkom na ovo glasanje: „Sajt nije moj, našao sam ga surfajući, i ideja mi se
  jako sviđa: građani glasaju o najboljem rješenju koristeći eOsobnu kako bi se izbjegli lažni glasovi.”
- LinkedIn, Threads, Bluesky, Facebook i Instagram javnom pretragom nisu vratili ništa relevantno.

### X, pregled s prijavom (28. 9.)

Pregled je napravljen u prijavljenom pregledniku, samo čitanjem. Učitano je oko 35 od 58 odgovora na Dinamov post
i 12 citata.

- **Na X-u nitko ne dijeli open-source ni 3D projekt vezan uz natječaj.** Pretrage `maksimir github`, `3D`,
  `open source` i `zagreb.lol` ne daju relevantne rezultate. Link `maksimir.domovina.ai` dijeli samo autor ovog repoa.
- **Doseg.** Najčitanija objava je [@CroatiaFooty](https://x.com/CroatiaFooty/status/2103088304090386879) s
  predstavljanjem rješenja (258 tisuća pregleda). Slijede Bobanovo pismo (26,6 tisuća) i dvije objave
  [@bozo_kras](https://x.com/bozo_kras/status/2103431572682670432), koji je pregledao svih 88 radova i kao favorita
  izdvojio zatvoreni oval Kaić Arhitekata (26,4 tisuće).
- **Odgovori na Bobanovo pismo** su pretežno negativni. Glavne linije:
  - pismo je „kontrola štete” i prebacivanje odgovornosti;
  - stadion je zastario, otvoren i na propuhu;
  - traži se referendum članova („jedan član jedan glas”).

  Citati pismo uglavnom čitaju kao povlačenje i najavu izmjena rada. Manjina odgovora rješenje brani.
- **Dinamova objava [„Dom svima nama”](https://x.com/gnkdinamo/status/2103099029357994466)** od 24. 9. ima 163
  odgovora, pretežno negativnih. Klub je najavio [člansku tribinu](https://x.com/gnkdinamo/status/2103157539277766930)
  s Bobanom i predsjednikom žirija.
- **Teme rasprave:**
  - estetika („ruglo”, razdvojene tribine);
  - kiša i vjetar;
  - legitimnost žirija, s threadovima o sukobu interesa, npr.
    [@jozo_jurica](https://x.com/jozo_jurica/status/2103149023280480506);
  - cijena od 175 do 205 milijuna eura;
  - DKOM i je li odluka konačna;
  - tko odlučuje: struka ili javnost.
- **Bakićevo glasanje:** [@nbakic](https://x.com/nbakic/status/2104196425986793769) (9,9 tisuća pregleda) i njegova
  [X anketa](https://x.com/nbakic/status/2104271048334274839) „Nagrađeno rješenje … će biti odbačeno” (navečer 312
  glasova, Da 217 / Ne 95, traje do 30. 9.).
  Komentatori traže više slika po radu i predlažu javno glasanje između pet radova.
- **AI koncepti** umjesto projekata, npr. [@ProPatriaHR](https://x.com/ProPatriaHR/status/2103517285365256359) s
  ChatGPT-om i Geminijem. Dijeli se i rad [TVORZI „Zagrebački greben”](https://tvorzi.com/en/projects/maksimir-stadium-zagreb/).

## 5. Kandidati za povezivanje

1. **Ivan Rezić** ([GitHub](https://github.com/ivanrezic)). Projekt je otvoren (MIT) i izravno vezan uz natječaj. Moguća
   suradnja: podaci o 88 radova kao izvor za dodatne 3D varijante, međusobni linkovi.
2. **Strahimir Stribor / zagreb.lol**. 3D model je već ugrađen. Zajednička tema: otvoreni podaci, glasanje i blockchain
   ([urbangametheory.xyz](https://urbangametheory.xyz)).
3. **Marko Banušić / Ne Znam** ([nezn.am](https://nezn.am), [GitHub](https://github.com/mbanusic)). Overlay tlocrta,
   moguće ugraditi uz lokaciju.
4. **Nenad Bakić / maksimirski-stadion.org**. Ima najviše neslužbenih glasača, a glasanje mu nema provjeru identiteta.
   Prirodna tema je usporedba metodologija (Turnstile i jedan glas po pregledniku naspram Certilije i lanca). Kod nije
   javan.
5. **Božo Kraš** ([@bozo_kras](https://x.com/bozo_kras)). Pregledao je svih 88 radova i ima velik doseg na X-u. Nije
   developer, ali je prirodan korisnik stranice [`/radovi`](https://maksimir.domovina.ai/radovi).
