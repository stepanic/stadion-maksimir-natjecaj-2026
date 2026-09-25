#!/usr/bin/env node
// Službeni Gnosis faucet (faucet.gnosischain.com) za Chiado, bez preglednika.
//
// Faucet daje 0,001 xDAI tjedno po e-mailu i adresi. Na Chiadu je base fee ~7 wei, pa uz
// priority fee od 1 wei to pokriva desetke deployeva (v. docs/blockchain/03-deploy-runbook.md).
//
//   node scripts/faucet-chiado.mjs send-otp  --email ime@gmail.com
//   node scripts/faucet-chiado.mjs claim     --email ime@gmail.com --otp 123456 [--token GNO]
//
// Ključ primatelja čita iz chain/.env.chiado (CHIADO_DEPLOYER_PRIVATE_KEY, gitignorirano).
// Tok je isti kao na stranici (app/page-*.js, 25. 9. 2026.):
//   send-otp → verify-otp (token) → altcha-challenge (proof-of-work) → generate-message
//   → potpis poruke ključem → verify-and-claim
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

const BASE = "https://faucet.gnosischain.com";
const CHAIN_ID = 10200;
const HERE = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv.slice(3).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), [])
);
const cmd = process.argv[2];
if (!args.email) throw new Error("--email je obavezan");

// Stranica šalje sha256 nekoliko svojstava preglednika; isti oblik, stabilan po stroju.
const fingerprint = createHash("sha256")
  .update(["Mozilla/5.0 (Macintosh)", "hr-HR", 1512, 982, 30, "Europe/Zagreb", 8].join("|"))
  .digest("hex");

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

/** ALTCHA: nađi n ≤ maxnumber takav da sha256(salt + n) = challenge. */
function solveAltcha(c) {
  for (let n = 0; n <= c.maxnumber; n++) {
    if (createHash("sha256").update(c.salt + n).digest("hex") === c.challenge) {
      const payload = { algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature };
      return Buffer.from(JSON.stringify(payload)).toString("base64");
    }
  }
  throw new Error("ALTCHA nije riješen");
}

function loadKey() {
  const env = readFileSync(resolve(HERE, "../.env.chiado"), "utf8");
  const k = env.match(/^CHIADO_DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
  if (!k) throw new Error("nema CHIADO_DEPLOYER_PRIVATE_KEY u chain/.env.chiado");
  return privateKeyToAccount(k);
}

if (cmd === "send-otp") {
  await post("/api/send-otp", { email: args.email, fingerprint });
  console.log(`kôd poslan na ${args.email}`);
} else if (cmd === "claim") {
  if (!args.otp) throw new Error("--otp je obavezan");
  const account = loadKey();
  const info = await (await fetch(BASE + "/api/info")).json();
  const tokens = info.chains[String(CHAIN_ID)].enabledTokens;
  const token = tokens.find((t) => t.symbol === (args.token ?? "xDAI"));
  if (!token) throw new Error(`faucet nema ${args.token}`);

  const { token: otpToken, isPrivileged, multiplier } = await post("/api/verify-otp", { email: args.email, otp: args.otp });
  console.log(`OTP prihvaćen (privileged=${isPrivileged}, multiplier=${multiplier ?? 1})`);

  const challenge = await (await fetch(BASE + "/api/altcha-challenge")).json();
  const t0 = Date.now();
  const powToken = solveAltcha(challenge);
  console.log(`proof-of-work riješen za ${Date.now() - t0} ms`);

  const { nonceId, message } = await post("/api/generate-message", {
    address: account.address,
    chainId: CHAIN_ID,
    tokenAddress: token.address,
  });
  const signature = await account.signMessage({ message });

  const res = await post("/api/verify-and-claim", {
    address: account.address,
    signature,
    chainId: CHAIN_ID,
    tokenAddress: token.address,
    amount: token.maximumAmount,
    powToken,
    otpToken,
    nonceId,
  });
  console.log(`poslano ${token.maximumAmount} ${token.symbol} na ${account.address}: ${res.transactionHash}`);
} else {
  throw new Error("naredba: send-otp | claim");
}
