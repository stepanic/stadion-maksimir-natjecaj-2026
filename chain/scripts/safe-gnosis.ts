// Safe 2/3 na Gnosisu (vlasnik MaksimirGlasanjeV1), isti potpisnici kao MPT Safe (Matija, 26. 9. 2026.).
//
//   npx tsx scripts/safe-gnosis.ts --dry      # samo simulacija (eth_call, bez plina): potpisnici + adresa
//   npx tsx scripts/safe-gnosis.ts            # izradi Safe (jednom); plin plaća GNOSIS_DEPLOYER iz .env.gnosis
//
// Safe v1.3.0 L2 (kanonski, isti kao na Chiadu gdje je isproban: scripts/safe-chiado.ts).
// V1 se zatim deploya izravno s OWNER=<Safe>, pa prijenos vlasništva nije potreban.
// Potpisnici ne potpisuju ništa: izrada Safea je jedna transakcija deployera.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, encodeFunctionData, getAddress, http, parseAbi, parseEventLogs, zeroAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gnosis } from "viem/chains";

const RPC = process.env.GNOSIS_RPC_URL ?? "https://rpc.gnosischain.com";
const MPT_SAFE = "0x449aBCEf4e29a7Dd8d98dB451AF2c463561BAf2e" as const;
const SAFE_L2 = "0x3E5c63644E683549055b9Be8653de26E0B4CD36E" as const;
const FACTORY = "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2" as const;
const FALLBACK = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4" as const;
const TIP = BigInt(process.env.PRIORITY_FEE_WEI ?? 10_000_000);
const OUT = "deployments/gnosis/safe.json";

const env = Object.fromEntries(
  readFileSync(".env.gnosis", "utf8").split("\n").filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const deployer = privateKeyToAccount(env.GNOSIS_DEPLOYER_PRIVATE_KEY as Hex);
const pc = createPublicClient({ chain: gnosis, transport: http(RPC) });
const wallet = createWalletClient({ account: deployer, chain: gnosis, transport: http(RPC) });
const SAFE_ABI = parseAbi([
  "function setup(address[] owners, uint256 threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
]);
const FACTORY_ABI = parseAbi([
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address proxy, address singleton)",
]);

async function main() {
  if (existsSync(OUT)) {
    console.log(`Safe već postoji: ${JSON.parse(readFileSync(OUT, "utf8")).safe}`);
    return;
  }
  if ((await pc.getChainId()) !== 100) throw new Error("RPC nije Gnosis (100)");
  const owners = ((await pc.readContract({ address: MPT_SAFE, abi: SAFE_ABI, functionName: "getOwners" } as never)) as readonly Hex[]).map((a) => getAddress(a));
  const threshold = 2n;
  if (owners.length !== 3) throw new Error(`MPT Safe ima ${owners.length} vlasnika, očekivano 3`);
  console.log(`potpisnici (iz MPT Safea ${MPT_SAFE}): ${owners.join(", ")}; prag ${threshold}/3`);

  const init = encodeFunctionData({ abi: SAFE_ABI, functionName: "setup", args: [owners, threshold, zeroAddress, "0x", FALLBACK, zeroAddress, 0n, zeroAddress] });
  const salt = BigInt(Date.now());
  if (process.argv.includes("--dry")) {
    const { result } = await pc.simulateContract({ account: deployer, address: FACTORY, abi: FACTORY_ABI, functionName: "createProxyWithNonce", args: [SAFE_L2, init, salt] } as never);
    console.log(`simulacija: Safe bi bio ${result} (sol ${salt}); deployer ${deployer.address}, saldo ${await pc.getBalance({ address: deployer.address })} wei`);
    return;
  }
  const base = (await pc.getBlock()).baseFeePerGas ?? 0n;
  const hash = await wallet.writeContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "createProxyWithNonce",
    args: [SAFE_L2, init, salt],
    maxPriorityFeePerGas: TIP,
    maxFeePerGas: base * 2n + TIP,
  } as never);
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 300_000 });
  if (r.status !== "success") throw new Error(`transakcija pala: ${hash}`);
  const safe = parseEventLogs({ abi: FACTORY_ABI, logs: r.logs, eventName: "ProxyCreation" })[0].args.proxy;
  const [got, t] = await Promise.all([
    pc.readContract({ address: safe, abi: SAFE_ABI, functionName: "getOwners" } as never) as Promise<readonly Hex[]>,
    pc.readContract({ address: safe, abi: SAFE_ABI, functionName: "getThreshold" } as never) as Promise<bigint>,
  ]);
  if (t !== threshold || got.length !== 3 || !owners.every((o) => got.map((x) => x.toLowerCase()).includes(o.toLowerCase()))) throw new Error("Safe nema očekivane vlasnike/prag");
  mkdirSync("deployments/gnosis", { recursive: true });
  const out = { network: "gnosis", safe, safeVersion: "1.3.0 (L2)", owners: got, threshold: Number(t), sameOwnersAs: MPT_SAFE, deployTx: hash, block: r.blockNumber.toString(), at: new Date().toISOString() };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`✔ Safe ${safe} (${t}/3) — tx ${hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
