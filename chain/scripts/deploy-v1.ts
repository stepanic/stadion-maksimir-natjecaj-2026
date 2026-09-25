// Deploy MaksimirGlasanjeV1 i zapis nepromjenjivog manifesta deployments/<mreža>/v1.json.
//
//   Chiado:  OWNER=0x… REGISTRAR=0x… npx hardhat run scripts/deploy-v1.ts --network chiado
//   Gnosis:  DEPLOYER_PRIVATE_KEY=… OWNER=<Safe> REGISTRAR=0x… npx hardhat run scripts/deploy-v1.ts --network gnosis
//   Lokalno: npx hardhat run scripts/deploy-v1.ts --network localhost   (deploya i Semaphore)
//
// Manifest bilježi hash svake izvorne datoteke iz solc metadata (i naših i OpenZeppelin/
// Semaphore), metadata hash ugrađen u bytecode i git commit. `npm run check-frozen`
// odbija svaku promjenu izvora zamrznute verzije (v. docs/blockchain/07-verzioniranje.md).
import hre from "hardhat";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { getAddress, isAddress, keccak256 } from "viem";
import { entriesHash } from "../client/ballot";

const VERSION = "v1";
const FQN = "contracts/v1/MaksimirGlasanjeV1.sol:MaksimirGlasanjeV1";
const CANONICAL_SEMAPHORE = "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D";
// 31. 12. 2027. 23:59:59 Europe/Zagreb (CET, UTC+1) — isto kao maksimir_settings.closes_at
const CLOSES_AT = BigInt(process.env.CLOSES_AT ?? Date.parse("2027-12-31T22:59:59Z") / 1000);
const MERKLE_TREE_DURATION = BigInt(process.env.MERKLE_TREE_DURATION ?? 3600);

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const pc = await hre.viem.getPublicClient();
  const chainId = await pc.getChainId();
  const network = hre.network.name;
  const local = network === "localhost" || network === "hardhat";

  const out = `deployments/${network}/${VERSION}.json`;
  if (network === "gnosis" && execSync("git status --porcelain -- contracts").toString().trim() !== "") {
    throw new Error("na Gnosis se deploya samo commitan izvor (git status contracts/ nije čist)");
  }
  if (!local && existsSync(out)) throw new Error(`${out} već postoji — verzija je deployana i zamrznuta`);

  const owner = process.env.OWNER ?? (local ? deployer.account.address : undefined);
  const registrar = process.env.REGISTRAR ?? (local ? deployer.account.address : undefined);
  if (!owner || !isAddress(owner) || !registrar || !isAddress(registrar)) throw new Error("postavi OWNER i REGISTRAR");

  let semaphore: `0x${string}` = CANONICAL_SEMAPHORE;
  if (local) {
    const poseidon = await hre.viem.deployContract("PoseidonT3");
    const verifier = await hre.viem.deployContract("SemaphoreVerifier");
    semaphore = (
      await hre.viem.deployContract("Semaphore", [verifier.address], {
        libraries: { "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidon.address },
      })
    ).address;
  } else {
    const code = await pc.getCode({ address: semaphore });
    if (!code || code === "0x") throw new Error(`Semaphore nije na ${semaphore} (chain ${chainId})`);
  }

  const args = [semaphore, getAddress(owner), getAddress(registrar), CLOSES_AT, entriesHash(), MERKLE_TREE_DURATION] as const;
  const { deploymentTransaction, contract } = await hre.viem.sendDeploymentTransaction("MaksimirGlasanjeV1", [...args], {
    // javni Chiado RPC zna odbiti procjenu gasa ("exceeds 999999"); tada DEPLOY_GAS=3000000
    ...(process.env.DEPLOY_GAS ? { gas: BigInt(process.env.DEPLOY_GAS) } : {}),
  });
  const receipt = await pc.waitForTransactionReceipt({ hash: deploymentTransaction.hash });
  const onchainCode = await pc.getCode({ address: contract.address });

  const build = await hre.artifacts.getBuildInfo(FQN);
  const [file, name] = FQN.split(":");
  const compiled = build!.output.contracts[file][name] as { metadata: string };
  const metadata = JSON.parse(compiled.metadata);
  const sources = Object.fromEntries(Object.entries(metadata.sources).map(([k, v]) => [k, (v as { keccak256: string }).keccak256]));

  const manifest = {
    contract: "MaksimirGlasanjeV1",
    version: VERSION,
    network,
    chainId,
    address: contract.address,
    deployTx: deploymentTransaction.hash,
    block: receipt.blockNumber.toString(),
    deployer: deployer.account.address,
    constructorArgs: args.map(String),
    groupId: (await contract.read.groupId()).toString(),
    gitCommit: execSync("git rev-parse HEAD").toString().trim(),
    // true = izvor u contracts/ nije bio commitan u trenutku deploya (dopušteno samo na testnetu)
    gitDirty: execSync("git status --porcelain -- contracts").toString().trim() !== "",
    compiler: { version: build!.solcLongVersion, settings: metadata.settings },
    metadataKeccak256: keccak256(new TextEncoder().encode(compiled.metadata)),
    sources,
    runtimeCodeKeccak256: keccak256(onchainCode!),
  };
  if (!local) {
    mkdirSync(`deployments/${network}`, { recursive: true });
    writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
