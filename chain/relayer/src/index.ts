// maksimir-relayer — plaća gas za već potpisane pakete glasača na Gnosis Chainu.
//
//   POST /register  { commitment, deadline, signature }   registrarov EIP-712 potpis
//   POST /cast      { revision, points, proof }           glasačev ZK dokaz za listić
//   POST /share     { proof }                             glasačev ZK dokaz „glasao sam”
//   GET  /status    adresa ugovora, broj glasača, saldo sponzora
//
// Relayer nema nikakvu ulogu u ugovoru (v. docs/blockchain/06-kontrola-glasaca.md).
import { formatEther } from "viem";
import { V1_ABI } from "./abi.ts";
import { chainOf, contractAddress, publicClient, walletFor } from "./chain.ts";
import { BadRequest, parseCall, relay } from "./relay.ts";
import type { Env } from "./types.ts";

function cors(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
  return allowed.includes(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : {};
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(env, req);
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    try {
      if (req.method === "GET" && pathname === "/status") return json(await status(env), 200, h);
      const kind = pathname.slice(1);
      if (req.method === "POST" && ["register", "cast", "share"].includes(kind)) {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return json({ ok: false, error: "neispravan JSON" }, 400, h);
        }
        const r = await relay(env, parseCall(kind, body), req.headers.get("CF-Connecting-IP") ?? "unknown");
        return json(r.body, r.status, h);
      }
      return json({ ok: false, error: "nema te rute" }, 404, h);
    } catch (e) {
      if (e instanceof BadRequest) return json({ ok: false, error: e.message }, 400, h);
      return json({ ok: false, error: (e as Error).message }, 500, h);
    }
  },
} satisfies ExportedHandler<Env>;
