// Rubni slučajevi V1: svaka grana ugovora ima test (npm run coverage traži 100 %).
// Nalazi audita na koje se testovi odnose: docs/blockchain/audit/.
import { expect } from "chai";
import hre from "hardhat";
import { Group, Identity, generateProof } from "@semaphore-protocol/core";
import { hashDomain, zeroAddress, type Hex } from "viem";
import {
  ballotMessage,
  encodePoints,
  entriesHash,
  proveBallot,
  proveMigrate,
  proveShare,
  registerTypedData,
  toSolidityProof,
  type SolidityProof,
} from "../../client/ballot";
import { deploy, registrar, tally } from "./fixture";

/** Pokvari jednu točku dokaza: SNARK više nije valjan, a sve ostalo je isto. */
const corrupt = (p: SolidityProof): SolidityProof => {
  const points = [...p.points] as unknown as bigint[];
  points[0] = points[0] ^ 1n;
  return { ...p, points: points as unknown as SolidityProof["points"] };
};

describe("MaksimirGlasanjeV1 — rubni slučajevi", () => {
  describe("konstruktor", () => {
    it("odbija nultu adresu Semaphorea ili registrara", async () => {
      const [owner] = await hre.viem.getWalletClients();
      const { semaphore } = await deploy();
      const args = (s: Hex, r: Hex) => [s, owner.account.address, r, 2n ** 40n, entriesHash(), 3600n] as const;
      await expect(hre.viem.deployContract("MaksimirGlasanjeV1", [...args(zeroAddress, registrar.address)])).to.be.rejectedWith("ZeroAddress");
      await expect(hre.viem.deployContract("MaksimirGlasanjeV1", [...args(semaphore.address, zeroAddress)])).to.be.rejectedWith("ZeroAddress");
    });
  });

  describe("register", () => {
    it("nakon zatvaranja nema novih registracija", async () => {
      const { v1, asRelayer, chainId } = await deploy(600n);
      const id = new Identity();
      const test = await hre.viem.getTestClient();
      await test.increaseTime({ seconds: 601 });
      await test.mine({ blocks: 1 });
      const now = (await (await hre.viem.getPublicClient()).getBlock()).timestamp;
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline: now + 60n }));
      await expect(asRelayer.write.register([id.commitment, now + 60n, sig])).to.be.rejectedWith("VotingClosed");
    });

    it("potpis za drugi ugovor ili drugi lanac ne vrijedi (EIP-712 domena)", async () => {
      const { v1, asRelayer, chainId, now } = await deploy();
      const id = new Identity();
      const otherContract = await registrar.signTypedData(registerTypedData({ chainId, contract: "0x000000000000000000000000000000000000dEaD", commitment: id.commitment, deadline: now + 60n }));
      await expect(asRelayer.write.register([id.commitment, now + 60n, otherContract])).to.be.rejectedWith("NotRegistrar");
      const otherChain = await registrar.signTypedData(registerTypedData({ chainId: 100, contract: v1.address, commitment: id.commitment, deadline: now + 60n }));
      await expect(asRelayer.write.register([id.commitment, now + 60n, otherChain])).to.be.rejectedWith("NotRegistrar");
    });

    it("malleabilan ECDSA potpis (s → n − s) odbija OpenZeppelin", async () => {
      const { v1, asRelayer, chainId, now } = await deploy();
      const id = new Identity();
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline: now + 60n }));
      const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
      const r = sig.slice(2, 66);
      const sHigh = (N - BigInt("0x" + sig.slice(66, 130))).toString(16).padStart(64, "0");
      const v = parseInt(sig.slice(130, 132), 16) === 27 ? "1c" : "1b";
      const flipped = `0x${r}${sHigh}${v}` as const;
      await expect(asRelayer.write.register([id.commitment, now + 60n, flipped])).to.be.rejectedWith("ECDSAInvalidSignatureS");
      await asRelayer.write.register([id.commitment, now + 60n, sig]);
    });

    it("potpis s produženim rokom ne vrijedi (rok je dio potpisane poruke)", async () => {
      const { v1, asRelayer, chainId, now } = await deploy();
      const id = new Identity();
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline: now + 60n }));
      await expect(asRelayer.write.register([id.commitment, now + 99999n, sig])).to.be.rejectedWith("NotRegistrar");
    });
  });

  describe("cast", () => {
    it("pokvaren SNARK s ispravnom porukom → InvalidProof", async () => {
      const { asRelayer, register, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const [rev, points, proof] = await signedBallot(a, 1, { "6TVJ3MUHR": 100 });
      await expect(asRelayer.write.cast([rev, points, corrupt(proof)])).to.be.rejectedWith("InvalidProof");
    }).timeout(300_000);

    it("isti glasač s drugim scopeom (= drugi nullifier, drugi listić) → WrongScope", async () => {
      const { v1, asRelayer, register, group, chainId } = await deploy();
      const a = new Identity();
      await register(a);
      const points = encodePoints({ "6TVJ3MUHR": 100 });
      const message = ballotMessage({ chainId, contract: v1.address, revision: 1, points });
      const first = await proveBallot(a, group, { chainId, contract: v1.address, revision: 1, points });
      await asRelayer.write.cast([1, points, first]);
      // bez provjere scopea ovo bi bio drugi, neovisan listić iste osobe
      const other = toSolidityProof(await generateProof(a, group, message, 424242n));
      expect(other.nullifier).to.not.equal(first.nullifier);
      await expect(asRelayer.write.cast([1, points, other])).to.be.rejectedWith("WrongScope");
      expect(await v1.read.voters()).to.equal(1n);
    }).timeout(300_000);

    it("malleabilnost: isti dokaz s nullifier + r (modul polja) → InvalidProof, nema drugog listića", async () => {
      const { v1, asRelayer, register, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const [rev, points, proof] = await signedBallot(a, 1, { "6TVJ3MUHR": 100 });
      const R = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
      await expect(asRelayer.write.cast([rev, points, { ...proof, nullifier: proof.nullifier + R }])).to.be.rejectedWith("InvalidProof");
      await asRelayer.write.cast([rev, points, proof]);
      expect(await v1.read.voters()).to.equal(1n);
    }).timeout(300_000);

    it("listić krive duljine (potpisan takav) → BadBallotLength", async () => {
      const { v1, asRelayer, register, group, chainId } = await deploy();
      const a = new Identity();
      await register(a);
      for (const points of [("0x64" + "00".repeat(86)) as Hex, ("0x64" + "00".repeat(88)) as Hex]) {
        const proof = await proveBallot(a, group, { chainId, contract: v1.address, revision: 1, points });
        await expect(asRelayer.write.cast([1, points, proof])).to.be.rejectedWith("BadBallotLength");
      }
    }).timeout(300_000);

    it("stari korijen grupe nakon isteka merkleTreeDuration → MerkleTreeRootIsExpired", async () => {
      const { v1, asRelayer, register, signedBallot } = await deploy();
      const [a, b] = [new Identity(), new Identity()];
      await register(a);
      const old = await signedBallot(a, 1, { "6TVJ3MUHR": 100 }); // dokaz nad grupom {a}
      await register(b); // novi korijen
      await v1.write.setMerkleTreeDuration([60n]);
      const test = await hre.viem.getTestClient();
      await test.increaseTime({ seconds: 61 });
      await test.mine({ blocks: 1 });
      await expect(asRelayer.write.cast(old)).to.be.rejectedWith("MerkleTreeRootIsExpired");
    }).timeout(300_000);

    it("stari korijen unutar trajanja vrijedi (novi član ne ruši dokaz u izradi)", async () => {
      const { v1, asRelayer, register, signedBallot } = await deploy();
      const [a, b] = [new Identity(), new Identity()];
      await register(a);
      const old = await signedBallot(a, 1, { "6TVJ3MUHR": 100 });
      await register(b);
      await asRelayer.write.cast(old);
      expect(await v1.read.voters()).to.equal(1n);
    }).timeout(300_000);

    it("ballotOf vraća reviziju i bodove po nullifieru", async () => {
      const { v1, asRelayer, register, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const [rev, points, proof] = await signedBallot(a, 1, { GY0F1A9OM: 100 });
      await asRelayer.write.cast([rev, points, proof]);
      expect(await v1.read.ballotOf([proof.nullifier])).to.deep.equal([1, false, points]);
      expect(await v1.read.ballotOf([123n])).to.deep.equal([0, false, "0x"]);
    }).timeout(300_000);
  });

  describe("share", () => {
    it("krivi scope ili kriva poruka", async () => {
      const { asRelayer, register, group, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const ballotProof = (await signedBallot(a, 1, { "6TVJ3MUHR": 100 }))[2]; // scope listića
      await expect(asRelayer.write.share([ballotProof])).to.be.rejectedWith("WrongScope");
      const s = await proveShare(a, group);
      await expect(asRelayer.write.share([{ ...s, message: s.message + 1n }])).to.be.rejectedWith("WrongMessage");
    }).timeout(300_000);

    it("objava i listić istog ključa imaju različite nullifiere (nepovezivi)", async () => {
      const { register, group, signedBallot } = await deploy();
      const a = new Identity();
      await register(a);
      const b = (await signedBallot(a, 1, { "6TVJ3MUHR": 100 }))[2];
      const s = await proveShare(a, group);
      expect(s.nullifier).to.not.equal(b.nullifier);
    }).timeout(300_000);
  });

  describe("prijelaz na V2 — rubni", () => {
    async function withSuccessor() {
      const f = await deploy();
      const v2 = await hre.viem.deployContract("MockSuccessorV2", [f.v1.address]);
      return { ...f, v2 };
    }

    it("setSuccessor odbija nultu adresu", async () => {
      const { v1 } = await withSuccessor();
      await expect(v1.write.setSuccessor([zeroAddress])).to.be.rejectedWith("ZeroAddress");
    });

    it("prije najave V2 nitko ne može zvati migrate", async () => {
      const { v1, register, group, chainId, asStranger } = await withSuccessor();
      const a = new Identity();
      await register(a);
      const p = await proveMigrate(a, group, { chainId, contract: v1.address, successor: zeroAddress });
      await expect(asStranger.write.migrate([p])).to.be.rejectedWith("NotSuccessor");
    }).timeout(300_000);

    it("migrate: krivi scope i pokvaren SNARK", async () => {
      const { v1, v2, register, group, chainId } = await withSuccessor();
      const a = new Identity();
      await register(a);
      await v1.write.setSuccessor([v2.address]);
      await expect(v2.write.migrate([await proveShare(a, group)])).to.be.rejectedWith("WrongScope");
      const p = await proveMigrate(a, group, { chainId, contract: v1.address, successor: v2.address });
      await expect(v2.write.migrate([corrupt(p)])).to.be.rejectedWith("InvalidProof");
    }).timeout(300_000);

    it("selidba ključa bez listića: nema promjene zbroja, ključ je ipak zaključan u V1", async () => {
      const { v1, v2, register, group, chainId, asRelayer, signedBallot } = await withSuccessor();
      const [a, b] = [new Identity(), new Identity()];
      await register(a);
      await register(b);
      await asRelayer.write.cast(await signedBallot(b, 1, { "6TVJ3MUHR": 100 }));
      await v1.write.setSuccessor([v2.address]);
      const p = await proveMigrate(a, group, { chainId, contract: v1.address, successor: v2.address });
      await v2.write.migrate([p]);
      expect(await v2.read.revisionOf([p.nullifier])).to.equal(0);
      expect(await v1.read.voters()).to.equal(1n);
      expect(await tally(v1)).to.deep.equal({ "6TVJ3MUHR": [100, 1] });
      expect((await v1.read.ballotOf([p.nullifier]))[1]).to.equal(true);
    }).timeout(300_000);

    it("selidba povučenog listića (prazan, revizija > 0)", async () => {
      const { v1, v2, register, group, chainId, asRelayer, signedBallot } = await withSuccessor();
      const a = new Identity();
      await register(a);
      await asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 100 }));
      await asRelayer.write.cast(await signedBallot(a, 2, {}));
      await v1.write.setSuccessor([v2.address]);
      const p = await proveMigrate(a, group, { chainId, contract: v1.address, successor: v2.address });
      await v2.write.migrate([p]);
      expect(await v2.read.revisionOf([p.nullifier])).to.equal(2);
      expect(await v1.read.voters()).to.equal(0n);
    }).timeout(300_000);

    it("A-07: zlonamjeran successor bez glasačeva dokaza ne može ni zaključati ni zaustaviti nikoga", async () => {
      const { v1, asRelayer, register, signedBallot, stranger, group, chainId } = await withSuccessor();
      const [a, b] = [new Identity(), new Identity()];
      await register(a);
      await asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 100 }));
      // vlasnik (ili ukraden Safe) najavi „V2” koji je zapravo običan račun napadača
      await v1.write.setSuccessor([stranger.account.address]);
      const asFake = await hre.viem.getContractAt("MaksimirGlasanjeV1", v1.address, { client: { wallet: stranger } });
      // napadač ima samo dokaze koje je glasač dao za druge svrhe (listić, objava)
      await expect(asFake.write.migrate([(await signedBallot(a, 2, { GY0F1A9OM: 100 }))[2]])).to.be.rejectedWith("WrongMessage");
      await expect(asFake.write.migrate([await proveShare(a, group)])).to.be.rejectedWith("WrongScope");
      // napadač ne može preuzeti ni upravljanje grupom (V1 ga nikad ne predaje)
      const sem = await hre.viem.getContractAt("Semaphore", await v1.read.semaphore(), { client: { wallet: stranger } });
      await expect(sem.write.acceptGroupAdmin([await v1.read.groupId()])).to.be.rejected;
      // V1 i dalje radi za sve: novi član, prvi listić, izmjena
      await register(b);
      await asRelayer.write.cast(await signedBallot(b, 1, { GY0F1A9OM: 100 }));
      await asRelayer.write.cast(await signedBallot(a, 2, { W3YS5VJBZ: 100 }));
      expect(await tally(v1)).to.deep.equal({ GY0F1A9OM: [100, 1], W3YS5VJBZ: [100, 1] });
      void chainId;
    }).timeout(300_000);

    it("zaključan nullifier (selidba bez listića) više ne može glasati u V1", async () => {
      const { v1, v2, register, group, chainId, asRelayer, signedBallot } = await withSuccessor();
      const a = new Identity();
      await register(a);
      await v1.write.setSuccessor([v2.address]);
      await v2.write.migrate([await proveMigrate(a, group, { chainId, contract: v1.address, successor: v2.address })]);
      await expect(asRelayer.write.cast(await signedBallot(a, 1, { "6TVJ3MUHR": 100 }))).to.be.rejectedWith("AlreadyMigrated");
    }).timeout(300_000);

    it("dokaz selidbe za drugi successor ne vrijedi", async () => {
      const { v1, v2, register, group, chainId, owner } = await withSuccessor();
      const a = new Identity();
      await register(a);
      await v1.write.setSuccessor([v2.address]);
      const p = await proveMigrate(a, group, { chainId, contract: v1.address, successor: owner.account.address });
      await expect(v2.write.migrate([p])).to.be.rejectedWith("WrongMessage");
    }).timeout(300_000);
  });

  describe("uprava", () => {
    it("setRegistrar: samo vlasnik, ne nula; stari registrar više ne vrijedi", async () => {
      const { v1, asStranger, stranger, chainId, now } = await deploy();
      await expect(asStranger.write.setRegistrar([stranger.account.address])).to.be.rejectedWith("OwnableUnauthorizedAccount");
      await expect(v1.write.setRegistrar([zeroAddress])).to.be.rejectedWith("ZeroAddress");
      await v1.write.setRegistrar([stranger.account.address]);
      const id = new Identity();
      const sig = await registrar.signTypedData(registerTypedData({ chainId, contract: v1.address, commitment: id.commitment, deadline: now + 60n }));
      await expect(asStranger.write.register([id.commitment, now + 60n, sig])).to.be.rejectedWith("NotRegistrar");
    });

    it("setMerkleTreeDuration: samo vlasnik; radi i nakon najave V2 (admin ostaje V1)", async () => {
      const { v1, asStranger } = await deploy();
      await expect(asStranger.write.setMerkleTreeDuration([1n])).to.be.rejectedWith("OwnableUnauthorizedAccount");
      await v1.write.setMerkleTreeDuration([7200n]);
      const v2 = await hre.viem.deployContract("MockSuccessorV2", [v1.address]);
      await v1.write.setSuccessor([v2.address]);
      await v1.write.setMerkleTreeDuration([3600n]);
    });

    it("vlasništvo se prenosi u dva koraka (Safe mora prihvatiti)", async () => {
      const { v1, stranger, asStranger } = await deploy();
      await v1.write.transferOwnership([stranger.account.address]);
      expect((await v1.read.owner()).toLowerCase()).to.not.equal(stranger.account.address.toLowerCase());
      await asStranger.write.acceptOwnership();
      expect((await v1.read.owner()).toLowerCase()).to.equal(stranger.account.address.toLowerCase());
    });

    it("domainSeparator = EIP-712 domena iz klijenta", async () => {
      const { v1, chainId } = await deploy();
      const expected = hashDomain({
        domain: { name: "MaksimirGlasanje", version: "1", chainId, verifyingContract: v1.address },
        types: { EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ] },
      });
      expect(await v1.read.domainSeparator()).to.equal(expected);
    });
  });

  it("neregistrirana grupa (prazna) → Semaphore GroupHasNoMembers", async () => {
    const { v1, asRelayer, chainId } = await deploy();
    const a = new Identity();
    const points = encodePoints({ "6TVJ3MUHR": 100 });
    const p = await proveBallot(a, new Group([a.commitment]), { chainId, contract: v1.address, revision: 1, points });
    await expect(asRelayer.write.cast([1, points, p])).to.be.rejectedWith("GroupHasNoMembers");
  }).timeout(300_000);
});
