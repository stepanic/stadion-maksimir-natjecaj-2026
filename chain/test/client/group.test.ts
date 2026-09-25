// fetchGroup (chain/client/group.ts): preglednik gradi grupu glasača iz Semaphore događaja,
// bez našeg poslužitelja, i provjerava korijen prema lancu.
import { expect } from "chai";
import hre from "hardhat";
import { Group, Identity } from "@semaphore-protocol/core";
import { fetchGroup } from "../../client/group";
import { ballotNullifier, proveBallot, encodePoints, registerTypedData } from "../../client/ballot";
import { deploy, registrar } from "../v1/fixture";

describe("client/group — fetchGroup", () => {
  it("grupa V1 iz događaja = grupa na lancu (i u malim koracima čitanja)", async () => {
    const f = await deploy();
    const pc = await hre.viem.getPublicClient();
    for (let i = 0; i < 5; i++) await f.register(new Identity());
    const groupId = await f.v1.read.groupId();
    const whole = await fetchGroup(pc as never, f.semaphore.address, groupId, 0n);
    const chunked = await fetchGroup(pc as never, f.semaphore.address, groupId, 0n, 3n);
    expect(whole.root).to.equal(f.group.root);
    expect(chunked.root).to.equal(f.group.root);
    expect(whole.size).to.equal(5);
  });

  it("C-02: tuđe grupe na istom (kanonskom) Semaphoreu ne ulaze u našu grupu", async () => {
    const [admin] = await hre.viem.getWalletClients();
    const f = await deploy();
    const pc = await hre.viem.getPublicClient();
    const ours = await f.v1.read.groupId();
    const other = await f.semaphore.read.groupCounter();
    await f.semaphore.write.createGroup([admin.account.address]);
    // isprepletene registracije: naša grupa i tuđa grupa na istom ugovoru
    await f.register(new Identity());
    await f.semaphore.write.addMember([other, new Identity().commitment]);
    await f.register(new Identity());
    await f.semaphore.write.addMembers([other, [new Identity().commitment, new Identity().commitment]]);
    const g = await fetchGroup(pc as never, f.semaphore.address, ours, 0n);
    expect(g.size).to.equal(2);
    expect(g.root).to.equal(f.group.root);
    const t = await fetchGroup(pc as never, f.semaphore.address, other, 0n);
    expect(t.size).to.equal(3);
  });

  it("svi Semaphore događaji: MemberAdded, MembersAdded, MemberUpdated, MemberRemoved", async () => {
    const [admin] = await hre.viem.getWalletClients();
    const { semaphore } = await deploy();
    const pc = await hre.viem.getPublicClient();
    const groupId = await semaphore.read.groupCounter();
    await semaphore.write.createGroup([admin.account.address]);
    const ids = Array.from({ length: 5 }, () => new Identity().commitment);
    const local = new Group();
    await semaphore.write.addMember([groupId, ids[0]]);
    local.addMember(ids[0]);
    await semaphore.write.addMembers([groupId, ids.slice(1, 4)]);
    local.addMembers(ids.slice(1, 4));
    await semaphore.write.updateMember([groupId, ids[1], ids[4], local.generateMerkleProof(1).siblings]);
    local.updateMember(1, ids[4]);
    await semaphore.write.removeMember([groupId, ids[2], local.generateMerkleProof(2).siblings]);
    local.removeMember(2);
    const g = await fetchGroup(pc as never, semaphore.address, groupId, 0n);
    expect(g.root).to.equal(local.root);
    expect(g.members).to.deep.equal(local.members);
  });

  it("više članova u istom bloku (različiti pošiljatelji): redoslijed po logIndexu", async () => {
    const f = await deploy();
    const pc = await hre.viem.getPublicClient();
    const test = await hre.viem.getTestClient();
    const [a, b, c] = [new Identity(), new Identity(), new Identity()];
    await f.register(a);
    const sign = (id: Identity) =>
      registrar.signTypedData(registerTypedData({ chainId: f.chainId, contract: f.v1.address, commitment: id.commitment, deadline: f.now + 3600n }));
    const [sb, sc] = [await sign(b), await sign(c)];
    await test.setAutomine(false);
    try {
      await f.asRelayer.write.register([b.commitment, f.now + 3600n, sb]);
      await f.asStranger.write.register([c.commitment, f.now + 3600n, sc]);
      await test.mine({ blocks: 1 });
    } finally {
      await test.setAutomine(true);
    }
    const logs = await f.v1.getEvents.Registered({}, { fromBlock: 0n });
    expect(logs.at(-1)!.blockNumber).to.equal(logs.at(-2)!.blockNumber); // doista isti blok
    const groupId = await f.v1.read.groupId();
    const g = await fetchGroup(pc as never, f.semaphore.address, groupId, 0n);
    expect(g.root).to.equal(await f.semaphore.read.getMerkleTreeRoot([groupId]));
    expect(g.size).to.equal(3);
  });

  it("nepotpuni događaji (npr. RPC ih sakrije) → greška, a ne kriva grupa", async () => {
    const f = await deploy();
    const pc = await hre.viem.getPublicClient();
    await f.register(new Identity());
    const from = (await pc.getBlockNumber()) + 1n;
    await f.register(new Identity());
    await expect(fetchGroup(pc as never, f.semaphore.address, await f.v1.read.groupId(), from)).to.be.rejectedWith("ne odgovara korijenu");
  });

  it("ballotNullifier = nullifier u dokazu listića (isti ključ, isti scope)", async () => {
    const f = await deploy();
    const a = new Identity();
    await f.register(a);
    const points = encodePoints({ "6TVJ3MUHR": 100 });
    const proof = await proveBallot(a, f.group, { chainId: f.chainId, contract: f.v1.address, revision: 1, points });
    expect(await ballotNullifier(a, f.group)).to.equal(proof.nullifier);
  }).timeout(120_000);
});
