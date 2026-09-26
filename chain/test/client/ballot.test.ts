// Klijentska kriptografija (chain/client/ballot.ts) — ono što radi glasačev preglednik.
// Greška ovdje značila bi krivo složen listić koji ugovor ipak prihvati (jer ga je glasač
// „potpisao”), zato se testira neovisno o ugovoru.
import { expect } from "chai";
import { zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  BALLOT_SCOPE,
  BallotError,
  ENTRIES,
  SHARE_MESSAGE,
  SHARE_SCOPE,
  ballotMessage,
  decodePoints,
  encodePoints,
  entriesHash,
  migrateMessage,
  registerTypedData,
  toJson,
} from "../../client/ballot";

// V1 na Chiadu/Gnosisu ima ovaj entriesHash kao immutable — popis se NIKAD ne smije promijeniti.
const V1_ENTRIES_HASH = "0xc80d187f076df9e79679216718a521e381e1c055c291ee90685bfd93457db30f";

describe("client/ballot", () => {
  it("popis radova: 88 jedinstvenih šifri, sortiran bytewise, otisak = V1", () => {
    expect(ENTRIES).to.have.length(88);
    expect(new Set(ENTRIES).size).to.equal(88);
    expect([...ENTRIES]).to.deep.equal([...ENTRIES].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(entriesHash()).to.equal(V1_ENTRIES_HASH);
  });

  it("konstante scopea i poruke (faza 1 + V1)", () => {
    expect(SHARE_MESSAGE).to.equal(46779715467123036996841617194389431189336537137425384514209209627004761014272n);
    expect(SHARE_SCOPE).to.equal(49474226259215312994888701590181247581981161421217961257574660746611720716288n);
    expect(BALLOT_SCOPE).to.not.equal(SHARE_SCOPE);
  });

  it("encodePoints: bajt na indeksu šifre, dekodiranje vraća isto", () => {
    const items = { "6TVJ3MUHR": 50, GY0F1A9OM: 30, W3YS5VJBZ: 20 };
    const hex = encodePoints(items);
    expect(hex).to.have.length(2 + 88 * 2);
    const bytes = Buffer.from(hex.slice(2), "hex");
    expect(bytes[ENTRIES.indexOf("6TVJ3MUHR")]).to.equal(50);
    expect(bytes.reduce((a, b) => a + b, 0)).to.equal(100);
    expect(decodePoints(hex)).to.deep.equal(items);
  });

  it("encodePoints: prazno i nule = povlačenje (0x)", () => {
    expect(encodePoints({})).to.equal("0x");
    expect(encodePoints({ "6TVJ3MUHR": 0 })).to.equal("0x");
  });

  it("encodePoints odbija sve što ugovor ne bi smio dobiti", () => {
    const bad: Array<Record<string, number>> = [
      { NEPOSTOJI: 100 },
      { "6TVJ3MUHR": 99 },
      { "6TVJ3MUHR": 101 },
      { "6TVJ3MUHR": 60, GY0F1A9OM: 50 },
      { "6TVJ3MUHR": 150, GY0F1A9OM: -50 },
      { "6TVJ3MUHR": 99.5, GY0F1A9OM: 0.5 },
      { "6TVJ3MUHR": Number.NaN },
      { "6TVJ3MUHR": 356 - 256 + 256 }, // 356 bi se u bajtu omotao u 100
    ];
    for (const b of bad) expect(() => encodePoints(b), JSON.stringify(b)).to.throw(BallotError);
  });

  it("ballotMessage ovisi o svakom polju (lanac, ugovor, revizija, listić)", () => {
    const base = { chainId: 100, contract: "0x88BdeE1E404aF25ea29dfAD5Ec67062A36493989" as const, revision: 1, points: encodePoints({ "6TVJ3MUHR": 100 }) };
    const m = ballotMessage(base);
    expect(ballotMessage(base)).to.equal(m);
    expect(ballotMessage({ ...base, chainId: 10200 })).to.not.equal(m);
    expect(ballotMessage({ ...base, contract: zeroAddress })).to.not.equal(m);
    expect(ballotMessage({ ...base, revision: 2 })).to.not.equal(m);
    expect(ballotMessage({ ...base, points: encodePoints({ GY0F1A9OM: 100 }) })).to.not.equal(m);
    expect(migrateMessage({ chainId: 100, contract: base.contract, successor: zeroAddress })).to.not.equal(m);
  });

  it("toJson: bigint → decimalni string (za relayer)", () => {
    expect(toJson({ a: 2n ** 255n, b: [1n], c: "x" })).to.equal(`{"a":"${(2n ** 255n).toString()}","b":["1"],"c":"x"}`);
  });

  it("EIP-712 domena registracije je vezana uz verziju 1, lanac i ugovor", () => {
    const t = registerTypedData({ chainId: 100, contract: zeroAddress, commitment: 1n, deadline: 2n });
    expect(t.domain).to.deep.equal({ name: "MaksimirGlasanje", version: "1", chainId: 100, verifyingContract: zeroAddress });
    expect(t.primaryType).to.equal("Register");
  });

  it("fiksni vektor registrara = domovina-api maksimir-register/logic_test.ts (isti potpis u Denou i ovdje)", async () => {
    // Hardhat račun #1. Ako se ovaj potpis promijeni, edge funkcija i klijent potpisuju različito.
    const acc = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    const sig = await acc.signTypedData(
      registerTypedData({ chainId: 31337, contract: "0x5fbdb2315678afecb367f032d93f642f64180aa3", commitment: 12345n, deadline: 2000000000n })
    );
    expect(sig).to.equal(
      "0x5599fd03ac39f1e4175d5bf4995287400cd5d116f783458af6da78f2796f64281063f0d694e38e8b5deb48c2a31f14d9a382e9b0dc66c55367a7f3d4a8d531ef1c"
    );
  });
});
