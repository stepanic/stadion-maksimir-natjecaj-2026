// Provjera listića na /glasanje bez produkcije: svi pozivi prema api.domovina.ai su presretnuti.
// Uklanjanje rada i pražnjenje imaju „Vrati”, povlačenje glasa traži potvrdu i čuva listić.
//   node scripts/glasanje-ui.mjs http://localhost:5173
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const BASE = (process.argv[2] ?? "http://localhost:5173").replace(/\/$/, "");
const S = mkdtempSync(join(tmpdir(), "glasanje-ui-"));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
const items = {"0ZUFNG8CC":40,"1EEPNNDDB":30,"2AAVTUGWB":30};
let server = { ...items }; const calls = [];
const ballot = () => ({ verified: true, consented: true, open: true, items: server, updated_at: new Date().toISOString(),
  receipt: Object.keys(server).length ? { seq: 7, prev_hash: "0", hash: "ab".repeat(32), pseudonym: "x", revision: 1, ts_ms: 1, items_canon: "" } : null,
  public_mode: null, share_id: null, zk_commitment: null });
// Sve prema bazi presretnuto: ništa ne ide na produkciju.
await p.route(/^https:\/\/api\.domovina\.ai\//, async (r) => {
  const u = r.request().url();
  if (u.includes("maksimir_my_ballot")) return r.fulfill({ json: ballot() });
  if (u.includes("maksimir_cast_ballot")) { calls.push(r.request().postDataJSON()); server = r.request().postDataJSON().p_items; return r.fulfill({ json: ballot() }); }
  if (u.includes("maksimir_results")) return r.fulfill({ json: { open: true, opens_at: null, closes_at: "2027-12-31T22:59:00Z", voters: 1, results: Object.entries(server).map(([code, points]) => ({ code, points, backers: 1, share: points })) } });
  if (u.includes("maksimir_public_ballots")) return r.fulfill({ json: { count: 0, zk_shares: 0, ballots: [] } });
  return r.fulfill({ json: {} });
});
await p.goto(BASE + "/");
await p.evaluate((it) => {
  localStorage.setItem("maksimir-draft", JSON.stringify(it));
  const exp = Math.floor(Date.now()/1000) + 3600;
  localStorage.setItem("maksimir-auth", JSON.stringify({ access_token: "x", refresh_token: "y", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: "u", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" } }));
}, items);
await p.goto(BASE + "/glasanje", { waitUntil: "networkidle" });
await p.screenshot({ path: S + "/m1.png" });
const snap = async () => JSON.parse(await p.evaluate(() => JSON.stringify({ draft: JSON.parse(localStorage.getItem("maksimir-draft")), hint: document.querySelector("[data-hint]")?.textContent.trim(), steps: [...document.querySelectorAll(".gl-steps li")].map(l => l.className) })));
const fails = [];
const ok = (c, m) => c || fails.push(m);
const t = async (name, check) => { const s = await snap(); ok(check(s), `${name}: ${JSON.stringify(s)}`); };
await t("start", (s) => Object.keys(s.draft).length === 3 && s.steps.join() === "done,done,done");
// ukloni jedan pa vrati
await p.click('.gl-row[data-code="1EEPNNDDB"] [data-act="remove"]');
await t("remove", (s) => !("1EEPNNDDB" in s.draft)); await p.waitForTimeout(400); await p.screenshot({ path: S + "/m2.png" });
await p.click('[data-act="undo"]'); await t("undo", (s) => s.draft["1EEPNNDDB"] === 30);
// isprazni pa vrati
await p.click('[data-act="clear"]'); await t("clear", (s) => Object.keys(s.draft).length === 0);
await p.click('[data-act="undo"]'); await t("undo clear", (s) => Object.keys(s.draft).length === 3);
// povuci glas: dijalog, odustani, pa potvrdi
await p.click(".gl-receipt summary");
await p.click('[data-act="withdraw"]'); await p.screenshot({ path: S + "/m3.png" });
await p.keyboard.press("Escape"); ok((await p.locator(".gl-modal").count()) === 0 && calls.length === 0, "Esc mora zatvoriti dijalog bez povlačenja");
await p.click(".gl-receipt summary").catch(()=>{});
await p.click('[data-act="withdraw"]'); await p.click('[data-act="withdraw-yes"]');
await p.waitForTimeout(500); await t("withdraw čuva listić", (s) => Object.keys(s.draft).length === 3);
ok(calls.length === 1 && Object.keys(calls[0].p_items).length === 0, "povlačenje: jedan poziv s praznim listićem");
await p.screenshot({ path: S + "/m4.png" });
// ponovno predaj
await p.click('[data-act="submit"]'); await p.waitForTimeout(500); await t("ponovna predaja", (s) => s.steps.join() === "done,done,done");
ok(calls.length === 2 && Object.keys(calls[1].p_items).length === 3, "ponovna predaja šalje sačuvani listić");
// klizač preko tipkovnice + dodavanje iz galerije
await p.click('.gp-card:not(.is-on) [data-toggle]'); await t("dodaj iz galerije", (s) => Object.keys(s.draft).length === 4 && /0 bodova/.test(s.hint));
await p.focus('.gl-row [data-f="num"]'); await p.fill('.gl-row [data-f="num"]', "10"); await p.keyboard.press("Tab"); await t("tipkanje bodova", (s) => Object.values(s.draft).includes(10) && s.steps[1] === "now");
await p.setViewportSize({ width: 1280, height: 900 }); await p.screenshot({ path: S + "/d1.png" });
ok(errs.length === 0, `greške: ${errs.join("; ")}`);
console.log(fails.length ? `PALO:\n${fails.join("\n")}` : `Listić: sve provjere prošle (snimke u ${S})`);
process.exitCode = fails.length ? 1 : 0;
await b.close();
