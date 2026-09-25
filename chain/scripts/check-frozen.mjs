#!/usr/bin/env node
// Zamrznute verzije se ne smiju mijenjati. Za svaki deployments/<mreža>/v<N>.json provjeri da
// trenutno kompajlirani izvor daje ISTI solc metadata (svaka izvorna datoteka, uključujući
// OpenZeppelin i Semaphore, te postavke kompajlera). Pokreće se nakon `hardhat compile`
// (npm run check-frozen) i u CI-ju (.github/workflows/chain.yml).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { keccak256 } from "viem";

const root = new URL("..", import.meta.url).pathname;
const dep = join(root, "deployments");
// Build-info TRENUTNOG artefakta (preko .dbg.json). Hardhat ne briše stare build-info
// datoteke, pa pretraživanje svih bi moglo naći stari izvor i lažno proći.
function currentMetadata(contract, version) {
  const file = `contracts/${version}/${contract}.sol`;
  const dbgPath = join(root, "artifacts", file, `${contract}.dbg.json`);
  if (!existsSync(dbgPath)) throw new Error(`${file} nije kompajliran — je li obrisan?`);
  const dbg = JSON.parse(readFileSync(dbgPath, "utf8"));
  const b = JSON.parse(readFileSync(join(dirname(dbgPath), dbg.buildInfo), "utf8"));
  return b.output.contracts[file][contract].metadata;
}

// Zamrznute su samo produkcijske mreže. Na testnetu (Chiado) deploy je nacrt: razlika se
// javlja kao upozorenje i znači „redeployaj na Chiado prije mainneta”.
const STRICT_CHAINS = new Set([100]);

let failed = 0;
let checked = 0;
for (const net of existsSync(dep) ? readdirSync(dep, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []) {
  for (const f of readdirSync(join(dep, net)).filter((x) => /^v\d+\.json$/.test(x))) {
    const m = JSON.parse(readFileSync(join(dep, net, f), "utf8"));
    const meta = currentMetadata(m.contract, m.version);
    const now = JSON.parse(meta);
    checked++;
    if (keccak256(new TextEncoder().encode(meta)) === m.metadataKeccak256) {
      console.log(`✔ ${net}/${f} ${m.address}`);
      continue;
    }
    const strict = STRICT_CHAINS.has(m.chainId);
    if (strict) failed++;
    console.error(`${strict ? "✘" : "⚠"} ${net}/${f}: izvor ili postavke promijenjeni nakon deploya${strict ? "" : " (testnet nacrt — redeployaj prije mainneta)"}`);
    for (const [k, h] of Object.entries(m.sources)) {
      if (now.sources[k]?.keccak256 !== h) console.error(`   promijenjeno: ${k}`);
    }
    for (const k of Object.keys(now.sources)) if (!(k in m.sources)) console.error(`   dodano: ${k}`);
  }
}
console.log(`${checked} zamrznutih verzija provjereno`);
process.exit(failed ? 1 : 0);
