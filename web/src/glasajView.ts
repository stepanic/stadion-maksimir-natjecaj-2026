// Stranica /glasaj: jednostavnije sučelje za ISTI listić od 100 bodova.
//
// Usporedno s /glasanje (klasični listić), ne umjesto njega. Dijele sve osim izgleda:
//   - nacrt listića (localStorage maksimir-draft): prijeđi s jednog na drugo kad god želiš;
//   - backend (glasanje.ts: Certilia, RPC-evi) i lanac (chainVote.ts);
//   - tok predaje chainVoteView (prijava → uvjeti → ključ → pravo glasa → ZK → relayer).
// Ovo sučelje samo slaže listić i pokazuje ga prije predaje. Ono što glasač vidi na zadnjem
// ekranu točno je ono što ulazi u tok (pravila u prototipi/glasanje-ux/README.md).
//
// Tok: početak → način (favoriti ili jedan po jedan) → favoriti redom → bodovi (prijedlog
// po redoslijedu, uvijek promjenjiv) → pregled → zajednički tok predaje.

import { radovi, byCode, esc, tidy, type Rad } from "./radoviView";
import {
  fetchChainConfig,
  fetchMyBallot,
  fetchResults,
  getDraft,
  getSession,
  sameItems,
  setDraft,
  signInWithCertilia,
  VoteError,
  type Items,
  type MyBallot,
  type Results,
} from "./glasanje";
import * as CVV from "./chainVoteView";
import * as M from "./ballotMath";
import { plural } from "./shareView";
import { link } from "./routes";

const PATH = "/glasaj";
const MAX_PICKS = 10;
const STEP = 5; // korak gumba − i +

type Screen = "start" | "nacin" | "swipe" | "biraj" | "bodovi" | "pregled";

const st = {
  screen: "start" as Screen,
  loaded: false,
  signedIn: false,
  my: null as MyBallot | null,
  results: null as Results | null,
  busy: null as string | null,
  abort: null as AbortController | null,
  msg: null as { kind: "ok" | "err"; text: string } | null,
  confirmWithdraw: false,
  submitted: false, // tok predaje pokrenut s ovog pregleda
  // izbor
  via: "favoriti" as "favoriti" | "swipe",
  order: [] as string[], // svih 88, nasumično po sesiji
  seen: 0, // swipe: koliko je radova pregledano
  liked: [] as string[],
  hist: [] as [string, boolean][],
  picks: [] as string[], // favoriti, redom
  q: "",
  // bodovi
  items: {} as Items,
  preset: "rank" as M.Preset | null, // null = ručno mijenjano
};

let root: HTMLElement | null = null;
let phase1: Results | null = null;

const KNOWN = new Set(radovi.map((r) => r.code));
const label = (code: string) => tidy((byCode[code] ?? ({ lead: code } as Rad)).lead);
const thumb = (code: string) => (byCode[code]?.image ? `<img src="/radovi/${code}-t.jpg" alt="" loading="lazy" />` : `<span class="gl-noimg"></span>`);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "short" }) : "—";

/** Redoslijed radova: nasumičan, isti kroz cijelu sesiju (O-5: prvi u popisu ne smiju imati prednost). */
function sessionOrder(): string[] {
  let seed = 0;
  try {
    seed = Number(sessionStorage.getItem("glasaj-seed")) || 0;
    if (!seed) {
      seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
      sessionStorage.setItem("glasaj-seed", String(seed));
    }
  } catch {
    seed = Date.now();
  }
  return M.shuffle(
    radovi.map((r) => r.code),
    M.mulberry32(seed)
  );
}

// ── veza sa zajedničkim tokom predaje ───────────────────────────────────────────

const host: CVV.Host = {
  draw: () => draw(),
  signIn: () => signIn(),
  signedIn: () => st.signedIn,
  my: () => st.my,
  setMy: (m) => void (st.my = m),
  draft: () => getDraft(),
  saveDraft: (items) => setDraft(items),
  phase1Results: () => phase1,
  setResults: (r) => void (st.results = r),
  refreshMy: async () => {
    st.my = await fetchMyBallot();
  },
  msg: (kind, text) => void (st.msg = { kind, text }),
};

const onChain = () => !!CVV.active();
/** Listić koji se trenutno broji za mene (na lancu ili, neprenesen, u fazi 1). */
const counted = (): Items => (onChain() ? CVV.serverItems(st.my) : st.my?.items ?? {});
const hasCounted = () => Object.keys(counted()).length > 0;

async function load() {
  const [session, results] = await Promise.all([getSession(), fetchResults().catch(() => null)]);
  const cfg = CVV.wantsChain(results) ? await fetchChainConfig().catch(() => null) : null;
  phase1 = results;
  st.results = results;
  st.signedIn = !!session;
  st.my = session ? await fetchMyBallot().catch(() => null) : null;
  const chain = CVV.selectChain(cfg);
  if (chain) {
    await CVV.initChain(chain, host).catch(() => {
      st.msg = { kind: "err", text: "Glasanje na lancu trenutno nije dostupno." };
    });
  }
  // Isto kao klasični listić: prazan nacrt preuzima glas koji se broji.
  if (!Object.keys(getDraft()).length && hasCounted()) setDraft({ ...counted() });
  if (!st.results) st.msg = { kind: "err", text: "Glasanje trenutno nije dostupno. Pokušaj malo kasnije." };
  st.loaded = true;
}

export async function renderGlasaj(el: HTMLElement) {
  root = el;
  st.msg = null;
  st.confirmWithdraw = false;
  if (!st.order.length) st.order = sessionOrder();
  // Završen ili prekinut izbor ne vraća se pri ponovnom dolasku; nedovršen ostaje.
  if (st.screen === "pregled" || st.screen === "nacin") st.screen = "start";
  st.loaded = false;
  draw();
  await load();
  if (root === el) draw();
}

async function run(text: string, fn: () => Promise<void>) {
  st.busy = text;
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
  // Prozor Certilije otvara se sinkrono, izravno iz klika (inače ga preglednik blokira).
  st.abort = new AbortController();
  const p = signInWithCertilia(st.abort.signal);
  p.catch(() => {});
  return run("Čekam prijavu u Certilia prozoru…", async () => {
    await p;
    st.signedIn = true;
    st.my = await fetchMyBallot();
    if (onChain()) await CVV.refreshChain();
    if (!Object.keys(getDraft()).length && hasCounted()) setDraft({ ...counted() });
    st.msg = { kind: "ok", text: "Prijavljen/a si eOsobnom." };
  });
}

// ── prijelazi ─────────────────────────────────────────────────────────────────────

function go(screen: Screen) {
  st.screen = screen;
  st.submitted = false;
  st.msg = null;
  draw();
  window.scrollTo({ top: 0 });
}

function startFresh(via: "favoriti" | "swipe") {
  st.via = via;
  st.picks = [];
  st.q = "";
  if (via === "swipe") {
    st.seen = 0;
    st.liked = [];
    st.hist = [];
    return go("swipe");
  }
  go("biraj");
}

/** Bodovi iz postojećeg listića (nastavak nacrta ili izmjena predanog glasa). */
function editBallot(items: Items) {
  st.items = { ...items };
  st.picks = M.byPoints(items).map(([c]) => c);
  st.preset = null;
  go("bodovi");
}

function toPoints() {
  // Ako su favoriti isti kao prije, zadrži ručne izmjene; inače novi prijedlog.
  const same = st.picks.length === Object.keys(st.items).length && st.picks.every((c) => c in st.items);
  if (!same) {
    st.preset = "rank";
    st.items = M.propose(st.picks, "rank");
    for (const c of st.picks) st.items[c] ??= 0;
  }
  saveItems();
  go("bodovi");
}

/** Bodovi idu u zajednički nacrt, pa ih klasični listić odmah vidi. */
function saveItems() {
  setDraft({ ...st.items });
}

function swipe(yes: boolean) {
  const code = st.order[st.seen];
  if (!code) return;
  st.hist.push([code, yes]);
  if (yes) st.liked.push(code);
  st.seen++;
  if (st.seen >= st.order.length) return endSwipe();
  draw();
}

function undoSwipe() {
  const last = st.hist.pop();
  if (!last) return;
  if (last[1]) st.liked.splice(st.liked.lastIndexOf(last[0]), 1);
  st.seen--;
  draw();
}

function endSwipe() {
  if (!st.liked.length) {
    st.msg = { kind: "err", text: "Nijedan rad nisi označio/la sa „Sviđa mi se”. Pokušaj ponovno ili izaberi favorite iz svih radova." };
    st.screen = "nacin";
    return draw();
  }
  st.picks = st.liked.length === 1 ? [...st.liked] : [];
  if (st.liked.length === 1) return toPoints();
  go("biraj");
}

function togglePick(code: string) {
  const i = st.picks.indexOf(code);
  if (i >= 0) st.picks.splice(i, 1);
  else if (st.picks.length < MAX_PICKS) st.picks.push(code);
  else st.msg = { kind: "err", text: `Najviše ${MAX_PICKS} favorita. Makni jednog da dodaš drugog.` };
  draw();
}

function submit() {
  const items = M.clean(st.items);
  const v = M.validate(items, KNOWN);
  if (!v.ok) {
    st.msg = { kind: "err", text: v.reason };
    return draw();
  }
  setDraft(items);
  st.submitted = true;
  if (onChain()) return CVV.startFlow("cast", { items });
  // Faza 1 (bez lanca) se predaje kroz klasični listić: nacrt je već ondje.
  st.msg = null;
  draw();
}

function withdraw() {
  st.confirmWithdraw = false;
  const keep = Object.keys(getDraft()).length ? getDraft() : { ...counted() };
  setDraft(keep);
  CVV.startFlow("withdraw");
}

// ── crtanje ─────────────────────────────────────────────────────────────────────

const STEPS: [Screen[], string][] = [
  [["nacin", "swipe", "biraj"], "Izaberi favorite"],
  [["bodovi"], "Provjeri bodove"],
  [["pregled"], "Predaj eOsobnom"],
];

function stepsHtml(): string {
  const at = STEPS.findIndex(([s]) => s.includes(st.screen));
  return `<ol class="gj-steps" aria-label="Koraci">${STEPS.map(
    ([, t], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}" ${i === at ? 'aria-current="step"' : ""}><span>${i < at ? "✓" : i + 1}</span>${t}</li>`
  ).join("")}</ol>`;
}

function ballotListHtml(items: Items): string {
  return `<ul class="gj-list">${M.byPoints(items)
    .map(([c, p]) => `<li>${thumb(c)}<span class="gj-list-name">${esc(label(c))}</span><strong>${p}</strong></li>`)
    .join("")}</ul>`;
}

function startHtml(): string {
  if (!st.loaded) return `<p class="muted">Učitavam glasanje…</p>`;
  const closed = st.results ? !st.results.open : false;
  const draft = getDraft();
  const draftN = Object.keys(M.clean(draft)).length;
  const draftOpen = draftN > 0 && !sameItems(draft, counted());
  const out: string[] = [];

  if (CVV.active() && CVV.needsTransfer()) {
    out.push(`<section class="panel gj-card">
      <h2>Tvoj glas iz faze 1 se broji</h2>
      ${ballotListHtml(st.my?.items ?? {})}
      <p>Prenesi ga na lanac da ga kasnije možeš mijenjati. Bodovi ostaju isti.</p>
      <button class="btn btn-primary btn-lg" data-act="transfer" ${st.busy ? "disabled" : ""}>Prenesi glas na lanac</button>
    </section>`);
  } else if (hasCounted()) {
    out.push(`<section class="panel gj-card gj-card--ok">
      <h2>✓ Tvoj glas se broji</h2>
      ${ballotListHtml(counted())}
      <div class="gl-actions">
        <button class="btn btn-primary" data-act="change" ${st.busy || closed ? "disabled" : ""}>Promijeni bodove</button>
        <button class="btn" data-act="new" ${st.busy || closed ? "disabled" : ""}>Izaberi ispočetka</button>
      </div>
      ${onChain() ? CVV.receiptHtml(draftOpen, !!st.busy) : ""}
    </section>`);
  } else if (onChain()) {
    const r = CVV.receiptHtml(false, !!st.busy);
    if (r) out.push(`<section class="panel gj-card">${r}</section>`);
  }

  if (draftOpen && !closed) {
    out.push(`<section class="panel gj-card">
      <h2>Imaš nedovršen listić</h2>
      <p class="muted">${draftN} ${plural(draftN, "rad", "rada", "radova")} · ${M.sum(M.clean(draft))} od 100 bodova. Spremljen je na ovom uređaju.</p>
      <button class="btn btn-primary" data-act="resume">Nastavi gdje si stao/la</button>
    </section>`);
  }

  if (closed) out.push(`<div class="gl-msg">Glasanje je zatvoreno ${esc(fmtDate(st.results?.closes_at ?? null))}.</div>`);
  else if (!hasCounted())
    out.push(`<div class="gj-cta">
      <button class="btn btn-primary btn-lg" data-act="begin">${draftOpen ? "Kreni ispočetka" : "Kreni"}</button>
      <span class="muted small">Oko 2 minute. Prijava eOsobnom tek na kraju.</span>
    </div>`);
  return out.join("");
}

function nacinHtml(): string {
  return `<h2 class="gj-q">Kako želiš birati?</h2>
    <div class="gj-choices">
      <button class="gj-choice" data-act="via-favoriti" data-k="via-favoriti">
        <span class="gj-choice-tag">Najbrže</span>
        <strong>Izaberi svoje favorite</strong>
        <span>Klikni radove koji ti se najviše sviđaju, redom, najviše ${MAX_PICKS}. Bodove ti predložimo prema redoslijedu.</span>
      </button>
      <button class="gj-choice" data-act="via-swipe" data-k="via-swipe">
        <span class="gj-choice-tag">Temeljito</span>
        <strong>Pogledaj radove jedan po jedan</strong>
        <span>Za svaki od ${radovi.length} radova: sviđa mi se ili ne. Zatim od onih koji ti se sviđaju izabereš favorite.</span>
      </button>
    </div>
    <p class="muted small">Želiš sam/a upisati bodove svakom radu? <a href="${link("glasanje")}">Klasični listić →</a></p>`;
}

function swipeHtml(): string {
  const code = st.order[st.seen];
  const r = byCode[code];
  const n = st.order.length;
  return `<div class="gj-swipe">
    <div class="gj-progress" aria-hidden="true"><i style="width:${(st.seen / n) * 100}%"></i></div>
    <p class="gj-swipe-meta"><span>${st.seen + 1} / ${n}</span><span>Sviđa ti se: <strong>${st.liked.length}</strong></span></p>
    <article class="gj-deck" data-deck>
      ${r.image ? `<img src="/radovi/${code}-t.jpg" alt="Rad ${esc(label(code))}" draggable="false" />` : `<span class="gl-noimg"></span>`}
      <span class="gj-stamp gj-stamp--yes">SVIĐA MI SE</span><span class="gj-stamp gj-stamp--no">NE</span>
      <div class="gj-deck-cap">
        <strong>${esc(label(code))}</strong>
        <span>${esc(r.countries.join(", ") || "—")} · <a href="${link(`radovi/${code}`)}" target="_blank" rel="noopener">Više o radu ↗</a></span>
      </div>
    </article>
    <div class="gj-swipe-actions">
      <button class="gj-round gj-round--no" data-act="no" aria-label="Ne sviđa mi se" data-k="no">✕</button>
      <button class="gj-round gj-round--undo" data-act="undo" aria-label="Vrati zadnji" ${st.hist.length ? "" : "disabled"}>↩</button>
      <button class="gj-round gj-round--yes" data-act="yes" aria-label="Sviđa mi se" data-k="yes">♥</button>
    </div>
    <p class="muted small gj-center">Povuci sliku desno ili lijevo, ili tipke ← i →.</p>
    ${st.liked.length && st.seen >= 10 ? `<p class="gj-center"><button class="btn" data-act="enough">Dosta, idem dalje s ${st.liked.length} ${plural(st.liked.length, "radom", "rada", "radova")} →</button></p>` : ""}
  </div>`;
}

function birajHtml(): string {
  const fromLiked = st.via === "swipe";
  const pool = fromLiked ? st.liked : st.order;
  const q = st.q.trim().toLowerCase();
  const list = q
    ? pool.filter((c) => {
        const r = byCode[c];
        return [r.lead, r.code, ...r.roles.map((x) => x.name), ...r.countries].join(" ").toLowerCase().includes(q);
      })
    : pool;
  const tray = st.picks.length
    ? st.picks
        .map(
          (c, i) => `<li>
          <span class="gj-n">${i + 1}</span>${thumb(c)}<span class="gj-tray-name">${esc(label(c))}</span>
          <button data-up="${i}" aria-label="Pomakni gore" ${i ? "" : "disabled"}>↑</button>
          <button data-down="${i}" aria-label="Pomakni dolje" ${i < st.picks.length - 1 ? "" : "disabled"}>↓</button>
          <button data-pick="${c}" aria-label="Makni ${esc(label(c))}">✕</button>
        </li>`
        )
        .join("")
    : `<li class="muted gj-tray-empty">Klikni rad koji ti se najviše sviđa. On je tvoj broj 1.</li>`;
  const cards = list
    .map((c) => {
      const i = st.picks.indexOf(c);
      const r = byCode[c];
      return `<article class="gj-card-pick${i >= 0 ? " is-on" : ""}">
        <button class="gj-pick" data-pick="${c}" data-k="p:${c}" aria-pressed="${i >= 0}" aria-label="${i >= 0 ? `Makni favorita ${i + 1}` : "Dodaj među favorite"}: ${esc(label(c))}">
          ${thumb(c)}${i >= 0 ? `<span class="gj-badge">${i + 1}</span>` : ""}
        </button>
        <div class="gj-pick-cap"><span>${esc(label(c))}</span>
          <span class="muted small">${esc(r.countries.join(", ") || "—")} · <a href="${link(`radovi/${c}`)}" target="_blank" rel="noopener">više ↗</a></span></div>
      </article>`;
    })
    .join("");
  return `<h2 class="gj-q">${fromLiked ? `Svidjelo ti se ${st.liked.length} radova. Izaberi favorite, redom.` : "Klikni svoje favorite, redom"}</h2>
    <p class="muted">Prvi klik je tvoj broj 1. Najviše ${MAX_PICKS}; obično su dovoljna 3 do 5. Redoslijed mijenjaš strelicama.</p>
    <div class="gj-tray">
      <ol>${tray}</ol>
      <div class="gj-tray-go">
        <span class="muted small">${st.picks.length} / ${MAX_PICKS}</span>
        <button class="btn btn-primary" data-act="to-points" ${st.picks.length ? "" : "disabled"}>Dalje: bodovi →</button>
      </div>
    </div>
    ${pool.length > 12 ? `<input class="gj-search" type="search" placeholder="Traži: ured, autor, zemlja ili šifra…" value="${esc(st.q)}" aria-label="Traži rad" data-k="q" />` : ""}
    ${list.length ? `<div class="gj-grid">${cards}</div>` : `<p class="muted">Nijedan rad ne odgovara pretrazi.</p>`}`;
}

function bodoviHtml(): string {
  const s = M.sum(st.items);
  const codes = st.picks.filter((c) => c in st.items);
  const rows = codes
    .map((c, i) => {
      const p = st.items[c] ?? 0;
      return `<li class="${p ? "" : "is-zero"}" data-code="${c}">
        <span class="gj-n">${i + 1}</span>${thumb(c)}
        <div class="gj-row-main"><span>${esc(label(c))}</span><div class="gj-bar"><i style="width:${p}%"></i></div>
          ${p ? "" : `<span class="warn small">0 bodova: ovaj rad neće ući u glas</span>`}</div>
        <div class="gj-stepper">
          <button data-nudge="-${STEP}" aria-label="${STEP} bodova manje za ${esc(label(c))}" data-k="m:${c}">−</button>
          <input type="number" inputmode="numeric" min="0" max="100" value="${p}" aria-label="Bodovi za ${esc(label(c))}" data-k="n:${c}" />
          <button data-nudge="${STEP}" aria-label="${STEP} bodova više za ${esc(label(c))}" data-k="p:${c}">+</button>
        </div>
        <button class="gj-x" data-remove="${c}" aria-label="Makni ${esc(label(c))} s listića">✕</button>
      </li>`;
    })
    .join("");
  const presets = (Object.keys(M.PRESETS) as M.Preset[])
    .map((p) => `<button role="radio" aria-checked="${st.preset === p}" class="${st.preset === p ? "active" : ""}" data-preset="${p}" data-k="preset:${p}">${M.PRESETS[p]}</button>`)
    .join("");
  const state = s === 100 ? "ok" : s > 100 ? "over" : "under";
  const text = s === 100 ? "✓ Svih 100 bodova je raspodijeljeno" : s > 100 ? `${s - 100} ${plural(s - 100, "bod", "boda", "bodova")} previše` : `Preostalo još ${100 - s} ${plural(100 - s, "bod", "boda", "bodova")}`;
  return `<h2 class="gj-q">Koliko bodova kojem radu?</h2>
    <p class="muted">${
      st.preset === "rank"
        ? "Predložili smo bodove prema tvom redoslijedu. Promijeni ih kako želiš: važno je samo da zbroj bude 100."
        : "Podijeli 100 bodova kako želiš. Sve jednom radu je u redu."
    }</p>
    <div class="gj-presets" role="radiogroup" aria-label="Brza raspodjela">${presets}</div>
    <ul class="gj-rows">${rows}</ul>
    <p><button class="btn btn-sm" data-act="more">+ Dodaj ili makni favorite</button></p>
    <div class="gj-bar-sticky gj-meter gj-meter--${state}">
      <div class="gj-meter-text" data-meter><strong>${s}</strong> / 100 · ${text}</div>
      ${s !== 100 && s > 0 ? `<button class="btn btn-sm" data-act="fit">Svedi na 100</button>` : ""}
      <button class="btn btn-primary" data-act="to-review" ${s === 100 ? "" : "disabled"}>Dalje: provjeri →</button>
    </div>`;
}

function pregledHtml(): string {
  const items = M.clean(st.items);
  const n = Object.keys(items).length;
  const unchanged = hasCounted() && sameItems(items, counted());
  const closed = st.results ? !st.results.open : false;
  const action = onChain()
    ? `<button class="btn btn-primary btn-lg" data-act="submit" ${unchanged || closed || st.busy ? "disabled" : ""}>${
        closed ? "Glasanje je zatvoreno" : unchanged ? "✓ Ovo je već tvoj predani glas" : hasCounted() ? "Predaj izmijenjeni glas" : "Predaj glas"
      }</button>`
    : `<a class="btn btn-primary btn-lg" href="${link("glasanje")}" data-act="classic">Predaj na klasičnom listiću →</a>
       <p class="muted small">Ovo glasanje se predaje na klasičnom listiću. Tvoj listić je već ondje, samo klikni „Predaj glas”.</p>`;
  return `<h2 class="gj-q">Provjeri svoj listić</h2>
    <p>Ovo je točno ono što predaješ: <strong>${n} ${plural(n, "rad", "rada", "radova")}, 100 bodova</strong>.</p>
    ${ballotListHtml(items)}
    ${
      onChain()
        ? `<div class="gj-next"><strong>Što slijedi</strong><ol>
            <li>Prijava eOsobnom ili aplikacijom Certilia mobile.ID (jednom po osobi).</li>
            <li>Tvoj ključ glasača: passkey ili 24 riječi. Samo tim ključem možeš kasnije mijenjati glas.</li>
            <li>Preglednik zapečati listić i pošalje ga na Gnosis Chain. Bodovi su javni, bez imena.</li>
          </ol></div>`
        : ""
    }
    <div class="gj-actions">${action}
      <button class="btn" data-act="back-points">← Promijeni bodove</button></div>
    <details class="gj-tech"><summary>Tehnički zapis listića</summary><code class="mono">${esc(M.canon(items))}</code>
      <p class="muted small">Šifre radova i bodovi, sortirano po šifri. Isti zapis vidi i ugovor na lancu.</p></details>`;
}

function modalHtml(): string {
  if (CVV.flowOpen()) return CVV.flowHtml();
  if (!st.confirmWithdraw) return "";
  const n = Object.keys(counted()).length;
  return `<div class="gl-modal" role="dialog" aria-modal="true" aria-labelledby="gj-modal-t">
    <div class="gl-modal-box">
      <h3 id="gj-modal-t">Povući glas?</h3>
      <p>Tvojih 100 bodova na ${n} ${plural(n, "radu", "rada", "radova")} prestat će se brojati.</p>
      <p class="muted small">Listić ostaje spremljen na ovom uređaju, pa ga možeš ponovno predati. Za promjenu bodova ne treba povlačiti glas.</p>
      <div class="gl-actions">
        <button class="btn btn-primary" data-act="withdraw-no" data-autofocus>Ne, zadrži glas</button>
        <button class="btn btn-danger" data-act="withdraw-yes">Da, povuci glas</button>
      </div>
    </div>
  </div>`;
}

function bodyHtml(): string {
  switch (st.screen) {
    case "start":
      return startHtml();
    case "nacin":
      return nacinHtml();
    case "swipe":
      return swipeHtml();
    case "biraj":
      return birajHtml();
    case "bodovi":
      return bodoviHtml();
    case "pregled":
      return pregledHtml();
  }
}

const BACK: Partial<Record<Screen, Screen>> = { nacin: "start", swipe: "nacin", biraj: "nacin", bodovi: "biraj", pregled: "bodovi" };

function draw() {
  const el = root;
  if (!el || location.pathname.replace(/\/+$/, "") !== PATH) return;
  // Predan glas nakon toka: natrag na početak, gdje se vidi da se broji.
  if (st.screen === "pregled" && st.submitted && !CVV.flowOpen() && hasCounted() && sameItems(M.clean(st.items), counted())) {
    st.screen = "start";
    st.submitted = false;
  }
  const y = window.scrollY;
  const act = document.activeElement as HTMLElement | null;
  const focusKey = act && el.contains(act) ? act.dataset.k ?? null : null;
  const res = st.results;
  const wizard = st.screen !== "start";
  el.innerHTML = `<div class="gj">
    ${
      wizard
        ? `<div class="gj-top"><button class="linkish" data-act="back">← Natrag</button>${stepsHtml()}</div>`
        : `<section class="hero results-hero gj-hero">
            <div class="hero-eyebrow">Neslužbeno glasanje javnosti · eOsobna / Certilia mobile.ID</div>
            <h1>Glasaj za novi Maksimir</h1>
            <p class="hero-lede">Izaberi radove koji ti se sviđaju, provjeri bodove i predaj glas eOsobnom.
              Imaš 100 bodova za ${radovi.length} radova${res?.closes_at ? `, a glas možeš mijenjati do ${esc(fmtDate(res.closes_at))}` : ""}.</p>
            <ol class="gj-steps gj-steps--intro">${STEPS.map(([, t], i) => `<li><span>${i + 1}</span>${t}</li>`).join("")}</ol>
            <p class="gj-links small">
              <span>${res ? `${res.voters} ${plural(res.voters, "glasač", "glasača", "glasača")}` : ""}</span>
              <a href="${link("glasanje")}">Klasični listić, rezultati uživo i provjera →</a>
              ${st.signedIn && st.my?.verified ? `<span class="gl-who-ok">✓ Prijavljen/a eOsobnom</span>` : ""}
            </p>
          </section>`
    }
    ${onChain() ? CVV.bannerHtml() : ""}
    ${st.msg ? `<div class="gl-msg gl-msg--${st.msg.kind}" role="${st.msg.kind === "err" ? "alert" : "status"}">${esc(st.msg.text)}</div>` : ""}
    ${st.busy ? `<div class="gl-msg gl-msg--busy"><span class="gl-spin"></span><span>${esc(st.busy)}</span> ${st.abort ? `<button class="btn btn-sm" data-act="cancel">Odustani</button>` : ""}</div>` : ""}
    <div class="gj-body gj-body--${st.screen}">${bodyHtml()}</div>
    ${modalHtml()}
  </div>`;

  const auto = el.querySelector<HTMLElement>("[data-autofocus]");
  if (auto) auto.focus({ preventScroll: true });
  else if (focusKey) {
    const f = el.querySelector<HTMLElement>(`[data-k="${focusKey}"]`);
    f?.focus({ preventScroll: true });
    if (f instanceof HTMLInputElement && f.type === "search") f.setSelectionRange(f.value.length, f.value.length);
  }
  window.scrollTo({ top: y });
  bind(el);
  if (onChain()) CVV.bindChain(el);
}

function bind(el: HTMLElement) {
  const on = (act: string, fn: () => void) => el.querySelectorAll(`[data-act="${act}"]`).forEach((b) => b.addEventListener("click", fn));

  on("begin", () => go("nacin"));
  on("new", () => go("nacin"));
  on("resume", () => editBallot(M.clean(getDraft())));
  on("change", () => editBallot(counted()));
  on("transfer", () => CVV.startFlow("cast", { items: { ...(st.my?.items ?? {}) } }));
  on("back", () => go(BACK[st.screen] ?? "start"));
  on("cancel", () => st.abort?.abort());
  on("via-favoriti", () => startFresh("favoriti"));
  on("via-swipe", () => startFresh("swipe"));
  // swipe
  on("yes", () => swipe(true));
  on("no", () => swipe(false));
  on("undo", () => undoSwipe());
  on("enough", () => endSwipe());
  const deck = el.querySelector<HTMLElement>("[data-deck]");
  if (deck) dragDeck(deck);
  // favoriti
  el.querySelectorAll<HTMLElement>("[data-pick]").forEach((b) => b.addEventListener("click", () => togglePick(b.dataset.pick!)));
  el.querySelectorAll<HTMLElement>("[data-up],[data-down]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.up ?? b.dataset.down);
      st.picks = M.move(st.picks, i, b.dataset.up !== undefined ? -1 : 1);
      draw();
    })
  );
  el.querySelector<HTMLInputElement>(".gj-search")?.addEventListener("input", (e) => {
    st.q = (e.target as HTMLInputElement).value;
    draw();
  });
  on("to-points", () => toPoints());
  // bodovi
  el.querySelectorAll<HTMLElement>("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      st.preset = b.dataset.preset as M.Preset;
      const codes = st.picks.filter((c) => c in st.items);
      st.items = Object.fromEntries(codes.map((c) => [c, 0]));
      Object.assign(st.items, M.propose(codes, st.preset));
      saveItems();
      draw();
    })
  );
  el.querySelectorAll<HTMLElement>(".gj-rows li").forEach((row) => {
    const code = row.dataset.code!;
    row.querySelectorAll<HTMLElement>("[data-nudge]").forEach((b) =>
      b.addEventListener("click", () => {
        st.items = M.nudge(st.items, code, Number(b.dataset.nudge));
        st.preset = null;
        saveItems();
        draw();
      })
    );
    const input = row.querySelector<HTMLInputElement>("input")!;
    input.addEventListener("change", () => {
      st.items = { ...st.items, [code]: M.clampPoints(input.value) };
      st.preset = null;
      saveItems();
      draw();
    });
    row.querySelector<HTMLElement>("[data-remove]")!.addEventListener("click", () => {
      const { [code]: _, ...rest } = st.items;
      st.items = rest;
      st.picks = st.picks.filter((c) => c !== code);
      st.preset = null;
      saveItems();
      if (!st.picks.length) return go("biraj");
      draw();
    });
  });
  on("fit", () => {
    const fitted = M.fitTo100(st.items);
    st.items = Object.fromEntries(st.picks.filter((c) => c in st.items).map((c) => [c, fitted[c] ?? 0]));
    st.preset = null;
    saveItems();
    draw();
  });
  on("more", () => go("biraj"));
  on("to-review", () => {
    const v = M.validate(st.items, KNOWN);
    if (!v.ok) {
      st.msg = { kind: "err", text: v.reason };
      return draw();
    }
    go("pregled");
  });
  // pregled
  on("back-points", () => go("bodovi"));
  on("submit", () => submit());
  // povlačenje (gumb dolazi iz CVV.receiptHtml)
  on("withdraw", () => {
    st.confirmWithdraw = true;
    draw();
  });
  on("withdraw-no", () => {
    st.confirmWithdraw = false;
    draw();
  });
  on("withdraw-yes", () => withdraw());
  el.querySelector(".gl-modal:not(.cv-modal)")?.addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    st.confirmWithdraw = false;
    draw();
  });
}

/** Povlačenje slike u swipeu (miš, prst, olovka). Ispod praga se vraća na mjesto. */
function dragDeck(node: HTMLElement) {
  let x0: number | null = null;
  let dx = 0;
  const yes = node.querySelector<HTMLElement>(".gj-stamp--yes")!;
  const no = node.querySelector<HTMLElement>(".gj-stamp--no")!;
  node.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("a")) return;
    x0 = e.clientX;
    dx = 0;
    node.setPointerCapture(e.pointerId);
    node.style.transition = "none";
  });
  node.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    node.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    yes.style.opacity = String(Math.max(0, Math.min(1, dx / 100)));
    no.style.opacity = String(Math.max(0, Math.min(1, -dx / 100)));
  });
  const end = () => {
    if (x0 === null) return;
    x0 = null;
    if (Math.abs(dx) > 100) return swipe(dx > 0);
    node.style.transition = "transform .2s";
    node.style.transform = "";
    yes.style.opacity = no.style.opacity = "0";
  };
  node.addEventListener("pointerup", end);
  node.addEventListener("pointercancel", end);
}

document.addEventListener("keydown", (e) => {
  if (!root?.isConnected || location.pathname.replace(/\/+$/, "") !== PATH) return;
  if (e.key === "Escape") {
    if (CVV.escapeFlow()) return;
    if (st.confirmWithdraw) {
      st.confirmWithdraw = false;
      draw();
    }
    return;
  }
  if (st.screen !== "swipe" || CVV.flowOpen() || (e.target as Element)?.closest?.("input, textarea")) return;
  if (e.key === "ArrowRight") swipe(true);
  else if (e.key === "ArrowLeft") swipe(false);
  else if (e.key === "Backspace") undoSwipe();
});

// Za automatske provjere (glasanje-paritet.mjs): samo javni podaci.
(globalThis as { __glasaj?: unknown }).__glasaj = {
  get state() {
    return { screen: st.screen, picks: [...st.picks], items: { ...st.items }, preset: st.preset, seen: st.seen, liked: [...st.liked], order: [...st.order] };
  },
};
