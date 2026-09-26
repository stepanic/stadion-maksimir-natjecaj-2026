// Glasanje na lancu (MaksimirGlasanjeV1) u pregledniku — logika bez DOM-a.
//
// Učitava se dinamički (import("./chainVote")) tek kad je glasanje na lancu uključeno, jer
// viem + snarkjs + bip39 teže oko 1 MB. Kriptografija je u chain/client/ (100 % testova).
//
// Tok (docs/blockchain/08-integracija-s-fazom-1.md):
//   ključ (24 riječi / passkey / ključ iz faze 1) → registrar (domovina-api) → relayer /register
//   → grupa s lanca → ZK dokaz listića → relayer /cast → potvrda u bloku → ballotOf
// Tajna postoji samo u memoriji ove stranice; u localStorage idu samo javni podaci
// (commitment, nullifier, credentialId) i šifrirani omot.
import { Identity, type Group } from "@semaphore-protocol/core";
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import { ballotNullifier, encodePoints, proveBallot, proveOwnership, proveShare, toJson, type SolidityProof } from "../../chain/client/ballot";
import { fetchGroup, groupRoots } from "../../chain/client/group";
import {
  KeystoreError,
  checkConfirmation,
  confirmationPositions,
  credentialIdHash,
  keyFingerprint,
  localBlobStore,
  multiBlobStore,
  newSecret,
  phase1ExportToSecret,
  prfSupported,
  protectWithPasskey,
  revealWords,
  secretToIdentity,
  secretToWords,
  unlockWithPasskey,
  wordsToSecret,
  zeroize,
  type BlobStore,
  type WrappedSecret,
} from "../../chain/client/keystore";
import { checkOwnership, readBallot, readShareTx, readTally, sumTallies, type ChainBallot, type OwnershipCheck, type ProofJson, type Tally } from "../../chain/client/read";
import {
  VoteError,
  chainShareLink,
  keystoreGet,
  keystorePut,
  requestRegistration,
  setPublicChain,
  type ChainCfg,
  type Items,
  type MyBallot,
  type PublicMode,
  type Registration,
  type Results,
} from "./glasanje";

export { checkConfirmation, confirmationPositions, keyFingerprint, prfSupported, secretToWords, zeroize };
export type { ChainBallot, OwnershipCheck, ProofJson, Tally };

// ── mreža ───────────────────────────────────────────────────────────────────

export const isTestChain = (c: ChainCfg) => !c.counts;
export const txUrl = (c: ChainCfg, tx: string) => (c.explorerUrl ? `${c.explorerUrl.replace(/\/$/, "")}/tx/${tx}` : null);
export const addressUrl = (c: ChainCfg, a: string) => (c.explorerUrl ? `${c.explorerUrl.replace(/\/$/, "")}/address/${a}` : null);

const clients = new Map<string, PublicClient>();
export function client(c: ChainCfg): PublicClient {
  let pc = clients.get(c.rpcUrl);
  if (!pc) {
    pc = createPublicClient({ transport: http(c.rpcUrl, { batch: true }) }) as PublicClient;
    clients.set(c.rpcUrl, pc);
  }
  return pc;
}

// ── lokalni javni podaci (nisu tajne) ───────────────────────────────────────────

const LS = {
  cred: "maksimir-chain-credential", // credentialId passkeyja koji čuva ključ
  commitment: "maksimir-chain-commitment", // javni commitment ključa na ovom uređaju
  wordsOnly: "maksimir-chain-words-only", // glasač je izabrao samo riječi (bez passkeyja)
  nullifier: (c: ChainCfg, commitment: string) => `maksimir-chain-nullifier:${c.chainId}:${c.contract.toLowerCase()}:${commitment}`,
  lastTx: (c: ChainCfg) => `maksimir-chain-last-tx:${c.chainId}:${c.contract.toLowerCase()}`,
  share: (c: ChainCfg, commitment: string) => `maksimir-chain-share:${c.chainId}:${c.contract.toLowerCase()}:${commitment}`,
};

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* privatni prozor: samo ova stranica */
  }
}

export const localCommitment = () => lsGet(LS.commitment);
export const localCredential = () => lsGet(LS.cred) ?? undefined;
export const localNullifier = (c: ChainCfg, commitment: string) => lsGet(LS.nullifier(c, commitment));
export const lastTx = (c: ChainCfg) => lsGet(LS.lastTx(c));
export const localShare = (c: ChainCfg, commitment: string) => lsGet(LS.share(c, commitment));
export const wordsOnly = () => lsGet(LS.wordsOnly) === "1";

// ── ključ glasača ───────────────────────────────────────────────────────────────

/** rpId passkeyja: domovina.ai na produkciji (ADR 0001), inače host (lokalni razvoj). */
export const rpId = () => (location.hostname === "domovina.ai" || location.hostname.endsWith(".domovina.ai") ? "domovina.ai" : location.hostname);

/** Omot ključa: lokalno + domovina-api (novi uređaj s istim passkeyjem nađe svoj omot). */
export const blobStore = (): BlobStore =>
  multiBlobStore(localBlobStore(), {
    get: async (h) => (await keystoreGet(h)) as WrappedSecret | null,
    put: (h, b) => keystorePut(h, b),
  });

export type Key = { secret: Uint8Array; identity: Identity; commitment: string; fingerprint: string };

export function keyFromSecret(secret: Uint8Array): Key {
  const identity = secretToIdentity(secret);
  return { secret, identity, commitment: identity.commitment.toString(), fingerprint: keyFingerprint(secret) };
}

export const newKey = () => keyFromSecret(newSecret());

export function keyFromWords(words: string): Key {
  try {
    return keyFromSecret(wordsToSecret(words));
  } catch (e) {
    throw new VoteError(e instanceof KeystoreError ? `Riječi nisu ispravne: ${e.message}` : "Riječi nisu ispravne.");
  }
}

/** ZK ključ iz faze 1 (localStorage `maksimir-zk-identity`) — ista tajna, isti commitment. */
export function phase1Key(): Key | null {
  const raw = lsGet("maksimir-zk-identity");
  if (!raw) return null;
  try {
    return keyFromSecret(phase1ExportToSecret(raw));
  } catch {
    return null;
  }
}

/** Zapamti javni dio ključa na ovom uređaju (commitment), ne tajnu. */
export function rememberKey(k: Key, opts: { wordsOnly?: boolean } = {}) {
  lsSet(LS.commitment, k.commitment);
  if (opts.wordsOnly !== undefined) lsSet(LS.wordsOnly, opts.wordsOnly ? "1" : null);
}

export function forgetKey() {
  lsSet(LS.commitment, null);
  lsSet(LS.cred, null);
  lsSet(LS.wordsOnly, null);
}

export async function protectKey(k: Key): Promise<string> {
  const credentialId = await protectWithPasskey(k.secret, blobStore(), { rpId: rpId(), labelPrefix: "Maksimir glasanje" });
  lsSet(LS.cred, credentialId);
  rememberKey(k, { wordsOnly: false });
  return credentialId;
}

export async function unlockKey(): Promise<Key> {
  const { secret, credentialId } = await unlockWithPasskey(blobStore(), { rpId: rpId(), credentialId: localCredential() });
  lsSet(LS.cred, credentialId);
  const k = keyFromSecret(secret);
  rememberKey(k);
  return k;
}

export async function showWords(): Promise<string[]> {
  return (await revealWords(blobStore(), { rpId: rpId(), credentialId: localCredential() })).words;
}

export const credentialHash = credentialIdHash;

// ── relayer ────────────────────────────────────────────────────────────────────

const RELAYER_ERRORS: Record<string, string> = {
  BadRevision: "Listić je u međuvremenu promijenjen s drugog uređaja. Učitaj novo stanje i predaj ponovno.",
  WrongMessage: "Paket ne odgovara listiću. Pokušaj ponovno.",
  VotingClosed: "Glasanje je zatvoreno.",
  SignatureExpired: "Potpis prava glasa je istekao. Pokušaj ponovno.",
  LeafAlreadyExists: "Ovaj ključ je već upisan na lanac.",
  Semaphore__YouAreUsingTheSameNullifierTwice: "Ovu objavu si već napravio/la s ovim ključem.",
  Semaphore__MerkleTreeRootIsExpired: "Grupa se u međuvremenu promijenila. Pokušaj ponovno.",
  InvalidProof: "Dokaz nije prošao provjeru na lancu.",
};

export class RelayerError extends VoteError {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
  }
}

export const relayerBase = (c: ChainCfg) => (c.relayerUrl ?? `${location.origin}/relayer/${c.chainId}`).replace(/\/$/, "");

async function relay(c: ChainCfg, kind: "register" | "cast" | "share", payload: unknown): Promise<Hex> {
  let res: Response;
  try {
    res = await fetch(`${relayerBase(c)}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: toJson(payload) });
  } catch {
    throw new RelayerError("Relayer nije dostupan. Paket možeš preuzeti i poslati sam.", "network", 0);
  }
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; txHash?: Hex; error?: string };
  if (!res.ok || !body.txHash) {
    const code = body.error ?? String(res.status);
    throw new RelayerError(RELAYER_ERRORS[code] ?? `Relayer: ${code}`, code, res.status);
  }
  return body.txHash;
}

async function confirm(c: ChainCfg, hash: Hex): Promise<void> {
  const r = await client(c).waitForTransactionReceipt({ hash, timeout: 120_000, pollingInterval: 1_500 });
  if (r.status !== "success") throw new VoteError("Transakcija nije prošla na lancu.");
}

// ── pravo glasa ──────────────────────────────────────────────────────────────────

export const registrationFor = (my: MyBallot | null, c: ChainCfg) =>
  my?.chain_registrations?.find((r) => r.chainId === c.chainId && r.contract.toLowerCase() === c.contract.toLowerCase()) ?? null;

/** Je li commitment član grupe na lancu (Semaphore hasMember preko grupe iz događaja). */
export async function onChainGroup(c: ChainCfg): Promise<Group> {
  return fetchGroup(client(c), c.semaphore, BigInt(c.groupId), BigInt(c.deployBlock));
}

/**
 * Registrar potpiše, relayer upiše. Idempotentno: već upisan commitment se preskače.
 * Vraća registraciju (s prenesenim listićem faze 1, ako ga je bilo).
 */
export async function ensureRegistered(c: ChainCfg, k: Key, step: (s: string) => void): Promise<Registration | null> {
  step("Provjeravam je li tvoj ključ već upisan na lanac…");
  const g = await onChainGroup(c);
  if (g.indexOf(BigInt(k.commitment)) >= 0) return null; // već upisan (registracija je jednom)
  step("Tražim pravo glasa od registrara (domovina.ai, nakon eOsobne)…");
  const reg = await requestRegistration(c, k.commitment);
  step("Upisujem pravo glasa na lanac (relayer plaća naknadu)…");
  try {
    const tx = await relay(c, "register", { commitment: reg.commitment, deadline: reg.deadline, signature: reg.signature });
    step("Čekam potvrdu upisa u bloku…");
    await confirm(c, tx);
  } catch (e) {
    if (!(e instanceof RelayerError && e.code === "LeafAlreadyExists")) throw e;
  }
  return reg;
}

// ── listić ────────────────────────────────────────────────────────────────────────

export type CastPackage = { chainId: number; contract: string; revision: number; points: Hex; proof: SolidityProof };

export async function nullifierFor(c: ChainCfg, k: Key, group?: Group): Promise<bigint> {
  const cached = localNullifier(c, k.commitment);
  if (cached) return BigInt(cached);
  const n = await ballotNullifier(k.identity, group ?? (await onChainGroup(c)));
  lsSet(LS.nullifier(c, k.commitment), n.toString());
  return n;
}

export async function myChainBallot(c: ChainCfg, nullifier: string | bigint): Promise<ChainBallot> {
  return readBallot(client(c), c.contract, BigInt(nullifier));
}

/** Izradi paket (listić + ZK dokaz). Bez slanja: isti paket ide relayeru ili u datoteku. */
export async function buildCast(c: ChainCfg, k: Key, items: Items, step: (s: string) => void): Promise<CastPackage> {
  const points = encodePoints(items);
  step("Čitam grupu glasača s lanca…");
  const group = await onChainGroup(c);
  if (group.indexOf(BigInt(k.commitment)) < 0) throw new VoteError("Tvoj ključ još nije upisan na lanac.");
  const nullifier = await nullifierFor(c, k, group);
  const current = await myChainBallot(c, nullifier);
  if (current.migrated) throw new VoteError("Ovaj listić je preseljen u noviju verziju ugovora.");
  step("Tvoj preglednik računa ZK dokaz (nekoliko sekundi; prvi put preuzima ~2 MB)…");
  const revision = current.revision + 1;
  const proof = await proveBallot(k.identity, group, { chainId: c.chainId, contract: c.contract, revision, points });
  return { chainId: c.chainId, contract: c.contract, revision, points, proof };
}

export async function sendCast(c: ChainCfg, pkg: CastPackage, step: (s: string) => void): Promise<Hex> {
  step("Šaljem zapečaćen paket relayeru…");
  const tx = await relay(c, "cast", { revision: pkg.revision, points: pkg.points, proof: pkg.proof });
  lsSet(LS.lastTx(c), tx);
  step("Čekam potvrdu u bloku (nekoliko sekundi)…");
  await confirm(c, tx);
  return tx;
}

/** Paket za slanje bez našeg relayera (bilo koji novčanik ili skripta: cast(revision, points, proof)). */
export function packageJson(pkg: CastPackage): string {
  return JSON.stringify(
    {
      vrsta: "Paket listića — MaksimirGlasanjeV1",
      upute: "Pošalji iz bilo kojeg novčanika: cast(revision, points, proof) na adresu ugovora. Paket je zapečaćen ZK dokazom; nitko ga ne može promijeniti.",
      ...JSON.parse(toJson(pkg)),
    },
    null,
    2
  );
}

// ── rezultati ─────────────────────────────────────────────────────────────────────

/** Rezultati = lanac + ostatak faze 1, u obliku koji stranica već crta. */
export async function chainResults(c: ChainCfg, phase1: Results | null): Promise<Results & { chainVoters: number; phase1Voters: number }> {
  const chain = await readTally(client(c), c.contract);
  const p1: Tally = { voters: phase1?.voters ?? 0, results: {} };
  for (const r of phase1?.results ?? []) p1.results[r.code] = { points: r.points, backers: r.backers };
  // Testna mreža se ne zbraja s fazom 1 (listići na njoj se ne broje).
  const total = c.counts ? sumTallies(chain, p1) : chain;
  const rows = Object.entries(total.results)
    .map(([code, r]) => ({ code, points: r.points, backers: r.backers, share: total.voters ? Math.round((r.points / total.voters) * 100) / 100 : 0 }))
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code));
  return {
    open: phase1?.chain_open ?? true,
    opens_at: phase1?.opens_at ?? null,
    closes_at: phase1?.closes_at ?? null,
    chain_from: phase1?.chain_from ?? null,
    voters: total.voters,
    results: rows,
    chainVoters: chain.voters,
    phase1Voters: c.counts ? p1.voters : 0,
  };
}

// ── objave ────────────────────────────────────────────────────────────────────────

/** Javna objava listića s lanca: dokaz vlasništva nullifiera vezan uz pseudonim. */
export async function publishChainBallot(c: ChainCfg, k: Key, pseudonym: string, mode: PublicMode, step: (s: string) => void): Promise<MyBallot> {
  step("Čitam grupu glasača s lanca…");
  const group = await onChainGroup(c);
  const nullifier = await nullifierFor(c, k, group);
  step("Računam dokaz da je listić tvoj (ne otkriva ključ)…");
  const proof = await proveOwnership(k.identity, group, { chainId: c.chainId, contract: c.contract, pseudonym: `0x${pseudonym}` as Hex });
  // baza (kao i u fazi 1) traži merkleTreeDepth kao broj, a ostalo kao decimalne stringove
  const json = { ...JSON.parse(toJson(proof)), merkleTreeDepth: Number(proof.merkleTreeDepth) };
  return setPublicChain(mode, c, nullifier.toString(), json);
}

/** Anonimna objava „glasao sam” na lancu → kratka poveznica. */
export async function shareAnonymously(c: ChainCfg, k: Key, step: (s: string) => void): Promise<string> {
  step("Čitam grupu glasača s lanca…");
  const group = await onChainGroup(c);
  step("Računam anonimni ZK dokaz…");
  const proof = await proveShare(k.identity, group);
  step("Relayer upisuje objavu na lanac…");
  let tx: Hex;
  try {
    tx = await relay(c, "share", { proof });
    await confirm(c, tx);
  } catch (e) {
    const known = localShare(c, k.commitment);
    if (e instanceof RelayerError && e.code === "Semaphore__YouAreUsingTheSameNullifierTwice" && known) return known;
    throw e;
  }
  const id = await chainShareLink(c, tx);
  lsSet(LS.share(c, k.commitment), id);
  return id;
}

export async function verifyChainShare(c: ChainCfg, txHash: Hex) {
  return readShareTx(client(c), c.contract, txHash);
}

export async function verifyOwnership(c: ChainCfg, card: { pseudonym: string; nullifier: string; proof: ProofJson }): Promise<OwnershipCheck & { ballot: ChainBallot | null }> {
  const roots = await groupRoots(client(c), c.semaphore, BigInt(c.groupId), BigInt(c.deployBlock));
  const check = await checkOwnership(card.proof, { chainId: c.chainId, contract: c.contract, pseudonym: `0x${card.pseudonym}` as Hex, nullifier: card.nullifier }, roots);
  const ballot = await myChainBallot(c, card.nullifier).catch(() => null);
  return { ...check, ballot };
}
