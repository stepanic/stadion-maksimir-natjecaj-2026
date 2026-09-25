// Test stranica za chain/client/keystore.ts sa STVARNIM passkeyjem (ADR 0001).
//
//   npm run demo      → http://localhost:8788  (rpId = localhost; u produkciji domovina.ai)
//
// Riječi se prikazuju jednom i brišu iz stranice čim su potvrđene; tajna živi samo u memoriji
// dok traje korak. `window.__demo` bilježi rezultate (commitmente, ne tajne) za automatski test.
import {
  checkConfirmation,
  confirmationPositions,
  localBlobStore,
  newSecret,
  prfSupported,
  protectWithPasskey,
  secretToIdentity,
  secretToWords,
  unlockWithPasskey,
  wordsToSecret,
  zeroize,
} from "../keystore";

const RP_ID = location.hostname; // localhost za test
const store = localBlobStore();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const log = (msg: string, ok = true) => {
  const li = document.createElement("li");
  li.textContent = `${ok ? "✔" : "✘"} ${msg}`;
  li.className = ok ? "ok" : "err";
  $("log").prepend(li);
};
const state = (window as unknown as { __demo: Record<string, unknown> }).__demo = { events: [] as string[] };
const record = (k: string, v: unknown) => ((state[k] = v), (state.events as string[]).push(k));

let pending: { secret: Uint8Array; words: string[]; positions: number[] } | null = null;

$("support").onclick = async () => {
  const s = await prfSupported();
  record("prfSupported", s === undefined ? "nepoznato" : s);
  log(`PRF podrška: ${s === undefined ? "preglednik ne zna reći unaprijed (probaj)" : s ? "da" : "ne"}`, s !== false);
};

$("create").onclick = () => {
  pending = { secret: newSecret(), words: [], positions: confirmationPositions() };
  pending.words = secretToWords(pending.secret);
  $("words").innerHTML = pending.words.map((w, i) => `<span><b>${i + 1}.</b> ${w}</span>`).join("");
  $("confirm-label").textContent = `Upiši riječi br. ${pending.positions.map((p) => p + 1).join(", ")}:`;
  $("step-words").hidden = false;
  record("wordsShown", true);
};

$("confirm").onclick = async () => {
  if (!pending) return;
  if (pending.words.length) {
    const answers = [...document.querySelectorAll<HTMLInputElement>(".conf")].map((i) => i.value);
    if (!checkConfirmation(pending.words, pending.positions, answers)) return log("riječi se ne slažu — provjeri zapis", false);
    // riječi nestaju iz stranice zauvijek (glasač ih je upravo potvrdio)
    $("words").innerHTML = "";
    $("confirm-inputs").hidden = true;
    pending.words.fill("");
    pending.words = [];
  }
  const commitment = secretToIdentity(pending.secret).commitment.toString();
  try {
    const credentialId = await protectWithPasskey(pending.secret, store, { rpId: RP_ID, label: "Maksimir TEST (localhost)" });
    record("created", { commitment, credentialId });
    log(`ključ zaštićen passkeyjem; commitment ${commitment.slice(0, 12)}…`);
    zeroize(pending.secret);
    pending = null;
    $("step-words").hidden = true;
  } catch (e) {
    // K-01: tajna OSTAJE u memoriji — riječi su već zapisane, pa ponovni pokušaj mora dati isti ključ
    record("createError", String((e as Error).message));
    log(`passkey nije napravljen (${(e as Error).message}) — ključ je i dalje ovdje, pokušaj ponovno`, false);
    ($("confirm") as HTMLButtonElement).textContent = "Pokušaj ponovno s passkeyjem";
  }
};

$("unlock").onclick = async () => {
  try {
    const { secret, credentialId } = await unlockWithPasskey(store, { rpId: RP_ID });
    const commitment = secretToIdentity(secret).commitment.toString();
    zeroize(secret);
    const same = commitment === (state.created as { commitment?: string } | undefined)?.commitment;
    record("unlocked", { commitment, credentialId, sameAsCreated: same });
    log(`otključano Face ID / Touch ID; commitment ${commitment.slice(0, 12)}… ${same ? "= isti kao pri izradi" : ""}`);
  } catch (e) {
    record("unlockError", String((e as Error).message));
    log((e as Error).message, false);
  }
};

$("recover").onclick = () => {
  try {
    const secret = wordsToSecret(($("recover-words") as HTMLTextAreaElement).value);
    const commitment = secretToIdentity(secret).commitment.toString();
    zeroize(secret);
    ($("recover-words") as HTMLTextAreaElement).value = "";
    record("recovered", { commitment });
    log(`oporavak iz riječi; commitment ${commitment.slice(0, 12)}…`);
  } catch (e) {
    log((e as Error).message, false);
  }
};
