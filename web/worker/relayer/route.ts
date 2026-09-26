// /relayer/<chainId>/… — plaća gas za već potpisane pakete glasača (MaksimirGlasanjeV1).
//
//   POST /relayer/<chainId>/register  { commitment, deadline, signature }   registrarov EIP-712 potpis
//   POST /relayer/<chainId>/cast      { revision, points, proof }           glasačev ZK dokaz za listić
//   POST /relayer/<chainId>/share     { proof }                             glasačev ZK dokaz „glasao sam”
//   GET  /relayer/<chainId>/status    adresa ugovora, broj glasača, saldo sponzora
//
// Dio Workera `maksimir` (isti deploy kao web). Relayer nema nikakvu ulogu u ugovoru
// (v. docs/blockchain/06-kontrola-glasaca.md); isti paket može poslati bilo tko.
//
// Konfiguracija (wrangler.jsonc + tajne):
//   RELAYER_CHAINS              JSON {"<chainId>": {"contract": "0x…", "rpc": "https://…"}}
//   SPONSOR_PRIVATE_KEY_<id>    tajna: EOA sponzora za tu mrežu
//   RELAY_KV                    KV za dnevne kvote (po mreži)
//   RELAYER_ALLOWED_ORIGINS     dodatni izvori za CORS (lokalni razvoj); isti izvor ga ne treba
import { formatEther } from "viem";
import { V1_ABI } from "./abi.ts";
import { chainOf, contractAddress, publicClient, walletFor } from "./chain.ts";
import { BadRequest, parseCall, relay } from "./relay.ts";
import type { Env, KV } from "./types.ts";

export type RelayerWorkerEnv = {
  RELAY_KV?: KV;
  RELAYER_CHAINS?: string;
  RELAYER_ALLOWED_ORIGINS?: string;
  MAX_FEE_GWEI?: string;
  PRIORITY_FEE_WEI?: string;
  IP_DAILY_LIMIT?: string;
  GLOBAL_DAILY_LIMIT?: string;
  [secret: `SPONSOR_PRIVATE_KEY_${string}`]: string | undefined;
};

/** Env jednog relayera iz env Workera; null kad mreža nije uključena. */
export function relayerEnv(w: RelayerWorkerEnv, chainId: string): Env | null {
  let chains: Record<string, { contract?: string; rpc?: string }>;
  try {
    chains = JSON.parse(w.RELAYER_CHAINS ?? "{}");
  } catch {
    return null;
  }
  const c = chains[chainId];
  const key = w[`SPONSOR_PRIVATE_KEY_${chainId}`];
  if (!c?.contract || !key || !w.RELAY_KV) return null;
  return {
    RELAY_KV: w.RELAY_KV,
    SPONSOR_PRIVATE_KEY: key,
    CHAIN_ID: chainId,
    GNOSIS_RPC_URL: c.rpc,
    CONTRACT_ADDRESS: c.contract,
    MAX_FEE_GWEI: w.MAX_FEE_GWEI,
    PRIORITY_FEE_WEI: w.PRIORITY_FEE_WEI,
    IP_DAILY_LIMIT: w.IP_DAILY_LIMIT,
    GLOBAL_DAILY_LIMIT: w.GLOBAL_DAILY_LIMIT,
  };
}

function cors(w: RelayerWorkerEnv, req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (w.RELAYER_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : {};
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

async function status(env: Env) {
  const pc = publicClient(env);
  const address = contractAddress(env);
  const r = (functionName: string) => pc.readContract({ address, abi: V1_ABI, functionName: functionName as never });
  const [version, voters, registered, closesAt] = await Promise.all(["VERSION", "voters", "registered", "closesAt"].map(r));
  const sponsor = walletFor(env, env.SPONSOR_PRIVATE_KEY).account.address;
  return {
    contract: address,
    chainId: chainOf(env).id,
    version,
    voters,
    registered,
    closesAt,
    sponsor: { address: sponsor, xdai: formatEther(await pc.getBalance({ address: sponsor })) },
  };
}

/** `path` je dio iza /relayer/, npr. "10200/cast". */
export async function relayerRoute(req: Request, w: RelayerWorkerEnv, path: string): Promise<Response> {
  const h = cors(w, req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  const m = path.match(/^(\d{1,10})\/(register|cast|share|status)$/);
  if (!m) return json({ ok: false, error: "nema te rute" }, 404, h);
  const env = relayerEnv(w, m[1]);
  if (!env) return json({ ok: false, error: "relayer za ovu mrežu nije uključen — paket možeš poslati i sam" }, 503, h);
  try {
    if (m[2] === "status") {
      if (req.method !== "GET") return json({ ok: false, error: "samo GET" }, 405, h);
      return json(await status(env), 200, h);
    }
    if (req.method !== "POST") return json({ ok: false, error: "samo POST" }, 405, h);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "neispravan JSON" }, 400, h);
    }
    const r = await relay(env, parseCall(m[2], body), req.headers.get("CF-Connecting-IP") ?? "unknown");
    return json(r.body, r.status, h);
  } catch (e) {
    if (e instanceof BadRequest) return json({ ok: false, error: e.message }, 400, h);
    return json({ ok: false, error: (e as Error).message }, 500, h);
  }
}
