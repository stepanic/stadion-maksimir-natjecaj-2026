// Glasanje javnosti: prijava eOsobnom (Certilia) + listić od 100 bodova.
//
// Backend je isti kao za domovina.ai (self-hosted Supabase, api.domovina.ai):
//   - Certilia proxy (certilia.domovina.ai) drži client secret i radi PKCE;
//     ovdje ponavljamo web tok iz flutter_certilia (popup + polling).
//   - Edge funkcija `certilia` provjeri id_token i vrati jednokratni OTP kojim
//     se otvara Supabase sesija (verifyOTP).
//   - RPC-evi domovina_ai.maksimir_* (migracija domovina-api
//     20260925120000_maksimir_voting.sql) čuvaju „jedna osoba = 100 bodova".

import { createClient, type Session } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CERTILIA = (import.meta.env.VITE_CERTILIA_SERVER_URL as string) || "https://certilia.domovina.ai";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "domovina_ai" },
  auth: { storageKey: "maksimir-auth" },
});

// Anonimni klijent bez sesije: ZK dokaz se sprema bez veze na prijavljenog glasača.
export const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "domovina_ai" },
  auth: { persistSession: false, autoRefreshToken: false, storageKey: "maksimir-anon" },
});

export type Items = Record<string, number>;
export type ResultRow = { code: string; points: number; backers: number; share: number };
export type Results = {
  open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  voters: number;
  results: ResultRow[];
  // od migracije 20260926120000 (spajanje s lancem)
  phase1_open?: boolean;
  chain_open?: boolean;
  chain_from?: string | null;
};
export type ChainRegistration = { chainId: number; contract: string; commitment: string; counts: boolean; transfer_seq: number | null };
export type MyBallot = {
  verified: boolean;
  consented: boolean;
  open: boolean;
  items: Items;
  updated_at: string | null;
  receipt: Receipt | null;
  public_mode: PublicMode | null;
  share_id: string | null;
  zk_commitment: string | null;
  // od migracije 20260926120000
  pseudonym?: string | null;
  chain_consented?: boolean;
  chain_registrations?: ChainRegistration[];
  chain_public?: { chainId: number; contract: string; nullifier: string } | null;
};
export type PublicMode = "full" | "initial" | "anon";
export type PublicCard = {
  mode: PublicMode;
  name: string | null;
  pseudonym: string;
  revisions: number;
  updated_at: string;
  items: { code: string; points: number; lead: string }[];
  receipt: Receipt | null;
  chain?: { chainId: number; contract: string; nullifier: string; proof: ZkProof } | null;
};
export type ZkProof = {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
};
export type Share =
  | { id: string; kind: "public"; created_at: string; card: PublicCard | null }
  | { id: string; kind: "zk"; created_at: string; proof: ZkProof; zk_seq: number }
  | { id: string; kind: "chain"; created_at: string; chainId: number; contract: string; txHash: string };
export type PublicBallots = { count: number; zk_shares: number; ballots: (PublicCard & { id: string })[] };
export type Receipt = {
  seq: number;
  prev_hash: string;
  hash: string;
  pseudonym: string;
  revision: number;
  ts_ms: number;
  items_canon: string;
};
export type Checkpoint = { file: string; at: string; seq: number; hash: string; voters: number; bitcoin: boolean };

// Checkpointi (snapshot + .ots) žive u javnom repou; commita ih GitHub Action.
export const CHECKPOINTS_RAW =
  "https://raw.githubusercontent.com/stepanic/stadion-maksimir-natjecaj-2026/main/glasanje/checkpoints";
export const CHECKPOINTS_TREE =
  "https://github.com/stepanic/stadion-maksimir-natjecaj-2026/tree/main/glasanje/checkpoints";
export const VERIFY_SCRIPT =
  "https://github.com/stepanic/stadion-maksimir-natjecaj-2026/blob/main/scripts/maksimir_verify.py";

export async function fetchCheckpoints(): Promise<Checkpoint[]> {
  try {
    const res = await fetch(`${CHECKPOINTS_RAW}/index.json`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as Checkpoint[]) : [];
  } catch {
    return [];
  }
}

export class VoteError extends Error {}

const MESSAGES: Record<string, string> = {
  not_verified: "Račun nije potvrđen eOsobnom. Prijavi se putem Certilije.",
  terms_not_accepted: "Prije prvog glasa treba prihvatiti uvjete glasanja.",
  voting_closed: "Glasanje je zatvoreno.",
  invalid_ballot: "Bodovi moraju biti cijeli brojevi od 1 do 100.",
  unknown_entry: "Na listiću je nepoznata šifra rada.",
  points_sum_not_100: "Zbroj bodova na listiću mora biti točno 100.",
  no_ballot: "Najprije predaj listić.",
  invalid_mode: "Nepoznat način javnog prikaza.",
  chain_registered: "Tvoj glas je na lancu. Listić mijenjaš ondje, ne u fazi 1.",
  chain_terms_not_accepted: "Prije glasanja na lancu treba prihvatiti nove uvjete.",
  not_registered: "Ovaj ključ još nema pravo glasa na lancu.",
  invalid_proof: "Dokaz nije ispravnog oblika.",
  keystore_exists: "Za ovaj passkey već postoji drugačiji spremljeni ključ.",
};

function rpcError(message: string): VoteError {
  return new VoteError(MESSAGES[message] ?? `Greška poslužitelja: ${message}`);
}

// ── rezultati i listić ──────────────────────────────────────────────────────

let resultsCache: { at: number; data: Results } | null = null;

export async function fetchResults(force = false): Promise<Results> {
  if (!force && resultsCache && Date.now() - resultsCache.at < 30_000) return resultsCache.data;
  const { data, error } = await sb.rpc("maksimir_results");
  if (error) throw rpcError(error.message);
  resultsCache = { at: Date.now(), data: data as Results };
  return resultsCache.data;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function fetchMyBallot(): Promise<MyBallot> {
  const { data, error } = await sb.rpc("maksimir_my_ballot");
  if (error) throw rpcError(error.message);
  return data as MyBallot;
}

export async function acceptTerms(): Promise<void> {
  const { error } = await sb.rpc("maksimir_accept_terms");
  if (error) throw rpcError(error.message);
}

/** Zamijeni cijeli listić. Prazan objekt povlači glas. */
export async function castBallot(items: Items): Promise<MyBallot> {
  const { data, error } = await sb.rpc("maksimir_cast_ballot", { p_items: items });
  if (error) throw rpcError(error.message);
  resultsCache = null;
  return data as MyBallot;
}

/** Javni prikaz listića: 'full' | 'initial' | 'anon', ili null za isključivanje. */
export async function setPublic(mode: PublicMode | null): Promise<MyBallot> {
  const { data, error } = await sb.rpc("maksimir_set_public", { p_mode: mode });
  if (error) throw rpcError(error.message);
  return data as MyBallot;
}

export async function fetchShare(id: string): Promise<Share | null> {
  const { data, error } = await sbAnon.rpc("maksimir_share", { p_id: id });
  if (error) throw rpcError(error.message);
  return (data as Share | null) ?? null;
}

export async function fetchPublicBallots(limit = 100): Promise<PublicBallots> {
  const { data, error } = await sbAnon.rpc("maksimir_public_ballots", { p_limit: limit });
  if (error) throw rpcError(error.message);
  return data as PublicBallots;
}

// ── glasanje na lancu (migracija 20260926120000) ─────────────────────────────

export type ChainCfg = {
  chainId: number;
  contract: `0x${string}`;
  label: string;
  counts: boolean;
  rpcUrl: string;
  relayerUrl: string | null;
  explorerUrl: string | null;
  semaphore: `0x${string}`;
  groupId: string;
  deployBlock: number;
};
/** Ime mreže za ljude. */
export const chainName = (c: Pick<ChainCfg, "label" | "chainId"> | null) =>
  !c ? "nepoznata mreža" : c.chainId === 100 ? "Gnosis Chain" : c.chainId === 10200 ? "Chiado (testna mreža Gnosisa)" : c.label;

export type ChainConfig = { chain_from: string | null; active: ChainCfg | null; chains: ChainCfg[] };

export async function fetchChainConfig(): Promise<ChainConfig | null> {
  const { data, error } = await sbAnon.rpc("maksimir_chain_config");
  return error ? null : (data as ChainConfig);
}

export async function acceptChainTerms(): Promise<MyBallot> {
  const { data, error } = await sb.rpc("maksimir_accept_chain_terms");
  if (error) throw rpcError(error.message);
  return data as MyBallot;
}

export async function setPublicChain(mode: PublicMode, chain: ChainCfg, nullifier: string, proof: unknown): Promise<MyBallot> {
  const { data, error } = await sb.rpc("maksimir_set_public_chain", {
    p_mode: mode,
    p_chain_id: chain.chainId,
    p_contract: chain.contract,
    p_nullifier: nullifier,
    p_proof: proof,
  });
  if (error) throw rpcError(error.message);
  return data as MyBallot;
}

/** Kratka poveznica na anonimnu objavu na lancu (anonimni klijent, bez veze na glasača). */
export async function chainShareLink(chain: ChainCfg, txHash: string): Promise<string> {
  const { data, error } = await sbAnon.rpc("maksimir_chain_share", { p_chain_id: chain.chainId, p_contract: chain.contract, p_tx_hash: txHash });
  if (error) throw rpcError(error.message);
  return (data as { id: string }).id;
}

export async function keystoreGet(hash: string): Promise<unknown | null> {
  const { data, error } = await sbAnon.rpc("maksimir_keystore_get", { p_hash: hash });
  if (error) throw rpcError(error.message);
  return data ?? null;
}

export async function keystorePut(hash: string, blob: unknown): Promise<void> {
  const { error } = await sbAnon.rpc("maksimir_keystore_put", { p_hash: hash, p_blob: blob });
  if (error) throw rpcError(error.message);
}

const REGISTER_URL = (import.meta.env.VITE_MAKSIMIR_REGISTER_URL as string) || `${SUPABASE_URL}/functions/v1/maksimir-register`;

export type Registration = {
  chainId: number;
  contract: string;
  commitment: string;
  deadline: string;
  signature: `0x${string}`;
  existing: boolean;
  transferSeq: number | null;
  transferred: Items;
};

const REGISTER_ERRORS: Record<string, string> = {
  not_signed_in: "Prijava je istekla. Prijavi se ponovno eOsobnom.",
  not_verified: MESSAGES.not_verified,
  chain_terms_not_accepted: MESSAGES.chain_terms_not_accepted,
  already_registered: "Za tebe je na lancu već upisan drugi ključ. Otključaj taj ključ (passkey ili 24 riječi).",
  commitment_taken: "Ovaj ključ već pripada drugoj osobi. Izradi novi ključ.",
  weak_commitment: "Ovaj ključ je javno poznat (npr. same nule) i ne smije se koristiti. Izradi novi ključ ili upiši svoje prave riječi.",
  voting_closed: MESSAGES.voting_closed,
  registrar_unavailable: "Upis prava glasa trenutno nije dostupan. Pokušaj kasnije.",
  registrar_mismatch: "Upis prava glasa trenutno nije dostupan (ključ registrara). Pokušaj kasnije.",
};

/** Registrar (domovina-api): pravo glasa za commitment. Jednom po osobi, po ugovoru. */
export async function requestRegistration(chain: ChainCfg, commitment: string): Promise<Registration> {
  const session = await getSession();
  if (!session) throw new VoteError(REGISTER_ERRORS.not_signed_in);
  const res = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ chainId: chain.chainId, contract: chain.contract, commitment }),
  });
  const body = (await res.json().catch(() => ({}))) as Registration & { error?: string };
  if (!res.ok) throw new VoteError(REGISTER_ERRORS[body.error ?? ""] ?? `Upis prava glasa nije uspio (${body.error ?? res.status}).`);
  return body;
}

/** Poveznica za dijeljenje. /g/<id> poslužuje Pages Function s OG karticom. */
export const shareUrl = (id: string) => `${location.origin}/g/${id}`;

export async function signOut(): Promise<void> {
  await sb.auth.signOut();
}

// ── nacrt listića (lokalno, dok se ne preda) ────────────────────────────────

const DRAFT_KEY = "maksimir-draft";

export function getDraft(): Items {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Items) : {};
  } catch {
    return {};
  }
}

export function setDraft(items: Items) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  } catch {
    /* privatni prozor — nacrt živi samo u memoriji stranice */
  }
}

export const sumPoints = (items: Items) => Object.values(items).reduce((a, b) => a + (b || 0), 0);

export function sameItems(a: Items, b: Items): boolean {
  const clean = (x: Items) => Object.entries(x).filter(([, v]) => v > 0).sort(([k1], [k2]) => k1.localeCompare(k2));
  return JSON.stringify(clean(a)) === JSON.stringify(clean(b));
}

// ── Certilia (eOsobna / mobile ID) ──────────────────────────────────────────

async function proxy<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${CERTILIA}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new VoteError(`Certilia poslužitelj nije dostupan (${res.status}).`);
  return (await res.json()) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Otvara Certilia prijavu u skočnom prozoru i čeka ishod preko pollinga
 * (popup→opener poruke su nepouzdane s hrvatskim eID tokom, v. flutter_certilia).
 * `signal` omogućuje korisniku da odustane.
 */
export async function signInWithCertilia(signal: AbortSignal): Promise<void> {
  // Prozor se otvara ODMAH u klik handleru, prije ikakvog await-a — inače ga
  // browser blokira kao skočni prozor bez korisničke geste.
  const w = 500;
  const h = 700;
  const popup = window.open(
    "about:blank",
    "certilia_auth",
    `width=${w},height=${h},left=${(screen.width - w) / 2},top=${(screen.height - h) / 2}`
  );
  if (!popup) throw new VoteError("Preglednik je blokirao skočni prozor. Dopusti skočne prozore za ovu stranicu.");

  try {
    popup.document.write("<p style='font:16px system-ui;padding:2rem'>Otvaram Certilia prijavu…</p>");
    const redirect = `${CERTILIA}/api/auth/callback`;
    const init = await proxy<{ authorization_url: string; state: string; session_id: string }>(
      `/api/auth/initialize?response_type=code&redirect_uri=${encodeURIComponent(redirect)}`
    );
    const polling = await proxy<{ polling_id: string }>("/api/auth/polling/start", {
      state: init.state,
      session_id: init.session_id,
    });
    popup.location.href = init.authorization_url;

    // Polling je izvor istine. popup.closed se NE koristi kao otkazivanje:
    // ako IdP postavi COOP, referenca na prozor se presiječe i čita `closed`
    // iako prijava teče (ista zamka kao u flutter_certilia).
    let code: string | null = null;
    const deadline = Date.now() + 5 * 60_000;
    while (!code) {
      if (signal.aborted) throw new VoteError("Prijava je otkazana.");
      if (Date.now() > deadline) throw new VoteError("Prijava je istekla. Pokušaj ponovno.");
      await sleep(2000);
      const res = await fetch(`${CERTILIA}/api/auth/polling/${polling.polling_id}/status`);
      if (res.status === 404) throw new VoteError("Sesija prijave je istekla. Pokušaj ponovno.");
      if (!res.ok) continue;
      const st = (await res.json()) as { status: string; result?: { code: string }; errorDescription?: string };
      if (st.status === "completed" && st.result?.code) code = st.result.code;
      else if (st.status === "error") throw new VoteError(st.errorDescription || "Certilia je odbila prijavu.");
    }

    const tokens = await proxy<{ idToken?: string }>("/api/auth/exchange", {
      code,
      state: init.state,
      session_id: init.session_id,
    });
    if (!tokens.idToken) throw new VoteError("Certilia nije vratila identitet.");

    const { data, error } = await sb.functions.invoke("certilia", { body: { idToken: tokens.idToken, anonId: null } });
    if (error) {
      let detail = "";
      try {
        detail = ((await (error as { context?: Response }).context?.json()) as { error?: string })?.error ?? "";
      } catch {
        /* tijelo nije JSON */
      }
      throw new VoteError(
        detail === "no_oib_claim"
          ? "Certilia nije vratila OIB — prijava nije moguća."
          : `Povezivanje identiteta nije uspjelo${detail ? ` (${detail})` : ""}.`
      );
    }
    const { email, email_otp } = data as { email?: string; email_otp?: string };
    if (!email || !email_otp) throw new VoteError("Poslužitelj nije vratio podatke za prijavu.");

    const { error: otpErr } = await sb.auth.verifyOtp({ type: "magiclink", email, token: email_otp });
    if (otpErr) throw new VoteError(`Završetak prijave nije uspio: ${otpErr.message}`);
  } finally {
    try {
      popup.close();
    } catch {
      /* COOP */
    }
  }
}
