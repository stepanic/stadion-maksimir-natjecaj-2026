// Stranica /glasanje: listić od 100 bodova, rezultati uživo i provjerljivost
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
  setPublic,
  fetchShare,
  fetchPublicBallots,
  shareUrl,
  type Items,
  type PublicMode,
  type PublicCard,
  type PublicBallots,
  type MyBallot,
  type Results,
  type Checkpoint,
} from "./glasanje";
import {
  DOC_GITHUB,
  DOC_SLUG,
  ZK_SHARE_TEXT,
  bindShareButtons,
  plural,
  publicCardHtml,
  publicShareText,
  shareButtonsHtml,
} from "./shareView";
import { link, navigate } from "./routes";

const ZK_SHARE_KEY = "maksimir-zk-share"; // {commitment: shareId} — zadnji anonimni dokaz na ovom uređaju

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
  shareTab: "public" | "zk" | null;
  pubMode: PublicMode;
  pubConsent: boolean;
  myCard: PublicCard | null;
  pub: PublicBallots | null;
  pubAll: boolean;
  zkLocal: string | null; // commitment lokalnog ZK ključa
  zkShare: string | null;
  zkImport: boolean;
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
  shareTab: null,
  pubMode: "initial",
  pubConsent: false,
  myCard: null,
  pub: null,
  pubAll: false,
  zkLocal: null,
  zkShare: null,
  zkImport: false,
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
  st.pub = await fetchPublicBallots(60).catch(() => null);
  await loadShareState();
  if (st.my && Object.keys(st.draft).length === 0 && Object.keys(st.my.items).length) {
    saveDraft({ ...st.my.items });
  }
  if (!st.results) st.msg = { kind: "err", text: "Rezultati trenutno nisu dostupni." };
}

/** Stanje dijeljenja: vlastita javna kartica i lokalni ZK ključ (bez učitavanja snarkjs-a). */
async function loadShareState() {
  const my = st.my;
  st.myCard = null;
  if (my?.public_mode && my.share_id) {
    const s = await fetchShare(my.share_id).catch(() => null);
    st.myCard = s?.kind === "public" ? s.card : null;
    st.pubMode = my.public_mode;
  }
  st.zkLocal = null;
  st.zkShare = null;
  if (my?.zk_commitment || localZkKey()) {
    const { loadIdentity } = await import("./zk");
    st.zkLocal = loadIdentity()?.commitment.toString() ?? null;
    if (st.zkLocal) st.zkShare = zkShares()[st.zkLocal] ?? null;
  }
}

function localZkKey(): boolean {
  try {
    return !!localStorage.getItem("maksimir-zk-identity");
  } catch {
    return false;
  }
}

function zkShares(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ZK_SHARE_KEY) || "{}");
  } catch {
    return {};
  }
}

function rememberZkShare(commitment: string, id: string) {
  try {
    localStorage.setItem(ZK_SHARE_KEY, JSON.stringify({ ...zkShares(), [commitment]: id }));
  } catch {
    /* nije kritično */
  }
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
    await loadShareState();
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
    await loadShareState();
    st.pub = await fetchPublicBallots(60).catch(() => st.pub);
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
    stranica: new URL(link("glasanje"), location.origin + "/").href,
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

// ── dijeljenje: javno ili anonimno (ZK) ─────────────────────────────────────

async function publish(mode: PublicMode | null) {
  await run(mode ? "Objavljujem glas javno…" : "Uklanjam javni prikaz…", async () => {
    st.my = await setPublic(mode);
    await loadShareState();
    st.pub = await fetchPublicBallots(60).catch(() => st.pub);
    st.pubConsent = false;
    st.msg = { kind: "ok", text: mode ? "Glas je javan. Podijeli poveznicu." : "Glas više nije javan. Stara poveznica ne prikazuje ništa." };
  });
}

/** Tekst trenutnog koraka bez punog re-rendera (ZK izračun traje nekoliko sekundi). */
function step(text: string) {
  st.busy = text;
  root?.querySelectorAll<HTMLElement>("[data-busy]").forEach((box) => (box.textContent = text));
}

async function makeZkProof() {
  await run("Pripremam ZK ključ…", async () => {
    const zk = await import("./zk");
    let id = zk.loadIdentity();
    if (!id) {
      step("Izrađujem ZK ključ u tvom pregledniku…");
      id = zk.newIdentity();
    }
    const commitment = id.commitment.toString();
    if (st.my?.zk_commitment !== commitment) {
      step("Upisujem commitment u grupu potvrđenih glasača…");
      await zk.registerIdentity(id);
      st.my = await fetchMyBallot();
    }
    const shareId = await zk.createZkShare(id, step);
    rememberZkShare(commitment, shareId);
    st.zkLocal = commitment;
    st.zkShare = shareId;
    st.pub = await fetchPublicBallots(60).catch(() => st.pub);
    st.msg = { kind: "ok", text: "Anonimni ZK dokaz je izrađen. Podijeli poveznicu." };
  });
}

async function exportZkKey() {
  const { exportIdentity } = await import("./zk");
  const k = exportIdentity();
  if (!k) return;
  const blob = new Blob(
    [
      `Tajni ZK ključ za glasanje o Stadionu Maksimir (Semaphore v4).\n` +
        `Nikome ga ne šalji: tko ima ključ, može izraditi dokaz u tvoje ime.\n` +
        `Na drugom uređaju: ${location.host}${link("glasanje")} → Anonimno (ZK) → Uvezi ključ.\n\n${k}\n`,
    ],
    { type: "text/plain" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "maksimir-zk-kljuc.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importZkKey(text: string) {
  await run("Uvozim ZK ključ…", async () => {
    const zk = await import("./zk");
    const candidate = zk.parseIdentity(zk.findExportedKey(text) ?? text).commitment.toString();
    const inGroup = st.my?.zk_commitment ?? null;
    // Ključ na ovom uređaju već odgovara grupi: drugačiji ključ je gotovo sigurno
    // pogrešna datoteka, a prepisivanje bi pri sljedećoj izradi zamijenilo ključ u grupi.
    if (inGroup && st.zkLocal === inGroup && candidate !== inGroup) {
      throw new VoteError("Taj ključ ne odgovara ključu u grupi, a ključ na ovom uređaju odgovara. Ključ nije promijenjen.");
    }
    const id = zk.importIdentity(zk.findExportedKey(text) ?? text);
    st.zkLocal = id.commitment.toString();
    st.zkShare = zkShares()[st.zkLocal] ?? null;
    st.zkImport = false;
    st.msg = {
      kind: "ok",
      text:
        st.my?.zk_commitment === st.zkLocal
          ? "Ključ je uvezen i odgovara ključu u grupi."
          : "Ključ je uvezen. Pri izradi dokaza zamijenit će ključ koji je sad u grupi.",
    };
  });
}

function shareHtml(): string {
  const my = st.my;
  const has = !!my && Object.keys(my.items).length > 0;
  if (!has) {
    return `<section class="panel sh-panel">
      <h2>Podijeli svoj glas</h2>
      <p class="muted">Kad predaš listić, možeš ga podijeliti na dva načina: <strong>javno</strong>, s imenom iz eOsobne i svim bodovima,
        ili <strong>anonimno</strong>, sa ZK dokazom da je glas predala stvarna potvrđena osoba, bez otkrivanja tko je i kako je glasala.</p>
    </section>`;
  }
  const tab = st.shareTab ?? (my!.public_mode ? "public" : "zk");
  const busy = st.busy ? "disabled" : "";

  const modes: [PublicMode, string][] = [
    ["full", "Ime i prezime iz eOsobne"],
    ["initial", "Ime i prvo slovo prezimena"],
    ["anon", "Bez imena (samo „potvrđeni glasač”)"],
  ];
  const radios = modes
    .map(
      ([m, l]) =>
        `<label class="sh-radio"><input type="radio" name="pubmode" value="${m}" ${st.pubMode === m ? "checked" : ""} /> ${l}</label>`
    )
    .join("");

  const pub = my!.public_mode
    ? `${st.myCard ? publicCardHtml(st.myCard, { compact: true, href: link(`glasanje/g/${my!.share_id}`) }) : ""}
       ${st.myCard && my!.share_id ? shareButtonsHtml(shareUrl(my!.share_id), publicShareText(st.myCard)) : ""}
       <div class="sh-modes">${radios}</div>
       <div class="gl-actions">
         <button class="btn btn-sm" data-act="pub-change" ${busy || st.pubMode === my!.public_mode ? "disabled" : ""}>Promijeni prikaz imena</button>
         <button class="btn btn-sm" data-act="pub-off" ${busy}>Ukloni javni prikaz</button>
       </div>`
    : `<p>Tvoj glas (svi bodovi) bit će vidljiv svima na stalnoj poveznici i na popisu javnih glasova. Uz njega piše da je identitet potvrđen eOsobnom.</p>
       <div class="sh-modes">${radios}</div>
       <label class="sh-consent"><input type="checkbox" data-act="pub-consent" ${st.pubConsent ? "checked" : ""} />
         Pristajem da se moj glas javno prikaže s izabranim oblikom imena. Javni prikaz mogu isključiti bilo kada.</label>
       <button class="btn btn-primary" data-act="pub-on" ${busy || !st.pubConsent ? "disabled" : ""}>Objavi moj glas javno</button>`;

  const inGroup = !!my!.zk_commitment;
  const keyMatches = inGroup && st.zkLocal === my!.zk_commitment;
  const zk = my!.public_mode
    ? `<p>Tvoj glas je trenutno javan. Anonimni dokaz ima smisla samo za glas koji nije javan.</p>
       <button class="btn btn-sm" data-act="pub-off" ${busy}>Ukloni javni prikaz</button>`
    : `<p>Tvoj preglednik izradi tajni ključ koji ga nikad ne napušta, a u grupu potvrđenih glasača upiše samo njegov
         <em>commitment</em>. Zatim izračuna <strong>ZK dokaz</strong> (Semaphore, Groth16): „jedan sam od N potvrđenih glasača”.
         Tko otvori poveznicu, provjerava dokaz u svom pregledniku. Ne vidi ni tko si ni kako si glasao/la.</p>
       ${
         st.zkShare && keyMatches
           ? shareButtonsHtml(shareUrl(st.zkShare), ZK_SHARE_TEXT) +
             `<p class="small"><a href="${link(`glasanje/g/${st.zkShare}`)}">Otvori svoj dokaz i provjeri ga →</a></p>`
           : `<button class="btn btn-primary" data-act="zk-make" ${busy}>${
               keyMatches
                 ? "Prikaži moj ZK dokaz (ponovno se izračuna, poveznica ostaje ista)"
                 : inGroup
                   ? "Zamijeni ključ u grupi ovim s uređaja i izradi novi dokaz"
                   : "Izradi anonimni ZK dokaz"
             }</button>`
       }
       ${
         inGroup && !keyMatches
           ? `<p class="warn small">U grupi je ključ s drugog uređaja ili preglednika. Uvezi taj ključ ili izradi novi.
               Novi ključ zamjenjuje stari u grupi i daje novi nullifier.</p>`
           : ""
       }
       <div class="gl-actions small">
         ${st.zkLocal ? `<button class="btn btn-sm" data-act="zk-export">Preuzmi svoj ZK ključ</button>` : ""}
         <button class="btn btn-sm" data-act="zk-import-toggle">Uvezi ključ s drugog uređaja</button>
       </div>
       ${
         st.zkImport
           ? `<div class="sh-import"><textarea id="zk-key" rows="3" placeholder="Zalijepi sadržaj datoteke maksimir-zk-kljuc.txt"></textarea>
               <button class="btn btn-sm btn-primary" data-act="zk-import" ${busy}>Uvezi</button></div>`
           : ""
       }
       <p class="muted small">Anonimnost raste s veličinom grupe. U fazi 1 operater baze zna koji je glasač upisao koji commitment, a javnost ne zna.
         <a href="${link(DOC_SLUG)}">Detalji i plan →</a></p>`;

  return `<section class="panel sh-panel">
    <h2>Podijeli svoj glas</h2>
    <div class="sh-tabs" role="tablist">
      <button role="tab" class="${tab === "public" ? "active" : ""}" data-tab="public">Javno, s imenom${my!.public_mode ? " ✓" : ""}</button>
      <button role="tab" class="${tab === "zk" ? "active" : ""}" data-tab="zk">Anonimno, sa ZK dokazom${st.zkShare && keyMatches ? " ✓" : ""}</button>
    </div>
    ${st.busy ? `<div class="gl-msg"><span data-busy>${esc(st.busy)}</span></div>` : ""}
    <div class="sh-body">${tab === "public" ? pub : zk}</div>
  </section>`;
}

function publicListHtml(): string {
  const p = st.pub;
  if (!p || (!p.count && !p.zk_shares)) return "";
  const shown = st.pubAll ? p.ballots : p.ballots.slice(0, 6);
  return `<section class="panel sh-list">
    <h2>Javni glasovi <span class="muted small">· ${p.count} ${plural(p.count, "javni", "javna", "javnih")} ·
      ${p.zk_shares} ${plural(p.zk_shares, "anonimni ZK dokaz", "anonimna ZK dokaza", "anonimnih ZK dokaza")}</span></h2>
    <p class="muted small">Glasači koji su sami izabrali da im glas bude javan. Klik na ime otvara objavu koju se može podijeliti.</p>
    <div class="sh-grid">${shown.map((c) => publicCardHtml(c, { compact: true, href: link(`glasanje/g/${c.id}`) })).join("")}</div>
    ${p.ballots.length > 6 ? `<button class="btn btn-sm" data-act="pub-all">${st.pubAll ? "Prikaži manje" : `Prikaži sve (${p.ballots.length})`}</button>` : ""}
  </section>`;
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
        <a class="gl-name" href="${link(`radovi/${code}`)}">${esc(label(r))}<span class="muted small"> · <code>${code}</code></span></a>
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
                  <a class="gl-name" href="${link(`radovi/${row.code}`)}">${esc(label(r))}</a>
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
      <p class="small">Cijeli postupak s dijagramima: <a href="${link(DOC_SLUG)}">tehnički opis korak po korak</a>
        (<a href="${DOC_GITHUB}" target="_blank" rel="noopener">GitHub ↗</a>).</p>
      <ol>
        <li><strong>Lanac hasheva.</strong> Svaka predaja, izmjena ili povlačenje listića dodaje zapis u lanac u kojem svaki zapis sadrži hash prethodnog.
          Baza odbija izmjenu i brisanje zapisa. Svaki potajni ispravak promijenio bi sve hasheve iza njega.</li>
        <li><strong>Potvrda.</strong> Nakon predaje preuzmi potvrdu: svoj zapis, njegov hash i pseudonim. Pseudonim je stalan, ali ne otkriva tko si.</li>
        <li><strong>Bitcoin, svaki sat.</strong> Svaki sat se snapshot (vrh lanca + trenutni rezultati) žigoše putem
          <a href="https://opentimestamps.org" target="_blank" rel="noopener">OpenTimestamps ↗</a> i nakon par sati trajno zapisuje u Bitcoin blok.
          Tko god kasnije prepravi povijest, ne može promijeniti ono što je već u Bitcoinu. U snapshotu je i vrh zapisnika ZK grupe.</li>
        <li><strong>Anonimni ZK dokazi.</strong> Tko podijeli glas anonimno, objavljuje Semaphore dokaz da je jedan od potvrđenih glasača.
          Svaki posjetitelj ga provjerava u svom pregledniku, a korijen grupe računa iz javnog zapisnika.</li>
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
      <p class="small"><a href="${link(DOC_SLUG)}">Kako tehnički radi, korak po korak →</a> ·
        <a href="${DOC_GITHUB}" target="_blank" rel="noopener">isti dokument na GitHubu ↗</a></p>
    </section>

    <section class="card-grid">
      <div class="kpi"><div class="kpi-label">Glasača</div><div class="kpi-value">${res?.voters ?? "—"}</div><div class="kpi-meta">potvrđenih eOsobnom</div></div>
      <div class="kpi"><div class="kpi-label">Glasanje</div><div class="kpi-value">${res ? (res.open ? "otvoreno" : "zatvoreno") : "—"}</div><div class="kpi-meta">do ${esc(fmtDate(res?.closes_at ?? null))}</div></div>
      <div class="kpi"><div class="kpi-label">Radova</div><div class="kpi-value">88</div><div class="kpi-meta"><a href="${link("radovi")}">pregledaj sve →</a></div></div>
    </section>

    ${st.msg ? `<div class="gl-msg gl-msg--${st.msg.kind}">${esc(st.msg.text)}</div>` : ""}
    ${
      st.busy
        ? `<div class="gl-msg"><span data-busy>${esc(st.busy)}</span> ${st.abort ? `<button class="btn btn-sm" data-act="cancel">Odustani</button>` : ""}</div>`
        : ""
    }
    ${authHtml()}
    <div class="gl-grid">
      ${ballotHtml()}
      ${resultsHtml()}
    </div>
    ${shareHtml()}
    ${publicListHtml()}
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
  el.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      st.shareTab = b.dataset.tab as "public" | "zk";
      draw();
    })
  );
  el.querySelectorAll<HTMLInputElement>('input[name="pubmode"]').forEach((r) =>
    r.addEventListener("change", () => {
      st.pubMode = r.value as PublicMode;
      draw();
    })
  );
  el.querySelector<HTMLInputElement>('[data-act="pub-consent"]')?.addEventListener("change", (e) => {
    st.pubConsent = (e.target as HTMLInputElement).checked;
    draw();
  });
  on("pub-on", () => void publish(st.pubMode));
  on("pub-change", () => void publish(st.pubMode));
  el.querySelectorAll('[data-act="pub-off"]').forEach((b) => b.addEventListener("click", () => void publish(null)));
  on("pub-all", () => {
    st.pubAll = !st.pubAll;
    draw();
  });
  on("zk-make", () => void makeZkProof());
  on("zk-export", () => void exportZkKey());
  on("zk-import-toggle", () => {
    st.zkImport = !st.zkImport;
    draw();
  });
  on("zk-import", () => void importZkKey(el.querySelector<HTMLTextAreaElement>("#zk-key")?.value ?? ""));
  bindShareButtons(el);
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
        ? `<p>Na tvom listiću: <strong>${onDraft}</strong> bodova. <a class="btn btn-sm" href="${link("glasanje")}">Uredi listić →</a></p>`
        : `<button class="btn btn-primary" data-act="add">+ Dodaj na moj listić</button>
           <span class="muted small">Imaš 100 bodova za sve radove zajedno. Glasa se eOsobnom.</span>`
    }`;
  el.querySelector('[data-act="add"]')?.addEventListener("click", () => {
    addToDraft(code);
    navigate("glasanje");
  });
}
