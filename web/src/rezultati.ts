// Nagrađeni radovi natječaja (objava 24.9.2026.).
// Slike su stranice službenih PDF-ova s stadion-maksimir.zagreb.hr, renderirane
// u web/public/rezultati/<rank>/ (p-01..p-10 puna veličina, t-01..t-10 sličice,
// cover.jpg izrez rendera za kartice).

export const RESULTS_SOURCE =
  "https://stadion-maksimir.zagreb.hr/hr/rezultati-natjecaja-128/128";

export type Award = {
  rank: number;
  label: string;
  code: string;
  studio: string;
  country: string;
  authors: string[];
  rights?: string[];
  summary: string;
  highlights: string[];
  pdf: string;
  pages: number;
};

const pdf = (n: number) =>
  `https://stadion-maksimir.zagreb.hr/UserDocsImages//dokumenti/${n}nagrada.pdf`;

export const awards: Award[] = [
  {
    rank: 1,
    label: "1. nagrada — pobjednički rad",
    code: "6TVJ3MUHR",
    studio: "VG13 Architects Studio Associato",
    country: "Milano, Italija",
    authors: ["Tommaso Fantini", "Alberto Rossi"],
    rights: [
      "Suradnici: Nicola Andjelic, Giovanni Campagna, Niccolò Pasti, Tommaso Sala, Massimiliano Selenati",
    ],
    summary:
      "Četiri samostalne tribine koje se prema terenu spajaju u kompaktnu, strmu arenu, a prema gradu razmiču i otvaraju „rascjepima”. Sjeverna tribina je zasebna cjelina, kao veza s Turininim Maksimirom. Svetice su riješene kao kontinuirani park i šuma s kompaktnim sklopom dvorana i dijagonalno zarotiranim atletskim stadionom.",
    highlights: [
      "~35.000 mjesta, sva sjedeća i natkrivena · UEFA kategorija 4",
      "Procjena: stadion 175 mil. €, s okolišem ~204 mil. € (bez PDV-a)",
      "Novi prometni hub na jugu (tramvaj, autobus, vlak) s podzemnom garažom; krov garaže je ulazni trg",
      "Ugovor za idejni, glavni i izvedbeni projekt ~12,6 mil. €",
      "Studio osnovan 2017.; autori rođeni 1992.; dosad nisu projektirali stadion",
    ],
    pdf: pdf(1),
    pages: 10,
  },
  {
    rank: 2,
    label: "2. nagrada",
    code: "GY0F1A9OM",
    studio: "XDGA — Xaveer De Geyter Architects",
    country: "Bruxelles, Belgija",
    authors: ["Ovlaštena osoba: Antoine Chaudemanche"],
    rights: ["Nositelj autorskih prava: XDGA, Quai du Commerce 48, 1000 Bruxelles"],
    summary:
      "Stadion kao kvadratni volumen s kružnom zdjelom unutra, postavljen u „tepih drveća”. Cijeli kompleks organiziran je oko središnjeg zelenog poteza (Central Strip) od prometnog čvorišta na jugu do ulaza u park Maksimir. Motiv je „kontinuirana šuma i hram”.",
    highlights: [
      "Središnja os, tepih drveća, urbani okvir i mreža javnih prostora kao četiri principa masterplana",
      "Tornjevi i vrata (Towers and Gates) kao ulazi u stadion",
      "Atletski stadion kao ovalni objekt uz prugu na jugu",
    ],
    pdf: pdf(2),
    pages: 10,
  },
  {
    rank: 3,
    label: "3. nagrada",
    code: "W3YS5VJBZ",
    studio: "Plan Común · Studio Muoto · DATA architectes",
    country: "Santiago / Pariz",
    authors: ["Plan Común", "Studio Muoto", "DATA architectes", "Beatriz Borque", "Beatriz Saladich"],
    rights: [
      "Nositelji autorskih prava: EGITURA, 6 rue du Sentier, 75002 Pariz (Marc Leyral)",
      "ATMOS LAB, Unit 12, 24–28 Pritchard’s Road, London E2 9AP (Florencia Collo)",
    ],
    summary:
      "„A Stadium in the Park” — stadion kao „nježni stroj” i „sportski hram 21. stoljeća” u Maksimirskom parku, s društvenom platformom oko tribina. Svetice su razrađene kao sustav paviljona, a na jugu je predviđeno reverzibilno parkiralište.",
    highlights: [
      "Stadion unutar Maksimirskog parka, okružen drvoredima i pješačkim trgom",
      "Sustav paviljona za SRC Svetice",
      "Reverzibilno parkiranje na jugu",
    ],
    pdf: pdf(3),
    pages: 10,
  },
  {
    rank: 4,
    label: "4. nagrada",
    code: "6PPWVBBBZ",
    studio: "njiric plus arhitekti d.o.o.",
    country: "Zagreb, Hrvatska",
    authors: ["Hrvoje Njirić", "Iskra Filipović"],
    rights: ["Nositelj autorskih prava: njiric plus arhitekti d.o.o., Petrova ulica 140, Zagreb"],
    summary:
      "Jedini nagrađeni hrvatski rad. Kružni stadion pod kupolastim rešetkastim krovom, uz koji stoji visoki toranj kao gradski orijentir. Tramvaj vozi do samog trga pred stadionom.",
    highlights: [
      "Kružni tlocrt sa zakrivljenim rešetkastim krovom",
      "Toranj kao vertikalni reper uz stadion",
      "Tramvajska stanica na trgu pred stadionom",
    ],
    pdf: pdf(4),
    pages: 10,
  },
  {
    rank: 5,
    label: "5. nagrada",
    code: "CYFXC7LIM",
    studio: "LAN · P2PA",
    country: "Pariz, Francuska / Poljska",
    authors: ["LAN S.A.R.L. d’architecture", "P2PA sp. z o.o."],
    summary:
      "Stadion s monumentalnim crvenim pročeljem od niza trokutastih lukova koji tvore natkriveni trijem za navijače. Rad polazi od povijesne analize Maksimira i SRC Svetice.",
    highlights: [
      "Crveni trijem od trokutastih lukova po cijelom obodu",
      "Povijesna analiza lokacije kao polazište",
    ],
    pdf: pdf(5),
    pages: 10,
  },
];

export const pageUrl = (rank: number, page: number) =>
  `/rezultati/${rank}/p-${String(page).padStart(2, "0")}.jpg`;
export const thumbUrl = (rank: number, page: number) =>
  `/rezultati/${rank}/t-${String(page).padStart(2, "0")}.jpg`;
export const coverUrl = (rank: number) => `/rezultati/${rank}/cover.jpg`;
