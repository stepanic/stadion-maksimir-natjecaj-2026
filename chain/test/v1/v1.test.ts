import { expect } from "chai";
import hre from "hardhat";
import { Group, Identity } from "@semaphore-protocol/core";
import { getAddress, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  BALLOT_SCOPE,
  ENTRIES,
  SHARE_MESSAGE,
  SHARE_SCOPE,
  ballotMessage,
  decodePoints,
  encodePoints,
  entriesHash,
  proveBallot,
  proveMigrate,
  proveShare,
  registerTypedData,
} from "../../client/ballot";

// Faza 1 (web/src/zk.ts): iste vrijednosti moraju ostati da stari dokazi „glasao sam” vrijede.
const PHASE1_MESSAGE = 46779715467123036996841617194389431189336537137425384514209209627004761014272n;
const PHASE1_SCOPE = 49474226259215312994888701590181247581981161421217961257574660746611720716288n;

const registrarKey = generatePrivateKey();
const registrar = privateKeyToAccount(registrarKey);

async function deploy(closesIn = 3600n * 24n) {
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

async function tally(v1: { read: { results: () => Promise<readonly [readonly bigint[], readonly bigint[]]> } }) {
  const [points, backers] = await v1.read.results();
  const out: Record<string, [number, number]> = {};
  points.forEach((p, i) => p && (out[ENTRIES[i]] = [Number(p), Number(backers[i])]));
  return out;
}

describe("MaksimirGlasanjeV1", () => {
  it("konstante: faza 1, klijent i popis radova slažu se s ugovorom", async () => {
    const { v1 } = await deploy();
    expect(await v1.read.SHARE_MESSAGE()).to.equal(PHASE1_MESSAGE);
    expect(await v1.read.SHARE_SCOPE()).to.equal(PHASE1_SCOPE);
    expect(SHARE_MESSAGE).to.equal(PHASE1_MESSAGE);
    expect(SHARE_SCOPE).to.equal(PHASE1_SCOPE);
    expect(await v1.read.BALLOT_SCOPE()).to.equal(BALLOT_SCOPE);
    expect(await v1.read.entriesHash()).to.equal(entriesHash());
    expect(await v1.read.VERSION()).to.equal("1");
  });

  it("poruka listića u klijentu = poruka u ugovoru", async () => {
    const { v1, chainId } = await deploy();
    const points = encodePoints({ "6TVJ3MUHR": 50, GY0F1A9OM: 30, W3YS5VJBZ: 20 });
    expect(await v1.read.ballotMessage([3, points])).to.equal(ballotMessage({ chainId, contract: v1.address, revision: 3, points }));
  });

  describe("registracija (pravo glasa)", () => {
    it("vrijedi samo registrarov potpis, jednom, prije isteka", async () => {
      const { v1, asRelayer, chainId, now, register } = await deploy();
      const id = new Identity();
      await register(id);
      expect(await v1.read.registered()).to.equal(1n);

      // isti commitment ponovno → Semaphore odbija
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline: now + 3600n }));
      await expect(asRelayer.write.register([id.commitment, now + 3600n, sig])).to.be.rejectedWith("LeafAlreadyExists");

      // tuđi potpis
      const fake = privateKeyToAccount(generatePrivateKey());
      const other = new Identity();
      const bad = await fake.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: other.commitment, deadline: now + 3600n }));
      await expect(asRelayer.write.register([other.commitment, now + 3600n, bad])).to.be.rejectedWith("NotRegistrar");

      // relayer ne može potpis prenijeti na drugi commitment
      const good = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: other.commitment, deadline: now + 3600n }));
      await expect(asRelayer.write.register([new Identity().commitment, now + 3600n, good])).to.be.rejectedWith("NotRegistrar");

      // istekao potpis
      const old = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: other.commitment, deadline: now - 1n }));
      await expect(asRelayer.write.register([other.commitment, now - 1n, old])).to.be.rejectedWith("SignatureExpired");
    });
  });

  describe("listić", () => {
    it("predaja, izmjena i povlačenje; zbroj uživo na lancu", async () => {
      const { v1, asRelayer, register, signedBallot } = await deploy();
      const [a, b, c] = [new Identity(), new Identity(), new Identity()];
      for (const id of [a, b, c]) await register(id);

      await asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 50, GY0F1A9OM: 30, W3YS5VJBZ: 20 }));
      await asRelayer.write.cast(await signedBallot(b, 1, { "6TVJ3MUHR": 100 }));
      expect(await v1.read.voters()).to.equal(2n);
      expect(await tally(v1)).to.deep.equal({ "6TVJ3MUHR": [150, 2], GY0F1A9OM: [30, 1], W3YS5VJBZ: [20, 1] });

      // a mijenja listić (revizija 2): stari bodovi se oduzimaju
      await asRelayer.write.cast(await signedBallot(a, 2, { W3YS5VJBZ: 100 }));
      expect(await tally(v1)).to.deep.equal({ "6TVJ3MUHR": [100, 1], W3YS5VJBZ: [100, 1] });

      // b povlači listić (prazan)
      await asRelayer.write.cast(await signedBallot(b, 2, {}));
      expect(await v1.read.voters()).to.equal(1n);
      expect(await tally(v1)).to.deep.equal({ W3YS5VJBZ: [100, 1] });
    }).timeout(300_000);

    it("relayer ne može promijeniti bodove, podmetnuti stari listić ni ponoviti isti", async () => {
      const { asRelayer, register, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const [rev, points, proof] = await signedBallot(a, 1, { "6TVJ3MUHR": 60, GY0F1A9OM: 40 });

      const tampered = encodePoints({ "6TVJ3MUHR": 40, GY0F1A9OM: 60 });
      await expect(asRelayer.write.cast([rev, tampered, proof])).to.be.rejectedWith("WrongMessage");
      await expect(asRelayer.write.cast([2, points, proof])).to.be.rejectedWith("WrongMessage");

      await asRelayer.write.cast([rev, points, proof]);
      await expect(asRelayer.write.cast([rev, points, proof])).to.be.rejectedWith("BadRevision");

      // glasač je u međuvremenu potpisao reviziju 2 i 3; relayer zadrži 2 i pokuša poslati 3
      const second = await signedBallot(a, 2, { GY0F1A9OM: 100 });
      const third = await signedBallot(a, 3, { W3YS5VJBZ: 100 });
      await expect(asRelayer.write.cast(third)).to.be.rejectedWith("BadRevision");
      await asRelayer.write.cast(second);
      await asRelayer.write.cast(third);
    }).timeout(300_000);

    it("bilo tko smije poslati glasačev paket (relayer se može zaobići)", async () => {
      const { v1, asStranger, register, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      await asStranger.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 100 }));
      expect(await v1.read.voters()).to.equal(1n);
    }).timeout(300_000);

    it("neregistriran ključ, krivi zbroj, krivi scope i zatvoreno glasanje padaju", async () => {
      const { asRelayer, register, signedBallot, group, chainId, v1 } = await deploy(600n);
      const a = new Identity();
      await register(a);

      // ključ koji nije u grupi: dokaz nad lažnom grupom
      const outsider = new Identity();
      const fakeGroup = new Group([a.commitment, outsider.commitment]);
      const points = encodePoints({ "6TVJ3MUHR": 100 });
      const p = await proveBallot(outsider, fakeGroup, { chainId, contract: v1.address, revision: 1, points });
      await expect(asRelayer.write.cast([1, points, p])).to.be.rejectedWith("MerkleTreeRootIsNotPartOfTheGroup");

      // zbroj 99 (encodePoints ga ne bi ni napravio, pa ručno)
      const bad = ("0x63" + "00".repeat(87)) as Hex;
      const pb = await proveBallot(a, group, { chainId, contract: v1.address, revision: 1, points: bad });
      await expect(asRelayer.write.cast([1, bad, pb])).to.be.rejectedWith("BadPointsSum");

      // dokaz „glasao sam” (drugi scope) ne vrijedi kao listić
      await expect(asRelayer.write.cast([1, points, await proveShare(a, group)])).to.be.rejectedWith("WrongScope");

      const ok = await signedBallot(a, 1, { "6TVJ3MUHR": 100 });
      const test = await hre.viem.getTestClient();
      await test.increaseTime({ seconds: 601 });
      await test.mine({ blocks: 1 });
      await expect(asRelayer.write.cast(ok)).to.be.rejectedWith("VotingClosed");
    }).timeout(300_000);
  });

  it("anonimna objava „glasao sam” jednom po ključu", async () => {
    const { asRelayer, register, group } = await deploy();
    const a = new Identity();
    await register(a);
    const p = await proveShare(a, group);
    await asRelayer.write.share([p]);
    await expect(asRelayer.write.share([p])).to.be.rejectedWith("YouAreUsingTheSameNullifierTwice");
  }).timeout(300_000);

  describe("prijelaz na V2", () => {
    it("samo vlasnik najavljuje V2, jednom; listić seli samo glasač svojim dokazom", async () => {
      const { v1, owner, asRelayer, asStranger, register, signedBallot, group, chainId } = await deploy();
      const [a, b, c] = [new Identity(), new Identity(), new Identity()];
      await register(a);
      await register(b);
      await register(c);
      await asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 70, GY0F1A9OM: 30 }));
      await asRelayer.write.cast(await signedBallot(b, 1, { "6TVJ3MUHR": 100 }));

      const v2 = await hre.viem.deployContract("MockSuccessorV2", [v1.address]);
      await expect(asStranger.write.setSuccessor([v2.address])).to.be.rejectedWith("OwnableUnauthorizedAccount");
      await v1.write.setSuccessor([v2.address]);
      await expect(v1.write.setSuccessor([owner.account.address])).to.be.rejectedWith("SuccessorAlreadySet");
      await v2.write.acceptGroupAdmin();

      // nitko osim V2 ne zove migrate; V2 bez glasačeva dokaza ne može ništa
      const proofA = await proveMigrate(a, group, { chainId, contract: v1.address, successor: v2.address });
      await expect(asStranger.write.migrate([proofA])).to.be.rejectedWith("NotSuccessor");
      const ballotProof = (await signedBallot(a, 2, { "6TVJ3MUHR": 100 }))[2];
      await expect(v2.write.migrate([ballotProof])).to.be.rejectedWith("WrongMessage");

      await v2.write.migrate([proofA]);
      expect(await v2.read.revisionOf([proofA.nullifier])).to.equal(1);
      expect(decodePoints((await v2.read.pointsOf([proofA.nullifier])) as Hex)).to.deep.equal({ "6TVJ3MUHR": 70, GY0F1A9OM: 30 });

      // u V1 je listić poništen i ne može se više mijenjati; b je netaknut
      expect(await tally(v1)).to.deep.equal({ "6TVJ3MUHR": [100, 1] });
      expect(await v1.read.voters()).to.equal(1n);
      await expect(asRelayer.write.cast(await signedBallot(a, 2, { "6TVJ3MUHR": 100 }))).to.be.rejectedWith("AlreadyMigrated");
      await expect(v2.write.migrate([proofA])).to.be.rejectedWith("AlreadyMigrated");

      // c je registriran prije najave, ali nije glasao: u V1 više ne može početi (samo u V2)
      await expect(asRelayer.write.cast(await signedBallot(c, 1, { GY0F1A9OM: 100 }))).to.be.rejectedWith("UseSuccessor");
      // b ima listić u V1 i smije ga i dalje mijenjati ovdje
      await asRelayer.write.cast(await signedBallot(b, 2, { GY0F1A9OM: 100 }));
      expect(await tally(v1)).to.deep.equal({ GY0F1A9OM: [100, 1] });

      // nova registracija sad ide kroz V2 (admin grupe), V1 je odbija
      const late = new Identity();
      const { now } = { now: (await (await hre.viem.getPublicClient()).getBlock()).timestamp };
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: late.commitment, deadline: now + 3600n }));
      await expect(asRelayer.write.register([late.commitment, now + 3600n, sig])).to.be.rejected;
    }).timeout(300_000);
  });

  it("vlasnik mijenja registrara, ali ne dira listiće", async () => {
    const { v1, stranger, asRelayer, register, signedBallot } = await deploy();
    const a = new Identity();
    await register(a);
    await asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 100 }));
    await v1.write.setRegistrar([stranger.account.address]);
    expect(getAddress(await v1.read.registrar())).to.equal(getAddress(stranger.account.address));
    expect(await tally(v1)).to.deep.equal({ "6TVJ3MUHR": [100, 1] });
  }).timeout(300_000);
});
