// Paritet sučelja za glasanje: isti scenariji nad svakim frontendom, isti lažni backend.
// Svako sučelje mora predati ISTI listić u ISTI tok predaje (chainVoteView: Certilia → ključ →
// ZK → relayer). Tok se ne izvršava do kraja; provjerava se s čime je pokrenut i dokle je stigao.
//
//   npx vite --port 5173            (u drugom terminalu)
//   node scripts/glasanje-paritet.mjs [baseUrl] [--ui klasicno|glasaj] [--headed]
//
// Ništa ne ide na produkciju: Supabase, GitHub i Gnosis RPC su presretnuti (scripts/lib/glasanje-mock.mjs).
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockBackend, flowState, chainReady, draftOf, checker, same } from "./lib/glasanje-mock.mjs";

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith("http")) ?? "http://localhost:5173").replace(/\/$/, "");
const ONLY = args.includes("--ui") ? args[args.indexOf("--ui") + 1] : null;
const SHOTS = mkdtempSync(join(tmpdir(), "glasanje-paritet-"));
const { check, done } = checker();

const A = "0ZUFNG8CC";
const B = "1EEPNNDDB";
const C = "2AAVTUGWB";

// ── adapteri: kako se u pojedinom sučelju radi ista stvar ────────────────────────

const klasicno = {
  name: "klasicno",
  path: "/glasanje",
  /** Listić se slaže na stranici; ovdje ga zadajemo kao nacrt (slaganje pokriva glasanje-ui.mjs). */
  async compose(page, items, mock) {
    await page.evaluate((d) => localStorage.setItem("maksimir-draft", JSON.stringify(d)), items);
    await page.reload({ waitUntil: "networkidle" });
    if (mock.opts.chain) await chainReady(page);
  },
  submit: (page) => page.click('[data-act="submit"]'),
  submitLabel: (page) => page.locator('[data-act="submit"]').innerText(),
  async counted(page) {
    return (await page.locator(".gl-receipt summary").count()) ? page.locator(".gl-receipt summary").innerText() : null;
  },
  async withdraw(page) {
    await page.click(".gl-receipt summary");
    await page.click('[data-act="withdraw"]');
    await page.click('[data-act="withdraw-yes"]');
  },
};

const UIS = [klasicno].filter((u) => !ONLY || u.name === ONLY);

// ── scenariji ──────────────────────────────────────────────────────────────────

async function open(browser, ui, opts) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const mock = await mockBackend(page, opts);
  await page.goto(BASE + ui.path, { waitUntil: "networkidle" });
  if (mock.opts.chain) await chainReady(page);
  return { ctx, page, mock, errors };
}

const scenarios = [
  {
    name: "neprijavljen: predaja otvara tok na koraku prijave, s istim listićem",
    opts: { signedIn: false },
    async run(ui, { page, mock }) {
      const items = { [A]: 60, [B]: 40 };
      await ui.compose(page, items, mock);
      await ui.submit(page);
      const f = await flowState(page);
      check(f?.purpose === "cast", `${ui.name}: tok je predaja (${f?.purpose})`);
      check(f && same(f.items, items), `${ui.name}: u tok ide sastavljeni listić ${JSON.stringify(f?.items)}`);
      check(f?.steps.signin === "now", `${ui.name}: prvi korak je prijava eOsobnom`);
      check((await page.locator(".cv-modal").count()) === 1, `${ui.name}: prikazan je zajednički dijalog predaje`);
    },
  },
  {
    name: "prijavljen bez ključa: tok čeka ključ glasača",
    opts: { signedIn: true },
    async run(ui, { page, mock }) {
      const items = { [A]: 50, [B]: 30, [C]: 20 };
      await ui.compose(page, items, mock);
      await ui.submit(page);
      const f = await flowState(page);
      check(f && same(f.items, items), `${ui.name}: listić u toku ${JSON.stringify(f?.items)}`);
      check(f?.steps.signin === "done" && f?.steps.terms === "done" && f?.steps.key === "now", `${ui.name}: koraci ${JSON.stringify(f?.steps)}`);
      check(f?.keyStage === "choose", `${ui.name}: nudi izbor ključa`);
    },
  },
  {
    name: "glas iz faze 1 nije prenesen: prijenos na lanac s istim bodovima",
    opts: { signedIn: true, my: { items: { [C]: 100 } } },
    async run(ui, { page }) {
      check(/Prenesi glas na lanac/.test(await ui.submitLabel(page)), `${ui.name}: nudi prijenos na lanac`);
      check(same(await draftOf(page), { [C]: 100 }), `${ui.name}: nacrt je učitan iz faze 1`);
      await ui.submit(page);
      const f = await flowState(page);
      check(f?.purpose === "cast" && same(f.items, { [C]: 100 }), `${ui.name}: prijenos ${JSON.stringify(f?.items)}`);
    },
  },
  {
    name: "glas je na lancu: prikaz potvrde i povlačenje kroz isti tok",
    opts: { signedIn: true, chainBallot: { revision: 2, items: { [A]: 70, [B]: 30 } } },
    async run(ui, { page }) {
      const c = await ui.counted(page);
      check(!!c && /revizija 2/.test(c), `${ui.name}: vidi se glas na lancu (${c})`);
      check(same(await draftOf(page), { [A]: 70, [B]: 30 }), `${ui.name}: nacrt = glas s lanca`);
      await ui.withdraw(page);
      const f = await flowState(page);
      check(f?.purpose === "withdraw", `${ui.name}: povlačenje ide kroz tok (${f?.purpose})`);
      check(same(await draftOf(page), { [A]: 70, [B]: 30 }), `${ui.name}: listić ostaje na uređaju nakon povlačenja`);
    },
  },
];

const browser = await chromium.launch({ headless: !args.includes("--headed") });
for (const ui of UIS) {
  console.log(`\n■ ${ui.name} (${ui.path})`);
  for (const s of scenarios) {
    console.log(`· ${s.name}`);
    const t = await open(browser, ui, s.opts);
    try {
      await s.run(ui, t);
    } catch (e) {
      check(false, `${ui.name}: ${s.name}: ${e.message.split("\n")[0]}`);
    }
    await t.page.screenshot({ path: join(SHOTS, `${ui.name}-${scenarios.indexOf(s) + 1}.png`) });
    check(t.errors.length === 0, `${ui.name}: bez JS grešaka ${t.errors.join("; ")}`);
    await t.ctx.close();
  }
}
await browser.close();
console.log(`Snimke: ${SHOTS}`);
done();
