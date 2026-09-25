// Landing page (slug "/") rendered as HTML, not markdown.
// Surfaces the most important info: deadlines, key facts, submission steps.

export const landingHtml = /* html */ `
<a class="results-banner" href="#/rezultati">
  <img src="/rezultati/1/cover.jpg" alt="Pobjednički rad VG13 — render stadiona" />
  <div>
    <div class="hero-eyebrow">Novo · 24. 9. 2026.</div>
    <strong>Objavljeni rezultati: 88 radova, 5 nagrada. Pobjednik je VG13 Architects (Milano).</strong>
    <span>Pogledaj sve nagrađene radove i sve njihove panele →</span>
  </div>
</a>

<section class="hero">
  <div class="hero-eyebrow">Single Source of Truth · ažurirano 2026-05-26</div>
  <h1>Stadion Maksimir &amp; SRC Svetice</h1>
  <p class="hero-lede">
    Međunarodni arhitektonsko-urbanistički natječaj 2026. — sva radna dokumentacija,
    istraživanja i operativni plan na jednom mjestu, od koncepta do predaje.
  </p>
  <div class="hero-cta">
    <a class="btn btn-primary" href="#/sot">Otvori SOT →</a>
    <a class="btn" href="#/roadmap">Roadmap</a>
    <a class="btn" href="#/todo">TODO checklist</a>
  </div>
</section>

<section class="card-grid">
  <div class="kpi">
    <div class="kpi-label">Rok predaje (EOJN)</div>
    <div class="kpi-value">17. 7. 2026.</div>
    <div class="kpi-meta">Petak · ponoć</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Rok predaje makete</div>
    <div class="kpi-value">28. 7. 2026.</div>
    <div class="kpi-meta">11 dana nakon EOJN-a</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Kapacitet stadiona</div>
    <div class="kpi-value">35.000</div>
    <div class="kpi-meta">UEFA Category 4 (Elite)</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Nagradni fond</div>
    <div class="kpi-value">976.000 €</div>
    <div class="kpi-meta">bruto · 5 nagrada (1. = 390.400 €)</div>
  </div>
</section>

<section class="panel">
  <h2>Koraci predaje</h2>
  <ol class="steps">
    <li>
      <div class="step-no">1</div>
      <div>
        <strong>Registracija na EOJN</strong>
        <p>
          Otvoriti račun gospodarskog subjekta na <a href="https://eojn.hr" target="_blank" rel="noopener">eojn.hr</a>
          (potreban e-OI ili kvalificirani certifikat). Pronaći tender <strong>76778</strong>, postaviti se kao
          zainteresirani ponuditelj. Preuzeti sve podloge (geodetski snimci, katastar, DWG, obrasce).
        </p>
      </div>
    </li>
    <li>
      <div class="step-no">2</div>
      <div>
        <strong>Stručna pitanja</strong>
        <p>
          Rok za pitanja: <strong>21. 4. 2026.</strong> Pitanja se šalju isključivo kroz EOJN poruke; odgovori objavljuju
          se javno. Sva pitanja iskoristiti za reduciranje rizika (UEFA SIR interpretacije, prometna
          rješenja, konzervatorski okvir Z-1528, preklapanja s SRC Svetice).
        </p>
      </div>
    </li>
    <li>
      <div class="step-no">3</div>
      <div>
        <strong>Razvoj rješenja</strong>
        <p>
          Tri zone — <strong>C realizacija</strong> (stadion), <strong>A + D anketni</strong> (SRC Svetice + Borongaj).
          Vidi <a href="#/roadmap">ROADMAP</a> za sve faze i <a href="#/todo">TODO</a> za sedmične isporuke.
          Kritični paketi: koncept (do tjedna 9), arhitektura (10–14), tehnika i ekonomika (15–17),
          finalizacija (18–19).
        </p>
      </div>
    </li>
    <li>
      <div class="step-no">4</div>
      <div>
        <strong>Predaja digitalnih elaborata kroz EOJN</strong>
        <p>
          Rok: <strong>17. 7. 2026.</strong> Sva grafička, tekstualna i prilozna dokumentacija u zadanim
          formatima (vidi <a href="#/src-uvjeti">Uvjete natječaja</a>, t. 1.6 i 2.1). Šifra rada, anonimizacija
          metapodataka, jedan PDF po prilogu, table u zadanoj predaji.
        </p>
      </div>
    </li>
    <li>
      <div class="step-no">5</div>
      <div>
        <strong>Predaja makete</strong>
        <p>
          Rok: <strong>28. 7. 2026.</strong> Maketa zone C + interpretativni model SRC Svetice u zadanom
          mjerilu, isporuka na adresu DAZ-a u zatvorenoj ambalaži označenoj šifrom rada (nije EOJN!).
        </p>
      </div>
    </li>
    <li>
      <div class="step-no">6</div>
      <div>
        <strong>Ocjenjivanje i objava</strong>
        <p>
          Ocjenjivački sud (predsjednik <strong>Toma Plejić</strong>, Studio UP) donosi odluku
          do <strong>kraja srpnja 2026.</strong> Javno predstavljanje i izložba: <strong>od 15. 9. 2026.</strong>
          Vidi <a href="#/research-01-sud">istraživanje 01 — Ocjenjivački sud</a>.
        </p>
      </div>
    </li>
  </ol>
</section>

<section class="grid-2">
  <div class="panel">
    <h2>Ključne brojke</h2>
    <table class="kv">
      <tbody>
        <tr><th>Naručitelj</th><td>Grad Zagreb + Vlada RH (50:50)</td></tr>
        <tr><th>Provoditelj</th><td>Društvo arhitekata Zagreb (DAZ)</td></tr>
        <tr><th>Vrsta natječaja</th><td>otvoreni, jednostupanjski</td></tr>
        <tr><th>Zone</th><td>C — realizacija (stadion); A + D — anketno (SRC Svetice + Borongaj)</td></tr>
        <tr><th>Investicija zona C</th><td>~204,2 mil. € (bez PDV-a) · ~5.830 €/sjedalo</td></tr>
        <tr><th>Pravni okvir</th><td>NN 154/2025 (Pravilnik o natječajima)</td></tr>
        <tr><th>EOJN tender</th><td><a href="https://eojn.hr/tender-eo/76778" target="_blank" rel="noopener">76778</a></td></tr>
        <tr><th>Konzervatorska zaštita</th><td>Z-1528 = 278,93 ha (preventivna zaštita istekla)</td></tr>
        <tr><th>Vanjski rok</th><td>EURO 2032 (HR + IT) — odluka UEFA 2026./27.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="panel">
    <h2>Kriteriji ocjenjivanja (Uvjeti t. 2.3)</h2>
    <ul class="criteria">
      <li><strong>A.</strong> Uspješnost u savladavanju prostorno-programskih uvjeta — težište nogometni kompleks.</li>
      <li><strong>B.</strong> Cjelovitost urbanističko-arhitektonske ideje — SRC Svetice + stadion.</li>
      <li><strong>C.</strong> Mogućnost ekonomičnog ostvarenja u zadanom okviru.</li>
      <li><strong>D.</strong> Doprinos vrsnoći građenja — javni prostori, održivost, energetska učinkovitost.</li>
    </ul>
    <p class="muted small">
      Detaljna razrada težišta: <a href="#/sot">SOT §1</a> · biografije i sklonosti suda:
      <a href="#/research-01-sud">research 01</a>.
    </p>
  </div>
</section>

<section class="panel">
  <h2>Kako koristiti ovu stranicu</h2>
  <p>
    Lijevi sidebar je puna karta svih dokumenata. Sve datoteke su renderirane iz repozitorija
    <code>stadion-maksimir-natjecaj-2026</code> u trenutku builda — što vidiš ovdje jednako je tome
    što stoji na disku. Mermaid dijagrami (Gantt u <a href="#/roadmap">ROADMAP-u</a>) renderiraju se
    automatski, a sve interne reference između dokumenata su klikabilne.
  </p>
  <p class="muted small">
    Repo je SoT — ova stranica je samo readable view. Promjene se rade u markdown datotekama,
    nakon čega <code>npm run deploy</code> objavljuje novu verziju.
  </p>
</section>
`;
