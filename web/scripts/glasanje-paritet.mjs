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

const glasaj = {
  name: "glasaj",
  path: "/glasaj",
  /** Kroz sučelje: favoriti redom → točni bodovi upisani u polja → pregled. */
  async compose(page, items) {
    const start = page.locator('[data-act="begin"], [data-act="new"]').first();
    await start.click();
    await page.click('[data-act="via-favoriti"]');
    const order = Object.entries(items).sort(([, a], [, b]) => b - a).map(([c]) => c);
    for (const c of order) await page.click(`.gj-pick[data-pick="${c}"]`);
    await page.click('[data-act="to-points"]');
    for (const c of order) {
      await page.fill(`.gj-rows li[data-code="${c}"] input`, String(items[c]));
      await page.locator(`.gj-rows li[data-code="${c}"] input`).press("Tab");
    }
    await page.click('[data-act="to-review"]');
  },
  submit: (page) => page.locator('[data-act="transfer"], [data-act="submit"]').first().click(),
  submitLabel: (page) => page.locator('[data-act="transfer"], [data-act="submit"]').first().innerText(),
  counted: klasicno.counted,
  withdraw: klasicno.withdraw,
};

const UIS = [klasicno, glasaj].filter((u) => !ONLY || u.name === ONLY);

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

// ── samo /glasaj: putovi koje klasični listić nema ───────────────────────────────

const g = () => (p) => p.evaluate(() => globalThis.__glasaj.state);
const glasajOnly = [
  {
    name: "favoriti: prijedlog po redoslijedu, preseti, ručne izmjene, svedi na 100",
    opts: { signedIn: true },
    async run({ page }) {
      const st = g();
      await page.click('[data-act="begin"]');
      await page.click('[data-act="via-favoriti"]');
      const order = (await st(page)).order;
      check(order.length === 88 && order.join() !== [...order].sort().join(), "88 radova, nasumičan redoslijed");
      const five = order.slice(0, 5);
      for (const c of five) await page.click(`.gj-pick[data-pick="${c}"]`);
      check(JSON.stringify((await st(page)).picks) === JSON.stringify(five), "favoriti su zapamćeni redom klika");
      await page.click('.gj-tray [data-down="0"]');
      check((await st(page)).picks[1] === five[0], "strelica ↓ mijenja redoslijed");
      await page.click('.gj-tray [data-up="1"]');
      await page.click('[data-act="to-points"]');
      let s = await st(page);
      check(JSON.stringify(five.map((c) => s.items[c])) === "[33,27,20,13,7]", `prijedlog Borda 33/27/20/13/7 (${five.map((c) => s.items[c])})`);
      check(same(await draftOf(page), s.items), "prijedlog je odmah u zajedničkom nacrtu");
      await page.click('[data-preset="equal"]');
      s = await st(page);
      check(five.every((c) => s.items[c] === 20), "„Svima jednako” daje 20 svakome");
      await page.click(`.gj-rows li[data-code="${five[0]}"] [data-nudge="5"]`);
      s = await st(page);
      check(s.items[five[0]] === 25 && s.preset === null, "+ dodaje 5 bodova, preset više nije aktivan");
      check(await page.locator('[data-act="to-review"]').isDisabled(), "s 105 bodova nema dalje");
      check(/5 bodova previše/.test(await page.locator("[data-meter]").innerText()), "piše koliko je previše");
      await page.click('[data-act="fit"]');
      s = await st(page);
      check(Object.values(s.items).reduce((a, b) => a + b, 0) === 100, `„Svedi na 100” (${JSON.stringify(s.items)})`);
      await page.click('[data-preset="first"]');
      s = await st(page);
      check(s.items[five[0]] === 100 && five.slice(1).every((c) => s.items[c] === 0), "„Sve prvom”: 100 prvom, ostali 0");
      check((await page.locator(".gj-rows li.is-zero").count()) === 4, "radovi s 0 bodova su označeni");
      await page.click('[data-preset="rank"]');
      await page.click('[data-act="to-review"]');
      const shown = await page.$$eval(".gj-list li", (lis) => lis.map((l) => Number(l.querySelector("strong").textContent)));
      check(JSON.stringify(shown) === "[33,27,20,13,7]", `pregled pokazuje bodove (${shown})`);
      const canon = await page.locator(".gj-tech code").textContent();
      check(canon.split(",").length === 5 && canon === [...canon.split(",")].sort().join(","), `tehnički zapis je kanonski (sortiran po šifri): ${canon}`);
      await page.click('[data-act="submit"]');
      const f = await flowState(page);
      check(f?.purpose === "cast" && same(f.items, (await st(page)).items), "u tok ide točno listić s pregleda");
      await page.keyboard.press("Escape");
      check((await flowState(page)) === null, "Esc zatvara tok bez predaje");
      check((await st(page)).screen === "pregled", "nakon Esc glasač je i dalje na pregledu");
    },
  },
  {
    name: "jedan po jedan: sviđa/ne, vrati, dosta → favoriti samo iz onih koji se sviđaju",
    opts: { signedIn: true },
    async run({ page }) {
      const st = g();
      await page.click('[data-act="begin"]');
      await page.click('[data-act="via-swipe"]');
      const keys = ["ArrowRight", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowRight", "Backspace", "ArrowLeft"];
      for (const k of keys) await page.keyboard.press(k);
      let s = await st(page);
      check(s.seen === 10 && s.liked.length === 3, `10 pregledanih, 3 sviđa (${s.seen}, ${s.liked.length})`);
      check(JSON.stringify(s.liked) === JSON.stringify([s.order[0], s.order[2], s.order[5]]), "„Vrati” poništava zadnju odluku");
      await page.click('[data-act="no"]');
      await page.click('[data-act="yes"]');
      s = await st(page);
      check(s.seen === 12 && s.liked.length === 4, "gumbi ✕ i ♥ rade kao tipke");
      await page.click('[data-act="enough"]');
      check((await page.locator(".gj-pick").count()) === 4, "biraju se samo radovi koji se sviđaju");
      for (const c of s.liked) await page.click(`.gj-pick[data-pick="${c}"]`);
      await page.click('[data-act="to-points"]');
      await page.click('[data-act="to-review"]');
      await page.click('[data-act="submit"]');
      const f = await flowState(page);
      check(f && same(Object.fromEntries(Object.keys(f.items).map((c) => [c, 1])), Object.fromEntries(s.liked.map((c) => [c, 1]))), "listić čine točno favoriti iz swipea");
    },
  },
  {
    name: "isti nacrt u oba sučelja (prijelaz /glasaj ↔ /glasanje)",
    opts: { signedIn: false },
    async run({ page }) {
      await page.click('[data-act="begin"]');
      await page.click('[data-act="via-favoriti"]');
      const order = (await page.evaluate(() => globalThis.__glasaj.state.order)).slice(0, 2);
      for (const c of order) await page.click(`.gj-pick[data-pick="${c}"]`);
      await page.click('[data-act="to-points"]');
      const items = await page.evaluate(() => globalThis.__glasaj.state.items);
      await page.goto(BASE + "/glasanje", { waitUntil: "networkidle" });
      await chainReady(page);
      const rows = await page.$$eval(".gl-row", (rs) => Object.fromEntries(rs.map((r) => [r.dataset.code, Number(r.querySelector('[data-f="num"]').value)])));
      check(same(rows, items), `klasični listić vidi isti nacrt (${JSON.stringify(rows)})`);
      await page.fill(`.gl-row[data-code="${order[0]}"] [data-f="num"]`, "90");
      await page.locator(`.gl-row[data-code="${order[0]}"] [data-f="num"]`).press("Tab");
      await page.fill(`.gl-row[data-code="${order[1]}"] [data-f="num"]`, "10");
      await page.locator(`.gl-row[data-code="${order[1]}"] [data-f="num"]`).press("Tab");
      await page.click('.gl-alt a[href="/glasaj"]');
      await page.waitForSelector('[data-act="resume"]');
      await page.click('[data-act="resume"]');
      const back = await page.evaluate(() => globalThis.__glasaj.state.items);
      check(same(back, { [order[0]]: 90, [order[1]]: 10 }), `/glasaj nastavlja izmjene s klasičnog (${JSON.stringify(back)})`);
    },
  },
  {
    name: "faza 1 bez lanca: predaja ide kroz klasični listić s istim nacrtom",
    opts: { chain: false, signedIn: true },
    async run({ page }) {
      await glasaj.compose(page, { [A]: 55, [B]: 45 });
      check((await page.locator('[data-act="submit"]').count()) === 0, "nema predaje izvan lanca");
      await page.click('[data-act="classic"]');
      await page.waitForSelector('[data-act="submit"]');
      check(same(await draftOf(page), { [A]: 55, [B]: 45 }), "nacrt je prenesen");
      check(!(await page.locator('[data-act="submit"]').isDisabled()), "klasični listić je spreman za predaju");
    },
  },
  {
    name: "ograničenja: najviše 10 favorita, pretraga, prazan listić nema dalje",
    opts: {},
    async run({ page }) {
      await page.click('[data-act="begin"]');
      await page.click('[data-act="via-favoriti"]');
      check(await page.locator('[data-act="to-points"]').isDisabled(), "bez favorita nema dalje");
      const order = await page.evaluate(() => globalThis.__glasaj.state.order);
      for (const c of order.slice(0, 11)) await page.click(`.gj-pick[data-pick="${c}"]`);
      const s = await page.evaluate(() => globalThis.__glasaj.state);
      check(s.picks.length === 10, "jedanaesti favorit se ne dodaje");
      check(/Najviše 10 favorita/.test(await page.locator(".gl-msg--err").innerText()), "poruka o ograničenju");
      await page.fill(".gj-search", A);
      check((await page.locator(".gj-pick").count()) === 1, "pretraga po šifri");
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
if (!ONLY || ONLY === "glasaj") {
  console.log("\n■ samo /glasaj");
  for (const s of glasajOnly) {
    console.log(`· ${s.name}`);
    const t = await open(browser, glasaj, s.opts);
    try {
      await s.run(t);
    } catch (e) {
      check(false, `glasaj: ${s.name}: ${e.message.split("\n")[0]}`);
    }
    await t.page.screenshot({ path: join(SHOTS, `glasaj-x${glasajOnly.indexOf(s) + 1}.png`), fullPage: true });
    check(t.errors.length === 0, `glasaj: bez JS grešaka ${t.errors.join("; ")}`);
    await t.ctx.close();
  }
}
await browser.close();
console.log(`Snimke: ${SHOTS}`);
done();
