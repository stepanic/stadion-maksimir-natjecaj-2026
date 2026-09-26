// Čitanje s lanca za web (bez našeg poslužitelja): moj listić, zbroj, anonimna objava i
// provjera dokaza vlasništva nullifiera na javnoj kartici. Sve ide izravno na RPC.
import { verifyProof, type SemaphoreProof } from "@semaphore-protocol/core";
import { parseAbi, parseEventLogs, type Address, type Hex, type PublicClient } from "viem";
import { BALLOT_SCOPE, ENTRIES, decodePoints, publicMessage } from "./ballot";

export const V1_READ_ABI = parseAbi([
  "function ballotOf(uint256 nullifier) view returns (uint32 revision, bool migrated, bytes points)",
  "function results() view returns (uint256[88] points, uint256[88] backers)",
  "function voters() view returns (uint256)",
  "function registered() view returns (uint256)",
  "event AnonymousShare(uint256 indexed nullifier, uint256 indexed merkleTreeRoot, address submitter)",
]);

export type ChainBallot = { revision: number; migrated: boolean; items: Record<string, number> };
export type Tally = { voters: number; results: Record<string, { points: number; backers: number }> };

export async function readBallot(client: PublicClient, contract: Address, nullifier: bigint): Promise<ChainBallot> {
  const [revision, migrated, points] = await client.readContract({ address: contract, abi: V1_READ_ABI, functionName: "ballotOf", args: [nullifier] });
  return { revision, migrated, items: decodePoints(points) };
}

export async function readTally(client: PublicClient, contract: Address): Promise<Tally> {
  const [[points, backers], voters] = await Promise.all([
    client.readContract({ address: contract, abi: V1_READ_ABI, functionName: "results" }),
    client.readContract({ address: contract, abi: V1_READ_ABI, functionName: "voters" }),
  ]);
  const results: Tally["results"] = {};
  ENTRIES.forEach((code, i) => (results[code] = { points: Number(points[i]), backers: Number(backers[i]) }));
  return { voters: Number(voters), results };
}

/** Ukupno = zbroj dijelova (lanac, ostatak faze 1…). Radovi koji nedostaju u nekom dijelu imaju 0. */
export function sumTallies(...parts: Tally[]): Tally {
  const out: Tally = { voters: 0, results: {} };
  for (const code of ENTRIES) out.results[code] = { points: 0, backers: 0 };
  for (const p of parts) {
    out.voters += p.voters;
    for (const [code, r] of Object.entries(p.results)) {
      const t = out.results[code];
      if (!t) continue; // nepoznata šifra se ne broji
      t.points += r.points;
      t.backers += r.backers;
    }
  }
  return out;
}

/** Anonimna objava: događaj AnonymousShare NAŠEG ugovora u toj transakciji, ili null. */
export async function readShareTx(client: PublicClient, contract: Address, txHash: Hex): Promise<{ nullifier: bigint; root: bigint; block: bigint } | null> {
  // Neuspjela transakcija nema događaja, pa je dovoljno tražiti događaj.
  const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) return null;
  const logs = parseEventLogs({ abi: V1_READ_ABI, logs: receipt.logs, eventName: "AnonymousShare" }).filter(
    (l) => l.address.toLowerCase() === contract.toLowerCase()
  );
  if (logs.length === 0) return null;
  return { nullifier: logs[0].args.nullifier, root: logs[0].args.merkleTreeRoot, block: receipt.blockNumber };
}

export type ProofJson = {
  merkleTreeDepth: number | string;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
};
export type OwnershipCheck = { snark: boolean; scope: boolean; message: boolean; root: boolean; ok: boolean };

/**
 * Dokaz vlasništva nullifiera s javne kartice: SNARK valjan, scope listića, poruka veže
 * lanac + ugovor + pseudonim s kartice, korijen je bio korijen grupe na lancu.
 */
export async function checkOwnership(
  proof: ProofJson,
  w: { chainId: number | bigint; contract: Address; pseudonym: Hex; nullifier: string },
  roots: Set<bigint>
): Promise<OwnershipCheck> {
  const scope = BigInt(proof.scope) === BALLOT_SCOPE && proof.nullifier === w.nullifier;
  const message = BigInt(proof.message) === publicMessage(w);
  const root = roots.has(BigInt(proof.merkleTreeRoot));
  const snark = await verifyProof({ ...proof, merkleTreeDepth: Number(proof.merkleTreeDepth) } as unknown as SemaphoreProof).catch(() => false);
  return { snark, scope, message, root, ok: snark && scope && message && root };
}
