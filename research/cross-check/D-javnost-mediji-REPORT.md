# D — Javnost, ankete, slični projekti i medijski arhiv — Desktop Research REPORT

*Prompt: [`_prompt-D-javnost-mediji.md`](_prompt-D-javnost-mediji.md). Provjerava `research/10` i `research/11` (28. 9. 2026.).*

## Usporedba s našim stanjem (29. 9. 2026.)

Desktop Research je radio uglavnom iz rezultata pretrage ([P]), pa su mu brojke starije od naših: 24sata, HRT i
peticija provjereni su 28. 9. u 17:30 UTC, a on npr. navodi 29.547 potpisa i 138.867 glasova. Plenkovićevu
izjavu od 28. 9. nije našao.

| | Nalaz | Što smo napravili |
|---|---|---|
| ⚠ → ✓ naše | „Boban se oglasio i odgovorio Boysima…” je Indexov naslov, a ne Večernjakov | **Odbačeno.** Večernjakov poslužitelj ID 1999050 i danas preusmjerava (301) na slug `boban-se-oglasio-i-odgovorio-boysima-i-navijacima-procitajte-pismo-1999050`, koji zatim daje 404. Članak je bio na Večernjem i uklonjen je. Index ima sličan, zaseban članak (2839245). |
| ✓ | Za „najmanje četiri uklonjena članka” treba HTTP status i provjera arhiva | Već napravljeno 28. 9.: sva četiri daju 404, nijedan nema snimku u Waybacku. |
| ⚠ ispravljeno | „Ovakav stadion ne možemo podržati” je naslov HRT-a, a ne doslovni citat BBB-a | `research/10`: doslovni tekst priopćenja uz napomenu da je to naslov HRT-a. |
| ✓ | Fabijanić: „…to ne dolazi u obzir” | Naš tekst već parafrazira točno. |
| ✓ | Plejić: „referentno” / „preferentno” | Ne citiramo taj dio rečenice. |
| ➕ | Tomašević 24. 9., podijeljeni HDZ (Glavina, Matijević, Katičić), Mišić (SDP), Selak Raspudić | Dodano u odjeljak 4 `research/10`, s provjerenim linkovima. |
| ➕ | Dinamova tribina vjerojatno 1. ili 2. 10., izložba za otprilike mjesec dana | Dodano u `research/10`. Izložba je već bila u `research/08`. |
| ✓ postoji | Geers i Fantini na istoj akademiji (Mendrisio), Vjera Bakić kao zamjena | Već u arhivu (24sata, Index 2838674 i 2838769: žiri kaže da Geers nije sudjelovao), a Vjera Bakić je u `research/01`. |
| ✓ | Nenad Bakić (maksimirski-stadion.org) i Vjera Bakić (žiri) su različite osobe | Mi Nenada Bakića navodimo iz izjave o privatnosti, koju je naš subagent pročitao 28. 9. |
| ✓ | Službenog istraživanja agencija nema | Isto. |
| ✓ | Izvan regije pišu samo stadionski mediji; The Stadium Business navodi 224 mil. € | Isto kao naš nalaz. Otkud 224 mil. € (naspram ~204 mil. € u programu) nije provjereno. |
| ➕ | 15 objava koje nismo imali | 14 dodano u `sources/mediji.tsv` (iteracija `G-desktop-research.tsv`; naslov i datum provjereni na stranici). Jedna je bila duplikat. |
| ✗ | Change.org peticija „nije pronađena” | Postoji: 237 potpisa 28. 9. |
| ✗ | 16. anketa na Indexu, maksimir.netlify.app, Plenković, Drito i DP | Desktop ih nije našao, a mi ih imamo. |

## Izvorni output Desktop Researcha

<!-- PASTE HERE -->

# Novi stadion Maksimir / VG13: neovisna provjera javnih reakcija, anketa, peticija i medijskog odjeka (stanje 28. 9. 2026.)

Ključni nalaz: većina tvrdnji iz dokumenta 10 ima uporište u primarnim izvorima, ali tri se moraju ispraviti. Naslov „Boban se oglasio i odgovorio Boysima…” pripada Indexu, a ne Večernjem listu.\[1\] Rečenica „ovakav stadion ne možemo podržati” je HRT-ov naslov, a ne doslovni tekst BBB-a.\[2\] Za Plejićev citat kruže dvije inačice („preferentno” / „referentno”).\[3\]\[4\]\[5\]\[6\] Službeno mjerenje javnog mnijenja agencija o rješenju VG13 nisam pronašao.

## TL;DR
- **Ankete i peticije:**
  - Sportnetov „gotovo 90 %” potvrđen je u Sportnetovoj kolumni od 25. 9. 2026.
  - Indexova anketa iznosi 79 % „ne sviđa mi se” uz rastući broj glasova: 65.000+ → 135.000+ → 138.867.
  - Peticija na peticije.hr (#143) na samoj stranici pokazuje 29.547 potpisa uz cilj od 100.000.
- **Citati:** Plejić, Fabijanić, Boban, autori VG13, HDZ i Most potvrđeni su u primarnim ili gotovo primarnim izvorima (N1, tportal, RTL/Net.hr, Index, službeni kanali Dinama). Zabilježene su tri formulacijske razlike. Tvrdnju da je Večernji uklonio „Boban se oglasio i odgovorio Boysima…” nisam mogao potvrditi, a naslov gotovo sigurno pripada Indexu.
- **Sljedeći koraci:** nijedan formalni korak nije zakazan s točnim datumom.
  - Dinamova članska tribina najavljena je za „sljedeći tjedan”. Index uz potvrdu iz kluba piše da je „najizglednije da će se tribina održati u četvrtak ili petak sljedećeg tjedna, dakle prvog ili drugog listopada”.
  - VG13 najavljuje predstavljanje uživo „u idućim tjednima”.
  - Predsjednica DAZ-a Ana Boljar najavila je 24. 9. (Index): „Za otprilike mjesec dana organizirat ćemo izložbu svih natječajnih radova, zajedno s maketama.”
  - Nisam pronašao Tomaševićevu ni vladinu izjavu nakon 24. 9., sjednicu Skupštine ni Vlade, ni žalbu DKOM-u.

## Metodološka napomena
Sve je provjereno 28. 9. 2026. Oznake izvora:
- **[S]** – stranicu sam otvorio i pročitao.
- **[P]** – podatak vidim samo u rezultatu pretrage (snippetu).

Datum objave naveden je kad je vidljiv na stranici ili u URL-u. Tamo gdje ga nisam mogao utvrditi stoji „n/u” (nije utvrđeno).

Nisam glasao ni u jednoj anketi i nisam potpisao nijednu peticiju. Pretraga je bila ograničena brojem upita, pa „nije pronađeno” ne znači „ne postoji”.

## 1–5. Provjera tvrdnji (dokument 10)

### 1. Ankete portala

| Tvrdnja | Korisnikov podatak | Nalaz | Izvor (datum objave; provjereno 28. 9. 2026.) | Oznaka |
|---|---|---|---|---|
| Sportnetova anketa „gotovo 90 %” negativno | Korisnik je nije našao | Kolumna Jure Horvata doslovno kaže: „U anketi na Sportnetu gotovo 90 posto vas odgovorilo je da vam se izabrano rješenje ne sviđa.”\[7\] Poveznica vodi na vijest 632416 („Predstavljeno idejno rješenje novog Maksimira…”), gdje se anketa nalazi. Tu stranicu nisam uspio otvoriti, pa točno pitanje i broj glasova nisu potvrđeni. Sportnet anketu spominje i u vijesti 632486 („Sviđa li vam se idejno rješenje novog Maksimira? Pogledaj anketu”) [P].\[4\] | https://sportnet.hr/kolumne/originalno/90-posto-vas-mrzi-novi-maksimir-evo-zasto-mislim-da-cete-promijeniti-misljenje-kad-ga-izgrade/632477/ (25. 9. 2026.) [S] | ✓ postotak; ? broj glasova |
| Index: „Sviđa li vam se novi Maksimir?” | Dio 15 anketa | Rezultat 79 % „ne sviđa”. Broj glasova raste kroz Indexove članke: „više od 65.000” (članak o peticijama), „više od 135.000” (članak o odgovoru VG13), „138.867” (članak o Mostu, 27. 9.).\[8\]\[9\]\[10\] | https://www.index.hr/sport/clanak/anketa-svidja-li-vam-se-novi-maksimir/2838314.aspx (24. 9.) [P]; https://www.index.hr/vijesti/clanak/most-o-novom-maksimiru-generacijsku-priliku-su-pretvorili-u-kutiju-za-alat/2839094.aspx (27. 9.) [P] | ✓ (najnoviji broj: 138.867) |
| Index: „Koje biste rješenje odabrali?” | — | Anketa je zatvorena s „gotovo 60 tisuća” glasova. Pobijedio je 3LHD sa 7.701 pozitivnim glasom. VG13 je „dobio najslabije ocjene”.\[11\] | https://www.index.hr/sport/clanak/odabrali-ste-maksimir-kakav-zelite/2838804.aspx (n/u, oko 25. 9.) [P] | ✓ |
| Gol.hr (Dnevnik.hr): „Kako vam se sviđa novi Maksimir?” | — | Anketa postoji. Rezultat nije vidljiv u snippetu.\[12\]\[13\] | https://gol.dnevnik.hr/clanak/rubrika/nogomet/anketa-kako-vam-se-svidja-novi-maksimir-glasajte-u-anketi---1003589.html (24. 9.) [P] | ? rezultat |
| Sportklub: „Kako vam se sviđa novi stadion Maksimir?” | — | Anketa postoji. Rezultat nije vidljiv.\[14\] | https://sportklub.hr/nogomet/anketa-kako-vam-se-svida-novi-stadion-maksimir/ (n/u) [P] | ? rezultat |
| Baustela: „Koje vam je rješenje najbolje?” (top 5 hrvatskih radova) | — | Anketa postoji uz članak o hrvatskim radovima. Rezultat nije vidljiv.\[15\] | https://baustela.hr/estetika/vijesti/87517/ovo-je-top-5-hrvatskih-rjesenja-za-novi-maksimir-genijalna-su-ocjenjivaci-priznali-samo-jedno/vijest (25. 9.) [P] | ? rezultat |
| Večernji: „Koji je projekt idealan” | Nejasno koja opcija odgovara kojem radu | Anketa postoji: „Koji je za vas projekt maksimirskog stadiona idealan?”, 24. 9. 2026. oko 14:54, URL …/anketa-koji-je-za-vas-projekt-maksimirskog-stadiona-idealan-1998235 (utvrđeno preko agregatora novina.com [S]).\[16\] Samu stranicu nisam mogao otvoriti, pa opcije i rezultat nisu provjereni. Anketa je objavljena istog dana kad je predstavljeno pet nagrađenih radova, pa su opcije vrlo vjerojatno tih pet (nepotvrđeno). Šifre nagrađenih radova s maksimirski-stadion.org [S]: 1. VG13 Architects (IT) **6TVJ3MUHR**; 2. XDGA – Xaveer De Geyter Architects (BE) **GY0F1A9OM**; 3. Plan Común · Studio Muoto · DATA architectes (FR·GB·ES) **W3YS5VJBZ**; 4. njiric plus arhitekti (HR) **6PPWVBBBZ**; 5. LAN · P2PA (PL·FR) **CYFXC7LIM**.\[17\] | https://novina.com/cluster/talijanski-projekt-novog-maksimira-izazvao-bijes (24. 9.) [S]; https://www.maksimirski-stadion.org/hr [S] | ⚠ postoji; ? opcije i rezultat |
| Neslužbena anketa sa svih 88 radova (Telegram) | — | Telegram piše o građanskoj anketi u kojoj se biraju tri rada. 3LHD vodi s „gotovo 1.400 glasova od preko 4.000” sudionika.\[18\] Po mehanici (tri izbora, 88 radova) najvjerojatnije je riječ o maksimirski-stadion.org (moj zaključak). | https://www.telegram.hr/telesport/na-prvu/anketa-sa-svih-88-prijedloga-za-novi-maksimir-jedan-dizajn-premocno-vodi-a-stvarni-pobjednik-nije-ni-u-top-10/ (n/u) [P] | ✓ (zastarjeli međurezultat) |

Tumačenje: sve su to samoselektirane online ankete bez uzorka i zaštite od višestrukog glasanja. Pokazuju smjer i intenzitet reakcije, ali nisu mjera javnog mnijenja. Indexova brojka od 138.867 glasova ne znači 138.867 osoba.

### 2. Peticije

| Tvrdnja | Korisnikov podatak | Nalaz | Izvor | Oznaka |
|---|---|---|---|---|
| peticije.hr #143 | 3 peticije | Naziv: „Peticija za povlačenje odabranog arhitektonskog rješenja za Stadion Maksimir”. Autor: „Boris”. Objavljena 24. 9. 2026. Upućena HNS-u, Dinamu, Gradu Zagrebu i Vladi RH. **Prikupljeno 29.547 potpisa**, cilj 100.000 (29 %), 6.315 komentara.\[19\] Potpisivanje: obrazac s privolom za obradu imena, prezimena i e-pošte [P, tekst privole u snippetu].\[19\] Nema provjere identiteta osim (vjerojatno) e-pošte. Na stranici nisam vidio potvrdu e-pošte. | https://peticije.hr/inicijativa/0/peticija/143/stadion-maksimir [S] | ✓ |
| Rast te peticije | — | Tijek potpisa: 6.635 za manje od 24 sata (tportal, 25. 9.) → 11.600 (Baustela) → „više od 22.000” (obavijest na samoj peticiji [P]) → 29.547 [S].\[19\]\[20\]\[21\] | https://www.tportal.hr/vijesti/clanak/pokrenuta-peticija-protiv-novog-maksimira-evo-koliko-je-potpisa-dosad-prikupljeno-foto-20260925 [P]; https://baustela.hr/novosti/vijesti/87527/peticija-vec-prikupila-11600-potpisa-s-vizijom-novog-maksimira-mnogi-nisu-zadovoljni/vijest [P] | ✓ |
| Druga peticija „NE! gradnji stadiona u Maksimiru po postojećem rješenju” | peticijeonline | Peticija je na platformi Peticijeonline.com (https://www.peticijeonline.com/ne_gradnji_stadiona_u_maksimiru_po_postojeem_rjeenju), a autor je prema stranici „Lovro Naglić · HR”. HRT ga opisuje kao „vatreni dinamovac Lovro Naglić iz Borovja”. Telegram je naveo „gotovo 1500 potpisa” u prvim satima, a Index (2838471) „više od 1200” te večeri. Trenutni broj potpisa nisam vidio. | https://www.telegram.hr/politika-kriminal/pokrenute-dvije-peticije-protiv-novog-maksimira-tisuce-potpisuju-da-se-odustane-od-odabranog-izgleda-stadiona/ [P]; https://www.index.hr/vijesti/clanak/pojavile-se-dvije-peticije-protiv-odabranog-rjesenja-za-novi-maksimir/2838471.aspx [P] | ✓ platforma i autor; ? trenutni broj |
| change.org | 3. peticija | Nisam pronašao. | — | ? |

### 3. maksimirski-stadion.org

| Tvrdnja | Korisnikov podatak | Nalaz | Izvor | Oznaka |
|---|---|---|---|---|
| Tko stoji iza | Izjava o privatnosti navodi Nenada Bakića | Na naslovnici piše samo: „Neovisna građanska inicijativa. Nije povezana s Gradom Zagrebom, Vladom RH ni Društvom arhitekata Zagreba.”\[17\] Stranicu /hr/privatnost nisam otvorio. Pozor, radi se o različitim osobama: u žiriju je arhitektica **Vjera Bakić** zamijenila Kerstena Geersa (tportal).\[22\] O vezi s Nenadom Bakićem ne treba spekulirati bez provjere. | https://www.maksimirski-stadion.org/hr [S]; https://www.tportal.hr/vijesti/clanak/sve-sto-trebate-znati-o-novom-maksimiru-moze-li-pasti-pobjednicki-projekt-i-sto-slijedi-foto-20260925 [P] | ? autor |
| Metodologija | — | Radovi se prikazuju „nasumičnim redom”. Označuju se točno tri rada („nije rangiranje: svaki odabrani rad dobiva jedan glas”). Glasa se „bez prijave i bez e-maila. Jedan glas po pregledniku, a možeš ga kasnije promijeniti.” Podaci su preuzeti iz EOJN RH (tender 76778) i sa stadion-maksimir.zagreb.hr. Statistika: 88 radova, 32 zemlje u timovima, 33 rada s hrvatskim sudionikom, 5 nagrada. Stranica ima i odjeljak „21 otvoreno pitanje”.\[17\] | https://www.maksimirski-stadion.org/hr [S] | ✓ |
| Trenutni poredak | — | Stranicu /hr/poredak nisam otvorio. Posljednji javno citirani međurezultat (Telegram): 3LHD vodi s oko 1.400 glasova, više od 4.000 sudionika, VG13 nije u top 10.\[18\] | Telegram (gore) [P] | ? |

Tumačenje: „jedan glas po pregledniku” lako se zaobilazi (drugi preglednik, anonimni prozor). Metodologija je znatno slabija od korisnikova modela s Certilijom, i to je legitimna točka usporedbe.

### 4. Citati

| Osoba | Korisnikov citat | Točan tekst i izvornik | Izvor | Oznaka |
|---|---|---|---|---|
| Toma Plejić | „genijalno rješenje, remek-djelo” | Iz intervjua N1 (novinar Mateo Keller): „…duboko uvjereni da je ovo genijalno rješenje, remek-djelo i da je planetarno **referentno** i relevantno” (N1, Index, Sportnet).\[4\]\[23\] Telegram prenosi „planetarno **preferentno**”.\[3\]\[5\]\[6\] | https://n1info.hr/vijesti/sef-ocjenjivackog-suda-o-novom-maksimiru-ovo-je-genijalno-rjesenje-remek-djelo [P]; https://www.tportal.hr/vijesti/clanak/novi-maksimir-pod-paljbom-kritika-oglasio-se-predsjednik-zirija-daleko-najbolji-rad-foto-20260925 [P] | ✓ (⚠ inačica preferentno/referentno, provjeriti video N1) |
| Nenad Fabijanić | „ne dolazi u obzir” | Za tportal: „Ali to da se pod utjecajem javnosti mijenja odluka o radovima, to ne dolazi u obzir. To čak ni politika koja je sudjelovala u odabiru nije podržala.”\[24\] Naslov „Zamjena pobjedničkog rada ne dolazi u obzir” je parafraza redakcije.\[25\] | https://www.tportal.hr/vijesti/clanak/clan-zirija-za-novi-maksimir-zamjena-pobjednickog-rada-ne-dolazi-u-obzir-foto-20260925 (25. 9.) [P] | ✓ |
| Zvonimir Boban | pismo 27. 9. 2026. | Pismo je objavljeno na službenim kanalima Dinama, a prenijeli su ga Index (27. 9.), N1, HRT i drugi. Ključne rečenice: „Struka ga je ocijenila najboljim u svakom smislu – urbanističkom, arhitektonskom, povijesno-identitetskom. Duboko ostajem pri tom uvjerenju, ali to je samo jedno dinamovsko mišljenje…”; „Ono što je neupitna istina jest da velika većina vas, Dinamovih navijača, smatra da to nije dobra odluka ni pravo rješenje za naš klub.”; „Vjerujem da će investitori, Grad Zagreb i Vlada Republike Hrvatske, zajedno s ocjenjivačkim žirijem pronaći najbolji mogući put ka ostvarenju tih ideja.” Potpis: „Dinamo Zagreb iznad svih. Zvone Boban”.\[26\]\[27\]\[28\]\[29\] Izvornik na gnkdinamo.hr nisam otvorio. | https://www.index.hr/sport/clanak/boban-se-oglasio-i-odgovorio-boysima-procitajte-pismo/2839245.aspx [P]; https://www.zgportal.com/sport/stadion-maksimir-bi-se-trebao-graditi-prema-spornom-projektu-zvonimir-boban-porucio-da-treba-uvaziti-zelje-dinamovih-navijaca/ [P] | ✓ |
| Bad Blue Boys | „ovakav stadion ne možemo podržati” | Priopćenje na BBB-ovu Telegram kanalu doslovno kaže: „Izabrano idejno rješenje nije u skladu s nekim osnovnim načelima tog prijedloga (zatvoren stadion te spojene tribine) i **kao takvo ga ne možemo podržati**.”\[2\]\[30\] Formulacija „Ovakav stadion ne možemo podržati” je **naslov HRT-a**, a N1 u naslovu piše „Ovakvo rješenje…”.\[2\]\[31\] | https://sport.hrt.hr/hrvatski-nogomet/bad-blue-boysi-ovakav-stadion-ne-mozemo-podrzati-12928245 [P]; https://n1info.hr/vijesti/stigla-reakcija-boysa-na-novi-maksimir-ovakvo-rjesenje-ne-mozemo-podrzati [P] | ⚠ (naslov, ne citat) |
| Autori VG13 (Fantini, Rossi) | „brojni aspekti ostali su nevidljivi” | Izjava za RTL Danas: „Na društvenim mrežama dosad je objavljeno svega nekoliko vizualizacija, ponekad u niskoj kvaliteti ili znatno izmijenjenih. Zbog toga su brojni aspekti projekta ostali nevidljivi, među njima i lagana čelična konstrukcija stadiona te mogućnosti osvjetljavanja njegove vanjštine na dane utakmica.” Najavljuju i: „U idućim tjednima organiziramo predstavljanje uživo u Zagrebu.”\[32\]\[33\] | http://net.hr/danas/vijesti/arhitekti-novog-stadiona-za-rtl-odgovorili-na-kritike-brojni-aspekti-ostali-su-nevidljivi-2f584b97-b9c8-11f1-936f-9600040c8f8e [P]; Telegram [P] | ✓ |
| HDZ | — | Stav stranke nije jedinstven. Mladež HDZ-a Zagreb najprije je projekt pohvalila. Predsjednik zagrebačkog HDZ-a Ivan Matijević potom je napisao: „Maksimir nije betonsko groblje. Maksimir je naš dom… Propuh za 200 milijuna eura našeg novca!” Glavni tajnik Krunoslav Katičić rekao je: „To nije konačni odabir, nego prijedlog žirija… Osluškujemo, respektiramo njihovu reakciju.” Ministar Glavina (HDZ) glasao je za VG13.\[34\]\[35\]\[36\] | https://www.tportal.hr/vijesti/clanak/novi-stadion-izazvao-pomutnju-u-hdz-u-ministar-podrzao-projekt-sef-zagrebackog-hdz-a-ga-sasjekao-foto-20260925 [P]; https://n1info.hr/vijesti/hdz-o-novom-maksimiru-osluskujemo-respektiramo-reakciju-gradjana [P] | ✓ |
| Most Zagreb | — | Priopćenje od nedjelje 27. 9.: „generacijska prilika pretvorena u betonsku kutiju za alat”. Most traži „političku i financijsku odgovornost za isplaćene nagrade” od Tomaševića i Glavine ako se od rješenja odustane.\[10\]\[37\]\[38\]\[39\] | https://www.tportal.hr/vijesti/clanak/most-novi-maksimir-naziva-betonskom-kutijom-za-alat-poslali-poruku-tomasevicu-i-glavini-20260927 [P]; Index 2839094 [P] | ✓ |

Dodatni politički glasovi, vjerojatno slabo pokriveni u dokumentu 10:
- Matej Mišić (SDP), predsjednik Gradske skupštine, napisao je na Facebooku (prenosi Index, 2838815): „Stadion se gradi za navijače, a ne za arhitekte… Očekivao sam zatvoreni krov sa svih strana i nadam se da će se prije konačne realizacije projekta provesti šira javna rasprava te funkcionalne i vizualne korekcije.”
- Marija Selak Raspudić govori o „estetskoj uvredi”.\[40\]
- Arhitekt Otto Barić traži da Grad preispita rješenje.\[41\]

Izvori: https://01portal.hr/tek-je-predstavljen-a-vec-izazvao-buru-tko-brani-a-tko-osporava-novi-maksimir/ [P]; https://dalmatinskiportal.hr/selak-raspudic-kritizirala-tomasevica-zbog-novog-maksimira-osim-sto-predstavlja-estetsku-uvredu-ne-zadovoljava-ni-osnovne-funkcije [P].

### 5. Službeno mjerenje javnog mnijenja

| Tvrdnja | Nalaz | Oznaka |
|---|---|---|
| Istraživanje agencija (Promocija plus, Ipsos, 2x1 komunikacije, HRejting, CRO Demoskop) o rješenju VG13 | Do 28. 9. 2026. nisam pronašao nijedno objavljeno istraživanje na reprezentativnom uzorku. Svi citirani postoci dolaze iz samoselektiranih anketa portala. | ? (nije pronađeno; ne isključuje neobjavljena istraživanja) |

## 6. Nove ankete, peticije i nezavisni projekti (od 24. 9. 2026.)

- 24. 9. 2026. | peticije.hr | Peticija za povlačenje odabranog arhitektonskog rješenja | https://peticije.hr/inicijativa/0/peticija/143/stadion-maksimir | peticija | protiv | 29.547 potpisa na dan provjere [S].\[19\]
- 24. 9. 2026. | Peticijeonline.com (autor Lovro Naglić) | „NE! gradnji stadiona u Maksimiru po postojećem rješenju” | https://www.peticijeonline.com/ne_gradnji_stadiona_u_maksimiru_po_postojeem_rjeenju | peticija | protiv | Traži zaustavljanje realizacije. Telegram je javio gotovo 1.500 potpisa u prvim satima, a Index „više od 1200” te večeri [P].
- n/u (nakon 24. 9.) | maksimirski-stadion.org | 88 stadiona. Tvoj izbor. | https://www.maksimirski-stadion.org/hr | web aplikacija / glasanje | kritički neutralno („glasanje neovisno o odluci ocjenjivačkog suda”) | Glasa se za tri od 88 radova, bez prijave; ima i stranicu s 21 otvorenim pitanjem o žiriju i javnom novcu [S].\[17\]
- 25. 9. 2026. | tportal | Mogao je izgledati i ovako: Hrvatski arhitekti pokazali svoje vizije novog Maksimira | https://www.tportal.hr/vijesti/clanak/mogao-je-izgledati-i-ovako-hrvatski-arhitekti-pokazali-svoje-vizije-novog-maksimira-20260925 | alternativni prijedlozi | neutralno | 3LHD i IEC Architects + Engineers objavili su svoje nenagrađene radove [P].\[42\]
- n/u | gol.hr | FOTO Pogledajte još dva prijedloga za novi Maksimir | https://gol.dnevnik.hr/clanak/rubrika/nogomet/pogledajte-jos-dva-prijedloga-za-novi-maksimir-hrvatski-arhitekti-pokazali-svoje-projekte---1003713.html | alternativni prijedlozi | neutralno | Ista objava 3LHD-a i drugog ureda [P].\[12\]
- 25. 9. 2026. | Baustela | Ovo je top 5 hrvatskih rješenja za novi Maksimir… | https://baustela.hr/estetika/vijesti/87517/... | pregled i anketa | implicitno kritički prema izboru | Radovi Otta Barića, 3LHD-a, Kaić arhitekata, Urbanih ideja i njiric plus, uz anketu čitatelja [P].\[15\]
- n/u | Index | anketa o radovima koji nisu prošli (ID 2838484, prema snippetu koji je pronašao pomoćni istraživač) | https://www.index.hr/... /2838484.aspx (točan URL nepotvrđen) | anketa | — | Rezultat: 3LHD je pobijedio sa 7.701 glasom od gotovo 60.000 [P].
- n/u | YouTube | The New Maksimir Stadium Is Causing Controversy – But There Were 88 Designs | https://www.youtube.com/watch?v=8kniwzTy8u4 | video pregled | neutralno / kritički | Pregled svih 88 radova i kontroverze [P].\[43\]
- n/u | vg13.ch | VG13 Architects – Archive | https://www.vg13.ch/archive/ | službeni portfelj autora | za | Projekt je upisan kao „Maksimir Stadium and Svetice Sport Centre 2026, competition, 1. prize” (slike: Alessandro Garzanti) [P].\[44\]

GitHub repozitorije, 3D modele trećih strana i AI koncepte nisam pronašao u dostupnim pretragama (?).

## 7. Regionalni i međunarodni mediji

- 24. 9. 2026. | Croatia Week (HR, engl.) | New Maksimir Stadium design selected after international competition | https://www.croatiaweek.com/croatia-new-maksimir-stadium-winning-design/ | vijest | neutralno | Prenosi službene podatke [P].\[45\]
- 09/2026 (n/u) | StadiumDB | Croatia: Design for Dinamo Zagreb's new stadium unveiled | https://stadiumdb.com/news/2026/09/croatia_design_for_dinamo_zagrebs_new_stadium_unveiled | specijalizirani medij | neutralno | Opisuje koncept „elementarnog sklopa ploha” i investiciju od 204 mil. € [P].\[46\]
- 25. 9. 2026. | The Stadium Business | VG13 Architects lands contract for new Stadion Maksimir | https://www.thestadiumbusiness.com/2026/09/25/vg13-architects-lands-contract-for-new-stadion-maksimir/ | specijalizirani medij | neutralno | Navodi „€224m” investiciju. To odstupa od službenih 204 mil. €, vjerojatno greškom [P].\[16\]\[47\]\[48\]
- n/u | Nogomania (SLO) | „Je li ovo kartonska kutija?” (prema gol.hr) | preko https://gol.dnevnik.hr/clanak/rubrika/nogomet/ovako-su-slovenci-reagirali-na-novi-maksimir-je-li-ovo-kartonska-kutija---1003712.html | sportski portal | kritički / podrugljivo | Ističe podijeljene hrvatske reakcije [P, sekundarno].\[49\]
- n/u | Klix.ba (BiH) | Pogledajte kako će izgledati novi Maksimir, talijanski studio osvojio glavnu nagradu | preko net.hr (dolje) | vijest | neutralno | [P, sekundarno].\[50\]
- n/u | SportSport.ba (BiH) | Hrvatska i Dinamo su konačno dočekali… vrijedan 204 milijuna eura! | preko net.hr | vijest | pozitivno | Prenosi Bobanov „futuristički Maksimir” [P, sekundarno].\[50\]
- n/u | B92.sport (SRB) | Otkriveno kako će izgledati novi Maksimir FOTO | preko net.hr | vijest | neutralno | [P, sekundarno].\[50\]
- n/u | Telegraf (SRB) | Ovako će ubuduće izgledati stadion na kojem su ZVEZDA I PARTIZAN IGRALI LEGENDARNE UTAKMICE | preko net.hr | vijest | neutralno | Naglasak na jugoslavenskoj nogometnoj povijesti [P, sekundarno].\[50\]
- n/u | MONDO (SRB) | Maksimir će izazvati strahopoštovanje: Dinamo predstavio najveći projekt u Hrvatskoj | preko net.hr | vijest | neutralno / pozitivno | [P, sekundarno].\[50\]
- Zbirni izvor za regiju: https://net.hr/sport/nogomet/reakcije-iz-hrvatskog-susjednstva-na-novi-maksimir-0d9fad24-b8b6-11f1-936f-9600040c8f8e [P].
- n/u | Scena.ba (BiH) | Pokrenuta peticija protiv novog Maksimira… | https://scena.ba/pokrenuta-peticija-protiv-novog-maksimira-evo-koliko-je-potpisa-dosad-prikupljeno/ | preuzimanje tportala | kritički | [P].\[51\]
- 24.–27. 9. 2026. | Hercegovina.info (BiH) | Bad Blue Boysi se oglasili… / Boban se obratio navijačima… | https://www.hercegovina.info/sport/nogomet/bad-blue-boysi-se-oglasili-o-novom-stadionu-u-maksimiru/263237/ ; https://www.hercegovina.info/sport/nogomet/boban-se-obratio-navijacima-oko-novog-maksimira/263256/ | vijesti | neutralno | Prenose BBB i Bobanovo pismo [P].\[29\]\[52\]
- 24. 9. 2026. | Kamenjar (BiH) | Poznat pobjednik natječaja… / Zagrebački Most traži odgovornost… | https://kamenjar.com/poznat-pobjednik-natjecaja-za-stadion-maksimir-i-src-svetice/ ; https://kamenjar.com/most-odgovornost-novi-maksimir/ | agencijske vijesti (vjerojatno Hina) | neutralno | [P].\[39\]\[53\]

Rupe: nisam pronašao nijednu crnogorsku objavu ni objave talijanskih, španjolskih, njemačkih i britanskih dnevnika. Nisam pronašao ni objave Dezeena, ArchDailyja, designbooma, Archinecta i World-Architectsa (?). To je samo po sebi informativno: izvan regije o rezultatu su dosad pisali uglavnom specijalizirani stadionski mediji, i to neutralno i agencijski.

## 8. Hrvatski izvori slabo pokriveni u korisnikovu arhivu

- 24. 9. 2026. | gnkdinamo.hr | Izabrano idejno rješenje novog Maksimira | https://gnkdinamo.hr/hr/vijesti/izabrano-idejno-rjesenje-novog-maksimira-2 | službeno | za | Klupska vijest s prezentacije [P].\[54\]
- 24. 9. 2026. | gnkdinamo.hr (EN) | Results of the architectural-urban design competition… presented | https://gnkdinamo.hr/en/news/predstavljeni-rezultati-arhitektonsko-urbanistickog-natjecaja-za-src-svetice-stadion-maksimir | službeno | za | Bobanov govor („futuristički Maksimir”) [P].\[55\]
- 24. 9. 2026. | Grad Zagreb (službena stranica natječaja) | Rezultati natječaja | https://stadion-maksimir.zagreb.hr/en/rezultati-natjecaja/128 | službeno | za | Natječaj je trajao od 20. 3. do 17. 7. 2026., 88 radova, 5 nagrada [P].\[56\]
- 24. 9. 2026. | Večernji list | Anketa: Koji je za vas projekt maksimirskog stadiona idealan? | https://www.vecernji.hr/sport/anketa-koji-je-za-vas-projekt-maksimirskog-stadiona-idealan-1998235 | anketa | — | Preko novina.com [S agregator]; sama stranica neprovjerena.\[16\]
- 24. 9. 2026. | Večernji list | Tomašević otkrio koliko će koštati i kada će biti završen novi stadion u Maksimiru! | https://www.vecernji.hr/sport/tomasevic-otkrio-koliko-ce-kostati-i-kada-ce-biti-zavrsen-novi-stadion-u-maksimiru-1998215 | vijest | neutralno | Preko novina.com.\[16\]
- 24. 9. 2026. | Večernji list (Karlo Ledinski) | Novi stadion je remek-djelo, izraz onog što Zagreb i Dinamo jesu | https://www.vecernji.hr/sport/novi-stadion-je-remek-djelo-izraz-onog-sto-zagreb-i-dinamo-jesu-1998269 | komentar / izjave | za | Preko novina.com.\[16\]
- 24. 9. 2026. | Večernji list (Maja Car) | Stadion koji odbija generičke trendove: novi Maksimir podsjeća na kultna zdanja u Španjolskoj i Francuskoj | https://www.vecernji.hr/sport/stadion-koji-odbija-genericke-trendove-novi-maksimir-podsjeca-na-kultna-zdanja-u-spanjolskoj-i-francuskoj-1998289 | analiza | za | Preko novina.com.\[16\]
- 24. 9. 2026., 19:57 | Večernji list (Karolina Lubina) | Ugledni arhitekti oduševljeni, evo što ističu za novi maksimirski stadion | https://www.vecernji.hr/sport/ugledni-arhitekti-odusevljeni-evo-sto-isticu-za-novi-maksimirski-stadion-1998324 | izjave struke | za | Preko novina.com; vidi točku 9.\[16\]
- 25. 9. 2026. (vjerojatno) | Večernji list (Robert Junaci) | Boban kaže da grli identitet Dinamovaca, ovo je sve što morate znati o novom stadionu Dinama | https://www.vecernji.hr/sport/boban-kaze-da-grli-identitet-dinamovaca-ovo-je-sve-sto-morate-znati-o-novom-stadionu-dinama-1998362 | intervju | za | Bobanova izjava da će se napraviti korekcije („kutovi će biti zatvoreniji… generalna slika će ostati”), koju citiraju tportal i Sportnet.\[7\]\[57\]
- n/u | Nacional | Usred žestokih kritika tvorci novog stadiona stižu u Zagreb… | https://www.nacional.hr/usred-zestokih-kritika-tvorci-novog-stadiona-stizu-u-zagreb-javnost-nije-sve-vidjela-proucavali-smo-rad-hrvatskog-arhitekta/ | vijest | neutralno | Najava dolaska VG13 i njihovo pozivanje na Turinu [P].\[58\]
- n/u | Dalmacija News | Boban se oglasio nakon žestokih reakcija… | https://www.dalmacijanews.hr/clanak/boban-se-oglasio-nakon-zestokih-reakcija-na-novi-maksimir-neupitna-je-istina-da-vecina-navijaca-nije-zadovoljna/ | vijest | neutralno | [P].\[27\]
- 24. 9. 2026. | Prigorski.hr (tekst identičan agencijskom) | Poznat pobjednik natječaja… | https://prigorski.hr/poznat-pobjednik-natjecaja-za-stadion-maksimir-i-src-svetice/ | vjerojatno Hina | neutralno | Troškovi 175/205 mil. € bez PDV-a, rušenje 2027., gradnja 2029. [P].\[53\]\[59\]
- 25. 9. 2026. | tportal | Sve što trebate znati o novom Maksimiru: Može li pasti pobjednički projekt i što slijedi? | https://www.tportal.hr/vijesti/clanak/sve-sto-trebate-znati-o-novom-maksimiru-moze-li-pasti-pobjednicki-projekt-i-sto-slijedi-foto-20260925 | analiza | neutralno | Geersa je u žiriju zamijenila Vjera Bakić; za naknade radnim tijelima potrošeno je 338.000 € [P].\[22\]
- n/u | 24sata (preko foruma ZonaDinamo) | Član žirija za Maksimir i autor pobjedničkog rješenja rade na istoj akademiji… | https://www.zonadinamo.com/discussion/comment/972302 (forum koji citira 24sata) | istraživački | kritički | Tvrdnja o vezi Geers–Fantini (Accademia di Architettura di Mendrisio).\[60\] Vidim je samo sekundarno, pa provjeriti izvornik na 24sata [P].
- n/u | construction.hr | Novi Maksimir: stadion od 35.000 mjesta projektirat će talijanski VG13 Architects | https://www.construction.hr/novosti/novi-maksimir-stadion-od-35000-mjesta-projektirat-ce-talijanski-vg13-architects/a/12014 | strukovni | neutralno | [P].\[61\]
- n/u | Net.hr | Tko su arhitekti novog Maksimira? Milanski studio dosad nije projektirao nijedan veliki stadion | https://net.hr/danas/vijesti/tko-su-arhitekti-novog-maksimira-mladi-milanski-studio-dosad-nije-projektirao-nijedan-veliki-stadion-d808ef4e-b824-11f1-936f-9600040c8f8e | profil | neutralno / skeptično | Studio je osnovan 2017. i nema izvedenog stadiona [P].\[62\]

Nisam pronašao: zagreb.info nakon listopada 2025., Slobodnu Dalmaciju, Hinine izvorne objave, UHA, HKA, Arhitektonski fakultet, Oris ni Čovjek i prostor. Index navodi da „arhitektonska struka također planira organizirati događaj posvećen projektu novog Maksimira na fakultetu”, ali bez datuma (?).\[63\] DAZ je provoditelj natječaja, pa njegov stav čine službeni nastupi Ane Boljar.

## 9. Uklonjeni članci Večernjeg lista

- „Ugledni arhitekti oduševljeni, evo što ističu za novi maksimirski stadion” (Karolina Lubina, 24. 9. 2026., 19:57). Postojanje je potvrđeno na agregatoru novina.com [S], a URL je …-1998324.\[16\] Radi li URL danas nisam mogao provjeriti, jer alat nije mogao otvoriti vecernji.hr. Kopiju na archive.today ili Wayback nisam pronašao pretragom (?).
- „Boban se oglasio i odgovorio Boysima…”. Takav naslov kod Večernjaka **nisam pronašao**. Gotovo identičan naslov ima **Index.hr**: „Boban se oglasio i odgovorio Boysima i navijačima. Pročitajte pismo” (https://www.index.hr/sport/clanak/boban-se-oglasio-i-odgovorio-boysima-procitajte-pismo/2839245.aspx, 27. 9. 2026. [P]).\[1\] Moguće je da je u korisnikovu arhivu naslov krivo pripisan Večernjem (⚠).
- Objašnjenje uklanjanja: nigdje nije objavljeno (?).
- Preporuka: ručno otvoriti URL-ove 1998235, 1998269, 1998289, 1998324 i 1998362 i zabilježiti HTTP status (404, 301 ili 200). Zatim provjeriti web.archive.org i archive.ph za svaki. Tek nakon toga tvrditi da je članak uklonjen.

## 10. Sljedeći koraci postupka – kronologija

- **veljača 2024.** – Vlada, Grad i Zagrebačka nadbiskupija rješavaju imovinsko-pravni spor. **Veljača 2025.** – sporazum o financiranju 50:50 (Index / službeno priopćenje).\[64\]
- **20. 3. – 17. 7. 2026.** – natječaj otvoren, stiglo je 88 radova.\[56\]
- **24. 9. 2026.** – objava rezultata.
  - Tomašević u službenoj izjavi Grada Zagreba (prenosi Net.hr): „Zadovoljan sam procesom odabira nagrađenog rješenja, koji je cijelo vrijeme bio pravičan i konstruktivan. Podržavam odabrano rješenje stadiona i cijelog sportskog kompleksa.” Na predstavljanju je dodao: „Mogli smo imati nekakvu našu Allianz Arenu, ali nismo htjeli.”
  - Glavina: „Povjerenje smo dali stručnjacima…”\[64\]
  - Predsjednica DAZ-a Ana Boljar (Index): „Za otprilike mjesec dana organizirat ćemo izložbu svih natječajnih radova, zajedno s maketama. O detaljima ćemo naknadno informirati javnost.” To upućuje na kraj listopada 2026.
  - Dinamo najavljuje člansku tribinu „sljedeći tjedan”.\[9\]\[65\]
  - Prva nagrada iznosi 390.400 €, a nagradni fond 976.000 € bruto.\[39\]\[66\]
- **25. 9. 2026.**
  - Boban za Večernji: „bit će korekcija, sve će se približiti onome što ljudi žele”.\[57\]
  - Plejić (N1) i Fabijanić (tportal) brane odluku.\[6\]\[25\]
  - HDZ (Katičić): „nije konačni odabir”.\[36\]
  - Index, prema izvoru bliskom jednom investitoru, piše da Vlada i Grad navodno mogu odustati i pokrenuti kraći postupak. Službene potvrde nema, pa je to nepotvrđena mogućnost.\[36\]
- **oko 26. 9. 2026.** – VG13 (za RTL Danas) najavljuje predstavljanje uživo u Zagrebu „u idućim tjednima”, bez datuma.\[33\]
- **najkasnije 27. 9. 2026.** – priopćenje BBB-a.\[67\]
- **27. 9. 2026.** – Most Zagreb traži odgovornost.\[37\] Boban objavljuje pismo i poziva investitore i žiri da „pronađu najbolji mogući put”.\[39\]\[68\]
- **28. 9. 2026.** (očekivano, nepotvrđeno) – Index, uz potvrdu iz kluba, piše: „DINAMO bi u ponedjeljak trebao objaviti termin članske tribine… najizglednije da će se tribina održati u četvrtak ili petak sljedećeg tjedna, dakle prvog ili drugog listopada.” Srijeda 30. 9. manje je vjerojatna zbog prijateljske utakmice sa Segestom u Sisku u 16 h. Prema Gol.hr, tribina će se održati na Maksimiru, a Boban i predsjednik žirija predstavit će pobjednički rad, objasniti kako je izabran i odgovarati na pitanja članova. Gol.hr navodi: „Točan datum i vrijeme održavanja tribine zasad nisu poznati.”
- **2027.** – planirano rušenje starog stadiona.\[53\] Tomašević na predstavljanju: „nadam se… u ljeto iduće godine”.\[47\]\[69\]
- **2029.** – početak gradnje. Tomašević u službenoj vijesti Dinama (gnkdinamo.hr, 24. 9.): „Očekujemo da bi gradnja trajala 22 mjeseca, nadamo se da bismo do kraja 2030. godine mogli imati otvoren novi Maksimir.”

Nisam pronašao sjednicu Gradske skupštine ni Vlade s točkom o stadionu, žalbu DKOM-u niti Tomaševićevu ili vladinu izjavu nakon 24. 9. 2026. (?). Grad i Vlada zasad službeno šute, a to je samo po sebi politički signal. Signale šalju Boban (pismo), SDP-ov Mišić i HDZ-ov Katičić, ali ne i dvojica formalnih investitora.

Izvori za kronologiju:
- https://www.index.hr/sport/clanak/dinamo-najavio-clansku-tribinu-o-stadionu-pa-utihnuo-evo-sto-se-dogadja/2838975.aspx [P]
- https://www.index.hr/sport/clanak/anketa-svidja-li-vam-se-novi-maksimir/2838314.aspx [P]
- https://direktno.hr/sport/tomasevic-o-kritikama-novog-maksimira-mogli-smo-imati-nasu-allianz-arenu-ali-nismo-htjeli-405014/ [P]
- https://kamenjar.com/poznat-pobjednik-natjecaja-za-stadion-maksimir-i-src-svetice/ [P]
- https://n1info.hr/vijesti/hdz-o-novom-maksimiru-osluskujemo-respektiramo-reakciju-gradjana [P]
- https://gol.dnevnik.hr/clanak/rubrika/nogomet/gledajte-uzivo-dinamo-predstavlja-kako-ce-izgledati-novi-stadion-maksimir---1003540.html [P]

## 5 najvažnijih stvari koje korisnikov tekst vjerojatno krivo tvrdi ili propušta

1. **Krivo pripisan naslov.** „Boban se oglasio i odgovorio Boysima…” je Indexov naslov (ID 2839245), a ne Večernjakov.\[1\] Tvrdnja o „najmanje četiri uklonjena članka” mora se dokazati HTTP statusom i arhivskim snimkama, inače je treba ublažiti.
2. **Citat BBB-a.** „Ovakav stadion ne možemo podržati” je naslov HRT-a. Doslovno piše: „…i kao takvo ga ne možemo podržati.”\[2\] Isto vrijedi za Fabijanića: „Zamjena pobjedničkog rada ne dolazi u obzir” je naslov, a citat glasi „…da se pod utjecajem javnosti mijenja odluka o radovima, to ne dolazi u obzir.”\[70\] Kod Plejića provjeriti „referentno” prema „preferentno” u videu N1.
3. **Brojke u anketama i peticijama stare u satima.** Index: 65.000 → 135.000 → 138.867 glasova uz stabilnih 79 %.\[9\]\[10\] Peticija #143: 6.635 → 11.600 → 22.000+ → 29.547.\[19\]\[20\]\[21\] Svaku brojku treba vezati uz vrijeme očitanja. Nijedna od tih anketa nije reprezentativna, a službenog istraživanja agencija nema.
4. **Sastav i neovisnost žirija.** Kerstena Geersa zamijenila je Vjera Bakić, a 24sata izvještava o vezi Geers–Fantini preko akademije u Mendrisiju.\[22\]\[60\] To je vjerojatno slabo pokriveno, a upravo tu leže najjači argumenti za eventualnu žalbu ili poništenje. Uz to, ime „Bakić” u izjavi o privatnosti maksimirski-stadion.org treba jasno razlučiti od članice žirija.
5. **Politička pozicija investitora.** Mišić (SDP, predsjednik Skupštine), podijeljeni HDZ (Glavina za, Matijević protiv, Katičić „nije konačno”) i Mostov zahtjev za odgovornošću pokazuju da se pritisak premjestio s DAZ-a na Grad i Vladu.\[10\]\[34\]\[36\]\[39\] Službeni stav obaju investitora nakon 24. 9. ne postoji. Izvan regije projekt je dosad pratio samo stadionski tisak (StadiumDB, The Stadium Business, uz netočnu brojku od 224 mil. €), a ne veliki dnevnici ni arhitektonski mediji.

## Preporuke
- Prije objave ponovno očitati peticiju #143, Indexovu anketu i /hr/poredak na maksimirski-stadion.org sa satnom oznakom.
- Otvoriti /hr/privatnost na maksimirski-stadion.org i doslovno citirati tko je voditelj obrade.
- Pratiti gnkdinamo.hr 28.–29. 9. zbog termina tribine te stadion-maksimir.zagreb.hr zbog izložbe i eventualnih odluka investitora.
- U usporedbi metodologija istaknuti da portalske ankete i maksimirski-stadion.org nemaju provjeru identiteta. To je glavna razlika prema korisnikovu projektu, ali ne treba je predstavljati kao dokaz da su njihovi rezultati krivi, nego samo kao da su neprovjerljivi.

## Sources

1. [Boban se oglasio i odgovorio Boysima i navijačima. Pročitajte pismo - Index.hr](https://www.index.hr/sport/clanak/boban-se-oglasio-i-odgovorio-boysima-procitajte-pismo/2839245.aspx)
2. [Bad Blue Boysi: Ovakav stadion ne možemo podržati - HRT](https://sport.hrt.hr/hrvatski-nogomet/bad-blue-boysi-ovakav-stadion-ne-mozemo-podrzati-12928245)
3. [Novi Maksimir pod paljbom kritika, oglasio se predsjednik žirija: 'Daleko najbolji rad, remek-djelo'](https://www.tportal.hr/vijesti/clanak/novi-maksimir-pod-paljbom-kritika-oglasio-se-predsjednik-zirija-daleko-najbolji-rad-foto-20260925)
4. [Šef ocjenjivačkog suda odgovorio na kritike novog Maksimira: 'Ovo je remek-djelo i genijalno rješenje' - Sportnet](https://sportnet.hr/vijesti/nogomet-supersport-hnl/sef-ocjenjivackog-suda-odgovorio-na-kritike-novog-maksimira-ovo-je-remek-djelo-i-genijalno-rjesenje/632486/)
5. [Šef žirija za novi Maksimir odgovorio kritičarima: ‘Duboko smo uvjereni da je ovo genijalno rješenje, remek-djelo’](https://www.telegram.hr/vijesti/sef-zirija-za-novi-maksimir-odgovorio-kriticarima-duboko-smo-uvjereni-da-je-ovo-genijalno-rjesenje-remek-djelo/)
6. [Šef ocjenjivačkog suda o novom Maksimiru: Ovo je genijalno rješenje, remek-djelo! - Vijesti iz Hrvatske, regije i svijeta - N1 info](https://n1info.hr/vijesti/sef-ocjenjivackog-suda-o-novom-maksimiru-ovo-je-genijalno-rjesenje-remek-djelo)
7. [90 posto vas mrzi novi Maksimir. Evo zašto mislim da ćete promijeniti mišljenje kad ga izgrade - Sportnet](https://sportnet.hr/kolumne/originalno/90-posto-vas-mrzi-novi-maksimir-evo-zasto-mislim-da-cete-promijeniti-misljenje-kad-ga-izgrade/632477/)
8. [Talijanski arhitekti odgovorili na žestoke kritike za novi Maksimir - Index.hr](https://www.index.hr/vijesti/clanak/talijanski-arhitekti-pratimo-kritike-na-novi-maksimir-mnogo-toga-nije-predstavljeno/2839018.aspx)
9. [Pojavile se dvije peticije protiv odabranog rješenja za novi Maksimir - Index.hr](https://www.index.hr/vijesti/clanak/pojavile-se-dvije-peticije-protiv-odabranog-rjesenja-za-novi-maksimir/2838471.aspx)
10. [Most žestoko reagirao zbog novog Maksimira - Index.hr](https://www.index.hr/vijesti/clanak/most-o-novom-maksimiru-generacijsku-priliku-su-pretvorili-u-kutiju-za-alat/2839094.aspx)
11. [Ovo je Maksimir kakav biste htjeli. Projekt nije ušao ni u top 5 kod žirija - Index.hr](https://www.index.hr/mobile/sport/clanak/ovo-je-maksimir-kakav-biste-htjeli-projekt-nije-usao-ni-u-top-5-kod-zirija/2838804.aspx?index_ref=homepage_comment_box_m&commentId=12086807)
12. [FOTO Pogledajte još dva prijedloga za novi Maksimir - Gol.hr](https://gol.dnevnik.hr/clanak/rubrika/nogomet/pogledajte-jos-dva-prijedloga-za-novi-maksimir-hrvatski-arhitekti-pokazali-svoje-projekte---1003713.html)
13. [ANKETA Kako vam se sviđa novi Maksimir? Glasajte u anketi](https://gol.dnevnik.hr/clanak/rubrika/nogomet/anketa-kako-vam-se-svidja-novi-maksimir-glasajte-u-anketi---1003589.html)
14. [ANKETA / Kako vam se sviđa novi stadion Maksimir? - Sportklub](https://sportklub.hr/nogomet/anketa-kako-vam-se-svida-novi-stadion-maksimir/)
15. [Ovo je top 5 hrvatskih rješenja za novi Maksimir: Genijalna su, ocjenjivači 'priznali' samo jedno](https://baustela.hr/estetika/vijesti/87517/ovo-je-top-5-hrvatskih-rjesenja-za-novi-maksimir-genijalna-su-ocjenjivaci-priznali-samo-jedno/vijest)
16. [Novi Maksimir: Talijani pobijedili, cijena šuti — Novina](https://novina.com/cluster/talijanski-projekt-novog-maksimira-izazvao-bijes)
17. [Maksimirski stadion · Javno glasanje za natječajne radove](https://www.maksimirski-stadion.org/hr)
18. [Online anketa za novi Maksimir: stvarni pobjednik ni u Top 10 | Telegram.hr](https://www.telegram.hr/telesport/na-prvu/anketa-sa-svih-88-prijedloga-za-novi-maksimir-jedan-dizajn-premocno-vodi-a-stvarni-pobjednik-nije-ni-u-top-10/)
19. [Peticija za povlačenje odabranog arhitektonskog rješenja za Stadion Maksimir – potpišite - peticije.hr](https://peticije.hr/inicijativa/0/peticija/143/stadion-maksimir)
20. [Peticija već prikupila 11.600 potpisa: S vizijom novog Maksimira mnogi nisu zadovoljni](https://baustela.hr/novosti/vijesti/87527/peticija-vec-prikupila-11600-potpisa-s-vizijom-novog-maksimira-mnogi-nisu-zadovoljni/vijest)
21. [Pokrenuta peticija protiv novog Maksimira: Evo koliko je potpisa dosad prikupljeno | tportal](https://www.tportal.hr/vijesti/clanak/pokrenuta-peticija-protiv-novog-maksimira-evo-koliko-je-potpisa-dosad-prikupljeno-foto-20260925)
22. [Sve što trebate znati o novom Maksimiru: Može li pasti pobjednički projekt i što slijedi? | tportal](https://www.tportal.hr/vijesti/clanak/sve-sto-trebate-znati-o-novom-maksimiru-moze-li-pasti-pobjednicki-projekt-i-sto-slijedi-foto-20260925)
23. [Šef žirija za Maksimir: Ovo je genijalno rješenje, remek-djelo - Index.hr](https://www.index.hr/vijesti/clanak/sef-zirija-za-maksimir-ovo-je-genijalno-rjesenje-remekdjelo/2838786.aspx)
24. [Član žirija: 'Da se pod utjecajem javnosti mijenja odluka o Maksimiru? Ne dolazi u obzir'](https://www.telegram.hr/vijesti/clan-zirija-koji-je-jednoglasno-odabrao-novi-maksimir-da-se-pod-utjecajem-javnosti-mijenja-odluka-ne-dolazi-u-obzir/)
25. [Član žirija za novi Maksimir: 'Zamjena pobjedničkog rada ne dolazi u obzir. Krafne ili palačinke nisu nam potrebne'](https://www.tportal.hr/vijesti/clanak/clan-zirija-za-novi-maksimir-zamjena-pobjednickog-rada-ne-dolazi-u-obzir-foto-20260925)
26. [Boban se obratio navijačima Dinama zbog novog stadiona: Većina vas smatra da to nije dobra odluka... - Vijesti iz Hrvatske, regije i svijeta - N1 info](https://n1info.hr/vijesti/boban-se-obratio-navijacima-dinama-zbog-novog-stadiona-vecina-vas-smatra-da-to-nije-dobra-odluka)
27. [Boban se oglasio nakon žestokih reakcija na novi Maksimir: "Neupitna je istina da većina navijača nije zadovoljna"](https://www.dalmacijanews.hr/clanak/boban-se-oglasio-nakon-zestokih-reakcija-na-novi-maksimir-neupitna-je-istina-da-vecina-navijaca-nije-zadovoljna/)
28. [Stadion Maksimir bi se trebao graditi prema spornom projektu | Zvonimir Boban poručio da treba uvažiti želje Dinamovih navijača](https://www.zgportal.com/sport/stadion-maksimir-bi-se-trebao-graditi-prema-spornom-projektu-zvonimir-boban-porucio-da-treba-uvaziti-zelje-dinamovih-navijaca/)
29. [Boban se obratio navijačima oko novog Maksimira | Vijesti Hercegovina.Info](https://www.hercegovina.info/sport/nogomet/boban-se-obratio-navijacima-oko-novog-maksimira/263256/)
30. [BBB protiv Bobanovog i Tomaševićevog novog Maksimira: Ne možemo ga podržati. Nismo se tak dogovorili - Hrvatska danas](https://hrvatska-danas.com/2026/09/27/bbb-protiv-bobanovog-i-tomasevicevog-novog-maksimira-ne-mozemo-ga-podrzati-nismo-se-tak-dogovorili/)
31. [Stigla reakcija Boysa na novi Maksimir: "Ovakvo rješenje ne možemo podržati" - Vijesti iz Hrvatske, regije i svijeta - N1 info](https://n1info.hr/vijesti/stigla-reakcija-boysa-na-novi-maksimir-ovakvo-rjesenje-ne-mozemo-podrzati)
32. [Talijanski arhitekti koji stoje iza novog Maksimira: 'Brojni aspekti ostali su nevidljivi'](https://www.telegram.hr/vijesti/talijanski-arhitekti-koji-stoje-iza-novog-stadiona-u-maksimiru-brojni-aspekti-ostali-su-nevidljivi/)
33. [Arhitekti novog stadiona za RTL odgovorili na reakcije - 'Brojni aspekti ostali su nevidljivi' - Net.hr](http://net.hr/danas/vijesti/arhitekti-novog-stadiona-za-rtl-odgovorili-na-kritike-brojni-aspekti-ostali-su-nevidljivi-2f584b97-b9c8-11f1-936f-9600040c8f8e)
34. [Novi stadion izazvao pomutnju u HDZ-u: Ministar podržao projekt, šef zagrebačkog HDZ-a ga sasjekao | tportal](https://www.tportal.hr/vijesti/clanak/novi-stadion-izazvao-pomutnju-u-hdz-u-ministar-podrzao-projekt-sef-zagrebackog-hdz-a-ga-sasjekao-foto-20260925)
35. [HDZ-ovci hvalili stadion pa nakon kritika u javnosti okrenuli ploču | Telegram.hr](https://www.telegram.hr/politika-kriminal/hdz-ovci-klicali-novom-stadionu-zahvaljivali-plenkovicu-a-onda-naglo-okrenuli-plocu-zar-je-stvarno-dostojan/)
36. [HDZ o novom Maksimiru: "Osluškujemo, respektiramo reakciju građana" - Vijesti iz Hrvatske, regije i svijeta - N1 info](https://n1info.hr/vijesti/hdz-o-novom-maksimiru-osluskujemo-respektiramo-reakciju-gradjana)
37. [Most novi Maksimir naziva 'betonskom kutijom za alat': Poslali poruku Tomaševiću i Glavini | tportal](https://www.tportal.hr/vijesti/clanak/most-novi-maksimir-naziva-betonskom-kutijom-za-alat-poslali-poruku-tomasevicu-i-glavini-20260927)
38. [Most novi Maksimir nazvao betonskom kutijom za alat, prozvao Tomaševića i Vladu](https://www.telegram.hr/vijesti/most-novi-maksimir-nazvao-betonskom-kutijom-za-alat-prozvao-tomasevica-i-vladu/)
39. [Zagrebački Most traži odgovornost ako se odustane od rješenja za novi Maksimir - Kamenjar](https://kamenjar.com/most-odgovornost-novi-maksimir/)
40. [Selak Raspudić kritizirala Tomaševića zbog novog Maksimira: Osim što predstavlja estetsku uvredu, ne zadovoljava ni osnovne funkcije | Dalmatinski Portal](https://dalmatinskiportal.hr/selak-raspudic-kritizirala-tomasevica-zbog-novog-maksimira-osim-sto-predstavlja-estetsku-uvredu-ne-zadovoljava-ni-osnovne-funkcije)
41. [Tek je predstavljen, a već izazvao buru: Tko brani, a tko osporava novi Maksimir | 01Portal](https://01portal.hr/tek-je-predstavljen-a-vec-izazvao-buru-tko-brani-a-tko-osporava-novi-maksimir/)
42. [Mogao je izgledati i ovako: Hrvatski arhitekti pokazali svoje vizije novog Maksimira | tportal](https://www.tportal.hr/vijesti/clanak/mogao-je-izgledati-i-ovako-hrvatski-arhitekti-pokazali-svoje-vizije-novog-maksimira-20260925)
43. [The New Maksimir Stadium Is Causing Controversy - But There Were 88 Designs - YouTube](https://www.youtube.com/watch?v=8kniwzTy8u4)
44. [VG13 Architects – Archive](https://www.vg13.ch/archive/)
45. [New Maksimir Stadium design selected after international competition | Croatia Week](https://www.croatiaweek.com/croatia-new-maksimir-stadium-winning-design/)
46. [Croatia: Design for Dinamo Zagreb’s new stadium unveiled](https://stadiumdb.com/news/2026/09/croatia_design_for_dinamo_zagrebs_new_stadium_unveiled)
47. [VG13 Architects lands contract for new Stadion Maksimir - The Stadium Business](https://www.thestadiumbusiness.com/2026/09/25/vg13-architects-lands-contract-for-new-stadion-maksimir/)
48. [Architecture Competition Maksimir Stadium and Svetice SRC](https://stadion-maksimir.zagreb.hr/en)
49. [Ovako su Slovenci reagirali na novi Maksimir](https://gol.dnevnik.hr/clanak/rubrika/nogomet/ovako-su-slovenci-reagirali-na-novi-maksimir-je-li-ovo-kartonska-kutija---1003712.html)
50. [Ne prestaju stizati reakcije na novi Maksimir, pazite što pišu naši susjedi](https://net.hr/sport/nogomet/reakcije-iz-hrvatskog-susjednstva-na-novi-maksimir-0d9fad24-b8b6-11f1-936f-9600040c8f8e)
51. [Pokrenuta peticija protiv novog Maksimira: Evo koliko je potpisa dosad prikupljeno \~ Scena.ba](https://scena.ba/pokrenuta-peticija-protiv-novog-maksimira-evo-koliko-je-potpisa-dosad-prikupljeno/)
52. [Bad Blue Boysi se oglasili o novom stadionu u Maksimiru | Vijesti Hercegovina.Info](https://www.hercegovina.info/sport/nogomet/bad-blue-boysi-se-oglasili-o-novom-stadionu-u-maksimiru/263237/)
53. [Poznat pobjednik natječaja za stadion Maksimir i SRC Svetice - Kamenjar](https://kamenjar.com/poznat-pobjednik-natjecaja-za-stadion-maksimir-i-src-svetice/)
54. [Izabrano idejno rješenje novog Maksimira | Dinamo Zagreb](https://gnkdinamo.hr/hr/vijesti/izabrano-idejno-rjesenje-novog-maksimira-2)
55. [Results of the architectural-urban design competition for SRC Svetice – Maksimir Stadium presented | Dinamo Zagreb](https://gnkdinamo.hr/en/news/predstavljeni-rezultati-arhitektonsko-urbanistickog-natjecaja-za-src-svetice-stadion-maksimir)
56. [Rezultati natječaja - Maksimir Architectural Competition](https://stadion-maksimir.zagreb.hr/en/rezultati-natjecaja/128)
57. [Boban odgovorio na burne reakcije zbog Maksimira: 'Bit će korekcija, sve će se približiti onome što ljudi žele'](https://www.tportal.hr/vijesti/clanak/boban-odgovorio-na-burne-reakcije-bit-ce-korekcija-sve-ce-se-pribliziti-onome-sto-ljudi-zele-20260925)
58. [USRED ŽESTOKIH KRITIKA Tvorci novog stadiona stižu u Zagreb: 'Javnost nije sve vidjela, proučavali smo rad hrvatskog arhitekta…'](https://www.nacional.hr/usred-zestokih-kritika-tvorci-novog-stadiona-stizu-u-zagreb-javnost-nije-sve-vidjela-proucavali-smo-rad-hrvatskog-arhitekta/)
59. [Poznat pobjednik natječaja za stadion Maksimir i SRC Svetice – Prigorski.hr](https://prigorski.hr/poznat-pobjednik-natjecaja-za-stadion-maksimir-i-src-svetice/)
60. [Stadion Maksimir - ZonaDinamo](https://www.zonadinamo.com/discussion/comment/972302)
61. [Novi Maksimir: stadion od 35.000 mjesta projektirat će talijanski VG13 Architects](https://www.construction.hr/novosti/novi-maksimir-stadion-od-35000-mjesta-projektirat-ce-talijanski-vg13-architects/a/12014)
62. [Tko su arhitekti novog Maksimira? Milanski studio dosad nije projektirao nijedan veliki stadion - Net.hr](https://net.hr/danas/vijesti/tko-su-arhitekti-novog-maksimira-mladi-milanski-studio-dosad-nije-projektirao-nijedan-veliki-stadion-d808ef4e-b824-11f1-936f-9600040c8f8e)
63. [Dinamo najavio člansku tribinu o stadionu pa utihnuo. Evo što se događa - Index.hr](https://www.index.hr/sport/clanak/dinamo-najavio-clansku-tribinu-o-stadionu-pa-utihnuo-evo-sto-se-dogadja/2838975.aspx)
64. [ANKETA Sviđa li vam se novi Maksimir? - Index.hr](https://www.index.hr/sport/clanak/anketa-svidja-li-vam-se-novi-maksimir/2838314.aspx)
65. [Dinamo organizira javnu tribinu o novom stadionu, dolazi Boban - Index.hr](https://www.index.hr/sport/clanak/dinamo-organizira-javnu-tribinu-o-novom-stadionu-dolazi-boban/2838371.aspx)
66. [FOTO Ovo rješenje Maksimira Tomašević je platio 390.400 eura: Navijači su ogorčeni. Teške riječi padaju... - Hrvatska danas](https://hrvatska-danas.com/2026/09/24/foto-ovo-rjesenje-maksimira-tomasevic-je-platio-390-400-eura-navijaci-su-ogorceni-teske-rijeci-padaju/)
67. [Oglasili se Boysi, Boban nije mogao dobiti jasniju poruku! - Nogometne vijesti](https://nogometne-vijesti.hr/oglasili-se-boysi-boban-nije-mogao-dobiti-jasniju-poruku/)
68. [Boban odgovorio Boysima: 'Ono što je neupitna istina jest...'](https://direktno.hr/sport/boban-odgovorio-boysima-ono-sto-je-neupitna-istina-jest-405232/)
69. [FOTO Ovako će izgledati novi stadion Dinama: ''Ovo smo mi, ovo je naš Maksimir''](https://gol.dnevnik.hr/clanak/rubrika/nogomet/gledajte-uzivo-dinamo-predstavlja-kako-ce-izgledati-novi-stadion-maksimir---1003540.html)
70. [Član žirija za novi Maksimir: "Zamjena rada ne dolazi u obzir. Krafne ili palačinke nisu nam potrebne" - Vijesti iz Hrvatske, regije i svijeta - N1 info](https://n1info.hr/vijesti/clan-zirija-za-novi-maksimir-zamjena-rada-ne-dolazi-u-obzir-krafne-ili-palacinke-nisu-nam-potrebne)

