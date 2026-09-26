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
  fetchChainConfig,
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
  CHAIN_SHARE_TEXT,
  bindShareButtons,
  plural,
  publicCardHtml,
  publicShareText,
  shareButtonsHtml,
} from "./shareView";
import { link, navigate } from "./routes";
import * as CVV from "./chainVoteView";

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
  filter: "all" | "award" | "popular" | "mine";
  pickAll: boolean;
  modal: "withdraw" | null;
  toast: { text: string; undo: Items | null; seen?: boolean } | null;
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
  filter: "all",
  pickAll: false,
  modal: null,
  toast: null,
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

// Glasanje na lancu (chainVoteView): uključuje se zastavicom u bazi ili ?lanac=<testna mreža>.
let phase1: Results | null = null; // rezultati faze 1 (ostatak koji se zbraja s lancem)
const host: CVV.Host = {
  draw: () => draw(),
  signIn: () => signIn(),
  signedIn: () => st.signedIn,
  my: () => st.my,
  setMy: (m) => void (st.my = m),
  draft: () => st.draft,
  saveDraft: (items) => saveDraft(items),
  phase1Results: () => phase1,
  setResults: (r) => void (st.results = r),
  refreshMy: async () => {
    st.my = await fetchMyBallot();
  },
  msg: (kind, text) => void (st.msg = { kind, text }),
};
const onChain = () => !!CVV.active();
/** Listić koji se trenutno broji za mene (na lancu ili u fazi 1). */
const counted = (): Items => (onChain() ? CVV.serverItems(st.my) : st.my?.items ?? {});

async function load() {
  st.draft = getDraft();
  const [session, results, checkpoints] = await Promise.all([
    getSession(),
    fetchResults().catch(() => null),
    fetchCheckpoints(),
  ]);
  const cfg = CVV.wantsChain(results) ? await fetchChainConfig().catch(() => null) : null;
  phase1 = results;
  st.results = results;
  st.checkpoints = checkpoints;
  st.signedIn = !!session;
  st.my = session ? await fetchMyBallot().catch(() => null) : null;
  st.pub = await fetchPublicBallots(60).catch(() => null);
  const chain = CVV.selectChain(cfg);
  if (chain) {
    await CVV.initChain(chain, host).catch(() => {
      st.msg = { kind: "err", text: "Glasanje na lancu trenutno nije dostupno." };
    });
  }
  await loadShareState();
  if (st.my && Object.keys(st.draft).length === 0 && Object.keys(counted()).length) {
    saveDraft({ ...counted() });
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
  st.modal = null;
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
    if (onChain()) await CVV.refreshChain();
    if (Object.keys(st.draft).length === 0 && Object.keys(counted()).length) saveDraft({ ...counted() });
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
  if (onChain()) {
    CVV.startFlow("cast", { items });
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
        ? `Hvala! Tvoj glas je predan i broji se (zapis #${st.my.receipt?.seq}).`
        : "Glas je povučen.",
    };
  });
}

/** Povlačenje glasa: prazan listić na poslužitelju, a nacrt ostaje na uređaju za ponovnu predaju. */
async function withdraw() {
  const keep = Object.keys(st.draft).length ? { ...st.draft } : { ...counted() };
  if (onChain()) {
    st.modal = null;
    saveDraft(keep);
    CVV.startFlow("withdraw");
    return;
  }
  await run("Povlačim glas…", async () => {
    st.modal = null;
    st.my = await castBallot({});
    saveDraft(keep);
    st.results = await fetchResults(true);
    await loadShareState();
    st.pub = await fetchPublicBallots(60).catch(() => st.pub);
    st.msg = {
      kind: "ok",
      text: "Glas je povučen i više se ne broji. Listić je ostao spremljen ispod: klikni „Predaj glas” kad ga želiš vratiti.",
    };
  });
  st.modal = null;
  draw();
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
  if (onChain()) return chainShareHtml();
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

/** Dijeljenje kad je glasanje na lancu: javno (ime iz baze + dokaz vlasništva) ili anonimno (na lancu). */
function chainShareHtml(): string {
  const my = st.my;
  const tab = st.shareTab ?? (my?.public_mode ? "public" : "zk");
  const busy = !!st.busy;
  const modes: [PublicMode, string][] = [
    ["full", "Ime i prezime iz eOsobne"],
    ["initial", "Ime i prvo slovo prezimena"],
    ["anon", "Bez imena (samo „potvrđeni glasač”)"],
  ];
  const radios = `<div class="sh-modes">${modes
    .map(([m, l]) => `<label class="sh-radio"><input type="radio" name="pubmode" value="${m}" ${st.pubMode === m ? "checked" : ""} /> ${l}</label>`)
    .join("")}</div>`;
  let body = CVV.shareBodyHtml(tab, st.pubMode, st.pubConsent, busy);
  if (tab === "public" && my?.public_mode && my.chain_public && my.share_id) {
    body = `${st.myCard ? publicCardHtml(st.myCard, { compact: true, href: link(`glasanje/g/${my.share_id}`) }) : ""}
      ${shareButtonsHtml(shareUrl(my.share_id), "Moj glas za novi Maksimir je na blockchainu, potvrđen eOsobnom. Provjeri i raspodijeli i ti svojih 100 bodova:")}
      ${radios}
      <div class="gl-actions">
        <button class="btn btn-sm" data-act="pub-change" ${busy || st.pubMode === my.public_mode ? "disabled" : ""}>Promijeni prikaz imena</button>
        <button class="btn btn-sm" data-act="pub-off" ${busy ? "disabled" : ""}>Ukloni javni prikaz</button>
      </div>`;
  } else if (tab === "public" && body.includes('data-cv="pub"')) {
    body = radios + body;
  }
  const anon = CVV.anonShareId();
  if (tab === "zk" && anon) {
    body = shareButtonsHtml(shareUrl(anon), CHAIN_SHARE_TEXT) + `<p class="small"><a href="${link(`glasanje/g/${anon}`)}">Otvori svoju objavu i provjeri je →</a></p>`;
  }
  return `<section class="panel sh-panel">
    <h2>Podijeli svoj glas</h2>
    <div class="sh-tabs" role="tablist">
      <button role="tab" class="${tab === "public" ? "active" : ""}" data-tab="public">Javno, s imenom${my?.public_mode ? " ✓" : ""}</button>
      <button role="tab" class="${tab === "zk" ? "active" : ""}" data-tab="zk">Anonimno, na lancu${anon ? " ✓" : ""}</button>
    </div>
    <div class="sh-body">${body}</div>
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

// Nijanse za segmente trake „100 bodova” (ponavljaju se kad je radova više).
const SEG = ["#002f6c", "#2a5fa8", "#5b8fd0", "#8fb5e3", "#1d4580", "#4577bb"];

type Phase = "empty" | "under" | "over" | "ready" | "done";

function phase(): Phase {
  const n = Object.keys(st.draft).length;
  const sum = sumPoints(st.draft);
  if (!n) return "empty";
  if (sum > 100) return "over";
  if (sum < 100) return "under";
  const server = counted();
  if (onChain() && CVV.needsTransfer()) return "ready";
  return Object.keys(server).length && sameItems(st.draft, server) ? "done" : "ready";
}

function stepsHtml(): string {
  const p = phase();
  const idx = { empty: 0, under: 1, over: 1, ready: 2, done: 3 }[p];
  const steps = [
    ["Odaberi radove", "Klikni „Dodaj” kod radova koji ti se sviđaju."],
    ["Podijeli 100 bodova", "Više bodova = jača podrška. Sve na jedan rad je u redu."],
    onChain()
      ? ["Predaj eOsobnom i ključem", "Certilia potvrdi da si stvarna osoba, a tvoj ključ zapečati listić na lancu."]
      : ["Predaj eOsobnom", "Prijava ide preko Certilije, samo za potvrdu da si stvarna osoba."],
  ];
  const signed = st.signedIn && st.my?.verified;
  return `<section class="gl-steps" aria-label="Kako glasati">
    <ol>${steps
      .map(
        ([t, d], i) =>
          `<li class="${i < idx ? "done" : i === idx ? "now" : ""}">
            <span class="gl-step-n">${i < idx ? "✓" : i + 1}</span>
            <div><strong>${t}</strong><span>${d}</span></div>
          </li>`
      )
      .join("")}</ol>
    <div class="gl-who">${
      signed
        ? `<span class="gl-who-ok">✓ Prijavljen/a eOsobnom</span> <button class="linkish" data-act="signout">Odjava</button>`
        : `<span class="muted">Već si glasao/la?</span> <button class="linkish" data-act="signin" ${st.busy ? "disabled" : ""}>Prijavi se i vidi svoj listić</button>`
    }</div>
  </section>`;
}

function matches(r: Rad, q: string): boolean {
  return [r.lead, r.code, ...r.roles.map((x) => x.name), ...r.countries].join(" ").toLowerCase().includes(q);
}

const PICK_PAGE = 24;

function pickerHtml(): string {
  const q = st.q.trim().toLowerCase();
  const share = new Map((st.results?.results ?? []).map((r) => [r.code, r]));
  let list = radovi.filter((r) => !q || matches(r, q));
  if (st.filter === "award") list = list.filter((r) => r.award);
  if (st.filter === "mine") list = list.filter((r) => r.code in st.draft);
  if (st.filter === "popular")
    list = [...list].sort((a, b) => (share.get(b.code)?.points ?? 0) - (share.get(a.code)?.points ?? 0));
  const nMine = Object.keys(st.draft).length;
  const chips: [State["filter"], string][] = [
    ["all", `Svi radovi · ${radovi.length}`],
    ["award", "Nagrađeni · 5"],
    ["popular", "Najpopularniji kod javnosti"],
    ["mine", `Na mom listiću · ${nMine}`],
  ];

  const more = list.length > PICK_PAGE && !st.pickAll && !q && st.filter !== "mine";
  const cards = (more ? list.slice(0, PICK_PAGE) : list)
    .map((r) => {
      const on = r.code in st.draft;
      const s = share.get(r.code);
      return `<article class="gp-card${on ? " is-on" : ""}">
        <button class="gp-img" data-toggle="${r.code}" data-k="img:${r.code}" aria-label="${on ? "Makni s listića" : "Dodaj na listić"}: ${esc(label(r))}">
          ${r.image ? `<img src="/radovi/${r.code}-t.jpg" alt="" loading="lazy" />` : `<span class="gl-noimg"></span>`}
          ${on ? `<span class="gp-pts">${st.draft[r.code]} b.</span>` : ""}
          ${r.award ? `<span class="gp-award">${r.award}. nagrada</span>` : ""}
        </button>
        <div class="gp-body">
          <a class="gp-name" href="${link(`radovi/${r.code}`)}" title="Otvori rad">${esc(label(r))}</a>
          <span class="gp-meta">${esc(r.countries.join(", ") || "—")}${s && s.points > 0 ? ` · ${pct(s.share)} javnosti` : ""}</span>
        </div>
        <button class="btn btn-sm gp-toggle${on ? " is-on" : ""}" data-toggle="${r.code}" data-k="tg:${r.code}">${on ? "✓ Na listiću" : "+ Dodaj"}</button>
      </article>`;
    })
    .join("");

  return `<section class="panel gp-panel" id="gl-radovi">
    <div class="gp-head">
      <h2>1. Odaberi radove</h2>
      <input id="gl-q" type="search" placeholder="Traži: ured, autor, zemlja ili šifra…" value="${esc(st.q)}" aria-label="Traži rad" data-k="q" />
    </div>
    <div class="gp-chips" role="tablist">${chips
      .map(
        ([f, t]) =>
          `<button role="tab" aria-selected="${st.filter === f}" class="${st.filter === f ? "active" : ""}" data-filter="${f}" data-k="f:${f}">${t}</button>`
      )
      .join("")}</div>
    ${
      list.length
        ? `<div class="gp-grid">${cards}</div>
           ${more ? `<button class="btn gp-more" data-act="pick-all">Prikaži sve radove (${list.length})</button>` : ""}`
        : `<p class="muted gp-empty">${st.filter === "mine" ? "Na listiću još nema radova." : "Nijedan rad ne odgovara pretrazi."}</p>`
    }
  </section>`;
}

function hintHtml(p: Phase, sum: number): string {
  const zero = Object.values(st.draft).filter((v) => !v).length;
  const note =
    zero && p !== "empty"
      ? ` <span class="warn">${zero} ${plural(zero, "rad ima", "rada imaju", "radova ima")} 0 bodova i ne ulaz${zero === 1 ? "i" : "e"} u glas.</span>`
      : "";
  return hintText(p, sum) + note;
}

function hintText(p: Phase, sum: number): string {
  const signed = st.signedIn && st.my?.verified;
  switch (p) {
    case "empty":
      return Object.keys(counted()).length
        ? "Listić na ovom uređaju je prazan, a predani glas i dalje vrijedi."
        : "Listić je prazan. Klikni „+ Dodaj” kod rada koji ti se sviđa.";
    case "under":
      return `Preostalo ti je još <strong>${100 - sum}</strong> ${plural(100 - sum, "bod", "boda", "bodova")}. Povuci klizač ili klikni „Dodijeli ostatak”.`;
    case "over":
      return `Imaš <strong>${sum - 100}</strong> ${plural(sum - 100, "bod", "boda", "bodova")} previše. Smanji nekom radu bodove.`;
    case "ready":
      return signed
        ? "Sve je spremno. Klikni „Predaj glas”."
        : "Sve je spremno. Klikni „Predaj glas” i potvrdi se eOsobnom ili aplikacijom Certilia mobile.ID.";
    case "done":
      return `Tvoj glas je predan i broji se. Možeš ga mijenjati do ${esc(fmtDate(st.results?.closes_at ?? null))}.`;
  }
}

function ballotHtml(): string {
  const entries = Object.entries(st.draft);
  const sum = sumPoints(st.draft);
  const server = counted();
  const hasServer = Object.keys(server).length > 0;
  const dirty = !sameItems(st.draft, server);
  const open = st.results?.open ?? true;
  const p = phase();

  const segs = entries
    .filter(([, v]) => v > 0)
    .map(
      ([code, v], i) =>
        `<span style="width:${(Math.min(v, 100) / Math.max(100, sum)) * 100}%;background:${SEG[i % SEG.length]}" title="${esc(label(byCode[code] ?? ({ lead: code } as Rad)))}: ${v}"></span>`
    )
    .join("");

  const rows = entries
    .map(([code, pts], i) => {
      const r = byCode[code];
      if (!r) return "";
      return `<li class="gl-row${pts === 0 ? " is-zero" : ""}" data-code="${code}">
        <span class="gl-dot" style="background:${SEG[i % SEG.length]}"></span>
        <a class="gl-name" href="${link(`radovi/${code}`)}">${esc(label(r))}</a>
        <button class="gl-x" data-act="remove" data-k="x:${code}" aria-label="Makni ${esc(label(r))} s listića" title="Makni s listića">✕</button>
        <input type="range" min="0" max="100" step="1" value="${pts}" data-f="range" data-k="range:${code}" aria-label="Bodovi za ${esc(label(r))}" />
        <label class="gl-num"><input type="number" inputmode="numeric" min="0" max="100" step="1" value="${pts}" data-f="num" data-k="num:${code}" aria-label="Bodovi za ${esc(label(r))}" /><span>b.</span></label>
      </li>`;
    })
    .join("");

  const submitLabel = !open
    ? "Glasanje je zatvoreno"
    : p === "done"
      ? "✓ Glas je predan"
      : onChain()
        ? CVV.submitLabel(hasServer)
        : hasServer
          ? "Predaj izmijenjeni glas"
          : "Predaj glas";

  return `
    <aside class="panel gl-ballot" id="gl-listic">
      <div class="gl-ballot-head">
        <h2>2. Moj listić</h2>
        <span class="gl-count">${entries.length} ${plural(entries.length, "rad", "rada", "radova")}</span>
      </div>
      <div class="gl-meter ${p === "over" ? "over" : sum === 100 ? "ok" : ""}">
        <div class="gl-meter-num"><strong data-sum>${sum}</strong> / 100 bodova</div>
        <div class="gl-meter-bar">${segs}</div>
      </div>
      <p class="gl-hint" data-hint>${hintHtml(p, sum)}</p>
      ${entries.length ? `<ul class="gl-rows">${rows}</ul>` : ""}
      ${
        entries.length
          ? `<div class="gl-tools">
              <button class="btn btn-sm" data-act="spread" ${sum >= 100 ? "hidden" : ""}>Dodijeli ostatak (${Math.max(0, 100 - sum)})</button>
              ${entries.length > 1 ? `<button class="btn btn-sm" data-act="equal">Podijeli jednako</button>` : ""}
              <button class="btn btn-sm btn-quiet" data-act="clear">Isprazni listić</button>
            </div>`
          : ""
      }
      <div class="gl-submit">
        <h3>3. Predaj</h3>
        <button class="btn btn-primary btn-lg" data-act="submit" ${submitDisabled() ? "disabled" : ""}>${submitLabel}</button>
        ${hasServer && dirty ? `<button class="btn btn-sm btn-quiet" data-act="reset">Odbaci izmjene i vrati predani listić</button>` : ""}
      </div>
      ${
        onChain()
          ? CVV.receiptHtml(dirty, !!st.busy)
          : hasServer && st.my?.receipt
          ? `<details class="gl-receipt">
              <summary>✓ Glas zapisan kao #${st.my.receipt.seq} · ${esc(fmtDate(st.my.updated_at))}${dirty ? ` · <span class="warn">imaš nepredane izmjene</span>` : ""}</summary>
              <p class="small muted">Potvrda služi da kasnije sam/a provjeriš da je tvoj glas ubrojen.</p>
              <div class="mono small">${st.my.receipt.hash}</div>
              <div class="gl-actions">
                <button class="btn btn-sm" data-act="receipt">Preuzmi potvrdu</button>
                <button class="btn btn-sm btn-danger-quiet" data-act="withdraw" ${st.busy ? "disabled" : ""}>Povuci glas…</button>
              </div>
            </details>`
          : ""
      }
    </aside>`;
}

function resultsHtml(): string {
  const res = st.results;
  if (!res) return "";
  const rows = res.results.filter((r) => r.points > 0);
  const shown = st.showAll ? rows : rows.slice(0, 10);
  return `
    <section class="panel gl-results">
      <h2>Rezultati uživo <span class="muted small">· ${res.voters} ${plural(res.voters, "glasač", "glasača", "glasača")}</span></h2>
      <p class="muted small">Postotak = udio svih podijeljenih bodova. Podupiratelji = koliko je osoba radu dalo barem 1 bod.</p>
      ${
        rows.length
          ? `<ol class="gl-rank">${shown
              .map((row, i) => {
                const r = byCode[row.code];
                if (!r) return "";
                const mine = row.code in st.draft;
                return `<li>
                  <span class="gl-place">${i + 1}.</span>
                  ${r.image ? `<img src="/radovi/${row.code}-t.jpg" alt="" loading="lazy" />` : `<span class="gl-noimg"></span>`}
                  <div class="gl-rank-main">
                    <a class="gl-name" href="${link(`radovi/${row.code}`)}">${esc(label(r))}</a>
                    <div class="gl-bar gl-bar--result"><span style="width:${Math.min(100, row.share)}%"></span></div>
                    <span class="muted small">${row.backers} ${plural(row.backers, "podupiratelj", "podupiratelja", "podupiratelja")}</span>
                  </div>
                  <div class="gl-rank-side">
                    <span class="gl-share">${pct(row.share)}</span>
                    ${mine ? `<span class="muted small">✓ na listiću</span>` : `<button class="btn btn-sm" data-toggle="${row.code}">+ Dodaj</button>`}
                  </div>
                </li>`;
              })
              .join("")}</ol>
            ${rows.length > 10 ? `<button class="btn btn-sm" data-act="all">${st.showAll ? "Prikaži manje" : `Prikaži svih ${rows.length}`}</button>` : ""}`
          : `<p>Još nema glasova. Budi prvi.</p>`
      }
    </section>`;
}

function integrityHtml(): string {
  const cps = [...st.checkpoints].reverse().slice(0, 8);
  const btc = st.checkpoints.filter((c) => c.bitcoin).at(-1);
  return `
    <details class="panel gl-integrity">
      <summary><h2>Kako znaš da nitko nije dirao glasove</h2><span class="muted small">lanac hasheva, Bitcoin žig svaki sat, provjera skriptom</span></summary>
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
        ${onChain() ? CVV.integrityHtml() : ""}
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
    </details>`;
}

function modalHtml(): string {
  if (CVV.flowOpen()) return CVV.flowHtml();
  if (st.consent) {
    return `<div class="gl-modal" role="dialog" aria-modal="true" aria-labelledby="gl-modal-t">
      <div class="gl-modal-box">
        <h3 id="gl-modal-t">Prije prvog glasa</h3>
        <ul>
          <li>Ovo je <strong>neslužbeno</strong> glasanje javnosti. Nema nikakav utjecaj na odluku ocjenjivačkog suda.</li>
          <li>Imaš jedan glas od 100 bodova. Listić smiješ mijenjati do zatvaranja, a broji se zadnja verzija.</li>
          <li>Identitet se provjerava putem Certilije. U bazi se čuva samo šifrirani OIB i njegov hash, radi pravila „jedna osoba, jedan listić”.
            Glasanje <strong>nije tajno</strong> prema operateru baze. Javno se objavljuju samo zbirni rezultati i, po zatvaranju,
            lanac listića pod pseudonimima, bez imena i OIB-a.</li>
        </ul>
        <div class="gl-actions">
          <button class="btn btn-primary" data-act="consent" data-autofocus ${st.busy ? "disabled" : ""}>Prihvaćam i predajem glas</button>
          <button class="btn" data-act="noconsent">Odustani</button>
        </div>
      </div>
    </div>`;
  }
  if (st.modal === "withdraw") {
    const n = Object.keys(counted()).length;
    return `<div class="gl-modal" role="dialog" aria-modal="true" aria-labelledby="gl-modal-t">
      <div class="gl-modal-box">
        <h3 id="gl-modal-t">Povući glas?</h3>
        <p>Tvojih 100 bodova na ${n} ${plural(n, "radu", "rada", "radova")} prestat će se brojati u rezultatima.</p>
        <p class="muted small">Listić ostaje spremljen na ovom uređaju, pa ga kasnije možeš ponovno predati jednim klikom.
          Za promjenu bodova ne treba povlačiti glas: samo izmijeni listić i predaj ga ponovno.</p>
        <div class="gl-actions">
          <button class="btn btn-primary" data-act="modal-close" data-autofocus>Ne, zadrži glas</button>
          <button class="btn btn-danger" data-act="withdraw-yes" ${st.busy ? "disabled" : ""}>Da, povuci glas</button>
        </div>
      </div>
    </div>`;
  }
  return "";
}

function toastHtml(): string {
  if (!st.toast) return "";
  const cls = st.toast.seen ? "gl-toast" : "gl-toast gl-toast--in";
  st.toast.seen = true;
  return `<div class="${cls}" role="status">${esc(st.toast.text)}
    ${st.toast.undo ? `<button class="linkish" data-act="undo">Vrati</button>` : ""}</div>`;
}

function mobileBarHtml(): string {
  const n = Object.keys(st.draft).length;
  if (!n) return "";
  const sum = sumPoints(st.draft);
  return `<div class="gl-mbar">
    <span><strong data-sum>${sum}</strong>/100 · ${n} ${plural(n, "rad", "rada", "radova")}</span>
    <a class="btn btn-sm btn-primary" href="#gl-listic">Moj listić ↓</a>
  </div>`;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Kratka obavijest na dnu ekrana, po potrebi s „Vrati” (prethodni nacrt). */
function toast(text: string, undo: Items | null = null) {
  st.toast = { text, undo };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    st.toast = null;
    root?.querySelector(".gl-toast")?.remove();
  }, 7000);
}

function submitDisabled(): boolean {
  const n = Object.keys(st.draft).length;
  const sum = sumPoints(st.draft);
  const open = st.results?.open ?? true;
  const same = sameItems(st.draft, counted()) && !(onChain() && CVV.needsTransfer());
  return !!st.busy || !open || same || (n > 0 && sum !== 100);
}

/** Klizač i tipkanje ažuriraju zbroj, traku i savjet na mjestu (puni draw() bi prekinuo povlačenje). */
function updateBallotInPlace(el: HTMLElement) {
  const sum = sumPoints(st.draft);
  const p = phase();
  el.querySelectorAll<HTMLElement>("[data-sum]").forEach((s) => (s.textContent = String(sum)));
  const meter = el.querySelector<HTMLElement>(".gl-meter");
  if (meter) {
    meter.classList.toggle("ok", sum === 100);
    meter.classList.toggle("over", sum > 100);
    const segs = meter.querySelectorAll<HTMLElement>(".gl-meter-bar span");
    const vals = Object.values(st.draft).filter((v) => v > 0);
    if (segs.length === vals.length) segs.forEach((s, i) => (s.style.width = `${(Math.min(vals[i], 100) / Math.max(100, sum)) * 100}%`));
  }
  const hint = el.querySelector<HTMLElement>("[data-hint]");
  if (hint) hint.innerHTML = hintHtml(p, sum);
  const spread = el.querySelector<HTMLButtonElement>('[data-act="spread"]');
  if (spread) {
    spread.hidden = sum >= 100;
    spread.textContent = `Dodijeli ostatak (${Math.max(0, 100 - sum)})`;
  }
  el.querySelectorAll<HTMLElement>(".gl-row").forEach((row) => row.classList.toggle("is-zero", !st.draft[row.dataset.code!]));
  const submit = el.querySelector<HTMLButtonElement>('[data-act="submit"]');
  if (submit) submit.disabled = submitDisabled();
}

function draw() {
  const el = root;
  if (!el) return;
  // Puni re-render: sačuvaj scroll i fokus (npr. uzastopni klikovi, tipkanje u pretrazi).
  const y = window.scrollY;
  const act = document.activeElement as HTMLElement | null;
  const focusKey = act && el.contains(act) ? act.dataset.k ?? null : null;
  const res = st.results;

  el.innerHTML = `
    <section class="hero results-hero gl-hero">
      <div class="hero-eyebrow">Neslužbeno glasanje javnosti · eOsobna / Certilia mobile.ID</div>
      <h1>Tvojih 100 bodova za novi Maksimir</h1>
      <p class="hero-lede">
        Odaberi radove koji ti se sviđaju i podijeli im 100 bodova: sve jednom radu ili npr. 40 / 30 / 20 / 10.
        Predaješ jednom, a listić smiješ mijenjati do ${esc(fmtDate(res?.closes_at ?? null))}.
      </p>
      <div class="gl-hero-kpis">
        <span><strong>${res?.voters ?? "—"}</strong> ${plural(res?.voters ?? 0, "glasač", "glasača", "glasača")}</span>
        <span><strong>${radovi.length}</strong> radova</span>
        <span>glasanje <strong>${res ? (res.open ? "otvoreno" : "zatvoreno") : "—"}</strong></span>
        <a href="${link(DOC_SLUG)}">Kako radi →</a>
      </div>
    </section>

    ${stepsHtml()}
    ${onChain() ? CVV.bannerHtml() : ""}
    ${st.msg ? `<div class="gl-msg gl-msg--${st.msg.kind}">${esc(st.msg.text)}</div>` : ""}
    ${
      st.busy
        ? `<div class="gl-msg gl-msg--busy"><span class="gl-spin"></span><span data-busy>${esc(st.busy)}</span> ${st.abort ? `<button class="btn btn-sm" data-act="cancel">Odustani</button>` : ""}</div>`
        : ""
    }
    <div class="gl-layout">
      ${pickerHtml()}
      ${ballotHtml()}
    </div>
    ${resultsHtml()}
    ${shareHtml()}
    ${publicListHtml()}
    ${integrityHtml()}
    ${mobileBarHtml()}
    ${toastHtml()}
    ${modalHtml()}
  `;

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

function removeFromDraft(code: string) {
  const prev = { ...st.draft };
  const d = { ...st.draft };
  delete d[code];
  saveDraft(d);
  toast(`Maknut s listića: ${label(byCode[code])}`, prev);
  draw();
}

function bind(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>(".gl-row").forEach((row) => {
    const code = row.dataset.code!;
    const range = row.querySelector<HTMLInputElement>('[data-f="range"]')!;
    const num = row.querySelector<HTMLInputElement>('[data-f="num"]')!;
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v) || 0));
    const onInput = (src: HTMLInputElement, other: HTMLInputElement) => () => {
      const v = clamp(Number(src.value));
      saveDraft({ ...st.draft, [code]: v });
      other.value = String(v);
      updateBallotInPlace(el);
    };
    range.addEventListener("input", onInput(range, num));
    num.addEventListener("input", onInput(num, range));
    // Po završetku promjene puni draw(): kartice u galeriji i savjeti se usklade.
    range.addEventListener("change", () => draw());
    num.addEventListener("change", () => {
      num.value = String(st.draft[code] ?? 0);
      draw();
    });
    row.querySelector('[data-act="remove"]')!.addEventListener("click", () => removeFromDraft(code));
  });

  el.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const code = b.dataset.toggle!;
      if (code in st.draft) return removeFromDraft(code);
      addToDraft(code);
      st.draft = getDraft();
      toast(`Dodano na listić: ${label(byCode[code])}`);
      draw();
    })
  );

  el.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      st.filter = b.dataset.filter as State["filter"];
      draw();
    })
  );

  el.querySelector<HTMLInputElement>("#gl-q")?.addEventListener("input", (e) => {
    st.q = (e.target as HTMLInputElement).value;
    draw();
  });

  const on = (act: string, fn: () => void) =>
    el.querySelectorAll(`[data-act="${act}"]`).forEach((b) => b.addEventListener("click", fn));

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
    st.modal = "withdraw";
    draw();
  });
  on("withdraw-yes", () => void withdraw());
  on("modal-close", () => {
    st.modal = null;
    draw();
  });
  el.querySelector(".gl-modal:not(.cv-modal)")?.addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    st.modal = null;
    st.consent = false;
    draw();
  });
  on("undo", () => {
    if (!st.toast?.undo) return;
    saveDraft(st.toast.undo);
    st.toast = null;
    draw();
  });
  on("reset", () => {
    saveDraft({ ...counted() });
    draw();
  });
  on("clear", () => {
    const prev = { ...st.draft };
    saveDraft({});
    toast("Listić je ispražnjen.", prev);
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
  on("equal", () => {
    const codes = Object.keys(st.draft);
    const prev = { ...st.draft };
    const base = Math.floor(100 / codes.length);
    let extra = 100 - base * codes.length;
    saveDraft(Object.fromEntries(codes.map((c) => [c, base + (extra-- > 0 ? 1 : 0)])));
    toast("Bodovi su podijeljeni jednako.", prev);
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
  on("pub-off", () => void publish(null));
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
  on("pick-all", () => {
    st.pickAll = true;
    draw();
  });
  on("all", () => {
    st.showAll = !st.showAll;
    draw();
  });
}

// Esc zatvara otvoreni dijalog (jedan slušač za cijelu stranicu).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !root?.isConnected) return;
  if (CVV.escapeFlow()) return;
  if (!st.modal && !st.consent) return;
  st.modal = null;
  st.consent = false;
  draw();
});

// ── mali panel na stranici pojedinog rada ───────────────────────────────────

export async function renderRadVotePanel(el: HTMLElement, code: string) {
  let res = await fetchResults().catch(() => null);
  const chain = CVV.wantsChain(res) ? CVV.selectChain(await fetchChainConfig().catch(() => null)) : null;
  if (chain) res = await import("./chainVote").then((cv) => cv.chainResults(chain, res)).catch(() => res);
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
