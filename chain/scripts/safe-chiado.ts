// Vlasnik MaksimirGlasanjeV1 na Chiadu → Safe 2/3 (probni put prije Gnosisa, docs/blockchain/03).
//
//   npx tsx scripts/safe-chiado.ts
//
// 1. Tri EOA-a vlasnika Safea: chain/.env.safe-chiado (gitignorirano; izradi ih ako ne postoje).
// 2. Safe v1.3.0 (kanonski SafeL2 + ProxyFactory, isti na Chiadu i Gnosisu), prag 2 od 3.
// 3. Ownable2Step: deployer → transferOwnership(Safe); Safe s 2 potpisa → acceptOwnership().
// 4. Provjera upravljanja: Safe s 2 potpisa radi (setMerkleTreeDuration, ista vrijednost),
//    s 1 potpisom ne (GS020), stari vlasnik više ne može ništa (OwnableUnauthorizedAccount).
// Idempotentno: već izrađen Safe i već preneseno vlasništvo se preskaču.
// Plin plaća testni deployer (CHIADO_DEPLOYER_PRIVATE_KEY); vlasnici Safea ne trebaju xDAI.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  concat,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseEventLogs,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { gnosisChiado } from "viem/chains";

const RPC = "https://rpc.chiadochain.net";
const SAFE_L2 = "0x3E5c63644E683549055b9Be8653de26E0B4CD36E" as const; // Safe v1.3.0 L2 (kanonski)
const FACTORY = "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2" as const;
const FALLBACK = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4" as const;
const TIP = 10_000_000n; // 0,01 gwei (napojnica 0 na Chiadu zna čekati minutama)

const readEnv = (f: string) =>
  existsSync(f)
    ? Object.fromEntries(readFileSync(f, "utf8").split("\n").filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]))
    : {};
const chiado = readEnv(".env.chiado");
const SAFE_ENV = ".env.safe-chiado";
let safeEnv = readEnv(SAFE_ENV);
if (!safeEnv.SAFE_OWNER_1_PRIVATE_KEY) {
  const keys = [1, 2, 3].map(() => generatePrivateKey());
  safeEnv = Object.fromEntries(keys.flatMap((k, i) => [[`SAFE_OWNER_${i + 1}_PRIVATE_KEY`, k], [`SAFE_OWNER_${i + 1}_ADDRESS`, privateKeyToAccount(k).address]]));
  save();
  console.log(`izrađena 3 vlasnika Safea → chain/${SAFE_ENV} (gitignorirano)`);
}
function save() {
  writeFileSync(SAFE_ENV, "# Chiado TESTNET: vlasnici Safea koji je vlasnik MaksimirGlasanjeV1 (samo testnet!)\n" + Object.entries(safeEnv).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
}

const owners: PrivateKeyAccount[] = [1, 2, 3].map((i) => privateKeyToAccount(safeEnv[`SAFE_OWNER_${i}_PRIVATE_KEY`] as Hex));
const deployer = privateKeyToAccount(chiado.CHIADO_DEPLOYER_PRIVATE_KEY as Hex);
const manifest = JSON.parse(readFileSync("deployments/chiado/v1.json", "utf8"));
const V1 = manifest.address as Address;

const pc = createPublicClient({ chain: gnosisChiado, transport: http(RPC) });
const wallet = createWalletClient({ account: deployer, chain: gnosisChiado, transport: http(RPC) });

const SAFE_ABI = parseAbi([
  "function setup(address[] owners, uint256 threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function nonce() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
]);
const FACTORY_ABI = parseAbi([
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address proxy, address singleton)",
]);
const V1_ABI = parseAbi([
  "function owner() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function acceptOwnership()",
  "function setMerkleTreeDuration(uint256 duration)",
  "error OwnableUnauthorizedAccount(address account)",
]);

async function send(tx: Parameters<typeof wallet.writeContract>[0]): Promise<Hex> {
  const fees = await pc.estimateFeesPerGas();
  const base = fees.maxFeePerGas! - (fees.maxPriorityFeePerGas ?? 0n);
  const hash = await wallet.writeContract({ ...tx, maxPriorityFeePerGas: TIP, maxFeePerGas: base * 2n + TIP } as never);
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 180_000 });
  if (r.status !== "success") throw new Error(`transakcija pala: ${hash}`);
  return hash;
}

/** Safe v1.3.0 EIP-712 SafeTx, potpisi sortirani po adresi potpisnika. */
async function safeExec(safe: Address, to: Address, data: Hex, signers: PrivateKeyAccount[]) {
  const nonce = await pc.readContract({ address: safe, abi: SAFE_ABI, functionName: "nonce" });
  const message = { to, value: 0n, data, operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: zeroAddress, refundReceiver: zeroAddress, nonce };
  const typed = {
    domain: { chainId: gnosisChiado.id, verifyingContract: safe },
    types: {
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "SafeTx" as const,
    message,
  };
  const sorted = [...signers].sort((a, b) => (a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1));
  const signatures = concat(await Promise.all(sorted.map((s) => s.signTypedData(typed))));
  const args = [to, 0n, data, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, signatures] as const;
  return { args, run: () => send({ address: safe, abi: SAFE_ABI, functionName: "execTransaction", args } as never) };
}

async function main() {
  const out: Record<string, unknown> = { network: "chiado", contract: V1, safeVersion: "1.3.0 (L2)", threshold: 2 };
  console.log(`vlasnici Safea: ${owners.map((o) => o.address).join(", ")}`);

  // 1. Safe
  let safe = safeEnv.SAFE_ADDRESS as Address | undefined;
  if (!safe) {
    const init = encodeFunctionData({ abi: SAFE_ABI, functionName: "setup", args: [owners.map((o) => o.address), 2n, zeroAddress, "0x", FALLBACK, zeroAddress, 0n, zeroAddress] });
    const hash = await send({ address: FACTORY, abi: FACTORY_ABI, functionName: "createProxyWithNonce", args: [SAFE_L2, init, BigInt(Date.now())] } as never);
    const r = await pc.getTransactionReceipt({ hash });
    safe = parseEventLogs({ abi: FACTORY_ABI, logs: r.logs, eventName: "ProxyCreation" })[0].args.proxy;
    safeEnv.SAFE_ADDRESS = safe;
    save();
    out.safeDeployTx = hash;
    console.log(`Safe izrađen: ${safe} (${hash})`);
  }
  const [sOwners, threshold] = await Promise.all([
    pc.readContract({ address: safe, abi: SAFE_ABI, functionName: "getOwners" }),
    pc.readContract({ address: safe, abi: SAFE_ABI, functionName: "getThreshold" }),
  ]);
  console.log(`Safe ${safe}: ${threshold}/${sOwners.length}`);
  if (threshold !== 2n || sOwners.length !== 3) throw new Error("Safe nije 2/3");
  out.safe = safe;
  out.owners = sOwners;

  // 2. prijenos vlasništva (dva koraka)
  let owner = await pc.readContract({ address: V1, abi: V1_ABI, functionName: "owner" });
  if (owner.toLowerCase() !== safe.toLowerCase()) {
    const pending = await pc.readContract({ address: V1, abi: V1_ABI, functionName: "pendingOwner" });
    if (pending.toLowerCase() !== safe.toLowerCase()) {
      out.transferOwnershipTx = await send({ address: V1, abi: V1_ABI, functionName: "transferOwnership", args: [safe] } as never);
      console.log(`transferOwnership(Safe): ${out.transferOwnershipTx}`);
    }
    const accept = await safeExec(safe, V1, encodeFunctionData({ abi: V1_ABI, functionName: "acceptOwnership" }), [owners[0], owners[2]]);
    out.acceptOwnershipTx = await accept.run();
    console.log(`Safe (vlasnici 1 + 3) acceptOwnership(): ${out.acceptOwnershipTx}`);
    owner = await pc.readContract({ address: V1, abi: V1_ABI, functionName: "owner" });
  }
  if (owner.toLowerCase() !== safe.toLowerCase()) throw new Error(`vlasnik je ${owner}, a ne Safe`);
  console.log(`✔ vlasnik V1 = Safe ${safe}`);

  // 3. upravljanje: 2 potpisa da, 1 ne, stari vlasnik ne
  const call = encodeFunctionData({ abi: V1_ABI, functionName: "setMerkleTreeDuration", args: [3600n] });
  const one = await safeExec(safe, V1, call, [owners[1]]);
  const oneFails = await pc
    .simulateContract({ account: deployer, address: safe, abi: SAFE_ABI, functionName: "execTransaction", args: one.args } as never)
    .then(() => false, (e) => /GS020|GS026/.test(String(e)));
  console.log(`${oneFails ? "✔" : "✘"} Safe s 1 potpisom odbija (GS020)`);
  const oldOwnerFails = await pc
    .simulateContract({ account: deployer, address: V1, abi: V1_ABI, functionName: "setMerkleTreeDuration", args: [3600n] } as never)
    .then(() => false, (e) => /OwnableUnauthorizedAccount/.test(String(e)));
  console.log(`${oldOwnerFails ? "✔" : "✘"} stari vlasnik (deployer) više ne može upravljati`);
  const two = await safeExec(safe, V1, call, [owners[1], owners[2]]);
  out.governanceTx = await two.run();
  console.log(`✔ Safe s 2 potpisa: setMerkleTreeDuration(3600) ${out.governanceTx}`);

  out.checks = { oneSignatureRejected: oneFails, oldOwnerRejected: oldOwnerFails };
  out.at = new Date().toISOString();
  // Javni zapis (adrese i transakcije, bez ključeva); v1.json je zamrznut pa ide u zasebnu datoteku.
  const prev = existsSync("deployments/chiado/owner.json") ? JSON.parse(readFileSync("deployments/chiado/owner.json", "utf8")) : {};
  writeFileSync("deployments/chiado/owner.json", JSON.stringify({ ...prev, ...out }, null, 2) + "\n");
  if (!oneFails || !oldOwnerFails) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
