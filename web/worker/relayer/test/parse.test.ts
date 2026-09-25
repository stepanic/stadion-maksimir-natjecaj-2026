import { test } from "node:test";
import assert from "node:assert/strict";
import { BadRequest, parseCall } from "../relay.ts";

const proof = { merkleTreeDepth: "1", merkleTreeRoot: "2", nullifier: "3", message: "4", scope: "5", points: ["1", "2", "3", "4", "5", "6", "7", "8"] };

test("cast: paket se prosljeđuje bez izmjene", () => {
  const points = "0x" + "00".repeat(87) + "64";
  const c = parseCall("cast", { revision: 2, points, proof });
  assert.equal(c.functionName, "cast");
  assert.deepEqual(c.args[0], 2);
  assert.equal(c.args[1], points);
  assert.equal((c.args[2] as { nullifier: bigint }).nullifier, 3n);
});

test("cast: povlačenje (prazan listić) je dopušteno", () => {
  assert.equal(parseCall("cast", { revision: 3, points: "0x", proof }).args[1], "0x");
});

test("odbija krive oblike prije ikakvog poziva lanca", () => {
  assert.throws(() => parseCall("cast", { revision: 0, points: "0x", proof }), BadRequest);
  assert.throws(() => parseCall("cast", { revision: 1, points: "0x1234", proof }), BadRequest);
  assert.throws(() => parseCall("cast", { revision: 1, points: "0x", proof: { ...proof, points: ["1"] } }), BadRequest);
  assert.throws(() => parseCall("share", { proof: { ...proof, nullifier: "-1" } }), BadRequest);
  assert.throws(() => parseCall("register", { commitment: "1", deadline: "2", signature: "0x12" }), BadRequest);
  assert.throws(() => parseCall("admin", {}), BadRequest);
  // revizija izvan uint32 (ugovor bi je odbio, ali viem bi je tiho odrezao)
  assert.throws(() => parseCall("cast", { revision: 2 ** 32, points: "0x", proof }), BadRequest);
  // broj veći od uint256
  assert.throws(() => parseCall("share", { proof: { ...proof, nullifier: "9".repeat(79) } }), BadRequest);
  assert.throws(() => parseCall("share", { proof: { ...proof, nullifier: "9".repeat(78) } }), BadRequest); // 78 znamenki > uint256
  assert.doesNotThrow(() => parseCall("share", { proof: { ...proof, nullifier: ((1n << 256n) - 1n).toString() } }));
});
