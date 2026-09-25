// Stranice "Rezultati natječaja": pregled nagrađenih radova (#/rezultati)
// i galerija svih panela pojedinog rada (#/rezultati/<rank>) s lightboxom.

import { awards, coverUrl, pageUrl, thumbUrl, RESULTS_SOURCE, type Award } from "./rezultati";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export function renderResultsIndex(el: HTMLElement) {
  const cards = awards
    .map(
      (a) => `
      <a class="award-card${a.rank === 1 ? " award-card--winner" : ""}" href="#/rezultati/${a.rank}">
        <div class="award-cover">
          <img src="${coverUrl(a.rank)}" alt="${esc(a.studio)} — render natječajnog rada" loading="${a.rank <= 2 ? "eager" : "lazy"}" />
          <span class="award-rank">${a.rank}.</span>
        </div>
        <div class="award-body">
          <div class="award-label">${esc(a.label)} · <code>${a.code}</code></div>
          <h2 class="award-studio">${esc(a.studio)}</h2>
          <div class="award-country">${esc(a.country)}</div>
          <p class="award-summary">${esc(a.summary)}</p>
          <span class="award-more">Pogledaj svih ${a.pages} panela →</span>
        </div>
      </a>`
    )
    .join("");

  el.innerHTML = `
    <section class="hero results-hero">
      <div class="hero-eyebrow">Objavljeno 24. 9. 2026. · Ocjenjivački sud, DAZ</div>
      <h1>Rezultati natječaja</h1>
      <p class="hero-lede">
        Pet nagrađenih idejnih rješenja za novi stadion Maksimir i SRC Svetice. Uz svaki rad
        su svi natječajni paneli u punoj rezoluciji.
      </p>
    </section>

    <section class="card-grid">
      <div class="kpi"><div class="kpi-label">Pristiglih radova</div><div class="kpi-value">88</div><div class="kpi-meta">iz više od 20 zemalja</div></div>
      <div class="kpi"><div class="kpi-label">Nagrađeno</div><div class="kpi-value">5</div><div class="kpi-meta">otkupi nisu objavljeni</div></div>
      <div class="kpi"><div class="kpi-label">Pobjednik</div><div class="kpi-value">VG13</div><div class="kpi-meta">Milano · Fantini, Rossi</div></div>
      <div class="kpi"><div class="kpi-label">Stadion</div><div class="kpi-value">~35.000</div><div class="kpi-meta">procjena 175 mil. € bez PDV-a</div></div>
    </section>

    <section class="award-list">${cards}</section>

    <section class="panel">
      <h2>A ostala 83 rada?</h2>
      <div id="non-awarded">${NON_AWARDED_HTML}</div>
    </section>

    <p class="muted small results-source">
      Izvor: <a href="${RESULTS_SOURCE}" target="_blank" rel="noopener">službena objava rezultata ↗</a>.
      Slike su stranice službenih PDF-ova nagrađenih radova, prikazane radi informiranja javnosti;
      autorska prava pripadaju autorima. Pozadina i reakcije:
      <a href="#/research-08-rezultati">research 08 — Rezultati natječaja</a>.
    </p>
  `;
}

// Stanje 25.9.2026. — nenagrađeni radovi službeno nisu objavljeni; vidi research/08 §8.
const NON_AWARDED_HTML = `
  <p><strong>Službeno zasad nisu objavljeni.</strong> Na dan 25. 9. 2026. javni su samo podaci i PDF-ovi pet nagrađenih radova. Popisa ostalih 83 šifre i autora, galerije i završnog izvješća nema. Na EOJN-u je dostupan samo „Zapisnik o pregledu i ocjeni”, i to uz prijavu.</p>
  <p><strong>Ali po propisima moraju biti.</strong> Pravilnik o natječajima (NN 154/2025) traži da se uz rezultate objave završno izvješće i grafički prilozi rješenja (čl. 81.). Traži i da se na stranicama HKA omogući uvid u <em>sva</em> pristigla rješenja te da se održi izložba svih rješenja (čl. 84.). DAZ je kod prošlih natječaja (Dom zdravlja Vrbani, park Šestine) objavio sve radove. <strong>Izložba svih 88 radova s maketama</strong> najavljena je „za otprilike mjesec dana”.</p>
  <p>Do tada su dostupni samo radovi koje su autori sami objavili:</p>
  <ul class="self-published">
    <li><strong>Zaha Hadid Architects</strong> + UPI2M, Buro Happold, Arup — <a href="https://www.instagram.com/p/DdrR35mADzJ/" target="_blank" rel="noopener">Instagram ↗</a></li>
    <li><strong>3LHD</strong> — <a href="https://www.instagram.com/p/DdrYCvxFfDA/" target="_blank" rel="noopener">Instagram ↗</a> · <a href="https://www.linkedin.com/posts/3lhd_deminutiv-inspekting-tering-activity-7508928803059093504-YuPT" target="_blank" rel="noopener">LinkedIn ↗</a></li>
    <li><strong>GEplus arhitekti</strong> + DBA Architects — <a href="https://www.instagram.com/p/DdrLnnbjki8/" target="_blank" rel="noopener">Instagram ↗</a></li>
    <li><strong>Urbane ideje</strong> + Kengo Kuma &amp; Associates — <a href="https://www.tportal.hr/kultura/clanak/foto-pogledajte-kako-su-urbane-ideje-i-slavni-japanski-arhitekti-zamislili-novi-maksimir-foto-20260924" target="_blank" rel="noopener">tportal ↗</a></li>
    <li><strong>Otto Barić</strong> i tim — <a href="https://www.tportal.hr/kultura/clanak/foto-ovako-je-maksimir-zamislio-poznati-hrvatski-arhitekt-malo-je-drugaciji-od-pobjednika-20260924" target="_blank" rel="noopener">tportal ↗</a></li>
    <li><strong>Proarh</strong> — <a href="https://www.jutarnji.hr/vijesti/zagreb/nevidene-vizije-maksimira-objavljeni-odbaceni-projekti-3lhd-proarh-geplus-urbane-ideje-kengo-kuma-15749656" target="_blank" rel="noopener">Jutarnji, galerija ↗</a></li>
    <li><strong>IEC Architects + Engineers</strong> — <a href="https://www.index.hr/sport/clanak/foto-egipcani-imaju-posebnu-ideju-za-maksimir-evo-sto-bi-sve-taj-stadion-imao/2838626.aspx" target="_blank" rel="noopener">Index ↗</a> <span class="muted">(porijeklo ureda nije provjereno)</span></li>
  </ul>
  <p class="muted small">Zbirno: <a href="https://net.hr/sport/nogomet/kako-je-mogao-izgledati-novi-maksimir-pogledajte-projekte-koji-nisu-pobijedili-9014428a-b857-11f1-936f-9600040c8f8e" target="_blank" rel="noopener">net.hr — projekti koji nisu pobijedili ↗</a>. Propisi, rokovi i kako zatražiti sve radove: <a href="#/research-08-rezultati">research 08, §8</a>.</p>
`;

export function renderAward(el: HTMLElement, rank: number): boolean {
  const a = awards.find((x) => x.rank === rank);
  if (!a) {
    el.innerHTML = `<div class="notfound"><h1>Rad nije pronađen</h1><p><a href="#/rezultati">← Svi nagrađeni radovi</a></p></div>`;
    return false;
  }
  const prev = awards.find((x) => x.rank === rank - 1);
  const next = awards.find((x) => x.rank === rank + 1);

  el.innerHTML = `
    <div class="doc-header award-header">
      <div class="doc-eyebrow">${esc(a.label)}</div>
      <h1 class="doc-title">${esc(a.studio)}</h1>
      <p class="doc-subtitle">${esc(a.country)}</p>
    </div>

    <figure class="award-hero">
      <img src="${coverUrl(a.rank)}" alt="${esc(a.studio)} — render" />
    </figure>

    <div class="grid-2 award-facts">
      <div class="panel">
        <h2>O radu</h2>
        <p>${esc(a.summary)}</p>
        <ul>${a.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      </div>
      <div class="panel">
        <h2>Podaci</h2>
        <table class="kv"><tbody>
          <tr><th>Šifra rada</th><td><code>${a.code}</code></td></tr>
          <tr><th>Autori</th><td>${a.authors.map(esc).join("<br>")}</td></tr>
          ${a.rights ? `<tr><th>Nositelji prava</th><td>${a.rights.map(esc).join("<br>")}</td></tr>` : ""}
          <tr><th>Paneli</th><td>${a.pages} × A0 (službeni PDF)</td></tr>
        </tbody></table>
        <p class="award-actions">
          <a class="btn btn-primary" href="${a.pdf}" target="_blank" rel="noopener">Preuzmi službeni PDF ↗</a>
        </p>
      </div>
    </div>

    <h2 class="gallery-title">Svi natječajni paneli</h2>
    <p class="muted small">Klikni panel za prikaz preko cijelog zaslona, pa klikni sliku za zumiranje detalja. Strelice ← → listaju, Esc zatvara.</p>
    <div class="gallery">
      ${range(a.pages)
        .map(
          (p) => `
        <button class="gallery-item" data-page="${p}" aria-label="Panel ${p} od ${a.pages}">
          <img src="${thumbUrl(a.rank, p)}" alt="Panel ${p}" loading="lazy" />
          <span>${String(p).padStart(2, "0")}/${a.pages}</span>
        </button>`
        )
        .join("")}
    </div>

    <nav class="award-nav">
      ${prev ? `<a class="btn" href="#/rezultati/${prev.rank}">← ${prev.rank}. ${esc(prev.studio)}</a>` : `<span></span>`}
      <a class="btn" href="#/rezultati">Svi radovi</a>
      ${next ? `<a class="btn" href="#/rezultati/${next.rank}">${next.rank}. ${esc(next.studio)} →</a>` : `<span></span>`}
    </nav>
  `;

  el.querySelectorAll<HTMLButtonElement>(".gallery-item").forEach((b) =>
    b.addEventListener("click", () => openLightbox(a, Number(b.dataset.page)))
  );
  return true;
}

let lb: HTMLDivElement | null = null;
let lbState: { award: Award; page: number } | null = null;

function ensureLightbox(): HTMLDivElement {
  if (lb) return lb;
  lb = document.createElement("div");
  lb.className = "lightbox";
  lb.hidden = true;
  lb.innerHTML = `
    <div class="lb-bar">
      <span class="lb-caption"></span>
      <a class="lb-full" target="_blank" rel="noopener">Puna veličina ↗</a>
      <button class="lb-close" aria-label="Zatvori">✕</button>
    </div>
    <button class="lb-prev" aria-label="Prethodni panel">‹</button>
    <div class="lb-stage"><img alt="" /></div>
    <button class="lb-next" aria-label="Sljedeći panel">›</button>
  `;
  document.body.appendChild(lb);
  lb.querySelector(".lb-close")!.addEventListener("click", closeLightbox);
  lb.querySelector(".lb-prev")!.addEventListener("click", () => step(-1));
  lb.querySelector(".lb-next")!.addEventListener("click", () => step(1));
  const stage = lb.querySelector<HTMLDivElement>(".lb-stage")!;
  stage.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeLightbox();
    else stage.classList.toggle("zoomed");
  });
  document.addEventListener("keydown", (e) => {
    if (!lbState) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let x0: number | null = null;
  lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  });
  window.addEventListener("hashchange", closeLightbox);
  return lb;
}

function show() {
  if (!lb || !lbState) return;
  const { award, page } = lbState;
  const src = pageUrl(award.rank, page);
  lb.querySelector(".lb-stage")!.classList.remove("zoomed");
  lb.querySelector<HTMLImageElement>(".lb-stage img")!.src = src;
  lb.querySelector<HTMLImageElement>(".lb-stage img")!.alt = `${award.studio} — panel ${page}`;
  lb.querySelector<HTMLAnchorElement>(".lb-full")!.href = src;
  lb.querySelector(".lb-caption")!.textContent =
    `${award.rank}. nagrada · ${award.studio} · panel ${page}/${award.pages}`;
}

function step(d: number) {
  if (!lbState) return;
  const n = lbState.award.pages;
  lbState.page = ((lbState.page - 1 + d + n) % n) + 1;
  show();
}

export function openLightbox(award: Award, page: number) {
  const el = ensureLightbox();
  lbState = { award, page };
  show();
  el.hidden = false;
  document.body.classList.add("lb-open");
}

function closeLightbox() {
  if (!lb) return;
  lb.hidden = true;
  lbState = null;
  document.body.classList.remove("lb-open");
}
