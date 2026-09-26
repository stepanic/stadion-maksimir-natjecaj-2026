// E2E na pravom Chiadu kroz STVARNI kod relayera (web/worker/relayer/relay.ts).
// Uloge su razdvojene točno kao u produkciji:
//   preglednik  — Semaphore ključ, listić, ZK dokaz (ovdje u procesu, ali bez ikakvog
//                 drugog ključa)
//   registrar   — potpisuje samo pravo glasa (CHIADO_REGISTRAR_PRIVATE_KEY)
//   relayer     — samo simulira i plaća gas (CHIADO_DEPLOYER_PRIVATE_KEY kao sponzor)
//
//   npx tsx scripts/e2e-chiado.ts
import { readFileSync } from "node:fs";
import { Identity } from "@semaphore-protocol/core";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gnosisChiado } from "viem/chains";
import { encodePoints, proveBallot, proveShare, registerTypedData, toJson, decodePoints, ENTRIES } from "../client/ballot";
import { fetchGroup } from "../client/group";
import { parseCall, relay } from "../../web/worker/relayer/relay.ts";

const env = Object.fromEntries(
  readFileSync(".env.chiado", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.split("=") as [string, string])
);
const m = JSON.parse(readFileSync("deployments/chiado/v1.json", "utf8"));
const contract = m.address as `0x${string}`;
const EXPLORER = "https://gnosis-chiado.blockscout.com";

const mem = new Map<string, string>();
const relayerEnv = {
  RELAY_KV: { get: async (k: string) => mem.get(k) ?? null, put: async (k: string, v: string) => void mem.set(k, v) },
  CHAIN_ID: "10200",
  GNOSIS_RPC_URL: "https://rpc.chiadochain.net",
  CONTRACT_ADDRESS: contract,
  SPONSOR_PRIVATE_KEY: env.CHIADO_DEPLOYER_PRIVATE_KEY,
} as never;
const pc = createPublicClient({ chain: gnosisChiado, transport: http("https://rpc.chiadochain.net") });

/** Kao preglednik: JSON preko mreže → relayer. */
async function post(kind: string, payload: unknown) {
  const r = await relay(relayerEnv, parseCall(kind, JSON.parse(toJson(payload))), "e2e");
  if (r.status === 200) {
    const rc = await pc.waitForTransactionReceipt({ hash: r.body.txHash as Hex });
    console.log(`  ${kind}: ${rc.status}, ${rc.gasUsed} gasa → ${EXPLORER}/tx/${r.body.txHash}`);
  } else console.log(`  ${kind}: ${r.status} ${r.body.error}`);
  return r;
}

const abi = [
  { type: "function", name: "results", stateMutability: "view", inputs: [], outputs: [{ type: "uint256[88]" }, { type: "uint256[88]" }] },
  { type: "function", name: "voters", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
async function show() {
  const [points, backers] = await pc.readContract({ address: contract, abi, functionName: "results" });
  const t = Object.fromEntries(points.map((p, i) => [ENTRIES[i], `${p} bodova / ${backers[i]}`]).filter((_, i) => points[i] > 0n));
  console.log("  zbroj na lancu:", t, "glasača:", await pc.readContract({ address: contract, abi, functionName: "voters" }));
}

async function main() {
  const chainId = 10200;
  const me = new Identity(); // tajni ključ glasača — postoji samo ovdje
  console.log(`ugovor ${EXPLORER}/address/${contract}`);

  console.log("1. registrar potpiše pravo glasa, relayer pošalje");
  const registrar = privateKeyToAccount(env.CHIADO_REGISTRAR_PRIVATE_KEY as Hex);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const signature = await registrar.signTypedData(registerTypedData({ chainId, contract, commitment: me.commitment, deadline }));
  await post("register", { commitment: me.commitment, deadline, signature });

  console.log("2. preglednik gradi grupu s lanca (bez našeg poslužitelja) i izrađuje dokaz");
  let group = await fetchGroup(pc as never, m.constructorArgs[0], BigInt(m.groupId), BigInt(m.block));
  console.log(`  grupa: ${group.size} član(ova), korijen = korijen na lancu`);
  const p1 = encodePoints({ "6TVJ3MUHR": 50, GY0F1A9OM: 30, W3YS5VJBZ: 20 });
  const proof1 = await proveBallot(me, group, { chainId, contract, revision: 1, points: p1 });
  await post("cast", { revision: 1, points: p1, proof: proof1 });
  await show();

  console.log("3. relayer pokuša promijeniti bodove u istom paketu");
  await post("cast", { revision: 1, points: encodePoints({ "6TVJ3MUHR": 100 }), proof: proof1 });

  console.log("4. glasač mijenja listić (revizija 2)");
  const p2 = encodePoints({ W3YS5VJBZ: 100 });
  await post("cast", { revision: 2, points: p2, proof: await proveBallot(me, group, { chainId, contract, revision: 2, points: p2 }) });
  await show();

  console.log("5. relayer pokuša ponovno poslati stari listić (revizija 1)");
  await post("cast", { revision: 1, points: p1, proof: proof1 });

  console.log("6. anonimna objava „glasao sam” (dvaput)");
  group = await fetchGroup(pc as never, m.constructorArgs[0], BigInt(m.groupId), BigInt(m.block));
  const sp = await proveShare(me, group);
  await post("share", { proof: sp });
  await post("share", { proof: sp });

  console.log("KV (kvotu troše samo uspješne simulacije):", Object.fromEntries(mem));
  const bal = await pc.getBalance({ address: privateKeyToAccount(env.CHIADO_DEPLOYER_PRIVATE_KEY as Hex).address });
  console.log(`saldo sponzora: ${bal} wei`);
  void decodePoints;
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
