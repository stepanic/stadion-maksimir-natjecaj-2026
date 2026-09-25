#!/usr/bin/env node
// Prag pokrivenosti: svaki produkcijski ugovor (contracts/v*/) mora imati 100 % naredbi,
// grana, funkcija i linija. Pokreće se nakon `hardhat coverage` (npm run coverage) i u CI-ju.
import { readFileSync } from "node:fs";

const summary = JSON.parse(readFileSync(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8"));
const METRICS = ["statements", "branches", "functions", "lines"];
let failed = 0;
let files = 0;
for (const [file, m] of Object.entries(summary)) {
  if (!/(^|\/)contracts\/v\d+\//.test(file)) continue;
  files++;
  const low = METRICS.filter((k) => m[k].pct < 100);
  const row = METRICS.map((k) => `${k} ${m[k].pct}%`).join(", ");
  if (low.length) {
    failed++;
    console.error(`✘ ${file.replace(/^.*contracts\//, "")}: ${row}`);
  } else console.log(`✔ ${file.replace(/^.*contracts\//, "")}: ${row}`);
}
if (files === 0) {
  console.error("nema ugovora u contracts/v*/ u izvještaju — je li coverage pokrenut?");
  process.exit(1);
}
process.exit(failed ? 1 : 0);
