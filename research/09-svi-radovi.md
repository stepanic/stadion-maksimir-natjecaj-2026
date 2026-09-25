# 09 — Svih 88 natječajnih radova

> **Generirano** iz `sources/radovi.json` skriptom `scripts/build_radovi.py`. Ne uređivati ručno.
> Izvor: EOJN RH, tender 76778, dokumenti odluke o rezultatima objavljeni **25.9.2026.**:
> „Zapisnik o pregledu i ocjeni”, „Zapisnik o rangiranju” i „Prilog III. Opisne ocjene i grafički prilozi natječajnih rješenja”.
> Galerija sa slikama i ocjenama žirija je na stranici **[Svih 88 radova](#/radovi)**.

- **88 radova:** 85 rangiranih, 3 odbijena (dvije makete nisu stigle u roku, jedan rad nije imao sve priloge).
- Obavijest o rezultatima navodi **27 radova iz Hrvatske, 41 iz drugih zemalja EU i 20 izvan EU**. Nagrade ukupno iznose 728.000,52 € bez PDV-a.
- Zemlje u timovima (uključujući partnere): Hrvatska 33, Italija 13, Španjolska 10, Velika Britanija 10, Njemačka 7, Francuska 4, Srbija 4, Slovenija 3, Austrija 3, Nizozemska 2, Bugarska 2, Portugal 2, Crna Gora 2, Kina 2, Meksiko 2, Belgija 1, Poljska 1, Češka 1, Švicarska 1, Brazil 1, Makedonija 1, Mađarska 1, Japan 1, Bosna i Hercegovina 1, Ujedinjeni Arapski Emirati 1, Kanada 1, Sjedinjene Američke Države (SAD) 1, Hong Kong 1, Norveška 1, Egipat 1, Kosovo 1, Litva 1.
- Rang 6–85 je redoslijed ocjenjivačkog suda, a ne nagrada. Ocjenjivanje je išlo u 5 krugova: u 1. je ispalo 11 radova, u 2. 18, u 3. 20, u 4. 11, a u 5. 8. Rangovi 6–17 došli su do završnog kruga.

## Kako do izvornih dokumenata

Stranica `https://eojn.hr/tender-eo/76778` svakom posjetitelju dodijeli privremeni gostujući token. Link koji tablica prikazuje vodi na prijavu, ali kraći oblik `https://eojn.hr/GetDocument.ashx?id=<DmsId>&userToken=<token>` vraća datoteku bez prijave. DmsId-ove daje javni API `GET /api/searchgrid/VAwardDecisions/get?filter=["TenderId","=",76778]` (token ide u zaglavlje `UserToken`). Zapisnik sadrži i OIB-e i adrese fizičkih osoba, pa se u repo **ne commita**. Ovdje su samo imena, uloge, zemlje i ocjene.

## Popis (po rangu)

| Rang | Šifra | Nositelj / podnositelj | Autori | Zemlje |
|---|---|---|---|---|
| **1. nagrada** | [`6TVJ3MUHR`](#/radovi/6TVJ3MUHR) | VG13 Architects Studio Associato |  | Italija |
| **2. nagrada** | [`GY0F1A9OM`](#/radovi/GY0F1A9OM) | XDGA |  | Belgija |
| **3. nagrada** | [`W3YS5VJBZ`](#/radovi/W3YS5VJBZ) | Plan Común | Plan Común, Studio Muoto, DATA architectes, Beatriz Borque, Beatriz Saladich | Francuska, Velika Britanija, Španjolska |
| **4. nagrada** | [`6PPWVBBBZ`](#/radovi/6PPWVBBBZ) | njiric plus arhitekti, d.o.o. | HRVOJE NJIRIĆ, ISKRA FILIPOVIĆ | Hrvatska |
| **5. nagrada** | [`CYFXC7LIM`](#/radovi/CYFXC7LIM) | P2PA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ | LAN S.A.R.L D'ARCHITECTURE, P2PA Spółka z ograniczoną odpowiedzialnością | Poljska, Francuska |
| 6 | [`GGWUGWAZB`](#/radovi/GGWUGWAZB) | de Architekten Cie. B.V. | SUNČANA RAPAIĆ, Branimir Medić | Nizozemska, Hrvatska |
| 7 | [`TCG3ZSILM`](#/radovi/TCG3ZSILM) | Jorge Vidal Studio |  | Španjolska |
| 8 | [`HV4FFIHDN`](#/radovi/HV4FFIHDN) | RANDIĆ I SURADNICI d. o. o. |  | Hrvatska |
| 9 | [`J8B0FD4Q0`](#/radovi/J8B0FD4Q0) | CHYBIK + KRISTOF s.r.o. |  | Češka |
| 10 | [`EEADH5IWW`](#/radovi/EEADH5IWW) | ing4studio d.o.o. | Vladimir Kasun, Darko Latin, KLARA KRIŠTO, EMA KOKOT, LUNA MAYER, BARBARA LONČARIĆ, BARBARA MANDIĆ, JOSIP MIKLEC | Hrvatska |
| 11 | [`K2MEDVFXI`](#/radovi/K2MEDVFXI) | ANDREA CAPUTO | ANDREA CAPUTO, SOFIA ALBRIGO, 8Y2NTY | Italija, Švicarska |
| 12 | [`I6PSUQ0QD`](#/radovi/I6PSUQ0QD) | SV60 ARQUITECTOS |  | Španjolska |
| 13 | [`OYPODSV1H`](#/radovi/OYPODSV1H) | ADAT Studio srl |  | Italija, Hrvatska, Brazil, Francuska, Velika Britanija |
| 14 | [`PPWTPROZF`](#/radovi/PPWTPROZF) | ARHITEKTURA NOVA DOOEL Veles |  | Makedonija |
| 15 | [`WYYB64CFR`](#/radovi/WYYB64CFR) | ARK Arhitektura Krušec d.o.o. |  | Slovenija |
| 16 | [`SS6SBB19I`](#/radovi/SS6SBB19I) | KÖZTI Zrt. |  | Mađarska |
| 17 | [`LPMLOBLZN`](#/radovi/LPMLOBLZN) | ATMOSFERA d.o.o. | Davor Silov, Bernarda Silov | Hrvatska |
| 18 · 5. krug | [`LV4YKMRVD`](#/radovi/LV4YKMRVD) | Global Connect d.o.o. |  | Hrvatska |
| 19 · 5. krug | [`KEQYRXFPS`](#/radovi/KEQYRXFPS) | MEDPROSTOR, arhitekturni atelje d.o.o. |  | Slovenija |
| 20 · 5. krug | [`QK1YMPGVJ`](#/radovi/QK1YMPGVJ) | Patricio José Martínez García |  | Španjolska |
| 21 · 5. krug | [`PWC6XWGWN`](#/radovi/PWC6XWGWN) | Atelier Thomas Pucher ZT GmbH |  | Austrija |
| 22 · 5. krug | [`2OXZFNNDT`](#/radovi/2OXZFNNDT) | ARQUIVIO ARCHITECTS SLP |  | Španjolska |
| 23 · 5. krug | [`TJML1KADC`](#/radovi/TJML1KADC) | MOSSESSIAN ARCHITECTURE LIMITED |  | Velika Britanija |
| 24 · 5. krug | [`9TZIJAPW4`](#/radovi/9TZIJAPW4) | Incept Arhitecture |  | Bugarska |
| 25 · 5. krug | [`JGLUCNGVP`](#/radovi/JGLUCNGVP) | dejan miletic |  | Srbija |
| 26 · 4. krug | [`ATQ1VGDWW`](#/radovi/ATQ1VGDWW) | Gordana Gregurić Miočić | Stipe Gašpar, Roko Guberina, Barbara Bobanac, Marin Ševo, Gordana Gregurić Miočić, Filip Omazić, ERICK VELASCO FARRERA, DINO ŠPADINA | Hrvatska |
| 27 · 4. krug | [`FSFJLMC2K`](#/radovi/FSFJLMC2K) | 2K ARHITEKTONSKI URED d.o.o. |  | Hrvatska, Velika Britanija |
| 28 · 4. krug | [`HKJS1WQOK`](#/radovi/HKJS1WQOK) | Patricia da Silva, Arquitectura, Unipessoal LDA |  | Portugal |
| 29 · 4. krug | [`9B9EEI64G`](#/radovi/9B9EEI64G) | STUDIO 3LHD d.o.o. |  | Hrvatska |
| 30 · 4. krug | [`72ECW1UD7`](#/radovi/72ECW1UD7) | URBANE IDEJE d.o.o. | KENGO KUMA, NIKOLA MATUHINA, ROKO DROPULJIĆ, ANA PODOBNIK, MISLAV MURŠIĆ | Hrvatska, Japan |
| 31 · 4. krug | [`SIAWCHRWI`](#/radovi/SIAWCHRWI) | CBA Christian Bergmann Architecture GmbH | Dr. Christian Bergmann | Njemačka |
| 32 · 4. krug | [`K1THJGC7W`](#/radovi/K1THJGC7W) | Studio Kaić arhitekti d.o.o. |  | Hrvatska |
| 33 · 4. krug | [`FQORKZEN0`](#/radovi/FQORKZEN0) | ZHA Architects Limited | ZHA Architects Limited | Velika Britanija, Hrvatska |
| 34 · 4. krug | [`GJLXCWWPR`](#/radovi/GJLXCWWPR) | Office for Metropolitan Architecture (O.M.A.) Stedebouw B.V. | David Gianotten, PERO VUKOVIĆ | Nizozemska, Hrvatska |
| 35 · 4. krug | [`YJEKYQPFE`](#/radovi/YJEKYQPFE) | Sofija Poleksić | Đorđe Gregović, Sofija Poleksić | Crna Gora, Bosna i Hercegovina |
| 36 · 4. krug | [`PJ7KODKT5`](#/radovi/PJ7KODKT5) | China Southwest Architectural Design and Research Institute Corp.Ltd |  | Kina |
| 37 · 3. krug | [`S7EE9DARZ`](#/radovi/S7EE9DARZ) | Pablo Ramos Alderete | Pablo Ramos Alderete, Jaime Ramos Alderete, Jorge Ramos Alderete | Španjolska |
| 38 · 3. krug | [`Y7ZXWDDBL`](#/radovi/Y7ZXWDDBL) | Zoran Dmitrovic |  | Srbija |
| 39 · 3. krug | [`Y7CWWEEP5`](#/radovi/Y7CWWEEP5) | ECOLA |  | Hrvatska, Portugal |
| 40 · 3. krug | [`RYX76HLBI`](#/radovi/RYX76HLBI) | O+M Architekten GmbH |  | Njemačka |
| 41 · 3. krug | [`82WWCRXWE`](#/radovi/82WWCRXWE) | SIRRAH-PROJEKT d.o.o. |  | Hrvatska |
| 42 · 3. krug | [`CIXSLMQWW`](#/radovi/CIXSLMQWW) | BOKOROM DOO | Aleksandra Čobeljić Rakočević, Petar Rakočević, Pavle Tvrdišić | Crna Gora |
| 43 · 3. krug | [`TVHRJYYJT`](#/radovi/TVHRJYYJT) | Degli Esposti Architetti S.r.l. | Prof. Arch. PhD Elisa Cristiana Cattaneo, Arch. PhD Lorenzo Degli Esposti | Italija |
| 44 · 3. krug | [`BPKNHCZ5Y`](#/radovi/BPKNHCZ5Y) | Tariq Khayyat Design Partners FZ-LLC |  | Ujedinjeni Arapski Emirati |
| 45 · 3. krug | [`G8UJEOMVM`](#/radovi/G8UJEOMVM) | GEplus arhitekti d.o.o |  | Hrvatska, Srbija |
| 46 · 3. krug | [`UXADSRW1U`](#/radovi/UXADSRW1U) | ATOM ARHITEKTURA d.o.o. | HRVOJE MARINOVIĆ, STJEPAN MIKETEK, ANA TOMŠIĆ, KATARINA KOVAČIĆ | Hrvatska |
| 47 · 3. krug | [`JYXGFPAWY`](#/radovi/JYXGFPAWY) | shesa srls |  | Italija |
| 48 · 3. krug | [`I4EEQIWWW`](#/radovi/I4EEQIWWW) | baukuh |  | Italija, Velika Britanija, Španjolska, Hrvatska, Njemačka |
| 49 · 3. krug | [`M6ILWNLRB`](#/radovi/M6ILWNLRB) | STUDIO ZA ARHITEKTURU d.o.o. | Igor Franić, Ivan Franić | Hrvatska |
| 50 · 3. krug | [`WGBJHGUL5`](#/radovi/WGBJHGUL5) | RMJM MANTOVA STP S.R.L. |  | Italija |
| 51 · 3. krug | [`HSQMCGBCH`](#/radovi/HSQMCGBCH) | OPERADORA DE PRODUCTOS Y SERVICIOS AARM |  | Meksiko |
| 52 · 3. krug | [`Q1BIEWBQI`](#/radovi/Q1BIEWBQI) | JA Architecture StudioInc |  | Kanada |
| 53 · 3. krug | [`MJ76JGHEI`](#/radovi/MJ76JGHEI) | Mihaela Sladović | Mihaela Sladović, Greta Grbavac, Ana Komadina, Dorijan Emanuel Rotim | Hrvatska |
| 54 · 3. krug | [`KPEEULHEN`](#/radovi/KPEEULHEN) | Dietrich/Untertrifaller Architekten ZT GmbH |  | Austrija |
| 55 · 3. krug | [`DPZC5ZDGB`](#/radovi/DPZC5ZDGB) | IPOSTUDIO Architetti srl |  | Italija |
| 56 · 3. krug | [`MJY2USY2W`](#/radovi/MJY2USY2W) | Engineering Design & Research Institute of Sichuan University | Yong Wang, Min Wang, Guirong Yu, Jun Luo, Yang Li, Denghui Qian, Wenqiao Cui, Lei Zhao, Jia You, Yangjunchun Liu, Qin He | Kina |
| 57 · 2. krug | [`EKQ6QK4AJ`](#/radovi/EKQ6QK4AJ) | Pedro Pitarch Alonso |  | Španjolska |
| 58 · 2. krug | [`XTCOLQ2HZ`](#/radovi/XTCOLQ2HZ) | Archea Associati srl |  | Italija |
| 59 · 2. krug | [`WP6WKTZ3Z`](#/radovi/WP6WKTZ3Z) | BJARKE INGELS GROUP ARCHITECTURE SPAIN SLP | Bjarke Ingels | Španjolska, Hrvatska |
| 60 · 2. krug | [`NONDB5MRF`](#/radovi/NONDB5MRF) | Studio Stoitsova |  | Velika Britanija |
| 61 · 2. krug | [`HTKIZRN8V`](#/radovi/HTKIZRN8V) | Matej Mauhar | Marko Ostović, Antonio Matešić, Lea Zadravec, Josip Botić, Matej Mauhar, Ivor Škaro | Hrvatska |
| 62 · 2. krug | [`H66BNHW0U`](#/radovi/H66BNHW0U) | ingenhoven associates GmbH |  | Njemačka |
| 63 · 2. krug | [`KRQEHDKDD`](#/radovi/KRQEHDKDD) | Moxon Architects Ltd |  | Velika Britanija |
| 64 · 2. krug | [`Y1AYSU2BI`](#/radovi/Y1AYSU2BI) | Margaret Arbanas |  | Hrvatska, Francuska |
| 65 · 2. krug | [`2AAVTUGWB`](#/radovi/2AAVTUGWB) | Dunja Jelisavcic | Zoran Šobić, Predrag Stevanović | Srbija |
| 66 · 2. krug | [`SVFGQA8HM`](#/radovi/SVFGQA8HM) | PROJEKT D.D. NOVA GORICA Podjetje za inženiring | Andrea Sili Scavalli, Tobia Zordan, Vincenzo Corvino, Giovanni Multari, Fabio De Falco, Aldo Giordano, Andrej Koglot, Teja Savelli | Slovenija, Italija |
| 67 · 2. krug | [`OUEE4GMGC`](#/radovi/OUEE4GMGC) | ppp architekten + generalplaner gmbh |  | Njemačka |
| 68 · 2. krug | [`UO5YMEAMR`](#/radovi/UO5YMEAMR) | JEFF ALAN GARD |  | Sjedinjene Američke Države (SAD) |
| 69 · 2. krug | [`CGCSJW79U`](#/radovi/CGCSJW79U) | TVORZI - Architecture | Dmytro Shakal | Bugarska |
| 70 · 2. krug | [`WWUUTZSNC`](#/radovi/WWUUTZSNC) | PROARH MATEKOVIĆ D.O.O. |  | Hrvatska |
| 71 · 2. krug | [`ZDWBDEPPE`](#/radovi/ZDWBDEPPE) | RUBING PROJEKT d.o.o. | DAMIR RUBEŠA, TIHOMIR RZOUNEK | Hrvatska |
| 72 · 2. krug | [`LOUOR2NOD`](#/radovi/LOUOR2NOD) | Gerber Architekten International GmbH |  | Njemačka |
| 73 · 2. krug | [`WDYQY56G6`](#/radovi/WDYQY56G6) | SWOODING ARCHITECTS LIMITED |  | Hong Kong |
| 74 · 2. krug | [`X8G5VVECK`](#/radovi/X8G5VVECK) | Pulsar Arhitektura d.o.o. |  | Hrvatska, Norveška, Velika Britanija |
| 75 · 1. krug | [`AXAHFUYJP`](#/radovi/AXAHFUYJP) | DOMO-PLAN d.o.o. |  | Hrvatska |
| 76 · 1. krug | [`X5Z6CZDRU`](#/radovi/X5Z6CZDRU) | Gianfranco Toso | Gianfranco Toso, Andrea Troccia, Nicola Zaccaria, Patrizio Maria Puppo, Beatrice Wielich | Italija |
| 77 · 1. krug | [`7ITCHBTWU`](#/radovi/7ITCHBTWU) | ZBIR studio d.o.o. | MARIJA BABIĆ, SAMANTHA LICARDO, Teodora Misirkić, LUKA BERIĆ, Filip Ćiković, ANTONIO OMIĆEVIĆ, MATIJA BABIĆ | Hrvatska, Italija |
| 78 · 1. krug | [`WWZGJZ9EO`](#/radovi/WWZGJZ9EO) | IEC Architects + Engineers | Fahd Abo El Azm, Mahmoud Faysal | Egipat |
| 79 · 1. krug | [`IN6KISUJT`](#/radovi/IN6KISUJT) | Nikola Polak |  | Hrvatska |
| 80 · 1. krug | [`QTHYEBYMC`](#/radovi/QTHYEBYMC) | VENDO PET d.o.o. | ASTRIT NIXHA | Hrvatska, Kosovo |
| 81 · 1. krug | [`KLHI95BLM`](#/radovi/KLHI95BLM) | ANDARCHITECTS LTD |  | Velika Britanija, Španjolska |
| 82 · 1. krug | [`1EEPNNDDB`](#/radovi/1EEPNNDDB) | Tim-Philipp Brendel |  | Njemačka |
| 83 · 1. krug | [`SS9MPMWOY`](#/radovi/SS9MPMWOY) | DONIS LTD |  | Meksiko |
| 84 · 1. krug | [`G2CPLFGEK`](#/radovi/G2CPLFGEK) | STEFANO BOERI ARCHITETTI | STEFANO BOERI ARCHITETTI, SYSTEMATICA SPA, NOVEMBRE STUDIO SRL | Italija |
| 85 · 1. krug | [`JFHSTDJMQ`](#/radovi/JFHSTDJMQ) | Albert Wimmer ZT GmbH |  | Austrija |
| odbijen | [`0ZUFNG8CC`](#/radovi/0ZUFNG8CC) | SMAR Architecture Studio |  | Litva |
| odbijen | [`AV3DOWDM4`](#/radovi/AV3DOWDM4) | Radionica arhitekture d.o.o. | Ivan Čilić, Josip Sabolić, Vid Šešelj, Tin Vukušić, Goran Rako | Hrvatska |
| odbijen | [`E5WW92OVA`](#/radovi/E5WW92OVA) | Mirko Marić |  | Hrvatska |
