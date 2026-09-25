// Manifest of repository markdown documents that get bundled into the site.
// Each entry maps a URL slug to its imported raw markdown content.
// Use Vite's `?raw` import suffix to inline file contents at build time.

import readme from "../../README.md?raw";
import sot from "../../SOT.md?raw";
import roadmap from "../../ROADMAP.md?raw";
import todo from "../../TODO.md?raw";

import research01 from "../../research/01-ocjenjivacki-sud.md?raw";
import research02 from "../../research/02-referentni-stadioni.md?raw";
import research03 from "../../research/03-lokacija-povijest.md?raw";
import research04 from "../../research/04-tehnicki-okvir.md?raw";
import research05 from "../../research/05-mediji-politika.md?raw";
import research06 from "../../research/06-status-natjecaja.md?raw";
import research07 from "../../research/07-kronologija-objava.md?raw";
import research08 from "../../research/08-rezultati-natjecaja.md?raw";
import research09 from "../../research/09-svi-radovi.md?raw";
import ops20260826 from "../../docs/2026-08-26-provjera-statusa-i-deploy.md?raw";
import ops20260925 from "../../docs/2026-09-25-rezultati-i-svi-radovi.md?raw";
import opsSeoPlan from "../../docs/2026-09-25-seo-rute-plan.md?raw";
import glasanjeKakoRadi from "../../docs/glasanje-kako-radi.md?raw";
import glasanjeOdluke from "../../docs/2026-09-25-glasanje-javnosti.md?raw";
import glasanjeReadme from "../../glasanje/README.md?raw";

import ccReadme from "../../research/cross-check/README.md?raw";
import ccSynthesis from "../../research/cross-check/SYNTHESIS.md?raw";
import ccA from "../../research/cross-check/A-tehnicki-brojke-REPORT.md?raw";
import ccB from "../../research/cross-check/B-plejic-perovic-REPORT.md?raw";
import ccC from "../../research/cross-check/C-konzervatorski-REPORT.md?raw";

import srcSazetak from "../../sources/00-sazetak-cinjenica.md?raw";
import srcUvjeti from "../../sources/uvjeti-natjecaja.md?raw";
import srcProgram from "../../sources/program-natjecaja.md?raw";

export type DocEntry = {
  slug: string;
  title: string;
  subtitle?: string;
  repoPath: string;
  raw: string;
  section: string;
};

export type DocSection = {
  id: string;
  title: string;
  items: DocEntry[];
};

export const docs: DocSection[] = [
  {
    id: "core",
    title: "Glavna dokumentacija",
    items: [
      {
        slug: "readme",
        title: "README",
        subtitle: "Pregled repozitorija",
        repoPath: "README.md",
        raw: readme,
        section: "core",
      },
      {
        slug: "sot",
        title: "SOT — Single Source of Truth",
        subtitle: "Master sažetak, brojke, rizici, navigacija",
        repoPath: "SOT.md",
        raw: sot,
        section: "core",
      },
      {
        slug: "roadmap",
        title: "ROADMAP",
        subtitle: "Strategijski plan do predaje (Gantt, swimlanes)",
        repoPath: "ROADMAP.md",
        raw: roadmap,
        section: "core",
      },
      {
        slug: "todo",
        title: "TODO",
        subtitle: "Granularni operativni checklist po fazama",
        repoPath: "TODO.md",
        raw: todo,
        section: "core",
      },
    ],
  },
  {
    id: "research",
    title: "Dubinska istraživanja",
    items: [
      {
        slug: "research-01-sud",
        title: "01 — Ocjenjivački sud",
        subtitle: "Sastav, biografije, prošli natječaji, sklonosti",
        repoPath: "research/01-ocjenjivacki-sud.md",
        raw: research01,
        section: "research",
      },
      {
        slug: "research-02-reference",
        title: "02 — Referentni stadioni",
        subtitle: "Europski 25–50k stadioni, troškovi, tipologije",
        repoPath: "research/02-referentni-stadioni.md",
        raw: research02,
        section: "research",
      },
      {
        slug: "research-03-lokacija",
        title: "03 — Lokacija i povijest",
        subtitle: "Maksimir kao mjesto, urbanistički kontekst, povijesni slojevi",
        repoPath: "research/03-lokacija-povijest.md",
        raw: research03,
        section: "research",
      },
      {
        slug: "research-04-tehnika",
        title: "04 — Tehnički okvir",
        subtitle: "UEFA SIR 2025, konstrukcija, MEP, održivost",
        repoPath: "research/04-tehnicki-okvir.md",
        raw: research04,
        section: "research",
      },
      {
        slug: "research-05-mediji",
        title: "05 — Mediji i politika",
        subtitle: "Politički kontekst, stakeholderi, narativ",
        repoPath: "research/05-mediji-politika.md",
        raw: research05,
        section: "research",
      },
      {
        slug: "research-06-status",
        title: "06 — Status natječaja",
        subtitle: "Živi log stanja — rezultati objavljeni 24.9.2026.",
        repoPath: "research/06-status-natjecaja.md",
        raw: research06,
        section: "research",
      },
      {
        slug: "research-07-kronologija",
        title: "07 — Kronologija objava",
        subtitle: "Sve nove objave 27.5. → 25.8.2026., uklj. HKIG dopis",
        repoPath: "research/07-kronologija-objava.md",
        raw: research07,
        section: "research",
      },
      {
        slug: "research-08-rezultati",
        title: "08 — Rezultati natječaja",
        subtitle: "88 radova, 5 nagrada, VG13 pobjednik — činjenice, izjave, reakcije",
        repoPath: "research/08-rezultati-natjecaja.md",
        raw: research08,
        section: "research",
      },
      {
        slug: "research-09-svi-radovi",
        title: "09 — Svih 88 radova",
        subtitle: "Popis po rangu: šifre, autori, zemlje (službeni EOJN zapisnik)",
        repoPath: "research/09-svi-radovi.md",
        raw: research09,
        section: "research",
      },
    ],
  },
  {
    id: "cross-check",
    title: "Cross-check (Desktop Research)",
    items: [
      {
        slug: "cc-readme",
        title: "Cross-check README",
        subtitle: "Metoda nezavisne verifikacije",
        repoPath: "research/cross-check/README.md",
        raw: ccReadme,
        section: "cross-check",
      },
      {
        slug: "cc-synthesis",
        title: "SYNTHESIS — diff verifikacije",
        subtitle: "Konsolidirani diff: što potvrđeno, što ispravljeno",
        repoPath: "research/cross-check/SYNTHESIS.md",
        raw: ccSynthesis,
        section: "cross-check",
      },
      {
        slug: "cc-a-tehnicki",
        title: "A — Tehničke brojke",
        subtitle: "Cross-check kapaciteta, troškova, UEFA kriterija",
        repoPath: "research/cross-check/A-tehnicki-brojke-REPORT.md",
        raw: ccA,
        section: "cross-check",
      },
      {
        slug: "cc-b-plejic",
        title: "B — Plejić & Perović",
        subtitle: "Bio cross-check predsjednika OS i UHA",
        repoPath: "research/cross-check/B-plejic-perovic-REPORT.md",
        raw: ccB,
        section: "cross-check",
      },
      {
        slug: "cc-c-konzervatorski",
        title: "C — Konzervatorski okvir",
        subtitle: "Z-1528, zaštita, preventivna zaštita",
        repoPath: "research/cross-check/C-konzervatorski-REPORT.md",
        raw: ccC,
        section: "cross-check",
      },
    ],
  },
  {
    id: "glasanje",
    title: "Glasanje javnosti",
    items: [
      {
        slug: "glasanje-kako-radi",
        title: "Kako tehnički radi glasanje",
        subtitle: "Korak po korak s dijagramima: eOsobna, lanac hasheva, Bitcoin, ZK dokaz",
        repoPath: "docs/glasanje-kako-radi.md",
        raw: glasanjeKakoRadi,
        section: "glasanje",
      },
      {
        slug: "glasanje-provjera",
        title: "Provjerljivi zapis i upravljanje",
        subtitle: "Formula hasha, satni checkpointi, neovisna provjera",
        repoPath: "glasanje/README.md",
        raw: glasanjeReadme,
        section: "glasanje",
      },
      {
        slug: "glasanje-odluke",
        title: "Odluke, mjerenja i zamke",
        subtitle: "Zašto baš ovako, testovi utrke, što je koštalo vremena (25.9.2026.)",
        repoPath: "docs/2026-09-25-glasanje-javnosti.md",
        raw: glasanjeOdluke,
        section: "glasanje",
      },
    ],
  },
  {
    id: "docs",
    title: "Operativa",
    items: [
      {
        slug: "ops-status-deploy",
        title: "Provjera statusa i deploy",
        subtitle: "Kanali provjere, docs.ts zamka, Cloudflare Pages (26.8.2026.)",
        repoPath: "docs/2026-08-26-provjera-statusa-i-deploy.md",
        raw: ops20260826,
        section: "docs",
      },
      {
        slug: "ops-rezultati-radovi",
        title: "Rezultati i svih 88 radova",
        subtitle: "EOJN bez prijave, build_radovi.py, autorska prava, zamke (25.9.2026.)",
        repoPath: "docs/2026-09-25-rezultati-i-svi-radovi.md",
        raw: ops20260925,
        section: "docs",
      },
      {
        slug: "ops-seo-rute-plan",
        title: "Plan: prave SEO rute",
        subtitle: "Hash rute → pravi URL-ovi + prerender, bez Astra (25.9.2026.)",
        repoPath: "docs/2026-09-25-seo-rute-plan.md",
        raw: opsSeoPlan,
        section: "docs",
      },
    ],
  },
  {
    id: "sources",
    title: "Službeni izvori",
    items: [
      {
        slug: "src-sazetak",
        title: "Sažetak činjenica",
        subtitle: "Konsolidirani izvod iz natječajne dokumentacije",
        repoPath: "sources/00-sazetak-cinjenica.md",
        raw: srcSazetak,
        section: "sources",
      },
      {
        slug: "src-uvjeti",
        title: "Uvjeti natječaja",
        subtitle: "Puni tekst — 26 stranica",
        repoPath: "sources/uvjeti-natjecaja.md",
        raw: srcUvjeti,
        section: "sources",
      },
      {
        slug: "src-program",
        title: "Natječajni program",
        subtitle: "Puni tekst — ~92 kB",
        repoPath: "sources/program-natjecaja.md",
        raw: srcProgram,
        section: "sources",
      },
    ],
  },
];

export const docIndex: Record<string, DocEntry> = Object.fromEntries(
  docs.flatMap((s) => s.items).map((d) => [d.slug, d])
);

// Map of repo file path -> slug, used to rewrite internal markdown links.
export const pathToSlug: Record<string, string> = Object.fromEntries(
  docs.flatMap((s) => s.items).map((d) => [d.repoPath, d.slug])
);
