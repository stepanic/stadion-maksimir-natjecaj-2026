// chain/client/read.ts + publicMessage/proveOwnership + groupRoots: ono što web čita s lanca.
import { expect } from "chai";
import hre from "hardhat";
import { Identity } from "@semaphore-protocol/core";
import { keccak256, toHex, zeroAddress, type Hex } from "viem";
import { BALLOT_SCOPE, ballotMessage, encodePoints, proveBallot, proveOwnership, proveShare, publicMessage, registerTypedData, toJson } from "../../client/ballot";
import { groupRoots } from "../../client/group";
import { checkOwnership, readBallot, readShareTx, readTally, sumTallies, type ProofJson, type Tally } from "../../client/read";
import { deploy, registrar } from "../v1/fixture";

const json = (p: unknown) => JSON.parse(toJson(p)) as ProofJson;
const PSEUDO = keccak256(toHex("maksimir:voter-a")) as Hex;

describe("client/read — čitanje s lanca", () => {
  it("readBallot i readTally: listić i zbroj kao na lancu", async () => {
    const f = await deploy();
    const pc = f.pc as never;
    const [a, b] = [new Identity(), new Identity()];
    await f.register(a);
    await f.register(b);
    const pa = await proveBallot(a, f.group, { chainId: f.chainId, contract: f.v1.address, revision: 1, points: encodePoints({ W3YS5VJBZ: 60, "6TVJ3MUHR": 40 }) });
    await f.asRelayer.write.cast([1, encodePoints({ W3YS5VJBZ: 60, "6TVJ3MUHR": 40 }), pa]);
    const pb = await proveBallot(b, f.group, { chainId: f.chainId, contract: f.v1.address, revision: 1, points: encodePoints({ W3YS5VJBZ: 100 }) });
    await f.asRelayer.write.cast([1, encodePoints({ W3YS5VJBZ: 100 }), pb]);

    expect(await readBallot(pc, f.v1.address, pa.nullifier)).to.deep.equal({ revision: 1, migrated: false, items: { "6TVJ3MUHR": 40, W3YS5VJBZ: 60 } });
    expect(await readBallot(pc, f.v1.address, 123n)).to.deep.equal({ revision: 0, migrated: false, items: {} });
    const t = await readTally(pc, f.v1.address);
    expect(t.voters).to.equal(2);
    expect(t.results.W3YS5VJBZ).to.deep.equal({ points: 160, backers: 2 });
    expect(t.results["6TVJ3MUHR"]).to.deep.equal({ points: 40, backers: 1 });
    expect(Object.keys(t.results)).to.have.length(88);
  });

  it("sumTallies: lanac + ostatak faze 1; nepoznata šifra se ne broji", () => {
    const chain: Tally = { voters: 2, results: { W3YS5VJBZ: { points: 160, backers: 2 } } };
    const phase1: Tally = { voters: 1, results: { W3YS5VJBZ: { points: 40, backers: 1 }, NEPOSTOJI: { points: 60, backers: 1 } } };
    const s = sumTallies(chain, phase1);
    expect(s.voters).to.equal(3);
    expect(s.results.W3YS5VJBZ).to.deep.equal({ points: 200, backers: 3 });
    expect(s.results.NEPOSTOJI).to.equal(undefined);
    expect(sumTallies().voters).to.equal(0);
  });

  it("readShareTx: AnonymousShare našeg ugovora; druga transakcija, drugi ugovor i nepostojeći hash → null", async () => {
    const f = await deploy();
    const pc = f.pc as never;
    const a = new Identity();
    await f.register(a);
    const proof = await proveShare(a, f.group);
    const tx = await f.asStranger.write.share([proof]);
    const r = await readShareTx(pc, f.v1.address, tx);
    expect(r?.nullifier).to.equal(proof.nullifier);
    expect(r?.root).to.equal(f.group.root);
    expect(r?.block).to.be.a("bigint");
    expect(await readShareTx(pc, zeroAddress, tx)).to.equal(null);
    const other = await deploy();
    const id = new Identity();
    const deadline = other.now + 3600n;
    const sig = await registrar.signTypedData(registerTypedData({ chainId: other.chainId, contract: other.v1.address, commitment: id.commitment, deadline }));
    const regTx = await other.asRelayer.write.register([id.commitment, deadline, sig]);
    expect(await readShareTx(pc, other.v1.address, regTx)).to.equal(null);
    expect(await readShareTx(pc, f.v1.address, `0x${"ab".repeat(32)}`)).to.equal(null);
  });

  it("groupRoots: svaki korijen koji je grupa imala", async () => {
    const f = await deploy();
    const roots: bigint[] = [];
    for (let i = 0; i < 3; i++) {
      await f.register(new Identity());
      roots.push(f.group.root as bigint);
    }
    const got = await groupRoots(f.pc as never, f.semaphore.address, await f.v1.read.groupId(), 0n, 2n);
    expect([...got]).to.deep.equal(roots);
  });

  it("publicMessage ovisi o lancu, ugovoru i pseudonimu; nije poruka listića", () => {
    const w = { chainId: 100, contract: "0x00000000000000000000000000000000000000aa" as const, pseudonym: PSEUDO };
    const m = publicMessage(w);
    expect(publicMessage({ ...w, chainId: 10200 })).to.not.equal(m);
    expect(publicMessage({ ...w, contract: zeroAddress })).to.not.equal(m);
    expect(publicMessage({ ...w, pseudonym: keccak256(toHex("drugi")) })).to.not.equal(m);
    expect(m).to.not.equal(ballotMessage({ ...w, revision: 1, points: "0x" }));
  });

  it("proveOwnership + checkOwnership: valjan dokaz prolazi; tuđi pseudonim, stari korijen izvan skupa i pokvaren SNARK ne", async () => {
    const f = await deploy();
    const a = new Identity();
    await f.register(a);
    await f.register(new Identity());
    const w = { chainId: f.chainId, contract: f.v1.address, pseudonym: PSEUDO };
    const proof = json(await proveOwnership(a, f.group, w));
    expect(BigInt(proof.scope)).to.equal(BALLOT_SCOPE);
    const roots = await groupRoots(f.pc as never, f.semaphore.address, await f.v1.read.groupId(), 0n);
    const ok = await checkOwnership(proof, { ...w, nullifier: proof.nullifier }, roots);
    expect(ok).to.deep.equal({ snark: true, scope: true, message: true, root: true, ok: true });

    // isti dokaz prepisan na tuđu karticu (drugi pseudonim) → poruka ne odgovara
    const stolen = await checkOwnership(proof, { ...w, pseudonym: keccak256(toHex("maksimir:bob")), nullifier: proof.nullifier }, roots);
    expect([stolen.message, stolen.ok]).to.deep.equal([false, false]);
    // kartica tvrdi drugi nullifier od onog u dokazu
    expect((await checkOwnership(proof, { ...w, nullifier: "1" }, roots)).scope).to.equal(false);
    // korijen izvan grupe na lancu
    expect((await checkOwnership(proof, { ...w, nullifier: proof.nullifier }, new Set())).root).to.equal(false);
    // izmijenjen nullifier (dosljedno i na kartici) → SNARK pada
    const forged = { ...proof, nullifier: "7" };
    expect((await checkOwnership(forged, { ...w, nullifier: "7" }, roots)).snark).to.equal(false);
    // neispravan oblik dokaza → verifyProof baci, rezultat je false
    expect((await checkOwnership({ ...proof, points: ["x"] }, { ...w, nullifier: proof.nullifier }, roots)).snark).to.equal(false);
  });

  it("dokaz vlasništva ne vrijedi kao listić na lancu", async () => {
    const f = await deploy();
    const a = new Identity();
    await f.register(a);
    const own = await proveOwnership(a, f.group, { chainId: f.chainId, contract: f.v1.address, pseudonym: PSEUDO });
    let reverted = false;
    try {
      await f.asRelayer.write.cast([1, "0x", own]);
    } catch (e) {
      reverted = /WrongMessage/.test(String(e));
    }
    expect(reverted).to.equal(true);
  });
});
