import { test } from "node:test";
import assert from "node:assert/strict";
import { relayerEnv, relayerRoute, type RelayerWorkerEnv } from "../route.ts";

const kv = { get: async () => null, put: async () => {} };
const KEY = "0x" + "11".repeat(32);
const base: RelayerWorkerEnv = {
  RELAY_KV: kv,
  RELAYER_CHAINS: JSON.stringify({ "10200": { contract: "0x00000000000000000000000000000000000000aa", rpc: "http://127.0.0.1:1" } }),
  SPONSOR_PRIVATE_KEY_10200: KEY,
  RELAYER_ALLOWED_ORIGINS: "http://localhost:5173",
};
const req = (method: string, body?: string, origin?: string) =>
  new Request("https://maksimir.domovina.ai/relayer/x", { method, body, headers: origin ? { Origin: origin } : {} });

test("relayerEnv: mreža uključena samo uz ugovor, ključ i KV", () => {
  const e = relayerEnv(base, "10200");
  assert.equal(e?.CONTRACT_ADDRESS, "0x00000000000000000000000000000000000000aa");
  assert.equal(e?.CHAIN_ID, "10200");
  assert.equal(e?.SPONSOR_PRIVATE_KEY, KEY);
  assert.equal(relayerEnv(base, "100"), null);
  assert.equal(relayerEnv({ ...base, SPONSOR_PRIVATE_KEY_10200: undefined }, "10200"), null);
  assert.equal(relayerEnv({ ...base, RELAY_KV: undefined }, "10200"), null);
  assert.equal(relayerEnv({ ...base, RELAYER_CHAINS: "{ne json" }, "10200"), null);
  assert.equal(relayerEnv({ ...base, RELAYER_CHAINS: undefined }, "10200"), null);
});

test("rute: nepoznata 404, isključena mreža 503, kriva metoda 405, loš JSON i oblik 400", async () => {
  assert.equal((await relayerRoute(req("POST", "{}"), base, "10200/admin")).status, 404);
  assert.equal((await relayerRoute(req("POST", "{}"), base, "abc/cast")).status, 404);
  const off = await relayerRoute(req("POST", "{}"), base, "100/cast");
  assert.equal(off.status, 503);
  assert.match(((await off.json()) as { error: string }).error, /sam/);
  assert.equal((await relayerRoute(req("GET"), base, "10200/cast")).status, 405);
  assert.equal((await relayerRoute(req("POST", "{}"), base, "10200/status")).status, 405);
  assert.equal((await relayerRoute(req("POST", "nije json"), base, "10200/cast")).status, 400);
  const bad = await relayerRoute(req("POST", JSON.stringify({ revision: 0, points: "0x", proof: {} })), base, "10200/cast");
  assert.equal(bad.status, 400);
  assert.equal(bad.headers.get("Cache-Control"), "no-store");
});

test("CORS: samo navedeni izvori; isti izvor ga ne treba", async () => {
  const pre = await relayerRoute(req("OPTIONS", undefined, "http://localhost:5173"), base, "10200/cast");
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
  const evil = await relayerRoute(req("OPTIONS", undefined, "https://zlo.example"), base, "10200/cast");
  assert.equal(evil.headers.get("Access-Control-Allow-Origin"), null);
});

test("lanac nedostupan → 500 s porukom, ne ruši Worker", async () => {
  const r = await relayerRoute(req("GET"), base, "10200/status");
  assert.equal(r.status, 500);
});
