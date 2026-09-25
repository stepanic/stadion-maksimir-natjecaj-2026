// Grupa glasača izravno s lanca (Semaphore događaji), bez našeg poslužitelja.
// Rezultat se provjerava prema korijenu koji vraća sam Semaphore ugovor.
import { Group } from "@semaphore-protocol/core";
import { parseAbi, type Address, type PublicClient } from "viem";

const SEMAPHORE_ABI = parseAbi([
  "event MemberAdded(uint256 indexed groupId, uint256 index, uint256 identityCommitment, uint256 merkleTreeRoot)",
  "event MembersAdded(uint256 indexed groupId, uint256 startIndex, uint256[] identityCommitments, uint256 merkleTreeRoot)",
  "event MemberUpdated(uint256 indexed groupId, uint256 index, uint256 identityCommitment, uint256 newIdentityCommitment, uint256 merkleTreeRoot)",
  "event MemberRemoved(uint256 indexed groupId, uint256 index, uint256 identityCommitment, uint256 merkleTreeRoot)",
  "function getMerkleTreeRoot(uint256 groupId) view returns (uint256)",
  "function getMerkleTreeSize(uint256 groupId) view returns (uint256)",
]);

export async function fetchGroup(
  client: PublicClient,
  semaphore: Address,
  groupId: bigint,
  fromBlock: bigint,
  step = 50_000n
): Promise<Group> {
  const latest = await client.getBlockNumber();
  const logs = [];
  for (let from = fromBlock; from <= latest; from += step) {
    const to = from + step - 1n > latest ? latest : from + step - 1n;
    logs.push(...(await client.getLogs({ address: semaphore, events: SEMAPHORE_ABI.filter((x) => x.type === "event"), args: { groupId }, fromBlock: from, toBlock: to })));
  }
  logs.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex! - b.logIndex! : a.blockNumber! < b.blockNumber! ? -1 : 1));

  const g = new Group();
  for (const l of logs) {
    const a = l.args as Record<string, unknown>;
    switch (l.eventName) {
      case "MemberAdded":
        g.addMember(a.identityCommitment as bigint);
        break;
      case "MembersAdded":
        g.addMembers(a.identityCommitments as bigint[]);
        break;
      case "MemberUpdated":
        g.updateMember(Number(a.index), a.newIdentityCommitment as bigint);
        break;
      case "MemberRemoved":
        g.removeMember(Number(a.index));
        break;
    }
  }
  const root = await client.readContract({ address: semaphore, abi: SEMAPHORE_ABI, functionName: "getMerkleTreeRoot", args: [groupId] });
  if (g.size > 0 && g.root !== root) throw new Error("grupa iz događaja ne odgovara korijenu na lancu");
  return g;
}
