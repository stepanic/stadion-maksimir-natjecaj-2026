// node --test --experimental-strip-types test/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, bordaWeights, byPoints, canon, clampPoints, clean, fitTo100, move, mulberry32, nudge, propose, shuffle, sum, validate, type Preset } from "../src/ballotMath.ts";

const CODES = Array.from({ length: 88 }, (_, i) => `R${String(i).padStart(8, "0")}`);
const KNOWN = new Set(CODES);

test("allocate: cijeli bodovi, zbroj 100, najveći ostatak", () => {
  assert.deepEqual(allocate({ a: 1, b: 1, c: 1 }), { a: 34, b: 33, c: 33 });
  assert.deepEqual(allocate({ a: 5, b: 4, c: 3, d: 2, e: 1 }), { a: 33, b: 27, c: 20, d: 13, e: 7 });
  assert.deepEqual(allocate({ a: 2, b: 0 }), { a: 100 });
  assert.deepEqual(allocate({}), {});
  assert.deepEqual(allocate({ a: 0 }), {});
  assert.deepEqual(allocate({ a: 1, b: 1 }, 7), { a: 4, b: 3 });
});

test("allocate: rad koji bi dobio 0 bodova ne ostaje na listiću", () => {
  const w = Object.fromEntries(CODES.map((c, i) => [c, i === 0 ? 1000 : 1]));
  const out = allocate(w);
  assert.equal(sum(out), 100);
  assert.ok(Object.values(out).every((v) => v > 0));
});

test("propose: svaki preset za 1…88 favorita daje ispravan listić", () => {
  const rnd = mulberry32(7);
  for (let n = 1; n <= 88; n++) {
    const ordered = shuffle(CODES, rnd).slice(0, n);
    for (const p of ["rank", "equal", "first"] as Preset[]) {
      const b = propose(ordered, p);
      assert.deepEqual(validate(b, KNOWN), { ok: true }, `n=${n} ${p}`);
      if (p === "first") assert.deepEqual(b, { [ordered[0]]: 100 });
    }
  }
  assert.deepEqual(propose([]), {});
});

test("propose rank: redoslijed se poštuje (prvi ≥ drugi ≥ …)", () => {
  const ordered = CODES.slice(0, 7);
  const b = propose(ordered, "rank");
  for (let i = 1; i < ordered.length; i++) assert.ok((b[ordered[i - 1]] ?? 0) >= (b[ordered[i]] ?? 0));
  assert.deepEqual(bordaWeights(["x", "y", "z"]), { x: 3, y: 2, z: 1 });
});

test("fitTo100 i nudge", () => {
  assert.deepEqual(fitTo100({ a: 30, b: 30 }), { a: 50, b: 50 });
  assert.deepEqual(fitTo100({ a: 0 }), {});
  assert.deepEqual(nudge({ a: 98 }, "a", 5), { a: 100 });
  assert.deepEqual(nudge({ a: 3 }, "a", -5), { a: 0 });
  assert.deepEqual(nudge({}, "b", 5), { b: 5 });
});

test("clampPoints: ručni unos", () => {
  assert.equal(clampPoints("42"), 42);
  assert.equal(clampPoints("4.6"), 5);
  assert.equal(clampPoints("-3"), 0);
  assert.equal(clampPoints("250"), 100);
  assert.equal(clampPoints("abc"), 0);
  assert.equal(clampPoints(""), 0);
});

test("validate: ista pravila kao ugovor i baza", () => {
  assert.deepEqual(validate({ [CODES[0]]: 100 }, KNOWN), { ok: true });
  assert.deepEqual(validate({ [CODES[0]]: 100, [CODES[1]]: 0 }, KNOWN), { ok: true }, "nule se ne broje");
  assert.equal(validate({}, KNOWN).ok, false);
  assert.match((validate({ X: 100 }, KNOWN) as { reason: string }).reason, /Nepoznata šifra/);
  assert.match((validate({ [CODES[0]]: 99 }, KNOWN) as { reason: string }).reason, /sad 99/);
  assert.match((validate({ [CODES[0]]: 50.5, [CODES[1]]: 49.5 }, KNOWN) as { reason: string }).reason, /cijeli brojevi/);
  assert.match((validate({ [CODES[0]]: 101, [CODES[1]]: -1 }, KNOWN) as { reason: string }).reason, /cijeli brojevi/);
});

test("canon, clean i byPoints", () => {
  assert.equal(canon({ B: 40, A: 60, C: 0 }), "A:60,B:40");
  assert.deepEqual(clean({ A: 0, B: 1 }), { B: 1 });
  assert.deepEqual(byPoints({ B: 40, A: 40, C: 20, D: 0 }), [["A", 40], ["B", 40], ["C", 20]]);
});

test("shuffle: permutacija, deterministična za isto sjeme", () => {
  const a = shuffle(CODES, mulberry32(1));
  assert.deepEqual([...a].sort(), [...CODES].sort());
  assert.deepEqual(a, shuffle(CODES, mulberry32(1)));
  assert.notDeepEqual(a, shuffle(CODES, mulberry32(2)));
  assert.notDeepEqual(a, CODES);
});

test("move: strelice gore/dolje", () => {
  assert.deepEqual(move(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(move(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
  assert.deepEqual(move(["a", "b"], 0, -1), ["a", "b"]);
  assert.deepEqual(move(["a", "b"], 1, 1), ["a", "b"]);
  assert.deepEqual(move(["a"], 5, 1), ["a"]);
});
