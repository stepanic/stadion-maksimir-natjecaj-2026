#!/usr/bin/env node
// Mutacijsko testiranje: imaju li testovi „zube”?
//
// Za svaku mutaciju (namjerno ubačenu grešku koja krši jedan sigurnosni cilj S1–S9) skripta
// promijeni ugovor, pokrene SVE testove i očekuje da PADNU. Mutant koji preživi znači rupu u
// testovima. Izvor se uvijek vraća (i nakon prekida), a na početku mora biti jednak HEAD-u.
//
//   node scripts/mutation-test.mjs            # sve mutacije
//   node scripts/mutation-test.mjs M03 M07    # samo neke
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "contracts/v1/MaksimirGlasanjeV1.sol";

// [id, cilj, opis, traži, zamijeni]
const MUTANTS = [
  ["M01", "S4", "stari bodovi se ne oduzimaju", "        _apply(b.points, false);\n        _apply(points, true);", "        _apply(points, true);"],
  ["M02", "S3", "revizija smije preskakati", "if (revision != b.revision + 1)", "if (revision <= b.revision)"],
  ["M03", "S3", "revizija se smije ponoviti", "if (revision != b.revision + 1)", "if (revision < b.revision)"],
  ["M04", "S2", "poruka listića se ne provjerava", "if (proof.message != ballotMessage(revision, points)) revert WrongMessage();", ""],
  ["M05", "S1", "rezultat verifyProof se ignorira", "if (!semaphore.verifyProof(groupId, proof)) revert InvalidProof();\n\n        Ballot storage b", "semaphore.verifyProof(groupId, proof);\n\n        Ballot storage b"],
  ["M06", "S3", "zaključan nullifier smije glasati u V1 (A-01/A-07)", "        if (b.migrated) revert AlreadyMigrated();\n        if (revision", "        if (revision"],
  ["M07", "S4", "zbroj ne mora biti 100", "if (sum != POINTS_PER_BALLOT) revert BadPointsSum(sum);", ""],
  ["M08", "S4", "povlačenje ne smanjuje voters", "if (b.points.length != 0 && points.length == 0) voters -= 1;", ""],
  ["M09", "S5", "registracija bez provjere potpisnika", "if (signer != registrar) revert NotRegistrar(signer);", ""],
  ["M10", "S7", "nema roka za listiće", "function cast(uint32 revision, bytes calldata points, ISemaphore.SemaphoreProof calldata proof) external open {", "function cast(uint32 revision, bytes calldata points, ISemaphore.SemaphoreProof calldata proof) external {"],
  ["M11", "S5", "istekao potpis registrara vrijedi", "if (block.timestamp > deadline) revert SignatureExpired();", ""],
  ["M12", "S3", "migrate smije dvaput (dvostruki uvoz u V2)", "        Ballot storage b = _ballots[proof.nullifier];\n        if (b.migrated) revert AlreadyMigrated();\n        revision = b.revision;", "        Ballot storage b = _ballots[proof.nullifier];\n        revision = b.revision;"],
  ["M23", "S6", "setSuccessor predaje admina grupe (A-07)", "        successor = next;\n        emit SuccessorSet(next);", "        successor = next;\n        semaphore.updateGroupAdmin(groupId, next);\n        emit SuccessorSet(next);"],
  ["M13", "S3", "migrate bez provjere poruke", "if (proof.message != migrateMessage()) revert WrongMessage();", ""],
  ["M14", "S6", "setSuccessor bez onlyOwner", "function setSuccessor(address next) external onlyOwner {", "function setSuccessor(address next) external {"],
  ["M15", "S6", "successor se smije mijenjati", "if (successor != address(0)) revert SuccessorAlreadySet();", ""],
  ["M16", "S3", "migrate ne poništava listić u V1", "        b.migrated = true;\n", ""],
  ["M17", "S2", "scope listića se ne provjerava", "if (proof.scope != BALLOT_SCOPE) revert WrongScope();\n        if (proof.message != ballotMessage", "if (proof.message != ballotMessage"],
  ["M18", "S8", "objava prihvaća scope listića", "if (proof.scope != SHARE_SCOPE) revert WrongScope();", ""],
  ["M19", "S4", "duljina listića se ne provjerava", "if (points.length != ENTRY_COUNT) revert BadBallotLength(points.length);", ""],
  ["M20", "S4", "selidba ne oduzima bodove u V1", "        _apply(points, false);\n        if (points.length != 0) voters -= 1;", "        if (points.length != 0) voters -= 1;"],
  ["M21", "S6", "setRegistrar bez onlyOwner", "function setRegistrar(address next) external onlyOwner {", "function setRegistrar(address next) external {"],
  ["M22", "S5", "EIP-712 bez roka u potpisu", "keccak256(abi.encode(REGISTER_TYPEHASH, commitment, deadline))", "keccak256(abi.encode(REGISTER_TYPEHASH, commitment, uint256(0)))"],
];

const only = process.argv.slice(2);
const original = readFileSync(FILE, "utf8");
const head = execSync(`git show HEAD:chain/${FILE}`).toString();
if (original !== head) {
  console.error(`${FILE} nije jednak HEAD-u — commitaj ili vrati promjene prije mutacija`);
  process.exit(2);
}
const restore = () => writeFileSync(FILE, original);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (restore(), process.exit(130)));

const results = [];
try {
  for (const [id, goal, desc, find, repl] of MUTANTS) {
    if (only.length && !only.includes(id)) continue;
    if (!original.includes(find)) {
      results.push([id, goal, desc, "NEVALJAN (uzorak nije nađen)"]);
      continue;
    }
    writeFileSync(FILE, original.replace(find, repl));
    const t0 = Date.now();
    const r = spawnSync("npx", ["hardhat", "test"], { encoding: "utf8", env: { ...process.env, FUZZ_SEEDS: "2", FUZZ_OPS: "25" } });
    const out = r.stdout + r.stderr;
    const failing = out.match(/(\d+) failing/)?.[1];
    const compileErr = /HH600|CompilerError|Compilation failed/.test(out);
    const verdict = compileErr ? "NEVALJAN (ne kompajlira)" : r.status !== 0 ? `ubijen (${failing ?? "?"} testova pada)` : "PREŽIVIO";
    results.push([id, goal, desc, verdict]);
    console.log(`${id} [${goal}] ${desc}: ${verdict}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
} finally {
  restore();
}

const survived = results.filter((x) => x[3] === "PREŽIVIO");
const invalid = results.filter((x) => x[3].startsWith("NEVALJAN"));
console.log(`\n${results.length} mutacija: ${results.length - survived.length - invalid.length} ubijeno, ${survived.length} preživjelo, ${invalid.length} nevaljano`);
process.exit(survived.length || invalid.length ? 1 : 0);
