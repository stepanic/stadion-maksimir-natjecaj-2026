// Stranice "Svi radovi": svih 88 natječajnih rješenja iz službenih EOJN
// dokumenata (/radovi) i detalj pojedinog rada (/radovi/<šifra>).
// Podaci: sources/radovi.json (gradi scripts/build_radovi.py).

import radoviData from "../../sources/radovi.json";
import { renderRadVotePanel } from "./glasanjeView";
import { link } from "./routes";

type Role = { name: string; role: string };
export type Rad = {
  n: number;
  code: string;
  rank: number | null;
  round_out: number | null;
  award: number | null;
  status: "ranked" | "rejected";
  lead: string;
  roles: Role[];
  submitter: string | null;
  countries: string[];
  city_country: string | null;
  received: string | null;
  prize_eur_gross: number | null;
  jury_hr: string | null;
  jury_en: string | null;
  rejection: string | null;
  prilog3_pages: number[] | null;
  image: boolean;
  links: { url: string; type: string }[];
};

export const radovi = radoviData as Rad[];
export const byCode: Record<string, Rad> = Object.fromEntries(radovi.map((r) => [r.code, r]));

export const EOJN_URL = "https://eojn.hr/tender-eo/76778";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

// "RANDIĆ I SURADNICI d. o. o." -> "Randić i suradnici d. o. o." (samo za CAPS nazive)
export function tidy(s: string): string {
  // Jednorječni nazivi i kratice (XDGA, ZHA, SV60) ostaju kako jesu.
  if (s !== s.toUpperCase() || !/\s/.test(s.trim())) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s(+\-/])(\p{L})/gu, (_, p, c) => p + c.toUpperCase())
    .replace(/\b(D\.? ?O\.? ?O\.?|S\.?R\.?L\.?|SLP|GMBH|LTD|DOO|D\.D\.)\b/gi, (m) => m.toLowerCase());
}

const isCroatian = (r: Rad) => r.countries.includes("Hrvatska");
export const rankLabel = (r: Rad) =>
  r.status === "rejected" ? "odbijen" : r.award ? `${r.award}. nagrada` : `${r.rank}. mjesto`;

function people(r: Rad): string {
  const authors = r.roles.filter((x) => /autor/i.test(x.role)).map((x) => tidy(x.name));
  return authors.join(", ");
}

type Filter = "svi" | "hr" | "int" | "nagrade";
let state: { q: string; f: Filter } = { q: "", f: "svi" };

function matches(r: Rad): boolean {
  if (state.f === "hr" && !isCroatian(r)) return false;
  if (state.f === "int" && isCroatian(r)) return false;
  if (state.f === "nagrade" && !r.award) return false;
  if (!state.q) return true;
  const hay = [r.lead, r.code, r.submitter ?? "", ...r.roles.map((x) => x.name), ...r.countries]
    .join(" ")
    .toLowerCase();
  return state.q
    .toLowerCase()
    .split(/\s+/)
    .every((t) => hay.includes(t));
}

function card(r: Rad): string {
  return `
    <a class="rad-card${r.award ? " rad-card--award" : ""}${r.status === "rejected" ? " rad-card--rejected" : ""}" href="${link(`radovi/${r.code}`)}">
      <div class="rad-thumb">
        ${r.image ? `<img src="/radovi/${r.code}-t.jpg" alt="${esc(r.lead)} — natječajni rad" loading="lazy" />` : ""}
        <span class="rad-rank">${r.status === "rejected" ? "✕" : r.award ? `${r.award}. nagrada` : `#${r.rank}`}</span>
      </div>
      <div class="rad-body">
        <div class="rad-lead">${esc(tidy(r.lead))}</div>
        ${people(r) ? `<div class="rad-people">${esc(people(r))}</div>` : ""}
        <div class="rad-meta">${esc(r.countries.join(" · "))} · <code>${r.code}</code></div>
      </div>
    </a>`;
}

export function renderRadoviIndex(el: HTMLElement) {
  const countries = new Set(radovi.flatMap((r) => r.countries));
  const hr = radovi.filter(isCroatian).length;
  el.innerHTML = `
    <div class="rad-intro">
    <section class="hero results-hero">
      <div class="hero-eyebrow">Službeni izvor: EOJN RH, tender 76778 · objavljeno 25. 9. 2026.</div>
      <h1>Svih 88 natječajnih radova</h1>
      <p class="hero-lede">
        Svaki predani rad sa službenom slikom, autorima, rangom (1–85) i obrazloženjem
        ocjenjivačkog suda. Tri rada su odbijena iz formalnih razloga.
      </p>
      <p class="hero-cta"><a class="btn btn-primary" href="${link("glasanje")}">Glasaj: raspodijeli svojih 100 bodova →</a></p>
    </section>

    <section class="card-grid">
      <div class="kpi"><div class="kpi-label">Radova</div><div class="kpi-value">88</div><div class="kpi-meta">85 rangirano · 3 odbijena</div></div>
      <div class="kpi"><div class="kpi-label">Zemalja u timovima</div><div class="kpi-value">${countries.size}</div><div class="kpi-meta">uklj. partnere u timu</div></div>
      <div class="kpi"><div class="kpi-label">S hrvatskim sudionikom</div><div class="kpi-value">${hr}</div><div class="kpi-meta">barem jedan član tima iz HR</div></div>
      <div class="kpi"><div class="kpi-label">Nagrade</div><div class="kpi-value">5</div><div class="kpi-meta"><a href="${link("rezultati")}">svi paneli nagrađenih →</a></div></div>
    </section>
    </div>

    <div class="rad-toolbar">
      <input id="rad-q" type="search" placeholder="Traži ured, autora, zemlju ili šifru…" value="${esc(state.q)}" aria-label="Pretraga radova" />
      <div class="rad-filters" role="group" aria-label="Filter">
        ${(
          [
            ["svi", "Svi"],
            ["nagrade", "Nagrađeni"],
            ["hr", "S hrvatskim sudionikom"],
            ["int", "Samo inozemni"],
          ] as [Filter, string][]
        )
          .map(([k, l]) => `<button data-f="${k}" class="${state.f === k ? "on" : ""}">${l}</button>`)
          .join("")}
      </div>
      <div class="rad-count muted small" id="rad-count"></div>
    </div>

    <section class="rad-grid" id="rad-grid"></section>

    <p class="muted small results-source">
      Izvor: <a href="${EOJN_URL}" target="_blank" rel="noopener">EOJN RH 76778 ↗</a>. Podaci su iz dokumenata
      „Zapisnik o pregledu i ocjeni”, „Zapisnik o rangiranju” i „Prilog III. Opisne ocjene i grafički prilozi
      natječajnih rješenja”, koje je naručitelj javno objavio uz odluku o rezultatima (Pravilnik NN 154/2025, čl. 81.).
      Autorska prava na radove pripadaju autorima. Rang 6–85 je redoslijed ocjenjivačkog suda, a ne nagrada.
    </p>
  `;

  const grid = el.querySelector<HTMLElement>("#rad-grid")!;
  const count = el.querySelector<HTMLElement>("#rad-count")!;
  const draw = () => {
    const list = radovi.filter(matches);
    grid.innerHTML = list.map(card).join("") || `<p class="muted">Nema rezultata.</p>`;
    count.textContent = `${list.length} od ${radovi.length}`;
  };
  el.querySelector<HTMLInputElement>("#rad-q")!.addEventListener("input", (e) => {
    state.q = (e.target as HTMLInputElement).value.trim();
    draw();
  });
  el.querySelectorAll<HTMLButtonElement>(".rad-filters button").forEach((b) =>
    b.addEventListener("click", () => {
      state.f = b.dataset.f as Filter;
      el.querySelectorAll(".rad-filters button").forEach((x) => x.classList.toggle("on", x === b));
      draw();
    })
  );
  draw();
}

const LINK_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  studio_website: "web stranica autora",
  article: "članak",
  archdaily: "ArchDaily",
};

export function renderRad(el: HTMLElement, code: string): Rad | null {
  const r = byCode[code];
  if (!r) {
    el.innerHTML = `<div class="notfound"><h1>Rad nije pronađen</h1><p><a href="${link("radovi")}">← Svi radovi</a></p></div>`;
    return null;
  }
  const i = radovi.indexOf(r);
  const prev = radovi[i - 1];
  const next = radovi[i + 1];
  const roles = r.roles.length
    ? r.roles.map((x) => `<tr><td>${esc(tidy(x.name))}</td><td class="muted">${esc(x.role)}</td></tr>`).join("")
    : `<tr><td colspan="2">${esc(tidy(r.submitter || r.lead))}</td></tr>`;

  el.innerHTML = `
    <div class="doc-header award-header">
      <div class="doc-eyebrow">${esc(rankLabel(r))} · šifra <code>${r.code}</code></div>
      <h1 class="doc-title">${esc(tidy(r.lead))}</h1>
      <p class="doc-subtitle">${esc(r.countries.join(" · "))}</p>
    </div>

    ${
      r.image
        ? `<figure class="award-hero rad-hero"><a href="/radovi/${r.code}.jpg" target="_blank" rel="noopener"><img src="/radovi/${r.code}.jpg" alt="${esc(r.lead)} — natječajni rad" /></a>
           <figcaption class="muted small">Službena slika iz Priloga III${r.prilog3_pages ? `, str. ${r.prilog3_pages[0]}` : ""}. Klik za punu veličinu.</figcaption></figure>`
        : ""
    }

    ${
      r.award
        ? `<p><a class="btn btn-primary" href="${link(`rezultati/${r.award}`)}">Pogledaj svih 10 panela ovog rada →</a></p>`
        : ""
    }

    <div class="panel gl-rad-panel" id="gl-rad-panel"></div>

    ${
      r.rejection
        ? `<div class="panel rad-rejected"><h2>Rad je odbijen</h2><p>${esc(r.rejection)}</p></div>`
        : ""
    }

    <div class="grid-2 award-facts">
      <div class="panel">
        <h2>Ocjena ocjenjivačkog suda</h2>
        ${r.jury_hr ? `<p class="jury">${esc(r.jury_hr)}</p>` : `<p class="muted">Nema opisne ocjene.</p>`}
        ${r.jury_en ? `<details><summary>English</summary><p class="jury">${esc(r.jury_en)}</p></details>` : ""}
      </div>
      <div class="panel">
        <h2>Tim</h2>
        <table class="kv rad-roles"><tbody>${roles}</tbody></table>
        <table class="kv"><tbody>
          <tr><th>Rang</th><td>${esc(rankLabel(r))}${r.rank ? ` (od 85)` : ""}</td></tr>
          ${r.status === "ranked" ? `<tr><th>Ocjenjivanje</th><td>${r.round_out ? `ispao u ${r.round_out}. krugu (od 5)` : r.award ? "nagrađen" : "došao do završnog kruga"}</td></tr>` : ""}
          <tr><th>Predano</th><td>${esc(r.received ?? "—")}</td></tr>
          <tr><th>Redni broj</th><td>${r.n}</td></tr>
        </tbody></table>
        ${
          r.links.length
            ? `<h3>Objave i mediji</h3><ul>${r.links
                .map(
                  (l) =>
                    `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(LINK_LABEL[l.type] ?? new URL(l.url).hostname)} ↗</a></li>`
                )
                .join("")}</ul>`
            : ""
        }
      </div>
    </div>

    <nav class="award-nav">
      ${prev ? `<a class="btn" href="${link(`radovi/${prev.code}`)}">← ${esc(rankLabel(prev))}</a>` : `<span></span>`}
      <a class="btn" href="${link("radovi")}">Svi radovi</a>
      ${next ? `<a class="btn" href="${link(`radovi/${next.code}`)}">${esc(rankLabel(next))} →</a>` : `<span></span>`}
    </nav>
  `;
  void renderRadVotePanel(el.querySelector<HTMLElement>("#gl-rad-panel")!, r.code);
  return r;
}
