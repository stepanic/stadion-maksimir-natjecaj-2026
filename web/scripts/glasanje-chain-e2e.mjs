// E2E glasanja na lancu u pravom pregledniku: lokalni web + lokalna baza + registrar + relayer,
// a ugovor je PRAVI MaksimirGlasanjeV1 na Chiadu. Passkey je CDP virtualni autentifikator s PRF-om.
//
// Preduvjeti (sve lokalno, v. docs/blockchain/08-integracija-s-fazom-1.md „Lokalni stack”):
//   1. domovina-api: `supabase start`; migracije maksimir 20260925* i 20260926120000 primijenjene
//   2. registrar:  deno run --allow-net --allow-env --allow-read supabase/functions/maksimir-register/index.ts
//                  (SUPABASE_URL/ANON/SERVICE lokalni, MAKSIMIR_REGISTRAR_KEY_10200 iz chain/.env.chiado) → :8000
//   3. relayer:    web$ npx wrangler dev --port 8787   (web/.dev.vars: SPONSOR_PRIVATE_KEY_10200)
//   4. web:        web$ npx vite --port 5173 --mode e2e (web/.env.e2e.local: lokalni Supabase + VITE_MAKSIMIR_REGISTER_URL;
//                  NE .env.local — njega Vite učitava i u produkcijskom buildu)
//
//   node scripts/glasanje-chain-e2e.mjs [--headed]
//
// Mijenja SAMO lokalnu bazu (novi testni korisnici e2e-chain-*, maksimir_chains 'chiado', zastavica) i
// troši zanemarivo Chiado xDAI sponzora. Produkciju ne dira.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { Identity } from "@semaphore-protocol/core";

const WEB = process.env.WEB ?? "http://localhost:5173";
const DB = process.env.DB ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.e2e.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const API = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) throw new Error("postavi SUPABASE_SERVICE_ROLE_KEY (lokalni, `supabase status -o env`)");
const CHIADO = JSON.parse(readFileSync(new URL("../../chain/deployments/chiado/v1.json", import.meta.url), "utf8"));
const SHOTS = process.env.SHOTS ?? "/tmp/glasanje-chain-e2e";
mkdirSync(SHOTS, { recursive: true });
const HEADED = process.argv.includes("--headed");

const fails = [];
let passed = 0;
function check(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${msg}`);
  } else {
    fails.push(msg);
    console.log(`  ✘ ${msg}`);
  }
  return cond;
}
const psql = (sql) => execFileSync("psql", [DB, "-Atq", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" }).trim();

// ── priprema baze ────────────────────────────────────────────────────────────
function seedChain({ active }) {
  psql(`update domovina_ai.maksimir_settings set active_chain_id = null, active_contract = null, chain_from = null`);
  psql(`insert into domovina_ai.maksimir_chains (chain_id, contract, label, counts, rpc_url, relayer_url, explorer_url, semaphore, group_id, deploy_block)
        values (10200, '${CHIADO.address.toLowerCase()}', 'chiado', true, 'https://rpc.chiadochain.net', 'http://localhost:8787/relayer/10200',
                'https://gnosis-chiado.blockscout.com', '${CHIADO.constructorArgs[0].toLowerCase()}', '${CHIADO.groupId}', ${CHIADO.block})
        on conflict (chain_id, contract) do update set counts = true, relayer_url = excluded.relayer_url, label = 'chiado'`);
  if (active)
    psql(`update domovina_ai.maksimir_settings set active_chain_id = 10200, active_contract = '${CHIADO.address.toLowerCase()}',
          chain_from = now() - interval '1 second'`);
}

async function mkUser(tag, first, last) {
  const email = `e2e-chain-${tag}-${Date.now()}@example.com`;
  const password = randomBytes(12).toString("hex");
  const r = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const u = await r.json();
  if (!u.id) throw new Error(`korisnik: ${JSON.stringify(u)}`);
  psql(`insert into public.identity_verifications (user_id, oib_ciphertext, oib_hash, first_name, last_name)
        values ('${u.id}', '\\x00'::bytea, 'e2e-chain-${tag}-${Date.now()}', '${first}', '${last}')`);
  const s = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((x) => x.json());
  return { id: u.id, session: s };
}

const rpc = (user, fn, args = {}) =>
  fetch(`${API}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${user.session.access_token}`, "Content-Type": "application/json", "Content-Profile": "domovina_ai", "Accept-Profile": "domovina_ai" },
    body: JSON.stringify(args),
  }).then(async (r) => {
    const t = await r.text();
    if (!r.ok) throw new Error(`${fn}: ${t}`);
    return t ? JSON.parse(t) : null;
  });

// ── preglednik ──────────────────────────────────────────────────────────────────
async function newDevice(browser, user, storage = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(
    ([auth, extra]) => {
      if (sessionStorage.getItem("__e2e_init")) return;
      sessionStorage.setItem("__e2e_init", "1");
      localStorage.setItem("maksimir-auth", auth);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    [JSON.stringify(user.session), storage]
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true },
  });
  return { ctx, page };
}

const state = (page) => page.evaluate(() => globalThis.__chainVote?.state ?? null);

async function waitFor(page, pred, what, timeout = 180_000) {
  const t0 = Date.now();
  for (;;) {
    const s = await state(page);
    if (s && pred(s)) return s;
    if (s?.flow?.error) throw new Error(`${what}: ${s.flow.error}`);
    if (Date.now() - t0 > timeout) throw new Error(`${what}: isteklo (${JSON.stringify(s?.flow)})`);
    await page.waitForTimeout(500);
  }
}

async function openGlasanje(page, draft) {
  if (!page.url().startsWith(WEB)) await page.goto(`${WEB}/glasanje`);
  if (draft) await page.evaluate((d) => localStorage.setItem("maksimir-draft", JSON.stringify(d)), draft);
  await page.goto(`${WEB}/glasanje`);
  await page.waitForSelector('[data-act="submit"]', { timeout: 60_000 });
  await waitFor(page, (s) => s.chain === "chiado" && s.ready, "lanac se nije uključio", 60_000);
}

async function newKeyFlow(page, source = "new") {
  await page.click(`[data-cv="${source}"]`);
  await page.waitForSelector(".cv-words li");
  const words = await page.$$eval(".cv-words li span", (xs) => xs.map((x) => x.textContent.trim()));
  check(words.length === 24, `ključ se prikazuje kao 24 riječi`);
  check(await page.$eval('[data-cv="written"]', (b) => b.disabled), "„dalje” je neaktivan dok riječi nisu kopirane ili ispisane");
  await page.click('[data-cv="copy"]');
  await page.waitForSelector('[data-cv="written"]:not([disabled])');
  check((await page.evaluate(() => navigator.clipboard.readText())) === words.join(" "), "„Kopiraj riječi” stavlja upravo prikazane riječi u međuspremnik");
  await page.click('[data-cv="written"]');
  await page.waitForSelector('[data-cv="protect"]');
  check((await page.$$(".cv-words li")).length === 0, "riječi nestaju sa stranice nakon „dalje” (bez upisivanja 3 riječi)");
  return words;
}

const stepStates = (s) => Object.values(s.flow?.steps ?? {}).join(",");

// ── scenariji ─────────────────────────────────────────────────────────────────────
const c1 = "6TVJ3MUHR";
const c2 = "W3YS5VJBZ";

async function main() {
  const browser = await chromium.launch({ headless: !HEADED });

  console.log("0. priprema: listić u fazi 1, zatim prijelaz na lanac (Chiado, lokalno kao da se broji)");
  seedChain({ active: false });
  const A = await mkUser("a", "IVANA", "HORVAT");
  await rpc(A, "maksimir_accept_terms");
  await rpc(A, "maksimir_cast_ballot", { p_items: { [c1]: 60, [c2]: 40 } });
  const p1Before = await rpc(A, "maksimir_results");
  seedChain({ active: true });
  const cfg = await fetch(`${API}/rest/v1/rpc/maksimir_chain_config`, { method: "POST", headers: { apikey: ANON, "Content-Profile": "domovina_ai", "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
  check(cfg.active?.label === "chiado", "maksimir_chain_config: aktivni ugovor = Chiado");

  console.log("A1. prijenos glasa iz faze 1 na lanac (novi ključ, 24 riječi, passkey)");
  const devA = await newDevice(browser, A);
  const pa = devA.page;
  await openGlasanje(pa);
  check(/faze 1 i dalje se broji/.test(await pa.textContent("body")), "traka: glas iz faze 1 i dalje se broji");
  check((await pa.textContent('[data-act="submit"]')).includes("Prenesi glas na lanac"), "gumb: „Prenesi glas na lanac”");
  await pa.screenshot({ path: `${SHOTS}/a1-prije.png`, fullPage: false });
  await pa.click('[data-act="submit"]');
  await pa.waitForSelector('[data-cv="terms"]');
  let s = await state(pa);
  check(s.flow.steps.signin === "done" && s.flow.steps.terms === "now", `koraci: prijava gotova, uvjeti sada (${stepStates(s)})`);
  await pa.screenshot({ path: `${SHOTS}/a1-uvjeti.png` });
  await pa.click('[data-cv="terms"]');
  await pa.waitForSelector('[data-cv="new"]');
  const wordsA = await newKeyFlow(pa, "new");
  await pa.screenshot({ path: `${SHOTS}/a1-passkey.png` });
  await pa.click('[data-cv="protect"]');
  s = await waitFor(pa, (x) => x.flow?.done, "prijenos");
  check(s.flow.steps.right === "done" && s.flow.steps.send === "done", `svi koraci gotovi (${stepStates(s)})`);
  check(s.ballot?.revision === 1 && s.ballot.items[c1] === 60 && s.ballot.items[c2] === 40, `listić na lancu = listić iz faze 1 (rev ${s.ballot?.revision})`);
  await pa.screenshot({ path: `${SHOTS}/a1-gotovo.png` });
  const p1After = await rpc(A, "maksimir_results");
  check(p1After.voters === p1Before.voters - 1, `faza 1: ostatak pao za 1 (${p1Before.voters} → ${p1After.voters})`);
  const regA = psql(`select commitment || '|' || coalesce(transfer_seq::text, '-') from domovina_ai.maksimir_chain_registrations where voter_id = (select id from domovina_ai.maksimir_voters where user_id = '${A.id}')`);
  check(regA.split("|")[0] === s.commitment && regA.split("|")[1] !== "-", "registracija: isti commitment, zapisan red „prijenos” u lancu faze 1");
  const log = psql(`select revision || ':' || items_canon from domovina_ai.maksimir_log where seq = ${regA.split("|")[1]}`);
  check(log === "0:", "red prijenosa u lancu faze 1 je revision 0 (povlačenje)");
  let err = null;
  try {
    await rpc(A, "maksimir_cast_ballot", { p_items: { [c1]: 100 } });
  } catch (e) {
    err = e.message;
  }
  check(/chain_registered|voting_closed/.test(err ?? ""), "faza 1 više ne prima listić te osobe");
  await pa.click('[data-cv="close"]');

  console.log("A2. izmjena: ključ otključan passkeyjem (bez riječi)");
  await openGlasanje(pa, { [c1]: 100 });
  check((await state(pa)).ballot?.revision === 1, "na novom učitavanju listić s lanca (preko zapamćenog nullifiera, bez ključa)");
  await pa.click('[data-act="submit"]');
  await pa.waitForSelector('[data-cv="unlock"]');
  await pa.click('[data-cv="unlock"]');
  s = await waitFor(pa, (x) => x.flow?.done, "izmjena");
  check(s.ballot?.revision === 2 && s.ballot.items[c1] === 100 && !s.ballot.items[c2], "revizija 2 = {c1: 100}");
  await pa.click('[data-cv="close"]');

  console.log("A3. javna objava s imenom (dokaz vlasništva) i provjera stranice objave");
  await pa.click('[data-tab="public"]');
  await pa.check('input[name="pubmode"][value="full"]');
  await pa.check('[data-act="pub-consent"]');
  await pa.click('[data-cv="pub"]');
  await pa.waitForSelector('[data-cv="unlock"]');
  await pa.click('[data-cv="unlock"]');
  await waitFor(pa, (x) => x.flow?.done, "javna objava");
  await pa.click('[data-cv="close"]');
  const myA = await rpc(A, "maksimir_my_ballot");
  check(myA.public_mode === "full" && myA.chain_public?.nullifier === s.nullifier, "baza: javni prikaz + nullifier listića");
  const view = await browser.newContext().then((c) => c.newPage());
  await view.goto(`${WEB}/glasanje/g/${myA.share_id}`);
  await view.waitForSelector(".sh-verdict.gl-msg--ok, .sh-verdict.gl-msg--err", { timeout: 120_000 });
  const verdict = await view.textContent(".sh-verdict");
  check(/Provjereno/.test(verdict), `stranica objave: ${verdict.trim()}`);
  check((await view.textContent(".sh-card")).includes("Ivana Horvat"), "kartica: ime iz eOsobne");
  check((await view.$$(".sh-checks li.ok")).length === 4, "sve 4 provjere u pregledniku posjetitelja");
  await view.screenshot({ path: `${SHOTS}/a3-objava.png`, fullPage: true });
  // podmetanje: tuđi nullifier na ovoj kartici → provjera mora pasti
  psql(`update domovina_ai.maksimir_chain_public set nullifier = '123', proof = jsonb_set(proof, '{nullifier}', '"123"') where voter_id = (select id from domovina_ai.maksimir_voters where user_id = '${A.id}')`);
  await view.reload();
  await view.waitForSelector(".sh-verdict.gl-msg--ok, .sh-verdict.gl-msg--err", { timeout: 120_000 });
  check(/NIJE/.test(await view.textContent(".sh-verdict")), "podmetnut nullifier na kartici → provjera pada");
  await pa.click('[data-act="pub-off"]');
  await pa.waitForTimeout(1500);

  console.log("A4. anonimna objava na lancu");
  await openGlasanje(pa);
  await pa.click('[data-tab="zk"]');
  await pa.click('[data-cv="anon"]');
  await pa.waitForSelector('[data-cv="unlock"]');
  await pa.click('[data-cv="unlock"]');
  await waitFor(pa, (x) => x.flow?.done, "anonimna objava");
  await pa.click('[data-cv="close"]');
  const anonHref = await pa.getAttribute('.sh-panel a[href*="/glasanje/g/"]', "href");
  await view.goto(new URL(anonHref, WEB).href);
  await view.waitForSelector(".sh-verdict.gl-msg--ok, .sh-verdict.gl-msg--err", { timeout: 120_000 });
  check(/Provjereno na lancu/.test(await view.textContent(".sh-verdict")), "stranica anonimne objave: događaj na lancu pronađen");

  console.log("A5. povlačenje glasa (potvrda u dijalogu)");
  await openGlasanje(pa);
  await pa.click("[data-cv-receipt] summary");
  await pa.click('[data-act="withdraw"]');
  await pa.click('[data-act="withdraw-yes"]');
  await pa.waitForSelector('[data-cv="unlock"]');
  await pa.click('[data-cv="unlock"]');
  s = await waitFor(pa, (x) => x.flow?.done, "povlačenje");
  check(s.ballot?.revision === 3 && Object.keys(s.ballot.items).length === 0, "revizija 3 = prazan listić (povučen)");
  check(JSON.parse(await pa.evaluate(() => localStorage.getItem("maksimir-draft")))[c1] === 100, "nacrt ostaje na uređaju");
  await pa.click('[data-cv="close"]');

  console.log("B. oporavak na novom uređaju: 24 riječi, bez passkeyja");
  const devB = await newDevice(browser, A);
  const pb = devB.page;
  await openGlasanje(pb, { [c2]: 100 });
  check((await state(pb)).ballot === null, "novi uređaj ne zna koji je listić moj (nema nullifiera)");
  await pb.click('[data-act="submit"]');
  await pb.waitForSelector('[data-cv="enter"]');
  check(/upisan ključ/.test(await pb.textContent(".cv-choose")), "tok zna da je za mene upisan ključ i traži baš njega");
  await pb.click('[data-cv="enter"]');
  await pb.fill("#cv-words-in", "abandon ".repeat(23) + "art");
  await pb.click('[data-cv="enter-ok"]');
  check(/nije ključ upisan|nisu ispravne/.test(await pb.textContent(".cv-err")), "tuđe (valjane) riječi → „to nije ključ upisan za tebe”");
  await pb.fill("#cv-words-in", wordsA.join("  ").toUpperCase());
  await pb.click('[data-cv="enter-ok"]');
  await pb.waitForSelector('[data-cv="words-only"]');
  await pb.click('[data-cv="words-only"]');
  s = await waitFor(pb, (x) => x.flow?.done, "oporavak");
  check(s.commitment === (await state(pa)).commitment && s.ballot?.revision === 4 && s.ballot.items[c2] === 100, "isti ključ iz riječi → isti nullifier → revizija 4");

  console.log("C. ZK ključ iz faze 1 postaje ključ za lanac (isti commitment)");
  const B = await mkUser("b", "MARKO", "KOVAČEVIĆ");
  const p1key = randomBytes(32).toString("base64");
  const expected = Identity.import(p1key).commitment.toString();
  const devC = await newDevice(browser, B, { "maksimir-zk-identity": p1key });
  const pc = devC.page;
  await openGlasanje(pc, { [c1]: 50, [c2]: 50 });
  await pc.click('[data-act="submit"]');
  await pc.click('[data-cv="terms"]');
  await pc.waitForSelector('[data-cv="phase1"]');
  await newKeyFlow(pc, "phase1");
  await pc.click('[data-cv="words-only"]');
  s = await waitFor(pc, (x) => x.flow?.done, "ključ iz faze 1");
  check(s.commitment === expected, "commitment na lancu = commitment ZK ključa iz faze 1");
  check(s.ballot?.revision === 1 && s.ballot.items[c1] === 50, "listić predan tim ključem");

  console.log("C2. I-09: ključ od nula iz faze 1 se ne nudi, a njegove riječi se odbijaju");
  const Bz = await mkUser("z", "ANA", "NULA");
  const devZ = await newDevice(browser, Bz, { "maksimir-zk-identity": Buffer.alloc(32).toString("base64") });
  const pz = devZ.page;
  await openGlasanje(pz, { [c1]: 100 });
  await pz.click('[data-act="submit"]');
  await pz.click('[data-cv="terms"]');
  await pz.waitForSelector('[data-cv="new"]');
  check(!(await pz.$('[data-cv="phase1"]')), "slab ključ iz faze 1 (same nule) nije ponuđen kao ključ za lanac");
  await pz.click('[data-cv="enter"]');
  await pz.fill("#cv-words-in", "abandon ".repeat(23) + "art");
  await pz.click('[data-cv="enter-ok"]');
  check(/slab/.test(await pz.textContent(".cv-err")), "riječi ključa od nula (abandon ×23 art) odbijene kao slab ključ");

  console.log("D. rezultati na stranici = lanac + ostatak faze 1");
  await openGlasanje(pa);
  const kpi = Number((await pa.textContent(".gl-hero-kpis strong")).trim());
  const chainVoters = Number(execFileSync("node", ["-e", `
    import("viem").then(async ({ createPublicClient, http, parseAbi }) => {
      const pc = createPublicClient({ transport: http("https://rpc.chiadochain.net") });
      const v = await pc.readContract({ address: "${CHIADO.address}", abi: parseAbi(["function voters() view returns (uint256)"]), functionName: "voters" });
      console.log(String(v));
    });`], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname }).trim());
  const p1 = (await rpc(A, "maksimir_results")).voters;
  check(kpi === chainVoters + p1, `glasača na stranici ${kpi} = lanac ${chainVoters} + faza 1 ${p1}`);
  await pa.setViewportSize({ width: 390, height: 844 });
  await pa.screenshot({ path: `${SHOTS}/d-mobitel.png`, fullPage: true });

  await browser.close();
  console.log(`\n${passed} provjera prošlo, ${fails.length} palo. Snimke: ${SHOTS}`);
  if (fails.length) {
    console.log(fails.map((f) => `  ✘ ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("SVE PROVJERE PROŠLE");
  process.exit(0); // snarkjs radnici drže proces živim
}

main().catch((e) => {
  console.error(`PAD: ${e.stack ?? e}`);
  process.exit(1);
});
