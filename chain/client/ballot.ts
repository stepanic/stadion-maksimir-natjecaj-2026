// Sve što glasačev preglednik računa za MaksimirGlasanjeV1 — bez poslužitelja.
// Iste formule kao u ugovoru (chain/contracts/v1/MaksimirGlasanjeV1.sol); testovi u
// chain/test/v1.test.ts provjeravaju da se slažu bit po bit.
import { Group, Identity, generateProof, type SemaphoreProof } from "@semaphore-protocol/core";
import { encodeAbiParameters, keccak256, stringToHex, toBytes, type Address, type Hex } from "viem";
import { ENTRY_CODES } from "./entries";

/** 88 šifri radova, sortirane bytewise. Indeks = položaj bajta u listiću. */
export const ENTRIES: readonly string[] = ENTRY_CODES;
export const POINTS_PER_BALLOT = 100;

const field = (s: string) => BigInt(stringToHex(s, { size: 32 }));
export const BALLOT_SCOPE = field("maksimir-2026-listic");
export const SHARE_MESSAGE = field("glasao-sam");
export const SHARE_SCOPE = field("maksimir-2026");

/** keccak256(utf8(šifre spojene zarezom)) — mora biti jednak `entriesHash()` ugovora. */
export const entriesHash = (): Hex => keccak256(toBytes(ENTRIES.join(",")));

export class BallotError extends Error {}

/** {ŠIFRA: bodovi} → 88 bajtova; prazan objekt → "0x" (povlačenje listića). */
export function encodePoints(items: Record<string, number>): Hex {
  const codes = Object.keys(items).filter((c) => items[c] !== 0);
  if (codes.length === 0) return "0x";
  const out = new Uint8Array(ENTRIES.length);
  let sum = 0;
  for (const c of codes) {
    const i = ENTRIES.indexOf(c);
    const p = items[c];
    if (i < 0) throw new BallotError(`nepoznata šifra ${c}`);
    if (!Number.isInteger(p) || p < 0 || p > POINTS_PER_BALLOT) throw new BallotError(`neispravni bodovi za ${c}`);
    out[i] = p;
    sum += p;
  }
  if (sum !== POINTS_PER_BALLOT) throw new BallotError(`zbroj mora biti ${POINTS_PER_BALLOT}, a ne ${sum}`);
  return `0x${[...out].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function decodePoints(points: Hex): Record<string, number> {
  const bytes = toBytes(points);
  const out: Record<string, number> = {};
  bytes.forEach((p, i) => p && (out[ENTRIES[i]] = p));
  return out;
}

type Where = { chainId: number | bigint; contract: Address };

/** = ugovor `ballotMessage(revision, points)`. */
export function ballotMessage(w: Where & { revision: number; points: Hex }): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "uint32" }, { type: "bytes32" }],
        [keccak256(toBytes("maksimir-listic")), BigInt(w.chainId), w.contract, w.revision, keccak256(w.points)]
      )
    )
  );
}

/** = ugovor `migrateMessage()`. */
export function migrateMessage(w: Where & { successor: Address }): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "address" }],
        [keccak256(toBytes("maksimir-migrate")), BigInt(w.chainId), w.contract, w.successor]
      )
    )
  );
}

export type SolidityProof = {
  merkleTreeDepth: bigint;
  merkleTreeRoot: bigint;
  nullifier: bigint;
  message: bigint;
  scope: bigint;
  points: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

export function toSolidityProof(p: SemaphoreProof): SolidityProof {
  return {
    merkleTreeDepth: BigInt(p.merkleTreeDepth),
    merkleTreeRoot: BigInt(p.merkleTreeRoot),
    nullifier: BigInt(p.nullifier),
    message: BigInt(p.message),
    scope: BigInt(p.scope),
    points: p.points.map(BigInt) as unknown as SolidityProof["points"],
  };
}

/** Nullifier listića za ovaj ključ — isti u svim verzijama ugovora (isti scope). */
export async function ballotNullifier(identity: Identity, group: Group): Promise<bigint> {
  // Nullifier ne ovisi o poruci ni stablu, ali Semaphore ga daje samo uz dokaz; zato
  // ga čitamo iz dokaza za prazan listić (jeftino u usporedbi s upisom).
  const p = await generateProof(identity, group, 0n, BALLOT_SCOPE);
  return BigInt(p.nullifier);
}

/** Dokaz za listić. Radi SAMO u pregledniku glasača: `identity` sadrži tajni ključ. */
export async function proveBallot(
  identity: Identity,
  group: Group,
  w: Where & { revision: number; points: Hex }
): Promise<SolidityProof> {
  return toSolidityProof(await generateProof(identity, group, ballotMessage(w), BALLOT_SCOPE));
}

export async function proveShare(identity: Identity, group: Group): Promise<SolidityProof> {
  return toSolidityProof(await generateProof(identity, group, SHARE_MESSAGE, SHARE_SCOPE));
}

/**
 * Poruka dokaza vlasništva nullifiera za javnu objavu listića s imenom (domovina-api
 * maksimir_set_public_chain). Veže lanac, ugovor i pseudonim glasača, pa se tuđi dokaz ne
 * može prepisati na drugu karticu. Scope je BALLOT_SCOPE (isti nullifier kao listić), ali
 * poruka nije ballotMessage ni migrateMessage, pa dokaz ne vrijedi kao listić ni selidba.
 */
export function publicMessage(w: Where & { pseudonym: Hex }): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }],
        [keccak256(toBytes("maksimir-javno")), BigInt(w.chainId), w.contract, w.pseudonym]
      )
    )
  );
}

export async function proveOwnership(identity: Identity, group: Group, w: Where & { pseudonym: Hex }): Promise<SolidityProof> {
  return toSolidityProof(await generateProof(identity, group, publicMessage(w), BALLOT_SCOPE));
}

export async function proveMigrate(
  identity: Identity,
  group: Group,
  w: Where & { successor: Address }
): Promise<SolidityProof> {
  return toSolidityProof(await generateProof(identity, group, migrateMessage(w), BALLOT_SCOPE));
}

/** EIP-712 poruka koju potpisuje registrar (poslužitelj, nakon eOsobne). */
export function registerTypedData(w: Where & { commitment: bigint; deadline: bigint }) {
  return {
    domain: { name: "MaksimirGlasanje", version: "1", chainId: Number(w.chainId), verifyingContract: w.contract },
    types: { Register: [{ name: "commitment", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    primaryType: "Register" as const,
    message: { commitment: w.commitment, deadline: w.deadline },
  };
}

/** JSON za relayer (bigint → decimalni string). */
export const toJson = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
