// Ključ glasača: 24 riječi za oporavak + passkey (WebAuthn PRF) za svakodnevno otključavanje.
// Odluka i obrazloženje: docs/blockchain/adr/0001-kljuc-glasaca-passkey-i-24-rijeci.md
//
//   tajna (32 bajta) = Semaphore ključ
//     ├─ 24 riječi (BIP-39) — prikazuju se JEDNOM, pri izradi; nikad se ne spremaju
//     └─ omot: AES-256-GCM(HKDF(PRF(passkey, sol)), tajna) — sprema se (lokalno / domovina-api)
//
// Sve se radi u pregledniku (Web Crypto). Tajna nikad ne ide na mrežu; omot bez passkeyja je
// beskoristan. Funkcije koje trebaju WebAuthn primaju `CredentialsContainer` kao parametar,
// pa se tokovi mogu testirati i bez pravog autentifikatora.
import { Identity } from "@semaphore-protocol/core";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

// ── trajne vrijednosti (ADR 0001, odluka 3) — NE MIJENJATI ────────────────────────────

/** Passkey vrijedi za domovina.ai i sve poddomene. */
export const RP_ID = "domovina.ai";
export const KEYSTORE_VERSION = 1;
const PRF_SALT_LABEL = "maksimir-2026/keystore/v1";
const HKDF_SALT_LABEL = "maksimir-2026";
const HKDF_INFO = "maksimir-keystore-v1";
const SECRET_BYTES = 32;

export class KeystoreError extends Error {}

const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

// ── pomoćno ───────────────────────────────────────────────────────────────────────

export const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const fromB64u = (s: string): Uint8Array => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
/** Kopija u svjež ArrayBuffer — Web Crypto i WebAuthn tipovi traže `Uint8Array<ArrayBuffer>`. */
const own = (b: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(b);

const bytes = (b: ArrayBuffer | ArrayBufferView): Uint8Array =>
  b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest("SHA-256", enc.encode(text)));
}

/** Prebriše osjetljive bajtove (najbolje što JS može; GC može imati kopije). */
export function zeroize(b: Uint8Array | null | undefined): void {
  b?.fill(0);
}

// ── tajna, riječi, identitet ───────────────────────────────────────────────────────

export function newSecret(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
}

function assertSecret(s: Uint8Array) {
  if (!(s instanceof Uint8Array) || s.length !== SECRET_BYTES) throw new KeystoreError("tajna mora imati točno 32 bajta");
  // Tajna od istih bajtova (same nule = „abandon ×23 art”) je javno poznata: svatko bi mogao mijenjati
  // taj listić. Nađeno 26. 9. 2026. na Gnosisu (nalaz I-09): testni ključ od nula iz faze 1 upisan kao pravi.
  if (s.every((b) => b === s[0])) throw new KeystoreError("ključ je slab (svi bajtovi isti, npr. same nule) — takav ključ svatko zna; izradi novi ključ");
}

/** 32 bajta → 24 riječi (BIP-39, engleski popis, s kontrolnim zbrojem). */
export function secretToWords(secret: Uint8Array): string[] {
  assertSecret(secret);
  return entropyToMnemonic(secret, wordlist).split(" ");
}

/** Normalizira unos (velika slova, višak razmaka, novi redovi) i vraća tajnu. */
export function wordsToSecret(input: string | string[]): Uint8Array {
  const words = (Array.isArray(input) ? input.join(" ") : input).toLowerCase().trim().split(/\s+/);
  if (words.length !== 24) throw new KeystoreError(`treba točno 24 riječi, a upisano je ${words.length}`);
  const unknown = words.filter((w) => !wordlist.includes(w));
  if (unknown.length) throw new KeystoreError(`nepoznate riječi: ${unknown.join(", ")}`);
  const phrase = words.join(" ");
  if (!validateMnemonic(phrase, wordlist)) throw new KeystoreError("riječi ne prolaze kontrolni zbroj — provjeri redoslijed i pravopis");
  const secret = mnemonicToEntropy(phrase, wordlist);
  assertSecret(secret);
  return secret;
}

/** Tajna → Semaphore identitet (isti oblik kao `Identity.export()` iz faze 1). */
export function secretToIdentity(secret: Uint8Array): Identity {
  assertSecret(secret);
  return Identity.import(toB64(secret));
}

/** Kratki, čitljivi otisak ključa (iz javnog commitmenta): „904493…340948”. Isti na stranici,
 *  na ispisanom listu i u imenu passkeyja, pa se zna koji passkey čuva koji ključ. */
export function keyFingerprint(secret: Uint8Array): string {
  const c = secretToIdentity(secret).commitment.toString();
  return `${c.slice(0, 6)}…${c.slice(-6)}`;
}

/**
 * `user.id` passkeyja izveden iz ključa: sha256("maksimir-passkey-user|" + commitment)[0..16].
 * Isti ključ → isti user.id, pa upravitelj lozinki (iCloud Keychain, Google) novi passkey za
 * isti ključ ZAMIJENI umjesto da ih gomila. Commitment je ionako javan (na lancu), a user.id
 * ostaje u pregledniku.
 */
export async function passkeyUserId(secret: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const c = secretToIdentity(secret).commitment.toString();
  return own((await sha256(`maksimir-passkey-user|${c}`)).slice(0, 16));
}

/** Ime passkeyja kakvo se vidi u Lozinkama i u izborniku: „Maksimir glasanje · ključ 904493…340948”. */
export const passkeyLabel = (secret: Uint8Array, prefix = "Maksimir glasanje"): string => `${prefix} · ključ ${keyFingerprint(secret)}`;

/** Ključ iz faze 1 (`maksimir-zk-kljuc.txt`, base64 od 32 bajta) → tajna. Isti commitment. */
export function phase1ExportToSecret(exported: string): Uint8Array {
  const k = exported.trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(k)) throw new KeystoreError("nije ključ iz faze 1 (base64 od 32 bajta)");
  const secret = Uint8Array.from(atob(k), (c) => c.charCodeAt(0));
  assertSecret(secret);
  return secret;
}

// ── potvrda da su riječi zapisane (ADR 0001, odluka 7) ─────────────────────────────

/** `n` različitih nasumičnih pozicija (0–23), sortirano. */
export function confirmationPositions(n = 3, rand: () => number = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): number[] {
  const out = new Set<number>();
  while (out.size < n) out.add(Math.floor(rand() * 24));
  return [...out].sort((a, b) => a - b);
}

/** Točno upisane riječi na traženim pozicijama (bez obzira na velika slova i razmake). */
export function checkConfirmation(words: string[], positions: number[], answers: string[]): boolean {
  if (answers.length !== positions.length) return false;
  return positions.every((p, i) => words[p] === answers[i].trim().toLowerCase());
}

// ── omot tajne ključem iz passkey PRF-a ────────────────────────────────────────────

export type WrappedSecret = {
  v: 1;
  /** base64url ID passkeyja kojim je omot napravljen (i AAD šifre). */
  credentialId: string;
  iv: string;
  ct: string;
};

/** Sol koja se šalje PRF-u: sha256("maksimir-2026/keystore/v1"). */
export const prfSalt = (): Promise<Uint8Array> => sha256(PRF_SALT_LABEL);

/** PRF izlaz → AES-256-GCM ključ (HKDF-SHA-256), ne može se izvesti iz Web Cryptoa. */
export async function deriveWrapKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  if (prfOutput.length < 32) throw new KeystoreError("PRF izlaz prekratak");
  const raw = own(prfOutput);
  const base = await subtle().importKey("raw", raw, "HKDF", false, ["deriveKey"]).finally(() => zeroize(raw));
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(HKDF_SALT_LABEL), info: enc.encode(HKDF_INFO) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

const aad = (credentialId: string) => enc.encode(`${HKDF_INFO}|${credentialId}`);

export async function wrapSecret(secret: Uint8Array, credentialId: string, prfOutput: Uint8Array): Promise<WrappedSecret> {
  assertSecret(secret);
  const key = await deriveWrapKey(prfOutput);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const pt = own(secret);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: aad(credentialId) }, key, pt).finally(() => zeroize(pt)));
  return { v: KEYSTORE_VERSION, credentialId, iv: b64u(iv), ct: b64u(ct) };
}

export async function unwrapSecret(blob: WrappedSecret, credentialId: string, prfOutput: Uint8Array): Promise<Uint8Array> {
  if (blob?.v !== KEYSTORE_VERSION) throw new KeystoreError("nepoznata verzija omota");
  if (blob.credentialId !== credentialId) throw new KeystoreError("omot pripada drugom passkeyju");
  const key = await deriveWrapKey(prfOutput);
  try {
    const pt = new Uint8Array(
      await subtle().decrypt({ name: "AES-GCM", iv: own(fromB64u(blob.iv)), additionalData: aad(credentialId) }, key, own(fromB64u(blob.ct)))
    );
    assertSecret(pt);
    return pt;
  } catch {
    throw new KeystoreError("omot se ne može otvoriti ovim passkeyjem");
  }
}

/** Ključ pod kojim se omot sprema (lokalno i na poslužitelju): sha256(credentialId), hex. */
export const credentialIdHash = async (credentialId: string): Promise<string> => hex(await sha256(credentialId));

// ── spremište omota ────────────────────────────────────────────────────────────────

export interface BlobStore {
  get(credentialIdHash: string): Promise<WrappedSecret | null>;
  put(credentialIdHash: string, blob: WrappedSecret): Promise<void>;
}

/** `localStorage` (ili bilo koji Storage). Privatni prozor / blokiran storage → samo memorija. */
export function localBlobStore(storage: Pick<Storage, "getItem" | "setItem"> | null = globalThis.localStorage ?? null): BlobStore {
  const mem = new Map<string, string>();
  const key = (h: string) => `maksimir-keystore-v1:${h}`;
  return {
    async get(h) {
      let raw: string | null = mem.get(h) ?? null;
      try {
        raw = storage?.getItem(key(h)) ?? raw;
      } catch {
        /* blokiran storage */
      }
      return raw ? (JSON.parse(raw) as WrappedSecret) : null;
    },
    async put(h, blob) {
      const raw = JSON.stringify(blob);
      mem.set(h, raw);
      try {
        storage?.setItem(key(h), raw);
      } catch {
        /* ostaje u memoriji */
      }
    },
  };
}

/** Čita iz prvog koji ima omot, piše u sve (npr. lokalno + domovina-api). */
export function multiBlobStore(...stores: BlobStore[]): BlobStore {
  return {
    async get(h) {
      for (const s of stores) {
        const b = await s.get(h).catch(() => null);
        if (b) return b;
      }
      return null;
    },
    async put(h, blob) {
      await Promise.all(stores.map((s) => s.put(h, blob)));
    },
  };
}

// ── WebAuthn (passkey + PRF) ───────────────────────────────────────────────────────

type Creds = Pick<CredentialsContainer, "create" | "get">;
const defaultCreds = (): Creds => {
  if (!globalThis.navigator?.credentials) throw new KeystoreError("ovaj preglednik ne podržava passkeyje");
  return globalThis.navigator.credentials;
};

/** true / false kad preglednik to zna reći unaprijed; undefined kad ne zna (probaj pa vidi). */
export async function prfSupported(): Promise<boolean | undefined> {
  const pkc = (globalThis as { PublicKeyCredential?: { getClientCapabilities?: () => Promise<Record<string, boolean>> } }).PublicKeyCredential;
  if (!pkc) return false;
  if (!pkc.getClientCapabilities) return undefined;
  try {
    const caps = await pkc.getClientCapabilities();
    return "extension:prf" in caps ? caps["extension:prf"] : undefined;
  } catch {
    return undefined;
  }
}

type PrfExt = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer | ArrayBufferView } } };
const prfFirst = (cred: PublicKeyCredential): Uint8Array | null => {
  const r = (cred.getClientExtensionResults() as PrfExt).prf?.results?.first;
  return r ? bytes(r) : null;
};

export type PasskeyOpts = { rpId?: string; creds?: Creds };

/** Nova passkey za glasanje. Bez `userId` je `user.id` nasumičan; `protectWithPasskey` ga izvodi iz ključa. */
export async function createPasskey(opts: PasskeyOpts & { label?: string; userId?: Uint8Array } = {}): Promise<{ credentialId: string; prf: Uint8Array | null; prfEnabled: boolean }> {
  const creds = opts.creds ?? defaultCreds();
  const salt = await prfSalt();
  const cred = (await creds.create({
    publicKey: {
      rp: { id: opts.rpId ?? RP_ID, name: "domovina.ai" },
      user: {
        id: opts.userId ? own(opts.userId) : globalThis.crypto.getRandomValues(new Uint8Array(16)),
        name: opts.label ?? "Maksimir glasanje",
        displayName: opts.label ?? "Maksimir glasanje",
      },
      challenge: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new KeystoreError("izrada passkeyja je otkazana");
  const ext = cred.getClientExtensionResults() as PrfExt;
  return { credentialId: b64u(bytes(cred.rawId)), prf: prfFirst(cred), prfEnabled: ext.prf?.enabled === true || !!ext.prf?.results?.first };
}

/** PRF izlaz passkeyja (Face ID / Touch ID). Bez `credentialId` preglednik nudi izbor passkeyja. */
export async function evaluatePrf(opts: PasskeyOpts & { credentialId?: string } = {}): Promise<{ credentialId: string; prf: Uint8Array }> {
  const creds = opts.creds ?? defaultCreds();
  const cred = (await creds.get({
    publicKey: {
      rpId: opts.rpId ?? RP_ID,
      challenge: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      userVerification: "required",
      allowCredentials: opts.credentialId ? [{ type: "public-key", id: own(fromB64u(opts.credentialId)) }] : [],
      extensions: { prf: { eval: { first: await prfSalt() } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new KeystoreError("otključavanje je otkazano");
  const prf = prfFirst(cred);
  if (!prf) throw new KeystoreError("ovaj passkey ili preglednik ne podržava PRF — koristi 24 riječi");
  return { credentialId: b64u(bytes(cred.rawId)), prf };
}

// ── tokovi (ADR 0001, odluka 5) ────────────────────────────────────────────────────

/**
 * Zaštiti tajnu novim passkeyjem: izradi passkey, dobij PRF (neki preglednici ga vrate tek
 * pri prvom `get`), omotaj i spremi. Vraća `credentialId`.
 */
export async function protectWithPasskey(
  secret: Uint8Array,
  store: BlobStore,
  opts: PasskeyOpts & { label?: string; labelPrefix?: string } = {}
): Promise<string> {
  // ime s otiskom ključa + user.id iz ključa: prepoznatljivo u Lozinkama, bez gomilanja
  const created = await createPasskey({
    ...opts,
    label: opts.label ?? passkeyLabel(secret, opts.labelPrefix),
    userId: await passkeyUserId(secret),
  });
  let prf = created.prf;
  if (!prf) prf = (await evaluatePrf({ ...opts, credentialId: created.credentialId })).prf;
  try {
    const blob = await wrapSecret(secret, created.credentialId, prf);
    await store.put(await credentialIdHash(created.credentialId), blob);
    return created.credentialId;
  } finally {
    zeroize(prf);
  }
}

/** Otključaj tajnu passkeyjem. Tajnu nakon upotrebe treba `zeroize`. */
export async function unlockWithPasskey(store: BlobStore, opts: PasskeyOpts & { credentialId?: string } = {}): Promise<{ secret: Uint8Array; credentialId: string }> {
  const { credentialId, prf } = await evaluatePrf(opts);
  try {
    const blob = await store.get(await credentialIdHash(credentialId));
    if (!blob) throw new KeystoreError("za ovaj passkey nema spremljenog ključa — izaberi drugi passkey ili upiši 24 riječi");
    return { secret: await unwrapSecret(blob, credentialId, prf), credentialId };
  } finally {
    zeroize(prf);
  }
}

/**
 * Ponovni prikaz 24 riječi (ADR 0001, odluka 3, izmjena 26. 9. 2026.). Traži svjež passkey
 * (Face ID / Touch ID). Ne daje nikome ništa više nego sam passkey — tko ga ima, ionako može
 * glasati — a vlasniku omogućuje da napravi papirnatu kopiju kad je propustio pri izradi.
 * Pozivatelj riječi prikazuje kratko i briše ih iz stranice čim korisnik zatvori prikaz.
 */
export async function revealWords(store: BlobStore, opts: PasskeyOpts & { credentialId?: string } = {}): Promise<{ words: string[]; credentialId: string }> {
  const { secret, credentialId } = await unlockWithPasskey(store, opts);
  try {
    return { words: secretToWords(secret), credentialId };
  } finally {
    zeroize(secret);
  }
}
