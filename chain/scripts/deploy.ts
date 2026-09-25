// Deploy MaksimirGlasanje.
//
//   Gnosis:  DEPLOYER_PRIVATE_KEY=… OWNER=<Safe> OPERATOR=<EOA> npx hardhat run scripts/deploy.ts --network gnosis
//   Chiado:  isto s --network chiado (testnet, besplatni xDAI s faucet.chiadochain.net)
//   Lokalno: npx hardhat run scripts/deploy.ts --network localhost   (deploya i Semaphore)
//
// Na Gnosisu i Chiadu koristi se kanonski Semaphore v4 (ista adresa na svim mrežama,
// https://docs.semaphore.pse.dev/deployed-contracts). Ništa se ne kompajlira ponovno:
// hardhat artefakt je ono što se verificira na Gnosisscanu / Blockscoutu.
import hre from "hardhat";
import { getAddress, isAddress } from "viem";

const CANONICAL_SEMAPHORE = "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D";
const MERKLE_TREE_DURATION = BigInt(process.env.MERKLE_TREE_DURATION ?? 3600); // s

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const pc = await hre.viem.getPublicClient();
  const chainId = await pc.getChainId();
  const local = hre.network.name === "localhost" || hre.network.name === "hardhat";

  const owner = process.env.OWNER ?? (local ? deployer.account.address : undefined);
  const operator = process.env.OPERATOR ?? (local ? deployer.account.address : undefined);
  if (!owner || !isAddress(owner) || !operator || !isAddress(operator)) {
    throw new Error("postavi OWNER (Safe multisig) i OPERATOR (EOA relayera)");
  }

  let semaphore = CANONICAL_SEMAPHORE as `0x${string}`;
  if (local) {
    const poseidon = await hre.viem.deployContract("PoseidonT3");
    const verifier = await hre.viem.deployContract("SemaphoreVerifier");
    const s = await hre.viem.deployContract("Semaphore", [verifier.address], {
      libraries: { "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidon.address },
    });
    semaphore = s.address;
  } else {
    const code = await pc.getCode({ address: semaphore });
    if (!code || code === "0x") throw new Error(`Semaphore nije na ${semaphore} (chain ${chainId})`);
  }

  const g = await hre.viem.deployContract("MaksimirGlasanje", [
    semaphore,
    getAddress(owner),
    getAddress(operator),
    MERKLE_TREE_DURATION,
  ]);
  const out = {
    network: hre.network.name,
    chainId,
    MaksimirGlasanje: g.address,
    semaphore,
    groupId: (await g.read.groupId()).toString(),
    owner: getAddress(owner),
    operator: getAddress(operator),
    merkleTreeDuration: MERKLE_TREE_DURATION.toString(),
    block: (await pc.getBlockNumber()).toString(),
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
