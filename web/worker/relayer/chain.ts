// viem klijenti za Gnosis Chain; normalizacija ključa kao u pay.domovina.ai
// (wallet/functions/_lib/relayer.ts): wrangler secret zna stići bez 0x ili s razmakom.
import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gnosis, gnosisChiado, hardhat } from "viem/chains";
import type { Env } from "./types.ts";

/** CHAIN_ID=10200 → Chiado (testnet); 31337 → lokalni Hardhat; sve ostalo → Gnosis (100). */
export function chainOf(env: Env) {
  return env.CHAIN_ID === "10200" ? gnosisChiado : env.CHAIN_ID === "31337" ? hardhat : gnosis;
}

export function publicClient(env: Env) {
  return createPublicClient({ chain: chainOf(env), transport: http(env.GNOSIS_RPC_URL || chainOf(env).rpcUrls.default.http[0]) });
}

export function walletFor(env: Env, rawKey: string | undefined) {
  const k = (rawKey ?? "").trim();
  if (!k) throw new Error("ključ nije postavljen");
  const key = (k.startsWith("0x") ? k : `0x${k}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("ključ nije 0x + 64 hex znaka");
  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: chainOf(env),
    transport: http(env.GNOSIS_RPC_URL || chainOf(env).rpcUrls.default.http[0]),
  });
}

export function contractAddress(env: Env): Address {
  const a = (env.CONTRACT_ADDRESS ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error("CONTRACT_ADDRESS nije postavljen");
  return a as Address;
}

/** Nonce utrka (dva zahtjeva istog EOA u istoj sekundi) — vrijedi ponoviti. */
export function isNonceError(e: unknown): boolean {
  const m = String((e as Error)?.message ?? e).toLowerCase();
  return m.includes("nonce") || m.includes("replacement transaction underpriced") || m.includes("already known");
}
