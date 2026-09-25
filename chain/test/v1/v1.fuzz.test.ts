// Stateful fuzz V1 prema referentnom modelu.
//
// Nasumičan (ali ponovljiv, po sjemenu) niz operacija miješa ispravne radnje glasača s napadima
// relayera i trećih strana. Nakon SVAKE operacije stanje ugovora mora biti točno jednako
// modelu, a invarijante S3/S4 moraju vrijediti. Pravi Semaphore dokazi, bez mockova.
//
//   FUZZ_SEEDS=10 FUZZ_OPS=60 npx hardhat test test/v1/v1.fuzz.test.ts   (dulje, lokalno)
import { expect } from "chai";
import hre from "hardhat";
import { Group, Identity, generateProof } from "@semaphore-protocol/core";
import type { Hex } from "viem";
import { ENTRIES, ballotMessage, encodePoints, proveBallot, proveMigrate, proveShare, toSolidityProof } from "../../client/ballot";
import { deploy } from "./fixture";

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 3);
const OPS = Number(process.env.FUZZ_OPS ?? 30);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Voter = { id: Identity; registered: boolean; nullifier?: bigint; revision: number; points: Hex; migrated: boolean; shared: boolean; packages: Array<[number, Hex, unknown]> };

describe("MaksimirGlasanjeV1 — stateful fuzz", () => {
  for (let s = 1; s <= SEEDS; s++) {
    it(`sjeme ${s}: ${OPS} operacija, stanje = model nakon svake`, async () => {
      const r = rng(s * 7919);
      const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
      const f = await deploy(3600n * 24n * 30n);
      const { v1, asRelayer, chainId, group } = f;
      const voters: Voter[] = [];
      let successor: { address: Hex; write: { migrate: (a: [never]) => Promise<unknown> } } | null = null;
      const log: string[] = [];

      const randomBallot = (): Record<string, number> => {
        if (r() < 0.12) return {}; // povlačenje
        const k = 1 + Math.floor(r() * 5);
        const codes = new Set<string>();
        while (codes.size < k) codes.add(pick([...ENTRIES]));
        const cs = [...codes];
        const cuts = Array.from({ length: k - 1 }, () => 1 + Math.floor(r() * 99)).sort((a, b) => a - b);
        const parts = [...cuts, 100].map((c, i) => c - (i ? cuts[i - 1] : 0));
        const out: Record<string, number> = {};
        cs.forEach((c, i) => (out[c] = (out[c] ?? 0) + parts[i]));
        return Object.fromEntries(Object.entries(out).filter(([, p]) => p > 0));
      };

      async function checkModel(step: string) {
        const [points, backers] = await v1.read.results();
        const exp = { points: Array(88).fill(0), backers: Array(88).fill(0) };
        let live = 0;
        for (const v of voters) {
          if (v.migrated || v.points === "0x") continue;
          live++;
          const bytes = Buffer.from(v.points.slice(2), "hex");
          bytes.forEach((p, i) => {
            if (p) {
              exp.points[i] += p;
              exp.backers[i] += 1;
            }
          });
        }
        const ctx = `${step}\n${log.slice(-5).join("\n")}`;
        expect(points.map(Number), `bodovi ≠ model\n${ctx}`).to.deep.equal(exp.points);
        expect(backers.map(Number), `podupiratelji ≠ model\n${ctx}`).to.deep.equal(exp.backers);
        expect(Number(await v1.read.voters()), `voters ≠ model\n${ctx}`).to.equal(live);
        expect(Number(await v1.read.registered())).to.equal(voters.filter((v) => v.registered).length);
        // S4: zbroj svih bodova = 100 × broj živih listića
        expect(points.reduce((a, b) => a + b, 0n)).to.equal(100n * BigInt(live));
        for (const v of voters.filter((x) => x.nullifier !== undefined)) {
          const [rev, mig, pts] = await v1.read.ballotOf([v.nullifier!]);
          expect([rev, mig, pts], `ballotOf ≠ model\n${ctx}`).to.deep.equal([v.revision, v.migrated, v.migrated ? "0x" : v.points]);
        }
      }

      const expectRevert = async (p: Promise<unknown>, why: string) => {
        await expect(p, why).to.be.rejected;
      };

      for (let i = 0; i < OPS; i++) {
        const regs = voters.filter((v) => v.registered);
        const roll = r();
        let op = "";

        if (voters.length < 2 || roll < 0.15) {
          // novi glasač (A-07: registracija radi i nakon najave V2)
          const v: Voter = { id: new Identity(), registered: false, revision: 0, points: "0x", migrated: false, shared: false, packages: [] };
          voters.push(v);
          op = `register #${voters.length - 1}`;
          await f.register(v.id);
          v.registered = true;
        } else if (roll < 0.55 && regs.length) {
          // ispravan listić (ili povlačenje)
          const v = pick(regs);
          const items = randomBallot();
          const pkg = await f.signedBallot(v.id, v.revision + 1, items);
          v.nullifier = (pkg[2] as { nullifier: bigint }).nullifier;
          op = `cast #${voters.indexOf(v)} rev ${v.revision + 1} ${JSON.stringify(items)}`;
          if (v.migrated) await expectRevert(asRelayer.write.cast(pkg as never), "cast nakon selidbe");
          else {
            await asRelayer.write.cast(pkg as never);
            v.revision += 1;
            v.points = pkg[1];
            v.packages.push(pkg);
          }
        } else if (roll < 0.63 && regs.length) {
          // napad: relayer mijenja bodove u glasačevu paketu
          const v = pick(regs);
          const pkg = await f.signedBallot(v.id, v.revision + 1, randomBallot());
          const other = encodePoints({ [pick([...ENTRIES])]: 100 });
          op = `NAPAD tamper #${voters.indexOf(v)}`;
          if (other !== pkg[1]) await expectRevert(asRelayer.write.cast([pkg[0], other, pkg[2]] as never), "podmetnuti bodovi");
        } else if (roll < 0.71 && regs.some((v) => v.packages.length)) {
          // napad: ponovno slanje starog paketa
          const v = pick(regs.filter((x) => x.packages.length));
          op = `NAPAD replay #${voters.indexOf(v)}`;
          await expectRevert(asRelayer.write.cast(pick(v.packages) as never), "stari paket");
        } else if (roll < 0.77 && regs.length) {
          // napad: preskočena revizija
          const v = pick(regs);
          op = `NAPAD skip #${voters.indexOf(v)}`;
          await expectRevert(asRelayer.write.cast((await f.signedBallot(v.id, v.revision + 2, randomBallot())) as never), "preskočena revizija");
        } else if (roll < 0.8 && regs.length) {
          // napad: glasač (ili zlonamjeran klijent) potpiše listić sa zbrojem ≠ 100
          const v = pick(regs);
          const bytes = new Uint8Array(88);
          bytes[Math.floor(r() * 88)] = 1 + Math.floor(r() * 99); // 1–99, nikad 100
          if (r() < 0.5) bytes[Math.floor(r() * 88)] += 101; // ili preko 100
          const pts = `0x${Buffer.from(bytes).toString("hex")}` as Hex;
          const sum = bytes.reduce((a, b) => a + b, 0);
          const p = await proveBallot(v.id, group, { chainId, contract: v1.address, revision: v.revision + 1, points: pts });
          op = `NAPAD zbroj ${sum} #${voters.indexOf(v)}`;
          if (sum !== 100) await expectRevert(asRelayer.write.cast([v.revision + 1, pts, p] as never), "zbroj ≠ 100");
        } else if (roll < 0.82 && regs.length) {
          // napad: isti glasač, DRUGI scope → drugi nullifier → drugi listić (dvostruko glasanje)
          const v = pick(regs);
          const pts = encodePoints({ [pick([...ENTRIES])]: 100 });
          const msg = ballotMessage({ chainId, contract: v1.address, revision: 1, points: pts });
          const p = toSolidityProof(await generateProof(v.id, group, msg, BigInt(1 + Math.floor(r() * 1e9))));
          op = `NAPAD drugi scope #${voters.indexOf(v)}`;
          await expectRevert(asRelayer.write.cast([1, pts, p] as never), "drugi scope = drugi nullifier");
        } else if (roll < 0.835 && regs.length) {
          // napad: pokvaren SNARK uz ispravnu poruku i scope
          const v = pick(regs);
          const pkg = await f.signedBallot(v.id, v.revision + 1, randomBallot());
          const bad = { ...(pkg[2] as { points: bigint[] }), points: (pkg[2] as { points: bigint[] }).points.map((x, j) => (j === Math.floor(r() * 8) ? x ^ 1n : x)) };
          op = `NAPAD snark #${voters.indexOf(v)}`;
          await expectRevert(asRelayer.write.cast([pkg[0], pkg[1], bad] as never), "pokvaren SNARK");
        } else if (roll < 0.845 && regs.length) {
          // napad: listić krive duljine (potpisan takav)
          const v = pick(regs);
          const len = pick([1, 87, 89, 176]);
          const bytes = new Uint8Array(len);
          bytes[0] = 100;
          const pts = `0x${Buffer.from(bytes).toString("hex")}` as Hex;
          const p = await proveBallot(v.id, group, { chainId, contract: v1.address, revision: v.revision + 1, points: pts });
          op = `NAPAD duljina ${len} #${voters.indexOf(v)}`;
          await expectRevert(asRelayer.write.cast([v.revision + 1, pts, p] as never), "kriva duljina");
        } else if (roll < 0.87) {
          // napad: ključ koji nije registriran (dokaz nad lažnom grupom)
          const outsider = new Identity();
          const fake = new Group([...group.members.filter((m) => m !== 0n), outsider.commitment]);
          const pts = encodePoints({ [pick([...ENTRIES])]: 100 });
          const p = await proveBallot(outsider, fake, { chainId, contract: v1.address, revision: 1, points: pts });
          op = "NAPAD outsider";
          await expectRevert(asRelayer.write.cast([1, pts, p] as never), "neregistriran ključ");
        } else if (roll < 0.92 && regs.length) {
          // objava „glasao sam”: prva prolazi, druga ne
          const v = pick(regs);
          op = `share #${voters.indexOf(v)}`;
          const p = await proveShare(v.id, group);
          if (v.shared) await expectRevert(asRelayer.write.share([p]), "druga objava");
          else {
            await asRelayer.write.share([p]);
            v.shared = true;
          }
        } else if (!successor && i > OPS / 2) {
          // najava V2 (jednom)
          const v2 = await hre.viem.deployContract("MockSuccessorV2", [v1.address]);
          await v1.write.setSuccessor([v2.address]);
          successor = v2 as never;
          op = "setSuccessor";
        } else if (successor && regs.length) {
          // selidba (samo glasačevim dokazom)
          const v = pick(regs);
          const p = await proveMigrate(v.id, group, { chainId, contract: v1.address, successor: successor.address });
          op = `migrate #${voters.indexOf(v)}`;
          if (v.migrated) await expectRevert(successor.write.migrate([p as never]), "dvostruka selidba");
          else {
            await successor.write.migrate([p as never]);
            v.migrated = true;
            v.nullifier = p.nullifier;
          }
        } else continue;

        log.push(`${i}: ${op}`);
        await checkModel(`korak ${i} (${op})`);
      }

      // zatvaranje: nakon roka nijedna promjena ne prolazi, a zbroj ostaje isti
      const before = await v1.read.results();
      const test = await hre.viem.getTestClient();
      await test.increaseTime({ seconds: 3600 * 24 * 31 });
      await test.mine({ blocks: 1 });
      for (const v of voters.filter((x) => x.registered && !x.migrated).slice(0, 3)) {
        await expectRevert(asRelayer.write.cast((await f.signedBallot(v.id, v.revision + 1, randomBallot())) as never), "nakon roka");
      }
      expect(await v1.read.results()).to.deep.equal(before);
      await checkModel("nakon roka");
    }).timeout(900_000);
  }
});
