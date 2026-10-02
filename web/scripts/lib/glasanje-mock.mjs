// Lažni backend glasanja za testove u pregledniku: Supabase RPC-evi, konfiguracija lanca i
// JSON-RPC Gnosisa (ballotOf, results, voters). Sve presreće Playwright, ništa ne ide na produkciju.
//
// Isti mock koriste testovi oba sučelja (/glasanje i /glasaj), pa ista provjera vrijedi za oba.
import { encodeFunctionResult, parseAbi, toFunctionSelector } from "viem";
import { readFileSync } from "node:fs";

// Redoslijed šifri kao u ugovoru (chain/ je CommonJS paket, pa se .ts čita kao tekst).
const ENTRY_CODES = [...readFileSync(new URL("../../../chain/client/entries.ts", import.meta.url), "utf8").matchAll(/^\s+"([0-9A-Z]{9})",$/gm)].map((m) => m[1]);
if (ENTRY_CODES.length !== 88) throw new Error(`entries.ts: ${ENTRY_CODES.length} šifri`);

export const CONTRACT = "0x81290000000000000000000000000000000000e8";
const RPC = "https://rpc.mock.test/";
const ABI = parseAbi([
  "function ballotOf(uint256 nullifier) view returns (uint32 revision, bool migrated, bytes points)",
  "function results() view returns (uint256[88] points, uint256[88] backers)",
  "function voters() view returns (uint256)",
]);
const SEL = Object.fromEntries(["ballotOf(uint256)", "results()", "voters()"].map((s) => [toFunctionSelector(s), s.slice(0, s.indexOf("("))]));

export const CHAIN = {
  chainId: 100,
  contract: CONTRACT,
  label: "gnosis",
  counts: true,
  rpcUrl: RPC,
  relayerUrl: "https://relayer.mock.test/100",
  explorerUrl: "https://gnosis.blockscout.com",
  semaphore: "0x0000000000000000000000000000000000005e4a",
  groupId: "1",
  deployBlock: 1,
};
export const COMMITMENT = "123456789";
export const NULLIFIER = "987654321";

/** Bodovi u obliku ugovora: 88 bajtova, indeks = položaj šifre u ENTRY_CODES. */
function encodePoints(items) {
  if (!Object.keys(items).length) return "0x";
  const out = new Uint8Array(ENTRY_CODES.length);
  for (const [c, p] of Object.entries(items)) out[ENTRY_CODES.indexOf(c)] = p;
  return `0x${[...out].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Opcije:
 *   chain      — glasanje na lancu uključeno (chain_from u prošlosti); false = faza 1
 *   signedIn   — Supabase sesija u localStorageu
 *   my         — polja maksimir_my_ballot (verified, chain_consented, items, chain_registrations…)
 *   chainBallot — { revision, items } za ballotOf; s njim se u localStorage upišu commitment i nullifier
 *   draft      — nacrt listića (maksimir-draft)
 *   open       — faza 1 otvorena
 */
export async function mockBackend(page, opts = {}) {
  const o = { chain: true, signedIn: false, open: true, my: {}, chainBallot: null, draft: null, ...opts };
  const calls = { cast: [], rpc: [] };
  const my = () => ({
    verified: true,
    consented: true,
    open: o.open,
    items: {},
    updated_at: null,
    receipt: null,
    public_mode: null,
    share_id: null,
    zk_commitment: null,
    pseudonym: "ab".repeat(8),
    chain_consented: true,
    chain_registrations: o.chainBallot ? [{ chainId: 100, contract: CONTRACT, commitment: COMMITMENT, counts: true, transfer_seq: null }] : [],
    chain_public: null,
    ...o.my,
  });
  const results = () => ({
    open: o.open,
    opens_at: null,
    closes_at: "2027-12-31T22:59:00Z",
    voters: 0,
    results: [],
    phase1_open: o.open && !o.chain,
    chain_open: true,
    chain_from: o.chain ? "2026-09-26T01:20:00Z" : null,
  });

  await page.route(/^https:\/\/api\.domovina\.ai\//, async (r) => {
    const u = r.request().url();
    const fn = u.match(/\/rpc\/([a-z_0-9]+)/)?.[1];
    if (fn === "maksimir_results") return r.fulfill({ json: results() });
    if (fn === "maksimir_chain_config") return r.fulfill({ json: { chain_from: o.chain ? "2026-09-26T01:20:00Z" : null, active: CHAIN, chains: [CHAIN] } });
    if (fn === "maksimir_my_ballot") return o.signedIn ? r.fulfill({ json: my() }) : r.fulfill({ status: 401, json: { message: "not_signed_in" } });
    if (fn === "maksimir_public_ballots") return r.fulfill({ json: { count: 0, zk_shares: 0, ballots: [] } });
    if (fn === "maksimir_cast_ballot") {
      const items = r.request().postDataJSON().p_items;
      calls.cast.push(items);
      o.my = { ...o.my, items };
      return r.fulfill({ json: my() });
    }
    return r.fulfill({ json: null });
  });
  await page.route(/^https:\/\/raw\.githubusercontent\.com\//, (r) => r.fulfill({ json: [] }));
  await page.route(RPC, async (r) => {
    const body = r.request().postDataJSON();
    const one = (q) => {
      calls.rpc.push(q.method);
      const call = q.method === "eth_call" ? q.params[0] : null;
      const fn = call && call.to?.toLowerCase() === CONTRACT.toLowerCase() ? SEL[call.data.slice(0, 10)] : null;
      if (fn === "ballotOf") {
        const b = o.chainBallot ?? { revision: 0, items: {} };
        return { jsonrpc: "2.0", id: q.id, result: encodeFunctionResult({ abi: ABI, functionName: "ballotOf", result: [b.revision, false, encodePoints(b.items)] }) };
      }
      if (fn === "results") {
        const pts = ENTRY_CODES.map((c) => BigInt(o.chainBallot?.items[c] ?? 0));
        const back = pts.map((p) => (p ? 1n : 0n));
        return { jsonrpc: "2.0", id: q.id, result: encodeFunctionResult({ abi: ABI, functionName: "results", result: [pts, back] }) };
      }
      if (fn === "voters") return { jsonrpc: "2.0", id: q.id, result: encodeFunctionResult({ abi: ABI, functionName: "voters", result: o.chainBallot ? 1n : 0n }) };
      return { jsonrpc: "2.0", id: q.id, error: { code: -32601, message: `mock: ${q.method}` } };
    };
    return r.fulfill({ json: Array.isArray(body) ? body.map(one) : one(body) });
  });

  // localStorage se postavlja prije prvog učitavanja stranice (addInitScript), samo jednom po kontekstu.
  await page.addInitScript(
    ({ signedIn, draft, chainBallot, contract, commitment, nullifier }) => {
      if (sessionStorage.getItem("__mock-init")) return;
      sessionStorage.setItem("__mock-init", "1");
      if (draft) localStorage.setItem("maksimir-draft", JSON.stringify(draft));
      if (signedIn) {
        const exp = Math.floor(Date.now() / 1000) + 3600;
        localStorage.setItem(
          "maksimir-auth",
          JSON.stringify({ access_token: "x", refresh_token: "y", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: "u", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" } })
        );
      }
      if (chainBallot) {
        localStorage.setItem("maksimir-chain-commitment", commitment);
        localStorage.setItem(`maksimir-chain-nullifier:100:${contract.toLowerCase()}:${commitment}`, nullifier);
      }
    },
    { signedIn: o.signedIn, draft: o.draft, chainBallot: o.chainBallot, contract: CONTRACT, commitment: COMMITMENT, nullifier: NULLIFIER }
  );
  return { calls, opts: o };
}

/** Javno stanje toka predaje (test hook u chainVoteView.ts). */
export const flowState = (page) => page.evaluate(() => globalThis.__chainVote?.state.flow ?? null);
export const chainReady = (page) => page.waitForFunction(() => globalThis.__chainVote?.state.ready === true, null, { timeout: 15000 });
export const draftOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("maksimir-draft") || "{}"));

/** Mali okvir za provjere: ispis ✔/✘ i izlazni kod. */
export function checker() {
  const fails = [];
  let passed = 0;
  const check = (cond, msg) => {
    if (cond) passed++;
    else fails.push(msg);
    console.log(`  ${cond ? "✔" : "✘"} ${msg}`);
    return cond;
  };
  const done = () => {
    console.log(fails.length ? `\nPALO ${fails.length}/${passed + fails.length}:\n- ${fails.join("\n- ")}` : `\nSve provjere prošle (${passed}).`);
    process.exitCode = fails.length ? 1 : 0;
  };
  return { check, done };
}

export const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
