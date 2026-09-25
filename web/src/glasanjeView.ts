// Stranica #/glasanje: listić od 100 bodova, rezultati uživo i provjerljivost
// (potvrda glasača + svakosatni snapshotovi žigosani u Bitcoin).

import { radovi, byCode, esc, tidy, type Rad } from "./radoviView";
import {
  acceptTerms,
  castBallot,
  fetchCheckpoints,
  fetchMyBallot,
  fetchResults,
  getDraft,
  getSession,
  sameItems,
  setDraft,
  signInWithCertilia,
  signOut,
  sumPoints,
  VoteError,
  CHECKPOINTS_RAW,
  CHECKPOINTS_TREE,
  VERIFY_SCRIPT,
  type Items,
  type MyBallot,
  type Results,
  type Checkpoint,
} from "./glasanje";

type State = {
  signedIn: boolean;
  my: MyBallot | null;
  draft: Items;
  results: Results | null;
  checkpoints: Checkpoint[];
  busy: string | null; // tekst trenutne radnje
  msg: { kind: "ok" | "err"; text: string } | null;
  consent: boolean; // prikaži korak privole
  showAll: boolean;
  q: string;
  abort: AbortController | null;
};

const st: State = {
  signedIn: false,
  my: null,
  draft: getDraft(),
  results: null,
  checkpoints: [],
  busy: null,
  msg: null,
  consent: false,
  showAll: false,
  q: "",
  abort: null,
};

let root: HTMLElement | null = null;

const label = (r: Rad) => tidy(r.lead);
const pct = (n: number) => `${n.toLocaleString("hr-HR", { maximumFractionDigits: 2 })} %`;
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "short" })
    : "—";

function saveDraft(items: Items) {
  st.draft = items;
  setDraft(items);
}

/** Dodaj rad na nacrt listića: prvi rad dobije 100, ostali ono što je preostalo. */
export function addToDraft(code: string) {
  const d = getDraft();
  if (!(code in d)) d[code] = Math.max(0, 100 - sumPoints(d));
  saveDraft(d);
}

export function draftHas(code: string): number | null {
  const d = getDraft();
  return code in d ? d[code] : null;
}

// ── učitavanje ──────────────────────────────────────────────────────────────

async function load() {
  st.draft = getDraft();
  const [session, results, checkpoints] = await Promise.all([
    getSession(),
    fetchResults().catch(() => null),
    fetchCheckpoints(),
  ]);
  st.results = results;
  st.checkpoints = checkpoints;
  st.signedIn = !!session;
  st.my = session ? await fetchMyBallot().catch(() => null) : null;
  if (st.my && Object.keys(st.draft).length === 0 && Object.keys(st.my.items).length) {
    saveDraft({ ...st.my.items });
  }
  if (!st.results) st.msg = { kind: "err", text: "Rezultati trenutno nisu dostupni." };
}

export async function renderGlasanje(el: HTMLElement) {
  root = el;
  st.msg = null;
  st.consent = false;
  el.innerHTML = `<p class="muted">Učitavam glasanje…</p>`;
  await load();
  if (root === el) draw();
}

// ── akcije ──────────────────────────────────────────────────────────────────

async function run(label: string, fn: () => Promise<void>) {
  st.busy = label;
  st.msg = null;
  draw();
  try {
    await fn();
  } catch (e) {
    st.msg = { kind: "err", text: e instanceof VoteError ? e.message : `Neočekivana greška: ${(e as Error).message}` };
  } finally {
    st.busy = null;
    st.abort = null;
    draw();
  }
}

function signIn(): Promise<void> {
  // signInWithCertilia otvara prozor sinkrono — mora se zvati izravno iz klika.
  st.abort = new AbortController();
  const p = signInWithCertilia(st.abort.signal);
  p.catch(() => {}); // greška se prikazuje kroz run(); ovo samo utišava rani unhandled rejection
  return run("Čekam prijavu u Certilia prozoru…", async () => {
    await p;
    st.signedIn = true;
    st.my = await fetchMyBallot();
    if (Object.keys(st.draft).length === 0 && Object.keys(st.my.items).length) saveDraft({ ...st.my.items });
    st.msg = { kind: "ok", text: "Prijavljen/a si eOsobnom." };
  });
}

function cleanDraft(): Items {
  return Object.fromEntries(Object.entries(st.draft).filter(([, v]) => v > 0));
}

async function submit(withConsent = false) {
  const items = cleanDraft();
  if (Object.keys(items).length && sumPoints(items) !== 100) {
    st.msg = { kind: "err", text: `Raspodijeli točno 100 bodova (sad ${sumPoints(items)}).` };
    draw();
    return;
  }
  if (!st.signedIn || (st.my && !st.my.verified)) {
    await signIn();
    if (!st.signedIn) return;
  }
  if (st.my && !st.my.consented && !withConsent) {
    st.consent = true;
    draw();
    return;
  }
  await run("Predajem listić…", async () => {
    if (withConsent) await acceptTerms();
    st.consent = false;
    st.my = await castBallot(items);
    saveDraft({ ...st.my.items });
    st.results = await fetchResults(true);
    st.msg = {
      kind: "ok",
      text: Object.keys(items).length
        ? `Listić je predan (zapis #${st.my.receipt?.seq}). Preuzmi potvrdu ispod.`
        : "Glas je povučen.",
    };
  });
}

function downloadReceipt() {
  const my = st.my;
  if (!my?.receipt) return;
  const doc = {
    vrsta: "Potvrda o glasu — Stadion Maksimir, glasanje javnosti",
    stranica: location.origin + "/#/glasanje",
    bodovi: my.items,
    receipt: my.receipt,
    provjera: {
      formula: "sha256(prev_hash|seq|pseudonym|revision|ts_ms|items_canon), hex, UTF-8",
      skripta: VERIFY_SCRIPT,
      checkpointi: CHECKPOINTS_TREE,
      upute:
        "Tvoj zapis ulazi u prvi sljedeći satni snapshot koji se žigoše u Bitcoin (OpenTimestamps). " +
        "Po zatvaranju glasanja objavljuje se cijeli lanac; `python3 maksimir_verify.py lanac.json --receipt ova-potvrda.json` " +
        "provjerava da je tvoj glas u lancu i da je ubrojen.",
    },
  };
  const blob = new Blob([JSON.stringify(doc, null, 2) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `maksimir-potvrda-${my.receipt.seq}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── crtanje ─────────────────────────────────────────────────────────────────

function authHtml(): string {
  if (st.signedIn && st.my?.verified) {
    return `<div class="gl-auth gl-auth--ok">✓ Prijavljen/a eOsobnom
      <button class="btn btn-sm" data-act="signout">Odjava</button></div>`;
  }
  return `<div class="gl-auth">
    <div><strong>Glasaju građani s eOsobnom ili Certilia mobile.ID.</strong>
    Listić možeš složiti i bez prijave, a prijava se traži pri predaji.</div>
    <button class="btn btn-primary" data-act="signin" ${st.busy ? "disabled" : ""}>Prijava eOsobnom (Certilia)</button>
  </div>`;
}

function ballotHtml(): string {
  const entries = Object.entries(st.draft);
  const sum = sumPoints(st.draft);
  const server = st.my?.items ?? {};
  const hasServer = Object.keys(server).length > 0;
  const dirty = !sameItems(st.draft, server);
  const open = st.results?.open ?? true;

  const rows = entries
    .map(([code, pts]) => {
      const r = byCode[code];
      if (!r) return "";
      return `<div class="gl-row" data-code="${code}">
        ${r.image ? `<img src="/radovi/${code}-t.jpg" alt="" loading="lazy" />` : `<span class="gl-noimg"></span>`}
        <a class="gl-name" href="#/radovi/${code}">${esc(label(r))}<span class="muted small"> · <code>${code}</code></span></a>
        <div class="gl-points">
          <button class="btn btn-sm" data-act="dec" aria-label="Manje bodova">−</button>
          <input type="number" min="0" max="100" step="1" value="${pts}" aria-label="Bodovi za ${esc(label(r))}" />
          <button class="btn btn-sm" data-act="inc" aria-label="Više bodova">+</button>
          <button class="btn btn-sm gl-x" data-act="remove" aria-label="Makni s listića">✕</button>
        </div>
        <div class="gl-bar"><span style="width:${Math.min(100, pts)}%"></span></div>
      </div>`;
    })
    .join("");

  const q = st.q.trim().toLowerCase();
  const matches = q
    ? radovi
        .filter((r) => !(r.code in st.draft))
        .filter((r) =>
          [r.lead, r.code, ...r.roles.map((x) => x.name), ...r.countries].join(" ").toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  return `
    <section class="panel gl-ballot">
      <h2>Moj listić</h2>
      ${
        entries.length
          ? rows
          : `<p class="muted">Listić je prazan. Dodaj rad pretragom ispod, ili klikni „+ na listić” kod rada u rezultatima ili na stranici rada.</p>`
      }
      <div class="gl-add">
        <input id="gl-q" type="search" placeholder="Dodaj rad: ured, autor, zemlja ili šifra…" value="${esc(st.q)}" aria-label="Dodaj rad na listić" />
        ${
          matches.length
            ? `<div class="gl-suggest">${matches
                .map((r) => `<button data-add="${r.code}">+ ${esc(label(r))} <code>${r.code}</code></button>`)
                .join("")}</div>`
            : ""
        }
      </div>
      <div class="gl-sum ${sum === 100 ? "ok" : sum > 100 ? "over" : ""}">
        Raspodijeljeno <strong>${sum}</strong> / 100
        ${entries.length ? `<button class="btn btn-sm" data-act="spread" ${sum >= 100 ? "hidden" : ""}>Raspodijeli ostatak (${Math.max(0, 100 - sum)})</button>` : ""}
      </div>
      ${
        st.consent
          ? `<div class="gl-consent">
              <h3>Prije prvog glasa</h3>
              <ul>
                <li>Ovo je <strong>neslužbeno</strong> glasanje javnosti. Nema nikakav utjecaj na odluku ocjenjivačkog suda.</li>
                <li>Imaš jedan glas od 100 bodova. Listić smiješ mijenjati do zatvaranja, a broji se zadnja verzija.</li>
                <li>Identitet se provjerava putem Certilije. U bazi se čuva samo šifrirani OIB i njegov hash, radi pravila „jedna osoba, jedan listić”.
                  Glasanje <strong>nije tajno</strong> prema operateru baze. Javno se objavljuju samo zbirni rezultati i, po zatvaranju,
                  lanac listića pod pseudonimima, bez imena i OIB-a.</li>
              </ul>
              <button class="btn btn-primary" data-act="consent" ${st.busy ? "disabled" : ""}>Prihvaćam i predajem listić</button>
              <button class="btn" data-act="noconsent">Odustani</button>
            </div>`
          : `<div class="gl-actions">
              <button class="btn btn-primary" data-act="submit" ${submitDisabled() ? "disabled" : ""}>${hasServer ? "Predaj izmijenjeni listić" : "Predaj listić"}</button>
              ${hasServer && dirty ? `<button class="btn" data-act="reset">Vrati predani listić</button>` : ""}
              ${hasServer ? `<button class="btn" data-act="withdraw" ${st.busy ? "disabled" : ""}>Povuci glas</button>` : ""}
              ${!open ? `<span class="muted small">Glasanje je zatvoreno.</span>` : ""}
            </div>`
      }
      ${
        hasServer && st.my?.receipt
          ? `<div class="gl-receipt">
              <div><strong>Tvoj glas je zapisan</strong> kao #${st.my.receipt.seq} u lancu (${esc(fmtDate(st.my.updated_at))}).
              ${dirty ? `<span class="warn">Imaš nepredane izmjene.</span>` : ""}</div>
              <div class="mono small">${st.my.receipt.hash}</div>
              <button class="btn btn-sm" data-act="receipt">Preuzmi potvrdu (JSON)</button>
            </div>`
          : ""
      }
    </section>`;
}

function resultsHtml(): string {
  const res = st.results;
  if (!res) return "";
  const rows = res.results.filter((r) => r.points > 0);
  const shown = st.showAll ? rows : rows.slice(0, 15);
  return `
    <section class="panel gl-results">
      <h2>Rezultati uživo</h2>
      <p class="muted small">Udio = zbroj bodova koje je rad dobio podijeljen s ukupnim brojem bodova (glasači × 100).
      Podupiratelji = koliko je osoba radu dalo barem 1 bod.</p>
      ${
        rows.length
          ? `<ol class="gl-rank">${shown
              .map((row) => {
                const r = byCode[row.code];
                if (!r) return "";
                const mine = row.code in st.draft;
                return `<li>
                  <a class="gl-name" href="#/radovi/${row.code}">${esc(label(r))}</a>
                  <div class="gl-bar gl-bar--result"><span style="width:${Math.min(100, row.share)}%"></span></div>
                  <span class="gl-share">${pct(row.share)}</span>
                  <span class="muted small">${row.backers} podupiratelja</span>
                  ${mine ? `<span class="muted small">na tvom listiću</span>` : `<button class="btn btn-sm" data-add="${row.code}">+ na listić</button>`}
                </li>`;
              })
              .join("")}</ol>
            ${rows.length > 15 ? `<button class="btn btn-sm" data-act="all">${st.showAll ? "Prikaži manje" : `Prikaži svih ${rows.length}`}</button>` : ""}`
          : `<p>Još nema glasova. Budi prvi.</p>`
      }
    </section>`;
}

function integrityHtml(): string {
  const cps = [...st.checkpoints].reverse().slice(0, 8);
  const btc = st.checkpoints.filter((c) => c.bitcoin).at(-1);
  return `
    <section class="panel gl-integrity">
      <h2>Kako znaš da nitko nije dirao glasove</h2>
      <ol>
        <li><strong>Lanac hasheva.</strong> Svaka predaja, izmjena ili povlačenje listića dodaje zapis u lanac u kojem svaki zapis sadrži hash prethodnog.
          Baza odbija izmjenu i brisanje zapisa. Svaki potajni ispravak promijenio bi sve hasheve iza njega.</li>
        <li><strong>Potvrda.</strong> Nakon predaje preuzmi potvrdu: svoj zapis, njegov hash i pseudonim. Pseudonim je stalan, ali ne otkriva tko si.</li>
        <li><strong>Bitcoin, svaki sat.</strong> Svaki sat se snapshot (vrh lanca + trenutni rezultati) žigoše putem
          <a href="https://opentimestamps.org" target="_blank" rel="noopener">OpenTimestamps ↗</a> i nakon par sati trajno zapisuje u Bitcoin blok.
          Tko god kasnije prepravi povijest, ne može promijeniti ono što je već u Bitcoinu.</li>
        <li><strong>Po zatvaranju</strong> se objavljuje cijeli lanac pod pseudonimima.
          <a href="${VERIFY_SCRIPT}" target="_blank" rel="noopener">maksimir_verify.py ↗</a> iz njega ponovno izračuna svaki hash i izbroji glasove,
          pa provjeri tvoju potvrdu i svaki satni snapshot.</li>
      </ol>
      <p class="muted small">Što ovo ne rješava: operater baze teoretski može dodati izmišljene glasače, jer pravo glasa potvrđuje Certilia preko našeg poslužitelja.
        Broj glasača je zato javan u svakom satnom snapshotu, pa je svaki nagli skok vidljiv i trajno zabilježen.</p>
      ${
        cps.length
          ? `<h3>Zadnji snapshotovi ${btc ? `<span class="muted small">· zadnji u Bitcoinu: #${btc.seq}, ${esc(fmtDate(btc.at))}</span>` : ""}</h3>
            <table class="kv gl-cps"><tbody>${cps
              .map(
                (c) => `<tr><td>${esc(fmtDate(c.at))}</td><td>zapis #${c.seq} · ${c.voters} glasača</td>
                  <td>${c.bitcoin ? "✓ u Bitcoinu" : "čeka blok"}</td>
                  <td><a href="${CHECKPOINTS_RAW}/${c.file}" target="_blank" rel="noopener">json</a> ·
                      <a href="${CHECKPOINTS_RAW}/${c.file}.ots" target="_blank" rel="noopener">ots</a></td></tr>`
              )
              .join("")}</tbody></table>
            <p class="small"><a href="${CHECKPOINTS_TREE}" target="_blank" rel="noopener">Svi snapshotovi ↗</a>.
            Provjera: preuzmi .json i .ots pa ih spusti na <a href="https://opentimestamps.org" target="_blank" rel="noopener">opentimestamps.org</a>.</p>`
          : `<p class="muted small">Prvi snapshot se objavljuje unutar sat vremena od prvog glasa.</p>`
      }
    </section>`;
}

function submitDisabled(): boolean {
  const n = Object.keys(st.draft).length;
  const sum = sumPoints(st.draft);
  const open = st.results?.open ?? true;
  return !!st.busy || !open || sameItems(st.draft, st.my?.items ?? {}) || (n > 0 && sum !== 100);
}

function updateBallotInPlace(el: HTMLElement) {
  const sum = sumPoints(st.draft);
  const box = el.querySelector<HTMLElement>(".gl-sum");
  if (box) {
    box.classList.toggle("ok", sum === 100);
    box.classList.toggle("over", sum > 100);
    box.querySelector("strong")!.textContent = String(sum);
    const spread = box.querySelector<HTMLButtonElement>('[data-act="spread"]');
    if (spread) {
      spread.hidden = sum >= 100;
      spread.textContent = `Raspodijeli ostatak (${Math.max(0, 100 - sum)})`;
    }
  }
  el.querySelectorAll<HTMLElement>(".gl-row").forEach((row) => {
    const bar = row.querySelector<HTMLElement>(".gl-bar span");
    if (bar) bar.style.width = `${Math.min(100, st.draft[row.dataset.code!] ?? 0)}%`;
  });
  const submit = el.querySelector<HTMLButtonElement>('[data-act="submit"]');
  if (submit) submit.disabled = submitDisabled();
}

function draw() {
  const el = root;
  if (!el) return;
  // Puni re-render: sačuvaj scroll i fokus (npr. uzastopni klikovi na +/−).
  const y = window.scrollY;
  const act = document.activeElement as HTMLElement | null;
  const focusKey = act?.closest<HTMLElement>(".gl-row")
    ? `.gl-row[data-code="${act.closest<HTMLElement>(".gl-row")!.dataset.code}"] ${act.dataset.act ? `[data-act="${act.dataset.act}"]` : "input"}`
    : null;
  const res = st.results;
  const focusQ = document.activeElement?.id === "gl-q";

  el.innerHTML = `
    <section class="hero results-hero">
      <div class="hero-eyebrow">Neslužbeno glasanje javnosti · eOsobna / Certilia mobile.ID</div>
      <h1>Tvojih 100 bodova za novi Maksimir</h1>
      <p class="hero-lede">
        Svaki građanin s eOsobnom ima jedan glas: 100 bodova koje raspoređuješ po 88 natječajnih radova kako hoćeš.
        Sve na jedan rad ili npr. 40 / 30 / 20 / 10. Listić smiješ mijenjati do zatvaranja.
      </p>
    </section>

    <section class="card-grid">
      <div class="kpi"><div class="kpi-label">Glasača</div><div class="kpi-value">${res?.voters ?? "—"}</div><div class="kpi-meta">potvrđenih eOsobnom</div></div>
      <div class="kpi"><div class="kpi-label">Glasanje</div><div class="kpi-value">${res ? (res.open ? "otvoreno" : "zatvoreno") : "—"}</div><div class="kpi-meta">do ${esc(fmtDate(res?.closes_at ?? null))}</div></div>
      <div class="kpi"><div class="kpi-label">Radova</div><div class="kpi-value">88</div><div class="kpi-meta"><a href="#/radovi">pregledaj sve →</a></div></div>
    </section>

    ${st.msg ? `<div class="gl-msg gl-msg--${st.msg.kind}">${esc(st.msg.text)}</div>` : ""}
    ${
      st.busy
        ? `<div class="gl-msg">${esc(st.busy)} ${st.abort ? `<button class="btn btn-sm" data-act="cancel">Odustani</button>` : ""}</div>`
        : ""
    }
    ${authHtml()}
    <div class="gl-grid">
      ${ballotHtml()}
      ${resultsHtml()}
    </div>
    ${integrityHtml()}
  `;

  if (focusQ) {
    const q = el.querySelector<HTMLInputElement>("#gl-q")!;
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  } else if (focusKey) {
    el.querySelector<HTMLElement>(focusKey)?.focus({ preventScroll: true });
  }
  window.scrollTo({ top: y });
  bind(el);
}

function bind(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>(".gl-row").forEach((row) => {
    const code = row.dataset.code!;
    const input = row.querySelector<HTMLInputElement>("input")!;
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v) || 0));
    const set = (v: number) => {
      saveDraft({ ...st.draft, [code]: clamp(v) });
      draw();
    };
    // Tipkanje ažurira samo zbroj/trake/gumb na mjestu. Puni draw() bi zamijenio
    // DOM usred Tab-a i izgubio fokus (klik na sljedeće polje bi promašio).
    input.addEventListener("input", () => {
      saveDraft({ ...st.draft, [code]: clamp(Number(input.value)) });
      updateBallotInPlace(el);
    });
    input.addEventListener("change", () => {
      input.value = String(st.draft[code] ?? 0);
    });
    row.querySelector('[data-act="dec"]')!.addEventListener("click", () => set((st.draft[code] ?? 0) - 5));
    row.querySelector('[data-act="inc"]')!.addEventListener("click", () => set((st.draft[code] ?? 0) + 5));
    row.querySelector('[data-act="remove"]')!.addEventListener("click", () => {
      const d = { ...st.draft };
      delete d[code];
      saveDraft(d);
      draw();
    });
  });

  el.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      addToDraft(b.dataset.add!);
      st.draft = getDraft();
      st.q = "";
      draw();
    })
  );

  el.querySelector<HTMLInputElement>("#gl-q")?.addEventListener("input", (e) => {
    st.q = (e.target as HTMLInputElement).value;
    draw();
  });

  const on = (act: string, fn: () => void) =>
    el.querySelector(`[data-act="${act}"]`)?.addEventListener("click", fn);

  on("signin", () => void signIn());
  on("signout", () =>
    void run("Odjavljujem…", async () => {
      await signOut();
      st.signedIn = false;
      st.my = null;
    })
  );
  on("cancel", () => st.abort?.abort());
  on("submit", () => void submit());
  on("consent", () => void submit(true));
  on("noconsent", () => {
    st.consent = false;
    draw();
  });
  on("withdraw", () => {
    saveDraft({});
    void submit();
  });
  on("reset", () => {
    saveDraft({ ...(st.my?.items ?? {}) });
    draw();
  });
  on("spread", () => {
    const codes = Object.keys(st.draft);
    let rest = 100 - sumPoints(st.draft);
    const d = { ...st.draft };
    codes.forEach((c, i) => {
      const share = Math.floor(rest / (codes.length - i));
      d[c] += share;
      rest -= share;
    });
    saveDraft(d);
    draw();
  });
  on("receipt", downloadReceipt);
  on("all", () => {
    st.showAll = !st.showAll;
    draw();
  });
}

// ── mali panel na stranici pojedinog rada ───────────────────────────────────

export async function renderRadVotePanel(el: HTMLElement, code: string) {
  const res = await fetchResults().catch(() => null);
  if (!el.isConnected) return;
  const row = res?.results.find((r) => r.code === code);
  const place = res ? res.results.findIndex((r) => r.code === code) + 1 : 0;
  const onDraft = draftHas(code);
  el.innerHTML = `
    <h2>Glasanje javnosti</h2>
    ${
      res && res.voters > 0 && row
        ? `<p><strong>${pct(row.share)}</strong> glasova · ${row.backers} podupiratelja${
            row.points > 0 ? ` · ${place}. mjesto kod javnosti` : ""
          } <span class="muted small">(${res.voters} glasača)</span></p>`
        : `<p class="muted">Još nema glasova za ovaj rad.</p>`
    }
    ${
      onDraft !== null
        ? `<p>Na tvom listiću: <strong>${onDraft}</strong> bodova. <a class="btn btn-sm" href="#/glasanje">Uredi listić →</a></p>`
        : `<button class="btn btn-primary" data-act="add">+ Dodaj na moj listić</button>
           <span class="muted small">Imaš 100 bodova za sve radove zajedno. Glasa se eOsobnom.</span>`
    }`;
  el.querySelector('[data-act="add"]')?.addEventListener("click", () => {
    addToDraft(code);
    location.hash = "#/glasanje";
  });
}
