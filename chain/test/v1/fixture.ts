// Zajednički fixture za sve V1 testove (osnovni, rubni, fuzz). Semaphore se deploya lokalno
// iz istog npm izvora kao kanonski ugovor na Gnosisu/Chiadu.
import hre from "hardhat";
import { Group, Identity } from "@semaphore-protocol/core";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { ENTRIES, encodePoints, entriesHash, proveBallot, registerTypedData } from "../../client/ballot";

const registrarKey = generatePrivateKey();
export const registrar = privateKeyToAccount(registrarKey);

export async function deploy(closesIn = 3600n * 24n) {
  const [owner, relayer, stranger] = await hre.viem.getWalletClients();
  const pc = await hre.viem.getPublicClient();
  const poseidon = await hre.viem.deployContract("PoseidonT3");
  const verifier = await hre.viem.deployContract("SemaphoreVerifier");
  const semaphore = await hre.viem.deployContract("Semaphore", [verifier.address], {
    libraries: { "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidon.address },
  });
  const now = (await pc.getBlock()).timestamp;
  const v1 = await hre.viem.deployContract("MaksimirGlasanjeV1", [
    semaphore.address,
    owner.account.address,
    registrar.address,
    now + closesIn,
    entriesHash(),
    3600n,
  ]);
  // relayer = bilo koji račun bez ikakve uloge u ugovoru
  const asRelayer = await hre.viem.getContractAt("MaksimirGlasanjeV1", v1.address, { client: { wallet: relayer } });
  const asStranger = await hre.viem.getContractAt("MaksimirGlasanjeV1", v1.address, { client: { wallet: stranger } });
  const chainId = await pc.getChainId();
  const group = new Group();

  /** Registrar potpiše (poslužitelj, nakon eOsobne); relayer pošalje. */
  async function register(id: Identity) {
    const deadline = now + 3600n;
    const sig = await registrar.signTypedData(
      registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline })
    );
    await asRelayer.write.register([id.commitment, deadline, sig]);
    group.addMember(id.commitment);
  }

  /** Sve u „pregledniku”: listić → poruka → ZK dokaz. Relayer dobije samo gotov paket. */
  async function signedBallot(id: Identity, revision: number, items: Record<string, number>) {
    const points = encodePoints(items);
    const proof = await proveBallot(id, group, { chainId, contract: v1.address, revision, points });
    return [revision, points, proof] as const;
  }

  return { owner, relayer, stranger, pc, semaphore, v1, asRelayer, asStranger, chainId, group, register, signedBallot, now };
}

export async function tally(v1: { read: { results: () => Promise<readonly [readonly bigint[], readonly bigint[]]> } }) {
  const [points, backers] = await v1.read.results();
  const out: Record<string, [number, number]> = {};
  points.forEach((p, i) => p && (out[ENTRIES[i]] = [Number(p), Number(backers[i])]));
  return out;
}

