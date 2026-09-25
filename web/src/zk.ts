// Anonimni dokaz „potvrđeni glasač sam” — Semaphore v4 (Groth16, BN254) u pregledniku.
//
// Učitava se tek kad zatreba (dynamic import), jer snarkjs + ethers teže ~1 MB.
//
// Tok (sve offchain, v. docs/glasanje-kako-radi.md):
//   1. Preglednik izradi Semaphore identitet. Tajni ključ ostaje u pregledniku
//      (localStorage + izvoz), a u bazu ide samo commitment = Poseidon(javni ključ).
//   2. Svi commitmenti potvrđenih glasača tvore grupu. Javni zapisnik grupe je
//      lanac hasheva (add/remove), a grupa u točki seq je redoslijed dodavanja
//      bez uklonjenih.
//   3. Dokaz: „znam tajni ključ jednog lista stabla s korijenom R” + nullifier
//      (jedna osoba = jedan dokaz). Ne otkriva koji je to list.
//   4. Provjera kod svakog posjetitelja: SNARK + R ponovno izračunat iz zapisnika.

import { Group, Identity, generateProof, verifyProof, type SemaphoreProof } from "@semaphore-protocol/core";
import { sb, sbAnon, VoteError, type ZkProof } from "./glasanje";
import { plural } from "./shareView";

// Isto kao u migraciji domovina-api 20260925160000_maksimir_share_zk.sql.
export const ZK_MESSAGE = "glasao-sam";
export const ZK_SCOPE = "maksimir-2026";
// Semaphore kratki string kodira kao bytes32 (UTF-8, dopunjen nulama) → bigint.
export const ZK_MESSAGE_FIELD = "46779715467123036996841617194389431189336537137425384514209209627004761014272";
export const ZK_SCOPE_FIELD = "49474226259215312994888701590181247581981161421217961257574660746611720716288";
const KEY = "maksimir-zk-identity";
const GENESIS = "0".repeat(64);

export type ZkLogRow = { seq: number; op: "add" | "remove"; commitment: string; prev_hash: string; hash: string };
export type ZkGroup = { head: { seq: number; hash: string; members: number }; log: ZkLogRow[] };

// ── identitet ───────────────────────────────────────────────────────────────

let memoryKey: string | null = null; // privatni prozor bez localStorage

function readKey(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

function writeKey(k: string) {
  memoryKey = k;
  try {
    localStorage.setItem(KEY, k);
  } catch {
    /* ostaje samo u memoriji stranice */
  }
}

export function loadIdentity(): Identity | null {
  const k = readKey();
  if (!k) return null;
  try {
    return Identity.import(k);
  } catch {
    return null;
  }
}

export function newIdentity(): Identity {
  const id = new Identity();
  writeKey(id.export());
  return id;
}

export function importIdentity(exported: string): Identity {
  let id: Identity;
  try {
    id = Identity.import(exported.trim());
  } catch {
    throw new VoteError("To nije ispravan ZK ključ.");
  }
  writeKey(id.export());
  return id;
}

export const exportIdentity = () => readKey();

// ── grupa ───────────────────────────────────────────────────────────────────

export async function fetchZkGroup(): Promise<ZkGroup> {
  const { data, error } = await sbAnon.rpc("maksimir_zk_group");
  if (error) throw new VoteError(`Popis ZK grupe nije dostupan: ${error.message}`);
  return data as ZkGroup;
}

/** Članovi grupe nakon zapisa `upto`: redoslijed dodavanja, bez uklonjenih. */
export function membersAt(log: ZkLogRow[], upto: number): string[] {
  const out: string[] = [];
  for (const r of log) {
    if (r.seq > upto) break;
    if (r.op === "add") out.push(r.commitment);
    else {
      const i = out.indexOf(r.commitment);
      if (i >= 0) out.splice(i, 1);
    }
  }
  return out;
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ponovno izračunaj lanac hasheva zapisnika grupe. Vraća opis prve greške ili null. */
export async function checkZkLog(g: ZkGroup): Promise<string | null> {
  let prev = GENESIS;
  for (const [i, r] of g.log.entries()) {
    if (r.seq !== i + 1) return `rupa u zapisniku na #${r.seq}`;
    if (r.prev_hash !== prev) return `prev_hash ne odgovara na #${r.seq}`;
    if ((await sha256hex(`${r.prev_hash}|${r.seq}|${r.op}|${r.commitment}`)) !== r.hash) return `hash ne odgovara na #${r.seq}`;
    prev = r.hash;
  }
  if (g.head.hash !== prev) return "vrh zapisnika ne odgovara";
  return null;
}

// ── izrada dokaza ───────────────────────────────────────────────────────────

export async function registerIdentity(id: Identity): Promise<void> {
  const { error } = await sb.rpc("maksimir_zk_register", { p_commitment: id.commitment.toString() });
  if (error) {
    throw new VoteError(
      error.message === "commitment_taken"
        ? "Ovaj ključ je već iskorišten. Izradi novi."
        : error.message === "no_ballot"
          ? "Najprije predaj listić."
          : `Upis u ZK grupu nije uspio: ${error.message}`
    );
  }
}

/**
 * Izradi dokaz nad trenutnom grupom i spremi ga BEZ prijave (anonimni klijent),
 * da objava ne bude vezana uz sesiju glasača. Vraća id objave.
 */
export async function createZkShare(id: Identity, step: (s: string) => void): Promise<string> {
  step("Učitavam javni popis ZK grupe…");
  const g = await fetchZkGroup();
  const members = membersAt(g.log, g.head.seq);
  if (!members.includes(id.commitment.toString())) throw new VoteError("Tvoj ključ još nije u grupi.");
  const group = new Group(members.map(BigInt));

  step(`Računam ZK dokaz nad grupom od ${members.length} ${plural(members.length, "člana", "člana", "članova")} (prvi put se preuzima oko 2 MB)…`);
  const proof = await generateProof(id, group, ZK_MESSAGE, ZK_SCOPE);

  step("Provjeravam dokaz prije objave…");
  if (!(await verifyProof(proof))) throw new VoteError("Izrađeni dokaz nije prošao provjeru.");

  step("Spremam anonimni dokaz…");
  const { data, error } = await sbAnon.rpc("maksimir_zk_share", { p_proof: proof, p_zk_seq: g.head.seq });
  if (error) throw new VoteError(`Spremanje dokaza nije uspjelo: ${error.message}`);
  return (data as { id: string }).id;
}

// ── provjera tuđeg dokaza ───────────────────────────────────────────────────

export type ZkCheck = {
  snark: boolean; // Groth16 dokaz je kriptografski valjan
  message: boolean; // poruka i scope su baš ovog glasanja
  root: boolean; // korijen = stablo iz javnog zapisnika do zk_seq
  log: string | null; // greška u lancu zapisnika grupe (null = ispravan)
  members: number; // veličina anonimnog skupa
};

export async function checkZkShare(p: ZkProof, zkSeq: number): Promise<ZkCheck> {
  const proof = p as unknown as SemaphoreProof; // isti oblik; points je uvijek 8 (provjerava i baza)
  const g = await fetchZkGroup();
  const [snark, log] = await Promise.all([verifyProof(proof).catch(() => false), checkZkLog(g)]);
  const members = membersAt(g.log, zkSeq);
  const root = members.length > 0 && new Group(members.map(BigInt)).root.toString() === String(proof.merkleTreeRoot);
  const message = String(proof.message) === ZK_MESSAGE_FIELD && String(proof.scope) === ZK_SCOPE_FIELD;
  return { snark, message, root, log, members: members.length };
}
