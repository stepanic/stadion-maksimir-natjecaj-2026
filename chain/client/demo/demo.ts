// Probna stranica za ključ glasača (ADR 0001): vođeni tok od 7 koraka sa stanjima.
//
//   npm run demo  →  http://localhost:8788   (rpId = localhost; u produkciji domovina.ai)
//
// Stanje stranice drži samo ono što smije: otisak ključa (javni commitment) i omot u
// localStorage-u. Tajna i riječi postoje samo u memoriji dok traje korak.
// `window.__demo` bilježi događaje i otiske (ne tajne) za automatsku provjeru.
import {
  KeystoreError,
  checkConfirmation,
  confirmationPositions,
  localBlobStore,
  newSecret,
  prfSupported,
  protectWithPasskey,
  revealWords,
  secretToIdentity,
  secretToWords,
  unlockWithPasskey,
  wordsToSecret,
  zeroize,
} from "../keystore";

const RP_ID = location.hostname;
const FP_KEY = "maksimir-demo-fingerprint"; // otisak (javan) za usporedbu između posjeta
const store = localBlobStore();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ── stanje ──────────────────────────────────────────────────────────────────────────

type StepState = "locked" | "now" | "done" | "error";
const S = {
  prf: null as boolean | null | "unknown",
  secret: null as Uint8Array | null, // samo između koraka 2 i 4
  words: null as string[] | null, // samo dok su prikazane (korak 2–3)
  positions: [] as number[],
  confirmed: false,
  protectedKey: false, // postoji omot u ovom pregledniku
  wordsOnly: false,
  fingerprint: null as string | null,
  errors: {} as Record<number, boolean>,
  unlockedOnce: false,
  revealedOnce: false,
  recoveredOnce: false,
};

const demo: Record<string, unknown> & { events: string[] } = { events: [] };
(window as unknown as { __demo: typeof demo }).__demo = demo;
const record = (k: string, v: unknown = true) => ((demo[k] = v), demo.events.push(k));

const fp = (commitment: bigint | string) => {
  const s = commitment.toString();
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
};
const readFp = () => {
  try {
    return localStorage.getItem(FP_KEY);
  } catch {
    return null;
  }
};
const writeFp = (v: string | null) => {
  try {
    if (v) localStorage.setItem(FP_KEY, v);
    else localStorage.removeItem(FP_KEY);
  } catch {
    /* privatni prozor */
  }
};
const hasBlob = () => {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("maksimir-keystore-v1:"));
  } catch {
    return false;
  }
};

// ── prikaz ──────────────────────────────────────────────────────────────────────────

function stepStates(): Record<number, StepState> {
  const has = S.protectedKey;
  const st: Record<number, StepState> = {
    1: S.prf === null ? "now" : "done",
    2: S.prf === null ? "locked" : S.secret || S.confirmed || has ? "done" : "now",
    3: !S.words && !S.confirmed ? (has ? "done" : "locked") : S.confirmed ? "done" : "now",
    4: has ? "done" : S.wordsOnly ? "done" : S.confirmed ? "now" : "locked",
    5: has ? (S.unlockedOnce ? "done" : "now") : "locked",
    6: has ? (S.revealedOnce ? "done" : "now") : "locked",
    7: S.prf === null ? "locked" : S.recoveredOnce ? "done" : "now",
  };
  for (const [k, e] of Object.entries(S.errors)) if (e) st[+k] = "error";
  return st;
}

const BADGE: Record<StepState, string> = { locked: "čeka prethodni korak", now: "sada", done: "gotovo ✔", error: "nije uspjelo" };

function render() {
  const st = stepStates();
  for (let i = 1; i <= 7; i++) {
    const el = $(`s${i}`);
    el.classList.remove("locked", "now", "done", "error");
    el.classList.add(st[i]);
    el.querySelector(".badge")!.textContent = i === 4 && S.wordsOnly && !S.protectedKey ? "samo riječi" : BADGE[st[i]];
  }
  $("progress").innerHTML = [1, 2, 3, 4, 5, 6, 7].map((i) => `<span class="${st[i] === "done" ? "done" : st[i] === "now" || st[i] === "error" ? "now" : ""}"></span>`).join("");

  // gumbi: aktivni samo kad korak ima smisla (K-02: ključ se ne može napraviti dvaput)
  ($("b-check") as HTMLButtonElement).disabled = S.prf !== null;
  ($("b-create") as HTMLButtonElement).disabled = S.prf === null || !!S.secret || S.confirmed || S.protectedKey;
  ($("b-confirm") as HTMLButtonElement).disabled = !S.words || S.confirmed;
  ($("b-protect") as HTMLButtonElement).disabled = !S.confirmed || !S.secret || S.protectedKey || S.prf === false;
  $("b-words-only").hidden = !(S.confirmed && S.secret && !S.protectedKey && (S.errors[4] || S.prf === false));
  ($("b-unlock") as HTMLButtonElement).disabled = !S.protectedKey;
  ($("b-reveal") as HTMLButtonElement).disabled = !S.protectedKey;
  ($("b-recover") as HTMLButtonElement).disabled = S.prf === null;
  $("confirm").querySelectorAll("input").forEach((i) => ((i as HTMLInputElement).disabled = !S.words || S.confirmed));
}

function result(n: number, kind: "ok" | "err" | "info", html: string) {
  const r = $(`r${n}`);
  r.className = `result show ${kind}`;
  r.innerHTML = html;
}

const showWords = (box: HTMLElement, words: string[]) =>
  (box.innerHTML = words.map((w, i) => `<span><b>${i + 1}.</b>${w}</span>`).join(""));

const errMsg = (e: unknown) => {
  const m = (e as Error)?.message ?? String(e);
  if (/focus/i.test(m)) return "Preglednik traži da je ova stranica u prvom planu. Klikni negdje na stranicu pa pokušaj ponovno.";
  if (/NotAllowed|cancel|otkaz/i.test(m) || (e as DOMException)?.name === "NotAllowedError") return "Passkey dijalog je zatvoren ili je isteklo vrijeme. Pokušaj ponovno.";
  return e instanceof KeystoreError ? m : `Greška: ${m}`;
};

// ── koraci ──────────────────────────────────────────────────────────────────────────

$("b-check").onclick = async () => {
  const s = await prfSupported();
  S.prf = s === undefined ? "unknown" : s;
  record("prfSupported", S.prf);
  if (s === true) result(1, "ok", "Tvoj preglednik to podržava. Idemo dalje.");
  else if (s === false) result(1, "err", "Ovaj preglednik ne zna otključavati ključ passkeyjem. I dalje možeš proći probu, ali ćeš ključ čuvati samo kao 24 riječi.");
  else result(1, "info", "Preglednik to ne zna reći unaprijed. Probat ćemo u koraku 4.");
  render();
};

$("b-create").onclick = () => {
  if (S.secret || S.confirmed || S.protectedKey) return; // K-02
  S.secret = newSecret();
  S.words = secretToWords(S.secret);
  S.positions = confirmationPositions();
  showWords($("words"), S.words);
  $("words-box").hidden = false;
  $("confirm-text").textContent = `Upiši riječi broj ${S.positions.map((p) => p + 1).join(", ")} s papira. Kad potvrdiš, riječi nestaju sa stranice.`;
  $("confirm").innerHTML = S.positions
    .map((p) => `<label>riječ ${p + 1}<input class="conf" autocomplete="off" autocapitalize="off" spellcheck="false" /></label>`)
    .join("");
  record("wordsShown");
  render();
};

$("b-confirm").onclick = () => {
  if (!S.words) return;
  const answers = [...document.querySelectorAll<HTMLInputElement>(".conf")].map((i) => i.value);
  if (!checkConfirmation(S.words, S.positions, answers)) {
    S.errors[3] = true;
    result(3, "err", "Riječi se ne slažu. Provjeri papir: broj riječi i pravopis.");
    return render();
  }
  S.errors[3] = false;
  S.confirmed = true;
  S.words.fill("");
  S.words = null;
  $("words").innerHTML = "";
  $("words-box").hidden = true;
  S.fingerprint = fp(secretToIdentity(S.secret!).commitment);
  result(3, "ok", `Potvrđeno. Riječi su nestale sa stranice. Otisak tvog ključa: <span class="fp">${S.fingerprint}</span>`);
  record("confirmed");
  render();
};

$("b-protect").onclick = async () => {
  if (!S.secret) return;
  try {
    await protectWithPasskey(S.secret, store, { rpId: RP_ID, label: "Maksimir TEST (localhost)" });
    S.fingerprint = fp(secretToIdentity(S.secret).commitment);
    writeFp(S.fingerprint);
    zeroize(S.secret);
    S.secret = null;
    S.protectedKey = true;
    S.errors[4] = false;
    result(4, "ok", `Ključ je zaključan tvojim passkeyjem i obrisan iz memorije. Otisak: <span class="fp">${S.fingerprint}</span>`);
    record("protected", { fingerprint: S.fingerprint });
  } catch (e) {
    // K-01: ključ OSTAJE — riječi su već zapisane
    S.errors[4] = true;
    result(4, "err", `${errMsg(e)} Tvoj ključ je i dalje ovdje, ništa nije izgubljeno.`);
    ($("b-protect") as HTMLButtonElement).textContent = "Pokušaj ponovno";
    record("protectError", (e as Error).message);
  }
  render();
};

$("b-words-only").onclick = () => {
  if (!S.secret) return;
  S.wordsOnly = true;
  writeFp(S.fingerprint);
  zeroize(S.secret);
  S.secret = null;
  S.errors[4] = false;
  result(4, "info", "U redu. Ključ nije spremljen nigdje osim na tvom papiru. Za svako glasanje upisat ćeš 24 riječi (korak 7).");
  record("wordsOnly");
  render();
};

$("b-unlock").onclick = async () => {
  try {
    const { secret } = await unlockWithPasskey(store, { rpId: RP_ID });
    const got = fp(secretToIdentity(secret).commitment);
    zeroize(secret);
    const saved = readFp();
    S.unlockedOnce = true;
    S.errors[5] = false;
    result(5, "ok", `Otključano. Otisak: <span class="fp">${got}</span> ${saved === got ? "= isti kao pri izradi ✔. Ključ je već obrisan iz memorije." : "(ne slaže se sa spremljenim otiskom)"}`);
    record("unlocked", { fingerprint: got, same: saved === got });
  } catch (e) {
    S.errors[5] = true;
    result(5, "err", errMsg(e));
    record("unlockError", (e as Error).message);
  }
  render();
};

let hideTimer: ReturnType<typeof setTimeout> | undefined;
const hideReveal = () => {
  $("reveal-words").innerHTML = "";
  $("reveal-box").hidden = true;
  clearTimeout(hideTimer);
};

$("b-reveal").onclick = async () => {
  try {
    const { words } = await revealWords(store, { rpId: RP_ID });
    showWords($("reveal-words"), words);
    words.fill("");
    $("reveal-box").hidden = false;
    hideTimer = setTimeout(hideReveal, 120_000);
    S.revealedOnce = true;
    S.errors[6] = false;
    result(6, "ok", "Zapiši riječi, zatim klikni „Sakrij”.");
    record("revealed");
  } catch (e) {
    S.errors[6] = true;
    result(6, "err", errMsg(e));
    record("revealError", (e as Error).message);
  }
  render();
};
$("b-hide").onclick = () => {
  hideReveal();
  result(6, "info", "Riječi su sakrivene i obrisane sa stranice.");
};

$("b-recover").onclick = () => {
  const ta = $<HTMLTextAreaElement>("recover-words");
  try {
    const secret = wordsToSecret(ta.value);
    const got = fp(secretToIdentity(secret).commitment);
    zeroize(secret);
    ta.value = "";
    const saved = readFp() ?? S.fingerprint;
    S.recoveredOnce = true;
    S.errors[7] = false;
    result(7, "ok", `Ključ vraćen. Otisak: <span class="fp">${got}</span> ${saved ? (saved === got ? "= isti kao tvoj ključ ✔" : "— to je <b>drugi</b> ključ od onog napravljenog na ovoj probi") : ""}`);
    record("recovered", { fingerprint: got, same: saved === got });
  } catch (e) {
    S.errors[7] = true;
    result(7, "err", errMsg(e));
  }
  render();
};

$("b-reset").onclick = () => {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("maksimir-keystore-v1:") || k === FP_KEY) localStorage.removeItem(k);
  } catch {
    /* ništa */
  }
  zeroize(S.secret);
  location.reload();
};

// ── početno stanje: postoji li već zaključan ključ u ovom pregledniku ────────────────

S.protectedKey = hasBlob();
S.fingerprint = readFp();
if (S.protectedKey) {
  S.prf = true;
  S.confirmed = true;
  result(4, "info", `U ovom pregledniku već postoji tvoj zaključan ključ (otisak <span class="fp">${S.fingerprint ?? "?"}</span>). Možeš ga otključati (5), prikazati riječi (6) ili krenuti ispočetka (dno stranice).`);
}
render();
