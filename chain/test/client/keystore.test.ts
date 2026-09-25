// Ključ glasača (chain/client/keystore.ts, ADR 0001). WebAuthn se glumi lažnim autentifikatorom
// koji računa PRF kao HMAC(tajna passkeyja, sol) — isto svojstvo kao pravi hmac-secret:
// isti passkey + ista sol = isti izlaz, drugi passkey = drugi izlaz.
import { expect } from "chai";
import { createHmac, randomBytes } from "node:crypto";
import { Identity } from "@semaphore-protocol/core";
import {
  KeystoreError,
  RP_ID,
  b64u,
  checkConfirmation,
  confirmationPositions,
  createPasskey,
  credentialIdHash,
  localBlobStore,
  multiBlobStore,
  keyFingerprint,
  newSecret,
  passkeyLabel,
  passkeyUserId,
  prfSupported,
  phase1ExportToSecret,
  prfSalt,
  protectWithPasskey,
  revealWords,
  secretToIdentity,
  secretToWords,
  unlockWithPasskey,
  unwrapSecret,
  wordsToSecret,
  wrapSecret,
  zeroize,
  type BlobStore,
  type WrappedSecret,
} from "../../client/keystore";

// ── lažni autentifikator ────────────────────────────────────────────────────────────

type Mode = "prf-on-create" | "prf-on-get-only" | "no-prf" | "prf-as-view";

function fakeAuthenticator(mode: Mode = "prf-on-create") {
  const passkeys = new Map<string, Buffer>(); // credentialId (b64u) → tajna passkeyja
  const byUser = new Map<string, string>(); // user.id (hex) → credentialId; isti user.id ZAMIJENI stari passkey
  const names = new Map<string, string>(); // credentialId → ime u „Lozinkama”
  const calls: { create: any[]; get: any[] } = { create: [], get: [] };
  let pick: string | undefined; // koji passkey „korisnik izabere” kad nije zadan
  const prfOf = (id: string, salt: Uint8Array) => new Uint8Array(createHmac("sha256", passkeys.get(id)!).update(salt).digest());
  const cred = (id: string, prf: Uint8Array | null, enabled: boolean) => ({
    rawId: new Uint8Array(Buffer.from(id.replace(/-/g, "+").replace(/_/g, "/"), "base64")).buffer,
    getClientExtensionResults: () =>
      mode === "no-prf" ? {} : { prf: { ...(mode === "prf-as-view" ? {} : { enabled }), ...(prf ? { results: { first: mode === "prf-as-view" ? new Uint8Array([0, ...prf]).subarray(1) : prf.buffer } } : {}) } },
  });
  const creds = {
    async create(o: any) {
      calls.create.push(o);
      const id = b64u(randomBytes(16));
      const uid = Buffer.from(o.publicKey.user.id).toString("hex");
      const old = byUser.get(uid);
      if (old) (passkeys.delete(old), names.delete(old));
      byUser.set(uid, id);
      passkeys.set(id, randomBytes(32));
      names.set(id, o.publicKey.user.name);
      pick = id;
      const salt = o.publicKey.extensions.prf.eval.first as Uint8Array;
      return cred(id, mode === "prf-on-create" || mode === "prf-as-view" ? prfOf(id, salt) : null, mode !== "no-prf");
    },
    async get(o: any) {
      calls.get.push(o);
      const allowed = o.publicKey.allowCredentials as { id: Uint8Array }[];
      const id = allowed.length ? b64u(allowed[0].id) : pick!;
      if (!passkeys.has(id)) return null;
      const salt = o.publicKey.extensions.prf.eval.first as Uint8Array;
      return cred(id, mode === "no-prf" ? null : prfOf(id, salt), mode !== "no-prf");
    },
  };
  return { creds: creds as unknown as CredentialsContainer, calls, passkeys, names, choose: (id: string) => (pick = id) };
}

const memStore = (): BlobStore & { data: Map<string, WrappedSecret> } => {
  const data = new Map<string, WrappedSecret>();
  return { data, get: async (h) => data.get(h) ?? null, put: async (h, b) => void data.set(h, b) };
};

// ── testovi ─────────────────────────────────────────────────────────────────────────

describe("client/keystore (ADR 0001)", () => {
  describe("trajne vrijednosti — promjena bi zaključala sve postojeće ključeve", () => {
    it("rpId = domovina.ai, PRF sol = sha256('maksimir-2026/keystore/v1')", async () => {
      expect(RP_ID).to.equal("domovina.ai");
      expect(Buffer.from(await prfSalt()).toString("hex")).to.equal("627ff82f075a5916ab449c2d217e1ed6445b78bbc89fa03232028be6caaceb57");
    });
  });

  describe("tajna ↔ 24 riječi ↔ identitet", () => {
    it("32 bajta = 24 riječi, povratak daje isti commitment", () => {
      const s = newSecret();
      const words = secretToWords(s);
      expect(words).to.have.length(24);
      const back = wordsToSecret(words);
      expect(Buffer.from(back)).to.deep.equal(Buffer.from(s));
      expect(secretToIdentity(back).commitment).to.equal(secretToIdentity(s).commitment);
    });

    it("ključ iz faze 1 (datoteka) → isti commitment i 24 riječi", () => {
      const old = new Identity();
      const s = phase1ExportToSecret(old.export());
      expect(secretToIdentity(s).commitment).to.equal(old.commitment);
      expect(secretToIdentity(wordsToSecret(secretToWords(s))).commitment).to.equal(old.commitment);
    });

    it("unos riječi je tolerantan na velika slova, višak razmaka i nove redove", () => {
      const s = newSecret();
      const messy = "  " + secretToWords(s).map((w, i) => (i % 2 ? w.toUpperCase() : w)).join("  \n ") + " \n";
      expect(Buffer.from(wordsToSecret(messy))).to.deep.equal(Buffer.from(s));
    });

    it("odbija krivi broj riječi, nepoznatu riječ i pogrešan redoslijed (kontrolni zbroj)", () => {
      const w = secretToWords(newSecret());
      expect(() => wordsToSecret(w.slice(0, 23))).to.throw(KeystoreError, "24");
      expect(() => wordsToSecret([...w.slice(0, 23), "stadion"])).to.throw(KeystoreError, "nepoznate");
      // deterministički: 24 × "abandon" ne prolazi kontrolni zbroj, 23 × "abandon" + "art" prolazi (0x00…00)
      expect(() => wordsToSecret(Array(24).fill("abandon"))).to.throw(KeystoreError, "kontrolni zbroj");
      expect(Buffer.from(wordsToSecret([...Array(23).fill("abandon"), "art"]))).to.deep.equal(Buffer.alloc(32));
    });

    it("odbija tajnu krive duljine i neispravan ključ iz faze 1", () => {
      expect(() => secretToWords(new Uint8Array(31))).to.throw(KeystoreError);
      expect(() => secretToIdentity(new Uint8Array(33))).to.throw(KeystoreError);
      expect(() => phase1ExportToSecret("ovo nije ključ")).to.throw(KeystoreError);
    });
  });

  describe("potvrda zapisanih riječi", () => {
    it("3 različite sortirane pozicije; točan odgovor prolazi, pogrešan ne", () => {
      const words = secretToWords(newSecret());
      for (let i = 0; i < 50; i++) {
        const p = confirmationPositions();
        expect(p).to.have.length(3);
        expect(new Set(p).size).to.equal(3);
        expect(p).to.deep.equal([...p].sort((a, b) => a - b));
        expect(p.every((x) => x >= 0 && x < 24)).to.equal(true);
      }
      const p = [2, 11, 23];
      expect(checkConfirmation(words, p, p.map((i) => ` ${words[i].toUpperCase()} `))).to.equal(true);
      expect(checkConfirmation(words, p, [words[2], words[11], words[22]])).to.equal(false);
      expect(checkConfirmation(words, p, [words[2], words[11]])).to.equal(false);
    });
  });

  describe("omot (AES-256-GCM, ključ iz PRF-a)", () => {
    const prf = () => new Uint8Array(randomBytes(32));

    it("omot se otvara istim passkeyjem; svaki omot ima drugi IV", async () => {
      const s = newSecret();
      const p = prf();
      const a = await wrapSecret(s, "cred-A", p);
      const b = await wrapSecret(s, "cred-A", p);
      expect(a.iv).to.not.equal(b.iv);
      expect(Buffer.from(await unwrapSecret(a, "cred-A", p))).to.deep.equal(Buffer.from(s));
    });

    it("drugi PRF (drugi passkey) ne otvara omot", async () => {
      const blob = await wrapSecret(newSecret(), "cred-A", prf());
      await expect(unwrapSecret(blob, "cred-A", prf())).to.be.rejectedWith(KeystoreError, "ne može otvoriti");
    });

    it("omot je vezan uz credentialId (AAD): podmetnut ID ne prolazi ni uz pravi PRF", async () => {
      const p = prf();
      const blob = await wrapSecret(newSecret(), "cred-A", p);
      await expect(unwrapSecret(blob, "cred-B", p)).to.be.rejectedWith(KeystoreError, "drugom passkeyju");
      await expect(unwrapSecret({ ...blob, credentialId: "cred-B" }, "cred-B", p)).to.be.rejectedWith(KeystoreError, "ne može otvoriti");
    });

    it("izmijenjen šifrat, IV ili verzija ne prolaze", async () => {
      const p = prf();
      const blob = await wrapSecret(newSecret(), "cred-A", p);
      const flip = (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1);
      await expect(unwrapSecret({ ...blob, ct: flip(blob.ct) }, "cred-A", p)).to.be.rejectedWith(KeystoreError);
      await expect(unwrapSecret({ ...blob, iv: flip(blob.iv) }, "cred-A", p)).to.be.rejectedWith(KeystoreError);
      await expect(unwrapSecret({ ...blob, v: 2 as 1 }, "cred-A", p)).to.be.rejectedWith(KeystoreError, "verzija");
    });

    it("prekratak PRF izlaz se odbija", async () => {
      await expect(wrapSecret(newSecret(), "cred-A", new Uint8Array(16))).to.be.rejectedWith(KeystoreError, "prekratak");
    });

    it("omot ne sadrži tajnu ni riječi u čitljivom obliku", async () => {
      const s = newSecret();
      const json = JSON.stringify(await wrapSecret(s, "cred-A", prf()));
      expect(json).to.not.include(Buffer.from(s).toString("hex"));
      expect(json).to.not.include(Buffer.from(s).toString("base64"));
      expect(json).to.not.include(secretToWords(s)[0] + " " + secretToWords(s)[1]);
    });
  });

  describe("tokovi s passkeyjem (lažni autentifikator)", () => {
    it("izrada: rpId domovina.ai, obavezna biometrija, discoverable, nasumičan user.id, PRF sol", async () => {
      const a = fakeAuthenticator();
      await createPasskey({ creds: a.creds });
      await createPasskey({ creds: a.creds });
      const [o1, o2] = a.calls.create.map((c) => c.publicKey);
      expect(o1.rp.id).to.equal("domovina.ai");
      expect(o1.authenticatorSelection).to.deep.equal({ residentKey: "required", userVerification: "required" });
      expect(Buffer.from(o1.extensions.prf.eval.first)).to.deep.equal(Buffer.from(await prfSalt()));
      expect(Buffer.from(o1.user.id)).to.not.deep.equal(Buffer.from(o2.user.id));
      expect(o1.pubKeyCredParams.map((p: { alg: number }) => p.alg)).to.deep.equal([-7, -257]);
    });

    it("zaštita + otključavanje (Chrome: PRF već pri izradi) → ista tajna", async () => {
      const a = fakeAuthenticator("prf-on-create");
      const store = memStore();
      const s = newSecret();
      const id = await protectWithPasskey(s, store, { creds: a.creds });
      expect(a.calls.get).to.have.length(0);
      expect(store.data.has(await credentialIdHash(id))).to.equal(true);
      const { secret, credentialId } = await unlockWithPasskey(store, { creds: a.creds });
      expect(credentialId).to.equal(id);
      expect(Buffer.from(secret)).to.deep.equal(Buffer.from(s));
      expect(a.calls.get[0].publicKey.userVerification).to.equal("required");
      expect(a.calls.get[0].publicKey.allowCredentials).to.deep.equal([]); // korisnik bira passkey
    });

    it("Safari: PRF tek pri get → dodatni get s točno tim passkeyjem", async () => {
      const a = fakeAuthenticator("prf-on-get-only");
      const store = memStore();
      const s = newSecret();
      const id = await protectWithPasskey(s, store, { creds: a.creds });
      expect(a.calls.get).to.have.length(1);
      expect(b64u(a.calls.get[0].publicKey.allowCredentials[0].id)).to.equal(id);
      expect(Buffer.from((await unlockWithPasskey(store, { creds: a.creds })).secret)).to.deep.equal(Buffer.from(s));
    });

    it("prfEnabled: zastavica, sam rezultat bez zastavice, ili ništa", async () => {
      expect((await createPasskey({ creds: fakeAuthenticator("prf-on-create").creds })).prfEnabled).to.equal(true);
      expect((await createPasskey({ creds: fakeAuthenticator("prf-as-view").creds })).prfEnabled).to.equal(true);
      expect((await createPasskey({ creds: fakeAuthenticator("no-prf").creds })).prfEnabled).to.equal(false);
    });

    it("PRF izlaz kao Uint8Array (pogled s pomakom) umjesto ArrayBuffera", async () => {
      const a = fakeAuthenticator("prf-as-view");
      const store = memStore();
      const s = newSecret();
      await protectWithPasskey(s, store, { creds: a.creds });
      expect(Buffer.from((await unlockWithPasskey(store, { creds: a.creds })).secret)).to.deep.equal(Buffer.from(s));
    });

    it("autentifikator bez PRF-a → jasna poruka (rezerva: 24 riječi)", async () => {
      const a = fakeAuthenticator("no-prf");
      await expect(protectWithPasskey(newSecret(), memStore(), { creds: a.creds })).to.be.rejectedWith(KeystoreError, "24 riječi");
    });

    it("passkey bez spremljenog omota (izabran pogrešan) → poruka da izabere drugi", async () => {
      const a = fakeAuthenticator();
      await createPasskey({ creds: a.creds }); // passkey bez omota
      await expect(unlockWithPasskey(memStore(), { creds: a.creds })).to.be.rejectedWith(KeystoreError, "izaberi drugi");
    });

    it("ime passkeyja nosi otisak ključa; user.id je izveden iz ključa", async () => {
      const a = fakeAuthenticator();
      const [s1, s2] = [newSecret(), newSecret()];
      await protectWithPasskey(s1, memStore(), { creds: a.creds, labelPrefix: "Maksimir TEST" });
      await protectWithPasskey(s2, memStore(), { creds: a.creds });
      const [o1, o2] = a.calls.create.map((c) => c.publicKey.user);
      expect(o1.name).to.equal(`Maksimir TEST · ključ ${keyFingerprint(s1)}`);
      expect(o1.displayName).to.equal(o1.name);
      expect(o2.name).to.equal(`Maksimir glasanje · ključ ${keyFingerprint(s2)}`);
      expect(Buffer.from(o1.id)).to.deep.equal(Buffer.from(await passkeyUserId(s1)));
      expect(Buffer.from(o1.id)).to.not.deep.equal(Buffer.from(o2.id));
      expect(o1.id).to.have.length(16);
    });

    it("ponovna zaštita ISTOG ključa zamijeni passkey (ne gomila); drugi ključ = drugi passkey", async () => {
      const a = fakeAuthenticator();
      const store = memStore();
      const s = newSecret();
      await protectWithPasskey(s, store, { creds: a.creds });
      await protectWithPasskey(s, store, { creds: a.creds });
      await protectWithPasskey(s, store, { creds: a.creds });
      expect(a.passkeys.size).to.equal(1);
      expect(Buffer.from((await unlockWithPasskey(store, { creds: a.creds })).secret)).to.deep.equal(Buffer.from(s));
      await protectWithPasskey(newSecret(), store, { creds: a.creds });
      expect(a.passkeys.size).to.equal(2);
      expect(new Set(a.names.values()).size).to.equal(2); // različita imena
    });

    it("keyFingerprint: kratki otisak iz commitmenta, isti za isti ključ", () => {
      const s = newSecret();
      const c = secretToIdentity(s).commitment.toString();
      expect(keyFingerprint(s)).to.equal(`${c.slice(0, 6)}…${c.slice(-6)}`);
      expect(keyFingerprint(wordsToSecret(secretToWords(s)))).to.equal(keyFingerprint(s));
      expect(passkeyLabel(s)).to.equal(`Maksimir glasanje · ključ ${keyFingerprint(s)}`);
    });

    it("dva uređaja (iPhone + Windows Hello) otključavaju ISTU tajnu", async () => {
      const phone = fakeAuthenticator();
      const pc = fakeAuthenticator(); // drugi ekosustav: vlastiti passkey s istim user.id
      const store = memStore();
      const s = newSecret();
      await protectWithPasskey(s, store, { creds: phone.creds });
      await protectWithPasskey(s, store, { creds: pc.creds });
      const x = await unlockWithPasskey(store, { creds: phone.creds });
      const y = await unlockWithPasskey(store, { creds: pc.creds });
      expect(Buffer.from(x.secret)).to.deep.equal(Buffer.from(y.secret));
      expect(x.credentialId).to.not.equal(y.credentialId);
      expect(secretToIdentity(x.secret).commitment).to.equal(secretToIdentity(s).commitment);
    });

    it("revealWords: passkey ponovno daje iste 24 riječi (i traži biometriju)", async () => {
      const a = fakeAuthenticator();
      const store = memStore();
      const s = newSecret();
      const expected = secretToWords(s);
      await protectWithPasskey(s, store, { creds: a.creds });
      const before = a.calls.get.length;
      const { words } = await revealWords(store, { creds: a.creds });
      expect(words).to.deep.equal(expected);
      expect(a.calls.get.length).to.equal(before + 1);
      expect(a.calls.get.at(-1).publicKey.userVerification).to.equal("required");
      expect(secretToIdentity(wordsToSecret(words)).commitment).to.equal(secretToIdentity(s).commitment);
    });

    it("revealWords bez omota za taj passkey → greška, bez riječi", async () => {
      const a = fakeAuthenticator();
      await createPasskey({ creds: a.creds });
      await expect(revealWords(memStore(), { creds: a.creds })).to.be.rejectedWith(KeystoreError, "izaberi drugi");
    });

    it("oporavak: izgubljen passkey → 24 riječi → novi passkey → isti commitment (isti listić)", async () => {
      const s = newSecret();
      const words = secretToWords(s);
      const commitment = secretToIdentity(s).commitment;
      zeroize(s); // „stari uređaj” je izgubljen
      const b = fakeAuthenticator(); // novi uređaj, novi ekosustav
      const store = memStore();
      const recovered = wordsToSecret(words);
      await protectWithPasskey(recovered, store, { creds: b.creds });
      const { secret } = await unlockWithPasskey(store, { creds: b.creds });
      expect(secretToIdentity(secret).commitment).to.equal(commitment);
    });
  });

  describe("spremišta omota", () => {
    it("localBlobStore: blokiran storage → radi iz memorije", async () => {
      const broken = { getItem: () => { throw new Error("blokirano"); }, setItem: () => { throw new Error("blokirano"); } };
      const st = localBlobStore(broken);
      const blob = { v: 1 as const, credentialId: "x", iv: "a", ct: "b" };
      await st.put("h", blob);
      expect(await st.get("h")).to.deep.equal(blob);
      expect(await st.get("nema")).to.equal(null);
    });

    it("localBlobStore bez argumenta: globalni localStorage ako postoji, inače memorija", async () => {
      const g = globalThis as Record<string, unknown>;
      const blob = { v: 1 as const, credentialId: "x", iv: "a", ct: "b" };
      const saved = g.localStorage;
      try {
        delete g.localStorage;
        const mem = localBlobStore();
        await mem.put("h", blob);
        expect(await mem.get("h")).to.deep.equal(blob);
        const m = new Map<string, string>();
        g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
        await localBlobStore().put("h", blob);
        expect(m.size).to.equal(1);
      } finally {
        if (saved === undefined) delete g.localStorage;
        else g.localStorage = saved;
      }
    });

    it("localBlobStore: zapis preživi novu instancu (isti Storage)", async () => {
      const m = new Map<string, string>();
      const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
      const blob = { v: 1 as const, credentialId: "x", iv: "a", ct: "b" };
      await localBlobStore(storage).put("h", blob);
      expect(await localBlobStore(storage).get("h")).to.deep.equal(blob);
      expect([...m.keys()][0]).to.equal("maksimir-keystore-v1:h");
    });

    it("multiBlobStore: čita iz prvog koji ima, piše u sve, pad jednog ne ruši čitanje", async () => {
      const a = memStore();
      const b = memStore();
      const failing: BlobStore = { get: async () => { throw new Error("mreža"); }, put: async () => {} };
      const blob = { v: 1 as const, credentialId: "x", iv: "a", ct: "b" };
      await b.put("h", blob);
      expect(await multiBlobStore(failing, a, b).get("h")).to.deep.equal(blob);
      await multiBlobStore(a, b).put("g", blob);
      expect(a.data.has("g") && b.data.has("g")).to.equal(true);
      expect(await multiBlobStore(a, b).get("nema")).to.equal(null);
    });
  });

  describe("okruženje preglednika", () => {
    const g = globalThis as Record<string, unknown>;
    const saved = { PublicKeyCredential: g.PublicKeyCredential };
    afterEach(() => {
      g.PublicKeyCredential = saved.PublicKeyCredential;
    });

    it("prfSupported: bez WebAuthn → false; bez getClientCapabilities → undefined", async () => {
      delete g.PublicKeyCredential;
      expect(await prfSupported()).to.equal(false);
      g.PublicKeyCredential = {};
      expect(await prfSupported()).to.equal(undefined);
    });

    it("prfSupported: preglednik kaže da/ne; ne zna; baci grešku", async () => {
      g.PublicKeyCredential = { getClientCapabilities: async () => ({ "extension:prf": true }) };
      expect(await prfSupported()).to.equal(true);
      g.PublicKeyCredential = { getClientCapabilities: async () => ({ "extension:prf": false }) };
      expect(await prfSupported()).to.equal(false);
      g.PublicKeyCredential = { getClientCapabilities: async () => ({ conditionalGet: true }) };
      expect(await prfSupported()).to.equal(undefined);
      g.PublicKeyCredential = { getClientCapabilities: async () => { throw new Error("x"); } };
      expect(await prfSupported()).to.equal(undefined);
    });

    it("bez navigator.credentials → jasna greška", async () => {
      const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
      Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
      try {
        await expect(createPasskey()).to.be.rejectedWith(KeystoreError, "ne podržava passkeyje");
      } finally {
        if (nav) Object.defineProperty(globalThis, "navigator", nav);
      }
    });

    it("zadano koristi navigator.credentials preglednika", async () => {
      const a = fakeAuthenticator();
      const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
      Object.defineProperty(globalThis, "navigator", { value: { credentials: a.creds }, configurable: true });
      try {
        const store = memStore();
        const secret = newSecret();
        await protectWithPasskey(secret, store);
        expect(a.calls.create).to.have.length(1);
        expect(Buffer.from((await unlockWithPasskey(store)).secret)).to.deep.equal(Buffer.from(secret));
      } finally {
        if (nav) Object.defineProperty(globalThis, "navigator", nav);
      }
    });

    it("otkazan dijalog (create/get vrate null) → jasna greška", async () => {
      const creds = { create: async () => null, get: async () => null } as unknown as CredentialsContainer;
      await expect(createPasskey({ creds })).to.be.rejectedWith(KeystoreError, "otkazana");
      await expect(unlockWithPasskey(memStore(), { creds })).to.be.rejectedWith(KeystoreError, "otkazano");
    });
  });

  it("zeroize prebriše bajtove", () => {
    const s = newSecret();
    zeroize(s);
    expect([...s].every((x) => x === 0)).to.equal(true);
    zeroize(null);
  });
});
