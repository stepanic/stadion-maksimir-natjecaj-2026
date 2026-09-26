// Relayer ne potpisuje ništa u ime glasača i ne može promijeniti paket:
//   register — registrarov EIP-712 potpis veže commitment
//   cast     — ZK dokaz veže listić, reviziju, lanac i adresu ugovora
//   share    — ZK dokaz veže poruku "glasao-sam"
// Relayer samo (1) provjeri oblik, (2) simulira poziv (besplatno), (3) plati gas.
// Isti paket može poslati bilo tko drugi, pa relayer ne može ni cenzurirati trajno.
import { BaseError, ContractFunctionRevertedError, isHex } from "viem";
import { V1_ABI } from "./abi.ts";
import { contractAddress, isNonceError, publicClient, walletFor } from "./chain.ts";
import type { Env, KV } from "./types.ts";

type Proof = {
  merkleTreeDepth: bigint;
  merkleTreeRoot: bigint;
  nullifier: bigint;
  message: bigint;
  scope: bigint;
  points: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

export class BadRequest extends Error {}

const UINT256_MAX = (1n << 256n) - 1n;
const num = (v: unknown, what: string): bigint => {
  if ((typeof v !== "string" && typeof v !== "number") || !/^\d{1,78}$/.test(String(v))) throw new BadRequest(`${what}: nije broj`);
  const n = BigInt(v);
  if (n > UINT256_MAX) throw new BadRequest(`${what}: veći od uint256`);
  return n;
};

function parseProof(p: unknown): Proof {
  const q = p as Record<string, unknown>;
  if (!q || !Array.isArray(q.points) || q.points.length !== 8) throw new BadRequest("proof.points mora imati 8 brojeva");
  return {
    merkleTreeDepth: num(q.merkleTreeDepth, "merkleTreeDepth"),
    merkleTreeRoot: num(q.merkleTreeRoot, "merkleTreeRoot"),
    nullifier: num(q.nullifier, "nullifier"),
    message: num(q.message, "message"),
    scope: num(q.scope, "scope"),
    points: q.points.map((x, i) => num(x, `points[${i}]`)) as unknown as Proof["points"],
  };
}

export type Call =
  | { functionName: "register"; args: readonly [bigint, bigint, `0x${string}`] }
  | { functionName: "cast"; args: readonly [number, `0x${string}`, Proof] }
  | { functionName: "share"; args: readonly [Proof] };

/** JSON tijelo → točno jedan poziv ugovora. Ništa se ne dodaje ni ne mijenja. */
export function parseCall(kind: string, body: unknown): Call {
  const b = (body ?? {}) as Record<string, unknown>;
  if (kind === "register") {
    if (typeof b.signature !== "string" || !isHex(b.signature) || b.signature.length !== 132) throw new BadRequest("signature");
    return { functionName: "register", args: [num(b.commitment, "commitment"), num(b.deadline, "deadline"), b.signature] };
  }
  if (kind === "cast") {
    const rev = Number(num(b.revision, "revision"));
    if (rev < 1 || rev > 0xffffffff) throw new BadRequest("revision");
    if (typeof b.points !== "string" || !isHex(b.points) || (b.points !== "0x" && b.points.length !== 2 + 88 * 2)) throw new BadRequest("points: 0x ili 88 bajtova");
    return { functionName: "cast", args: [rev, b.points, parseProof(b.proof)] };
  }
  if (kind === "share") return { functionName: "share", args: [parseProof(b.proof)] };
  throw new BadRequest("nepoznata radnja");
}

const DAY_TTL = 60 * 60 * 36;
const day = () => new Date().toISOString().slice(0, 10);

async function bump(kv: KV, key: string, limit: number): Promise<boolean> {
  const used = Math.max(0, Number((await kv.get(key)) ?? 0));
  if (used >= limit) return false;
  await kv.put(key, String(used + 1), { expirationTtl: DAY_TTL });
  return true;
}

export type RelayResult = { status: number; body: Record<string, unknown> };

/**
 * Napojnica validatoru. estimateFeesPerGas na Gnosisu/Chiadu daje 0, a dio validatora takve
 * transakcije ne uzima: izmjereno 26. 9. 2026. na Chiadu, napojnica 0 → 47 s do > 120 s,
 * 0,01 gwei → sljedeći blok (5 s). Trošak uz ~0,5 M gasa: ~0,000005 xDAI po listiću.
 */
export const DEFAULT_TIP_WEI = "10000000";

export function withTip(est: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }, floor: bigint) {
  const tip = (est.maxPriorityFeePerGas ?? 0n) > floor ? est.maxPriorityFeePerGas! : floor;
  const base = (est.maxFeePerGas ?? 0n) - (est.maxPriorityFeePerGas ?? 0n);
  return { maxPriorityFeePerGas: tip, maxFeePerGas: base + tip };
}

export async function relay(env: Env, call: Call, ip: string): Promise<RelayResult> {
  const address = contractAddress(env);
  const pc = publicClient(env);
  const wallet = walletFor(env, env.SPONSOR_PRIVATE_KEY);
  const req = { address, abi: V1_ABI, ...call } as const;

  // 1. simulacija: neispravan paket ne troši ni gas ni kvotu
  try {
    await pc.simulateContract({ ...req, account: wallet.account } as never);
  } catch (e) {
    const reason =
      e instanceof BaseError
        ? (e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null)?.data?.errorName
        : undefined;
    const conflict = reason === "Semaphore__YouAreUsingTheSameNullifierTwice" || reason === "LeafAlreadyExists" || reason === "BadRevision";
    return { status: conflict ? 409 : 400, body: { ok: false, error: reason ?? "simulacija nije prošla" } };
  }

  // 2. kočnice troška: gornja granica cijene gasa (zagušenje mreže ne smije isprazniti sponzora)
  const maxFee = BigInt(Math.round(Number(env.MAX_FEE_GWEI ?? 5) * 1e9));
  const fees = withTip(await pc.estimateFeesPerGas(), BigInt(env.PRIORITY_FEE_WEI ?? DEFAULT_TIP_WEI));
  if (fees.maxFeePerGas > maxFee) {
    return { status: 503, body: { ok: false, error: "gas je trenutno preskup — pokušaj kasnije ili pošalji paket sam" } };
  }

  // dnevni limiti
  if (!(await bump(env.RELAY_KV, `${env.CHAIN_ID ?? "100"}:global:${day()}`, Number(env.GLOBAL_DAILY_LIMIT ?? 5000)))) {
    return { status: 429, body: { ok: false, error: "dnevni proračun relayera je potrošen — paket možeš poslati i sam" } };
  }
  if (!(await bump(env.RELAY_KV, `${env.CHAIN_ID ?? "100"}:ip:${ip}:${day()}`, Number(env.IP_DAILY_LIMIT ?? 50)))) {
    return { status: 429, body: { ok: false, error: "previše zahtjeva s ove adrese danas" } };
  }

  // 3. slanje (nonce utrka dvaju istodobnih zahtjeva → ponovi)
  for (let attempt = 0; ; attempt++) {
    try {
      const txHash = await wallet.writeContract({ ...req, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } as never);
      return { status: 200, body: { ok: true, txHash } };
    } catch (e) {
      if (attempt < 3 && isNonceError(e)) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      return { status: 502, body: { ok: false, error: `slanje nije uspjelo: ${(e as Error).message.slice(0, 200)}` } };
    }
  }
}
