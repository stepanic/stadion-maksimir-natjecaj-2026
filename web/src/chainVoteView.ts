// Glasanje na lancu na stranici /glasanje: vođeni tok za laike (koraci sa stanjima),
// ključ glasača (24 riječi + passkey), potvrda s lanca, objave. Logika je u chainVote.ts.
//
// glasanjeView.ts ovo koristi samo kad je glasanje na lancu uključeno (zastavica u bazi
// ili ?lanac=<testna mreža>). Inače se ništa odavde ne učitava ni ne crta.
import { esc } from "./radoviView";
import { acceptChainTerms, chainName, sumPoints, VoteError, type ChainCfg, type ChainConfig, type Items, type MyBallot, type PublicMode, type Results } from "./glasanje";
import { plural } from "./shareView";
import { link } from "./routes";
import type * as CV from "./chainVote";

type Mod = typeof CV;

export type Host = {
  draw(): void;
  signIn(): Promise<void>;
  signedIn(): boolean;
  my(): MyBallot | null;
  setMy(m: MyBallot): void;
  draft(): Items;
  saveDraft(items: Items): void;
  phase1Results(): Results | null;
  setResults(r: Results): void;
  refreshMy(): Promise<void>;
  msg(kind: "ok" | "err", text: string): void;
};

type Purpose = "cast" | "withdraw" | "public" | "anon" | "unlock";
type StepId = "signin" | "terms" | "key" | "right" | "send";
type StepState = "wait" | "now" | "done" | "err";
type KeyStage = "choose" | "show" | "confirm" | "protect" | "enter";

type Flow = {
  purpose: Purpose;
  items: Items;
  mode: PublicMode;
  steps: Record<StepId, StepState>;
  keyStage: KeyStage;
  pending: CV.Key | null; // novi ključ ili ključ iz faze 1 dok se riječi ne potvrde
  words: string[] | null; // samo dok su prikazane
  positions: number[];
  confirmErr: boolean;
  keyErr: string | null;
  status: string | null;
  error: string | null;
  pkg: CV.CastPackage | null;
  done: string | null;
  running: boolean;
};

const S = {
  chain: null as ChainCfg | null,
  mod: null as Mod | null,
  key: null as CV.Key | null, // tajna samo u memoriji ove stranice
  ballot: null as CV.ChainBallot | null,
  nullifier: null as string | null,
  flow: null as Flow | null,
  host: null as Host | null,
  shareId: null as string | null,
  revealed: null as string[] | null,
  chainVoters: 0,
  phase1Voters: 0,
  ready: false, // stanje s lanca učitano (za automatske provjere)
};

// Za automatske provjere (glasanje-chain.mjs): samo javni podaci, nikad tajna ni riječi.
(globalThis as { __chainVote?: unknown }).__chainVote = {
  get state() {
    return {
      chain: S.chain?.label ?? null,
      ready: S.ready,
      commitment: S.key?.commitment ?? S.mod?.localCommitment() ?? null,
      nullifier: S.nullifier,
      ballot: S.ballot,
      flow: S.flow ? { purpose: S.flow.purpose, steps: { ...S.flow.steps }, keyStage: S.flow.keyStage, error: S.flow.error, done: S.flow.done, status: S.flow.status } : null,
      positions: S.flow?.positions ?? [],
    };
  },
};

const OVERRIDE_KEY = "maksimir-lanac"; // sessionStorage: oznaka testne mreže (?lanac=chiado)

/**
 * Koja mreža vrijedi na ovoj stranici: testna iz ?lanac=<oznaka> (pamti se u sesiji, ?lanac=0
 * briše), inače aktivna mreža kad je prijelaz nastupio. null = faza 1.
 */
/**
 * Treba li uopće pitati bazu za konfiguraciju lanca: samo kad je prijelaz zadan (chain_from u
 * rezultatima, dakle migracija 20260926120000 postoji) ili kad tester traži ?lanac=. Tako web
 * radi i nad bazom bez nove migracije (nema 404 u konzoli).
 */
export function wantsChain(results: Results | null, search = location.search): boolean {
  if (results?.chain_from) return true;
  const q = new URLSearchParams(search).get("lanac");
  if (q && q !== "0") return true;
  try {
    return q !== "0" && !!sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return false;
  }
}

export function selectChain(cfg: ChainConfig | null, search = location.search, now = Date.now()): ChainCfg | null {
  if (!cfg) return null;
  const q = new URLSearchParams(search).get("lanac");
  try {
    if (q === "0" || q === "") sessionStorage.removeItem(OVERRIDE_KEY);
    else if (q) sessionStorage.setItem(OVERRIDE_KEY, q);
  } catch {
    /* privatni prozor */
  }
  let label: string | null = q && q !== "0" ? q : null;
  try {
    label ??= q === "0" ? null : sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    /* ništa */
  }
  if (label) return cfg.chains.find((c) => c.label === label) ?? null;
  if (cfg.active && cfg.chain_from && Date.parse(cfg.chain_from) <= now) return cfg.active;
  return null;
}

export const active = () => S.chain;
export const flowOpen = () => !!S.flow;
export const flowBusy = () => !!S.flow?.running;

/** Učitaj modul i stanje s lanca. Vraća false ako lanac nije dostupan (stranica ostaje na fazi 1). */
export async function initChain(chain: ChainCfg, host: Host): Promise<boolean> {
  S.host = host;
  S.chain = chain;
  S.mod ??= await import("./chainVote");
  await refreshChain();
  return true;
}

/** Rezultati s lanca + ostatak faze 1; moj listić preko zapamćenog nullifiera (bez ključa). */
export async function refreshChain() {
  const c = S.chain!;
  const m = S.mod!;
  const h = S.host!;
  try {
    const r = await m.chainResults(c, h.phase1Results());
    S.chainVoters = r.chainVoters;
    S.phase1Voters = r.phase1Voters;
    h.setResults(r);
  } catch {
    h.msg("err", "Rezultati s lanca trenutno nisu dostupni.");
  }
  const reg = m.registrationFor(h.my(), c);
  const commitment = S.key?.commitment ?? reg?.commitment ?? m.localCommitment();
  S.nullifier = commitment ? m.localNullifier(c, commitment) : null;
  S.ballot = S.nullifier ? await m.myChainBallot(c, S.nullifier).catch(() => null) : null;
  S.shareId = commitment ? m.localShare(c, commitment) : null;
  S.ready = true;
}

/** Listić koji se trenutno broji za mene (lanac; inače neprenesen listić faze 1). */
export function serverItems(my: MyBallot | null): Items {
  if (S.ballot && S.ballot.revision > 0) return S.ballot.items;
  return my?.items ?? {};
}

const registered = () => (S.mod && S.chain ? S.mod.registrationFor(S.host!.my(), S.chain) : null);

// ── tok ─────────────────────────────────────────────────────────────────────────

const STEP_TEXT: Record<StepId, [string, string]> = {
  signin: ["Prijava eOsobnom", "Certilia potvrđuje da si stvarna osoba. Jednom po osobi."],
  terms: ["Uvjeti glasanja na lancu", "Kratko: tvoj listić je javan, ali bez imena."],
  key: ["Tvoj ključ glasača", "Samo ti možeš mijenjati svoj glas. Ključ nastaje u tvom pregledniku."],
  right: ["Pravo glasa", "domovina.ai potvrdi da imaš pravo glasa, a relayer to upiše na lanac."],
  send: ["Predaja", "Preglednik zapečati listić ZK dokazom, a relayer ga pošalje."],
};

const PURPOSE_SEND: Record<Purpose, string> = {
  cast: "Predaja listića",
  withdraw: "Povlačenje glasa",
  public: "Javna objava",
  anon: "Anonimna objava",
  unlock: "Učitavanje tvog listića",
};

export function startFlow(purpose: Purpose, opts: { items?: Items; mode?: PublicMode } = {}) {
  S.flow = {
    purpose,
    items: opts.items ?? {},
    mode: opts.mode ?? "initial",
    steps: { signin: "wait", terms: "wait", key: "wait", right: "wait", send: "wait" },
    keyStage: "choose",
    pending: null,
    words: null,
    positions: [],
    confirmErr: false,
    keyErr: null,
    status: null,
    error: null,
    pkg: null,
    done: null,
    running: false,
  };
  void advance();
}

function closeFlow() {
  const f = S.flow;
  if (f?.running) return;
  if (f?.pending && f.pending !== S.key) S.mod?.zeroize(f.pending.secret);
  S.flow = null;
  S.host?.draw();
}

function setStep(id: StepId, state: StepState) {
  if (S.flow) S.flow.steps[id] = state;
}

function status(text: string | null) {
  if (!S.flow) return;
  S.flow.status = text;
  // tekst bez punog crtanja (ZK izračun traje nekoliko sekundi)
  document.querySelectorAll<HTMLElement>("[data-cv-status]").forEach((el) => (el.textContent = text ?? ""));
}

/** Idi kroz korake dok ne treba klik glasača ili dok ne završi. */
async function advance() {
  const f = S.flow;
  const h = S.host!;
  const m = S.mod!;
  const c = S.chain!;
  if (!f || f.running) return;
  f.error = null;

  // 1. prijava
  const my = h.my();
  if (!h.signedIn() || !my?.verified) {
    setStep("signin", "now");
    return h.draw();
  }
  setStep("signin", "done");

  // 2. uvjeti v2
  if (!my.chain_consented) {
    setStep("terms", "now");
    return h.draw();
  }
  setStep("terms", "done");

  // 3. ključ
  const required = registered()?.commitment ?? null;
  if (S.key && required && S.key.commitment !== required) {
    m.zeroize(S.key.secret);
    S.key = null;
  }
  if (!S.key) {
    setStep("key", "now");
    return h.draw();
  }
  setStep("key", "done");

  // 4. + 5. bez klikova
  f.running = true;
  h.draw();
  try {
    setStep("right", "now");
    h.draw();
    const reg = await m.ensureRegistered(c, S.key, status);
    if (reg && Object.keys(reg.transferred ?? {}).length) {
      h.msg("ok", "Tvoj listić iz faze 1 prenesen je na lanac (u fazi 1 više se ne broji).");
    }
    await h.refreshMy();
    setStep("right", "done");

    setStep("send", "now");
    h.draw();
    await send(f);
    setStep("send", "done");
    status(null);
  } catch (e) {
    const step: StepId = f.steps.right === "done" ? "send" : "right";
    setStep(step, "err");
    f.error = e instanceof VoteError ? e.message : `Neočekivana greška: ${(e as Error).message}`;
    status(null);
  } finally {
    f.running = false;
    finishKey();
    h.draw();
  }
}

/** Nakon radnje: s passkeyjem se tajna briše (sljedeći put Face ID); samo s riječima ostaje za ovaj posjet. */
function finishKey() {
  const m = S.mod!;
  if (S.key && !m.wordsOnly() && m.localCredential() && S.flow?.done) {
    m.zeroize(S.key.secret);
    S.key = null;
  }
}

async function send(f: Flow) {
  const h = S.host!;
  const m = S.mod!;
  const c = S.chain!;
  const k = S.key!;
  switch (f.purpose) {
    case "cast":
    case "withdraw": {
      const items = f.purpose === "withdraw" ? {} : f.items;
      f.pkg = await m.buildCast(c, k, items, status);
      const tx = await m.sendCast(c, f.pkg, status);
      f.pkg = null;
      await refreshChain();
      if (f.purpose === "cast") h.saveDraft({ ...items });
      const url = m.txUrl(c, tx);
      f.done =
        f.purpose === "cast"
          ? `Tvoj glas je na lancu i broji se (revizija ${S.ballot?.revision ?? "?"}).${url ? "" : ` Transakcija ${tx}.`}`
          : "Glas je povučen i više se ne broji. Listić je ostao spremljen na ovom uređaju.";
      h.msg("ok", f.done);
      return;
    }
    case "public": {
      const pseudonym = h.my()?.pseudonym;
      if (!pseudonym) throw new VoteError("Nedostaje pseudonim glasača. Osvježi stranicu.");
      h.setMy(await m.publishChainBallot(c, k, pseudonym, f.mode, status));
      f.done = "Tvoj glas s lanca je javan. Podijeli poveznicu.";
      h.msg("ok", f.done);
      return;
    }
    case "anon": {
      S.shareId = await m.shareAnonymously(c, k, status);
      f.done = "Anonimna objava je na lancu. Podijeli poveznicu.";
      h.msg("ok", f.done);
      return;
    }
    case "unlock": {
      await refreshChain();
      if (!S.nullifier) {
        status("Računam nullifier tvog listića…");
        S.nullifier = (await m.nullifierFor(c, k)).toString();
        S.ballot = await m.myChainBallot(c, S.nullifier);
      }
      if (S.ballot?.revision) h.saveDraft({ ...S.ballot.items });
      f.done = S.ballot?.revision ? "Tvoj listić s lanca je učitan." : "Ključ je otključan. Na lancu još nema tvog listića.";
      return;
    }
  }
}

// ── ključ: radnje ───────────────────────────────────────────────────────────────

function keyError(e: unknown) {
  if (!S.flow) return;
  S.flow.keyErr = e instanceof Error ? e.message : String(e);
  S.host!.draw();
}

/** Ključ je spreman; provjeri da je baš onaj upisan za ovu osobu. */
function acceptKey(k: CV.Key): boolean {
  const required = registered()?.commitment;
  if (required && k.commitment !== required) {
    keyError(
      new VoteError(
        `To nije ključ upisan za tebe (otisak ${k.fingerprint}). Na lancu je upisan ključ ${short(required)}. Otključaj baš njega passkeyjem ili ga upiši riječima.`
      )
    );
    S.mod!.zeroize(k.secret);
    return false;
  }
  S.key = k;
  return true;
}

function beginNew(k: CV.Key) {
  const f = S.flow!;
  f.pending = k;
  f.words = S.mod!.secretToWords(k.secret);
  f.keyStage = "show";
  f.keyErr = null;
  S.host!.draw();
}

function toConfirm() {
  const f = S.flow!;
  f.positions = S.mod!.confirmationPositions(3);
  f.keyStage = "confirm";
  f.confirmErr = false;
  S.host!.draw();
}

function checkWords(answers: string[]) {
  const f = S.flow!;
  if (!f.words || !S.mod!.checkConfirmation(f.words, f.positions, answers)) {
    f.confirmErr = true;
    return S.host!.draw();
  }
  f.words = null; // riječi nestaju sa stranice (ADR 0001)
  f.keyStage = "protect";
  S.host!.draw();
}

async function protect() {
  const f = S.flow!;
  const k = f.pending!;
  f.keyErr = null;
  try {
    await S.mod!.protectKey(k);
  } catch (e) {
    // K-01: neuspjeli passkey ne smije izgubiti ključ — tajna ostaje, nudi se ponovni pokušaj
    return keyError(new VoteError(`Passkey nije izrađen: ${(e as Error).message}. Pokušaj ponovno ili nastavi samo s riječima.`));
  }
  if (acceptKey(k)) {
    f.pending = null;
    void advance();
  }
}

function wordsOnlyContinue() {
  const f = S.flow!;
  const k = f.pending!;
  S.mod!.rememberKey(k, { wordsOnly: true });
  if (acceptKey(k)) {
    f.pending = null;
    void advance();
  }
}

async function unlock() {
  try {
    const k = await S.mod!.unlockKey();
    if (acceptKey(k)) void advance();
  } catch (e) {
    keyError(e);
  }
}

function enterWords(text: string) {
  try {
    const k = S.mod!.keyFromWords(text);
    if (!acceptKey(k)) return;
    S.mod!.rememberKey(k);
    // Na ovom uređaju još nema passkeyja: ponudi zaštitu, ali ne traži je.
    if (!S.mod!.localCredential()) {
      const f = S.flow!;
      f.pending = k;
      f.keyStage = "protect";
      S.host!.draw();
      return;
    }
    void advance();
  } catch (e) {
    keyError(e);
  }
}

// ── crtanje ───────────────────────────────────────────────────────────────────────

const short = (s: string) => (s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s);

function stepsHtml(f: Flow): string {
  const ids: StepId[] = ["signin", "terms", "key", "right", "send"];
  const icon: Record<StepState, string> = { wait: "", now: "", done: "✓", err: "!" };
  return `<ol class="cv-steps">${ids
    .map((id, i) => {
      const [t, d] = STEP_TEXT[id];
      const title = id === "send" ? PURPOSE_SEND[f.purpose] : t;
      const s = f.steps[id];
      return `<li class="cv-${s}" data-cv-step="${id}" data-state="${s}">
        <span class="cv-n">${icon[s] || i + 1}</span>
        <div><strong>${title}</strong><span>${d}</span>
          <em class="cv-state">${{ wait: "čeka", now: "sada", done: "gotovo", err: "nije uspjelo" }[s]}</em></div>
      </li>`;
    })
    .join("")}</ol>`;
}

function keyHtml(f: Flow): string {
  const m = S.mod!;
  const reg = registered();
  const busy = f.running ? "disabled" : "";
  const err = f.keyErr ? `<p class="cv-err" role="alert">${esc(f.keyErr)}</p>` : "";
  switch (f.keyStage) {
    case "show":
      return `<div class="cv-key">
        <p><strong>Ovo je tvoj ključ: 24 riječi.</strong> Zapiši ih na papir, redom. Tko ima ove riječi, može mijenjati tvoj glas,
          a bez njih (i bez passkeyja) glas ostaje zamrznut. Mi ih ne vidimo i ne možemo ih vratiti.</p>
        <ol class="cv-words">${f.words!.map((w) => `<li><span>${esc(w)}</span></li>`).join("")}</ol>
        <p class="muted small">Otisak ključa: <strong>${esc(f.pending!.fingerprint)}</strong>. Ovo nisu riječi novčanika: ne unosi ih u MetaMask.</p>
        <div class="gl-actions">
          <button class="btn btn-sm" data-cv="copy">Kopiraj</button>
          <button class="btn btn-sm" data-cv="print">Ispiši</button>
          <button class="btn btn-primary" data-cv="written">Zapisao/la sam, dalje</button>
        </div>
      </div>`;
    case "confirm":
      return `<div class="cv-key">
        <p><strong>Provjera:</strong> upiši riječi s ovih mjesta, iz onoga što si zapisao/la.</p>
        <div class="cv-confirm">${f.positions
          .map((p, i) => `<label>${p + 1}. riječ <input data-cv-word="${i}" autocomplete="off" autocapitalize="none" spellcheck="false" /></label>`)
          .join("")}</div>
        ${f.confirmErr ? `<p class="cv-err" role="alert">Riječi se ne slažu. Provjeri zapisano.</p>` : ""}
        <div class="gl-actions">
          <button class="btn btn-sm" data-cv="back-show">Prikaži riječi ponovno</button>
          <button class="btn btn-primary" data-cv="confirm">Provjeri</button>
        </div>
      </div>`;
    case "protect":
      return `<div class="cv-key">
        <p><strong>Zaštiti ključ passkeyjem</strong> (Face ID, Touch ID, Windows Hello). Tada za glasanje ne trebaš riječi:
          dovoljan je otisak prsta ili lice, i na drugim uređajima s istim računom (iCloud, Google).</p>
        ${err}
        <div class="gl-actions">
          <button class="btn btn-primary" data-cv="protect" ${busy}>Zaštiti passkeyjem</button>
          <button class="btn btn-sm" data-cv="words-only" ${busy}>Nastavi samo s riječima</button>
        </div>
        <p class="muted small">Bez passkeyja ključ vrijedi samo dok je ova stranica otvorena; sljedeći put upisuješ riječi.</p>
      </div>`;
    case "enter":
      return `<div class="cv-key">
        <p>Upiši svojih 24 riječi, redom, razmakom između riječi.</p>
        <textarea id="cv-words-in" rows="4" autocomplete="off" autocapitalize="none" spellcheck="false"></textarea>
        ${err}
        <div class="gl-actions">
          <button class="btn btn-sm" data-cv="back-choose">Natrag</button>
          <button class="btn btn-primary" data-cv="enter-ok">Otključaj</button>
        </div>
      </div>`;
    case "choose": {
      const p1 = m.phase1Key();
      const p1ok = p1 && (!reg || reg.commitment === p1.commitment);
      const hasPasskey = !!m.localCredential() && !m.wordsOnly();
      const opts: string[] = [];
      if (reg) {
        opts.push(`<p>Za tebe je na lancu upisan ključ <strong>${esc(short(reg.commitment))}</strong>. Otključaj ga.</p>`);
        opts.push(`<button class="btn btn-primary" data-cv="unlock" ${busy}>Otključaj passkeyjem</button>`);
        if (p1ok) opts.push(`<button class="btn" data-cv="phase1" ${busy}>Koristi ZK ključ iz faze 1 s ovog uređaja</button>`);
        opts.push(`<button class="btn" data-cv="enter" ${busy}>Upiši 24 riječi</button>`);
      } else {
        if (hasPasskey) opts.push(`<button class="btn btn-primary" data-cv="unlock" ${busy}>Otključaj passkeyjem</button>`);
        if (p1ok)
          opts.push(`<button class="btn ${hasPasskey ? "" : "btn-primary"}" data-cv="phase1" ${busy}>Koristi svoj ZK ključ iz faze 1</button>
            <p class="muted small">Isti ključ kojim si u fazi 1 izradio/la anonimni dokaz. Pokazat ćemo ga kao 24 riječi.</p>`);
        opts.push(`<button class="btn ${hasPasskey || p1ok ? "" : "btn-primary"}" data-cv="new" ${busy}>Izradi novi ključ</button>`);
        opts.push(`<button class="btn btn-sm" data-cv="enter" ${busy}>Već imam 24 riječi</button>`);
        if (!hasPasskey) opts.push(`<button class="btn btn-sm" data-cv="unlock" ${busy}>Imam passkey za glasanje</button>`);
      }
      return `<div class="cv-key cv-choose">${opts.join("")}${err}</div>`;
    }
  }
}

export function flowHtml(): string {
  const f = S.flow;
  if (!f) return "";
  const c = S.chain!;
  const now = (Object.keys(f.steps) as StepId[]).find((id) => f.steps[id] === "now" || f.steps[id] === "err");
  let body = "";
  if (f.done && !f.running) {
    body = `<p class="cv-done" role="status">✓ ${esc(f.done)}</p>
      ${lastTxHtml()}
      <div class="gl-actions"><button class="btn btn-primary" data-cv="close" data-autofocus>Zatvori</button></div>`;
  } else if (now === "signin") {
    body = `<p>Za glasanje se jednom prijaviš eOsobnom ili aplikacijom Certilia mobile.ID.</p>
      <button class="btn btn-primary" data-cv="signin" data-autofocus>Prijavi se eOsobnom</button>`;
  } else if (now === "terms") {
    body = `<ul class="cv-terms">
        <li>Glasanje je <strong>neslužbeno</strong> i nema utjecaja na odluku ocjenjivačkog suda.</li>
        <li>Tvoj listić ide na javni blockchain (${esc(chainName(c))}): bodovi su <strong>javni odmah</strong>,
          pod nasumičnom oznakom (nullifier), <strong>bez imena i OIB-a</strong>. Tko zna točno kad si glasao/la, mogao bi pogoditi tvoj listić.</li>
        <li>Samo ti, svojim ključem, možeš mijenjati svoj listić. Ni mi to ne možemo. Ako izgubiš i riječi i passkey, zadnji listić se i dalje broji, ali se više ne može mijenjati.</li>
        <li>domovina.ai zna da ti je izdano pravo glasa (jednom po osobi), ali ne zna koji je listić tvoj.</li>
      </ul>
      <div class="gl-actions">
        <button class="btn btn-primary" data-cv="terms" data-autofocus>Prihvaćam</button>
        <button class="btn" data-cv="close">Odustani</button>
      </div>`;
  } else if (now === "key") {
    body = keyHtml(f);
  } else if (f.error) {
    body = `<p class="cv-err" role="alert">${esc(f.error)}</p>
      <div class="gl-actions">
        <button class="btn btn-primary" data-cv="retry">Pokušaj ponovno</button>
        ${f.pkg ? `<button class="btn btn-sm" data-cv="package">Preuzmi paket i pošalji sam</button>` : ""}
        <button class="btn btn-sm" data-cv="close">Zatvori</button>
      </div>`;
  } else {
    body = `<p class="cv-status"><span class="gl-spin"></span> <span data-cv-status>${esc(f.status ?? "Radim…")}</span></p>
      <p class="muted small">Ne zatvaraj stranicu. Tvoj ključ ne napušta preglednik; relayer dobiva samo zapečaćen paket.</p>`;
  }
  return `<div class="gl-modal cv-modal" role="dialog" aria-modal="true" aria-labelledby="cv-t">
    <div class="gl-modal-box">
      <h3 id="cv-t">${esc(PURPOSE_SEND[f.purpose])}${m1(c)}</h3>
      ${stepsHtml(f)}
      <div class="cv-body">${body}</div>
    </div>
  </div>`;
}

const m1 = (c: ChainCfg) => (c.counts ? "" : ` <span class="cv-test">testna mreža</span>`);

function lastTxHtml(): string {
  const c = S.chain!;
  const tx = S.mod!.lastTx(c);
  const url = tx ? S.mod!.txUrl(c, tx) : null;
  return url ? `<p class="small"><a href="${url}" target="_blank" rel="noopener">Transakcija na lancu ↗</a></p>` : "";
}

/** Traka iznad listića: testna mreža, neprenesen listić faze 1. */
export function bannerHtml(): string {
  const c = S.chain!;
  const out: string[] = [];
  if (!c.counts)
    out.push(`<div class="gl-msg cv-banner cv-banner--test"><strong>TESTNA MREŽA (${esc(chainName(c))})</strong> — glasovi se ne broje.
      <a href="?lanac=0">Vrati se na pravo glasanje</a></div>`);
  if (needsTransfer())
    out.push(`<div class="gl-msg cv-banner">Tvoj glas iz faze 1 i dalje se broji. Prenesi ga na lanac da ga možeš mijenjati:
      učitan je u listić, klikni „Prenesi glas na lanac”.</div>`);
  return out.join("");
}

/** Blok ispod listića u načinu lanca (umjesto potvrde faze 1). */
export function receiptHtml(dirty: boolean, busy: boolean): string {
  const c = S.chain!;
  const m = S.mod!;
  const reg = registered();
  if (S.ballot && S.ballot.revision > 0) {
    const tx = m.lastTx(c);
    const url = tx ? m.txUrl(c, tx) : null;
    return `<details class="gl-receipt" data-cv-receipt>
      <summary>✓ Glas na lancu · revizija ${S.ballot.revision}${dirty ? ` · <span class="warn">imaš nepredane izmjene</span>` : ""}</summary>
      <p class="small">Nullifier (tvoja nasumična oznaka na lancu): <span class="mono">${esc(short(S.nullifier ?? ""))}</span>.
        Bodove svatko vidi pod tom oznakom, ali ne zna da su tvoji.</p>
      <div class="gl-actions">
        ${url ? `<a class="btn btn-sm" href="${url}" target="_blank" rel="noopener">Zadnja transakcija ↗</a>` : ""}
        ${m.localCredential() && !m.wordsOnly() ? `<button class="btn btn-sm" data-cv="reveal" ${busy ? "disabled" : ""}>Prikaži moje riječi</button>` : ""}
        <button class="btn btn-sm btn-danger-quiet" data-act="withdraw" ${busy ? "disabled" : ""}>Povuci glas…</button>
      </div>
      ${revealHtml()}
    </details>`;
  }
  if (reg && !S.nullifier) {
    return `<div class="gl-receipt cv-unlock">
      <p class="small">Tvoj ključ je upisan na lanac. Na ovom uređaju još ne znamo koji je listić tvoj.</p>
      <button class="btn btn-sm" data-cv="start-unlock" ${busy ? "disabled" : ""}>Otključaj ključ i učitaj listić</button>
    </div>`;
  }
  return "";
}

function revealHtml(): string {
  if (!S.revealed) return "";
  return `<div class="cv-reveal" role="alert">
    <p class="warn small">Pazi da nitko ne gleda ekran. Riječi se skrivaju za 2 minute.</p>
    <ol class="cv-words">${S.revealed.map((w) => `<li><span>${esc(w)}</span></li>`).join("")}</ol>
    <button class="btn btn-sm" data-cv="hide">Sakrij</button>
  </div>`;
}

/** Listić iz faze 1 se još broji, a nije prenesen na lanac (prijenos je jedan klik). */
export function needsTransfer(): boolean {
  const my = S.host?.my();
  return !!S.chain?.counts && !!my && Object.keys(my.items).length > 0 && !registered();
}

export const submitLabel = (hasServer: boolean) => {
  if (needsTransfer()) return "Prenesi glas na lanac";
  return hasServer ? "Predaj izmijenjeni glas" : "Predaj glas";
};

export function integrityHtml(): string {
  const c = S.chain!;
  const m = S.mod!;
  const addr = m.addressUrl(c, c.contract);
  return `<li><strong>Na lancu.</strong> Listići se predaju ugovoru ${
    addr ? `<a href="${addr}#code" target="_blank" rel="noopener">MaksimirGlasanjeV1 ↗</a>` : "MaksimirGlasanjeV1"
  } (${esc(chainName(c))}). Ugovor sam provjerava ZK dokaz svakog listića i broji uživo; zbroj svatko može ponovno izračunati iz događaja,
    bez nas. Na lancu: ${S.chainVoters} ${plural(S.chainVoters, "glasač", "glasača", "glasača")}${
      c.counts ? `, iz faze 1 još ${S.phase1Voters}` : ""
    }. <a href="${link("lanac-kontrola")}">Tko što može →</a></li>`;
}

// ── dijeljenje ──────────────────────────────────────────────────────────────────

export function shareBodyHtml(tab: "public" | "zk", pubMode: PublicMode, pubConsent: boolean, busy: boolean): string {
  const my = S.host!.my();
  const d = busy ? "disabled" : "";
  if (!(S.ballot && S.ballot.revision > 0))
    return `<p class="muted">Kad predaš listić na lanac, možeš ga podijeliti javno (s imenom) ili anonimno.</p>`;
  if (tab === "public") {
    if (my?.chain_public && my.public_mode) return ""; // prikazuje glasanjeView (kartica + gumbi)
    return `<p>Tvoj listić s lanca bit će prikazan uz ime iz eOsobne. Tvoj preglednik izradi dokaz da je taj listić baš tvoj,
        a da ključ ne napusti preglednik. Ime nikad ne ide na lanac.</p>
      <label class="sh-consent"><input type="checkbox" data-act="pub-consent" ${pubConsent ? "checked" : ""} />
        Pristajem da se moj glas javno prikaže s izabranim oblikom imena. Javni prikaz mogu isključiti bilo kada.</label>
      <button class="btn btn-primary" data-cv="pub" data-mode="${pubMode}" ${d || !pubConsent ? "disabled" : ""}>Objavi moj glas javno</button>`;
  }
  if (my?.public_mode) return `<p>Tvoj glas je trenutno javan. Anonimna objava ima smisla samo za glas koji nije javan.</p>`;
  return S.shareId
    ? ""
    : `<p>Anonimna objava na lancu: ZK dokaz da je glas predala potvrđena osoba, bez otkrivanja tko i kako. Upisuje se na lanac, pa je nitko ne može obrisati.</p>
       <button class="btn btn-primary" data-cv="anon" ${d}>Izradi anonimnu objavu</button>`;
}

export const anonShareId = () => S.shareId;

// ── događaji ────────────────────────────────────────────────────────────────────

let revealTimer: ReturnType<typeof setTimeout> | undefined;

export function bindChain(el: HTMLElement) {
  const h = S.host!;
  const on = (act: string, fn: (b: HTMLElement) => void) =>
    el.querySelectorAll<HTMLElement>(`[data-cv="${act}"]`).forEach((b) => b.addEventListener("click", () => fn(b)));

  on("close", () => closeFlow());
  on("retry", () => void advance());
  on("signin", () => {
    void h.signIn().then(() => advance());
  });
  on("terms", () => {
    void acceptChainTerms()
      .then((m) => h.setMy(m))
      .then(() => advance())
      .catch((e) => {
        if (S.flow) S.flow.error = (e as Error).message;
        h.draw();
      });
  });
  on("unlock", () => void unlock());
  on("new", () => beginNew(S.mod!.newKey()));
  on("phase1", () => {
    const k = S.mod!.phase1Key();
    if (k) beginNew(k);
  });
  on("enter", () => {
    S.flow!.keyStage = "enter";
    S.flow!.keyErr = null;
    h.draw();
  });
  on("back-choose", () => {
    S.flow!.keyStage = "choose";
    h.draw();
  });
  on("written", () => toConfirm());
  on("back-show", () => {
    const f = S.flow!;
    f.words = S.mod!.secretToWords(f.pending!.secret);
    f.keyStage = "show";
    h.draw();
  });
  on("confirm", () => checkWords([...el.querySelectorAll<HTMLInputElement>("[data-cv-word]")].map((i) => i.value)));
  on("enter-ok", () => enterWords(el.querySelector<HTMLTextAreaElement>("#cv-words-in")?.value ?? ""));
  on("protect", () => void protect());
  on("words-only", () => wordsOnlyContinue());
  on("copy", () => {
    const words = S.flow?.words?.join(" ");
    if (!words) return;
    void navigator.clipboard?.writeText(words).then(() => {
      h.msg("ok", "Riječi su kopirane. Međuspremnik se briše za 60 sekundi.");
      setTimeout(() => {
        void navigator.clipboard?.readText?.().then(
          (t) => {
            if (t === words) void navigator.clipboard.writeText("");
          },
          () => {}
        );
      }, 60_000);
      h.draw();
    });
  });
  on("print", () => {
    document.body.classList.add("cv-printing");
    window.print();
    document.body.classList.remove("cv-printing");
  });
  on("package", () => {
    const pkg = S.flow?.pkg;
    if (!pkg) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([S.mod!.packageJson(pkg) + "\n"], { type: "application/json" }));
    a.download = `maksimir-paket-rev${pkg.revision}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  on("start-unlock", () => startFlow("unlock"));
  on("pub", (b) => startFlow("public", { mode: b.dataset.mode as PublicMode }));
  on("anon", () => startFlow("anon"));
  on("reveal", () => {
    void S.mod!
      .showWords()
      .then((w) => {
        S.revealed = w;
        clearTimeout(revealTimer);
        revealTimer = setTimeout(() => {
          S.revealed = null;
          h.draw();
        }, 120_000);
        h.draw();
        el.querySelector<HTMLDetailsElement>("[data-cv-receipt]")?.setAttribute("open", "");
      })
      .catch((e) => h.msg("err", (e as Error).message));
  });
  on("hide", () => {
    S.revealed = null;
    h.draw();
  });
  // Enter u polju riječi = potvrdi
  el.querySelectorAll<HTMLInputElement>("[data-cv-word]").forEach((i) =>
    i.addEventListener("keydown", (e) => {
      if (e.key === "Enter") el.querySelector<HTMLElement>('[data-cv="confirm"]')?.click();
    })
  );
}

export function escapeFlow(): boolean {
  if (!S.flow || S.flow.running) return false;
  closeFlow();
  return true;
}

/** Bodovi nacrta koji idu na lanac (bez nula). */
export const cleanItems = (d: Items) => Object.fromEntries(Object.entries(d).filter(([, v]) => v > 0));
export const validDraft = (d: Items) => {
  const items = cleanItems(d);
  return !Object.keys(items).length || sumPoints(items) === 100;
};
