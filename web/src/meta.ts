// Naslov, opis, canonical i OG kartica za svaku rutu. Isti izvor koriste
// preglednik (applyMeta pri svakoj promjeni rute) i prerender u buildu.

import { docs, docIndex } from "./docs";
import { radovi, byCode, rankLabel, tidy } from "./radoviView";
import { awards } from "./rezultati";
import { link } from "./routes";

export const SITE = "https://maksimir.domovina.ai";
const BRAND = "maksimir.DOMOVINA.ai";
const HOME_TITLE = "maksimir.DOMOVINA.ai — natječajna dokumentacija 2026";
const HOME_DESC =
  "Stadion Maksimir & SRC Svetice — Single Source of Truth za međunarodni arhitektonsko-urbanistički natječaj 2026.";
const DEFAULT_IMAGE = "/rezultati/1/cover.jpg";

export type PageMeta = {
  title: string;
  description: string;
  image: string;
  /** Put bez vodeće kose crte, isti kao za link(). */
  path: string;
  /** false: stranica ne ide u indeks (404, pojedinačne objave glasa). */
  index: boolean;
};

/** Sve rute koje se prerenderiraju i ulaze u sitemap. */
export function allRoutes(): string[] {
  return [
    "",
    "rezultati",
    ...awards.map((a) => `rezultati/${a.rank}`),
    "radovi",
    ...radovi.map((r) => `radovi/${r.code}`),
    "glasanje",
    ...docs.flatMap((s) => s.items.map((d) => d.slug)),
  ];
}

export function pageMeta(slug: string): PageMeta {
  const m = (title: string, description: string, image = DEFAULT_IMAGE): PageMeta => ({
    title: `${title} · ${BRAND}`,
    description: clip(description),
    image,
    path: slug,
    index: true,
  });
  const notFound = (): PageMeta => ({ ...m("Stranica nije pronađena", HOME_DESC), index: false });

  if (!slug) return { title: HOME_TITLE, description: HOME_DESC, image: DEFAULT_IMAGE, path: "", index: true };

  if (slug === "rezultati")
    return m(
      "Rezultati natječaja: 5 nagrađenih radova",
      "Pet nagrađenih radova međunarodnog natječaja za Stadion Maksimir i SRC Svetice 2026., s pobjedničkim radom VG13 Architects, svim panelima i ocjenom suda."
    );
  if (slug.startsWith("rezultati/")) {
    const a = awards.find((x) => String(x.rank) === slug.slice("rezultati/".length));
    if (!a) return notFound();
    return m(`${a.rank}. nagrada: ${a.studio}`, a.summary, `/rezultati/${a.rank}/cover.jpg`);
  }

  if (slug === "radovi")
    return m(
      "Svih 88 natječajnih radova",
      "Svih 88 radova natječaja za Stadion Maksimir i SRC Svetice 2026.: autori, šifre, rang, službena slika i obrazloženje ocjenjivačkog suda za svaki rad."
    );
  if (slug.startsWith("radovi/")) {
    const r = byCode[slug.slice("radovi/".length)];
    if (!r) return notFound();
    const where = r.countries.join(", ");
    return m(
      `${tidy(r.lead)} (${r.code}), ${rankLabel(r)}`,
      `${rankLabel(r)[0].toUpperCase()}${rankLabel(r).slice(1)} na natječaju za Stadion Maksimir 2026.${where ? ` ${where}.` : ""} ${r.jury_hr ?? r.rejection ?? ""}`,
      r.image ? `/radovi/${r.code}.jpg` : DEFAULT_IMAGE
    );
  }

  if (slug === "glasanje")
    return m(
      "Glasanje javnosti za novi Stadion Maksimir",
      "Svaki građanin s eOsobnom ima 100 bodova za 88 natječajnih radova. Provjerljivo do Bitcoina.",
      "/og-glasanje.png"
    );
  // Objava ima svoju OG karticu na /g/<id> (Pages Function); ova ruta se ne indeksira.
  if (slug.startsWith("glasanje/g/"))
    return {
      ...m(
        "Objava glasa za novi Maksimir",
        "Glas javnosti za natječajne radove Stadiona Maksimir, potvrđen eOsobnom ili anonimnim ZK dokazom.",
        "/og-glasanje.png"
      ),
      index: false,
    };

  const doc = docIndex[slug];
  if (!doc) return notFound();
  const lead = firstParagraph(doc.raw);
  return m(doc.title, doc.subtitle ? `${doc.subtitle}. ${lead}` : lead);
}

/** Upisuje meta podatke rute u <head> (u pregledniku i u prerenderu). */
export function applyMeta(slug: string): PageMeta {
  const p = pageMeta(slug);
  const url = SITE + link(p.path);
  const image = SITE + p.image;
  document.title = p.title;
  setMeta("name", "description", p.description);
  setMeta("name", "robots", p.index ? null : "noindex");
  setLink("canonical", p.index ? url : null);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", BRAND);
  setMeta("property", "og:locale", "hr_HR");
  setMeta("property", "og:url", url);
  setMeta("property", "og:title", p.title);
  setMeta("property", "og:description", p.description);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", p.title);
  setMeta("name", "twitter:description", p.description);
  setMeta("name", "twitter:image", image);
  return p;
}

function setMeta(attr: "name" | "property", key: string, value: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (value === null) return el?.remove();
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

function setLink(rel: string, href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (href === null) return el?.remove();
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

// Prvi odlomak običnog teksta iz markdowna (bez naslova, tablica, koda, citata).
function firstParagraph(raw: string): string {
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/```[\s\S]*?```/g, "");
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || /^(#|\||>|<|-{3,}|[-*+] |\d+\. |!\[)/.test(t)) continue;
    const text = t
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, a, __, b) => b ?? a)
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 40) return text;
  }
  return HOME_DESC;
}

function clip(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
}
