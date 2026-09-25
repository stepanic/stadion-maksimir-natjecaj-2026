#!/usr/bin/env node
// Prag pokrivenosti klijentskog koda (chain/client/: kriptografija glasačeva preglednika):
// 100 % naredbi, grana, funkcija i linija. Pokreće `npm run coverage:client` i CI.
import { readFileSync } from "node:fs";

const summary = JSON.parse(readFileSync(new URL("../coverage-client/coverage-summary.json", import.meta.url), "utf8"));
const METRICS = ["statements", "branches", "functions", "lines"];
let failed = 0;
for (const [file, m] of Object.entries(summary)) {
  if (file === "total") continue;
  const name = file.replace(/^.*\/chain\//, "");
  const low = METRICS.filter((k) => m[k].pct < 100);
  const row = METRICS.map((k) => `${k} ${m[k].pct}%`).join(", ");
  if (low.length) failed++;
  console[low.length ? "error" : "log"](`${low.length ? "✘" : "✔"} ${name}: ${row}`);
}
process.exit(failed ? 1 : 0);
