// E2E ZK toka nad LOKALNIM Supabaseom (domovina-api): 3 glasača, zamjena ključa, anonimna objava, provjera.
// Pokretanje (iz web/):  ANON=… SERVICE=… node scripts/zk-e2e.mjs
// Briše maksimir_zk_log i maksimir_shares — samo lokalno!
import { createClient } from "@supabase/supabase-js";
import { Identity, Group, generateProof, verifyProof } from "@semaphore-protocol/core";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const URL = "http://127.0.0.1:55321";
// Ključevi lokalnog stacka: `supabase status -o env` u domovina-api.
const ANON = process.env.ANON, SERVICE = process.env.SERVICE;
const DB = "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const psql = (q) => execSync(`psql "${DB}" -tAq -c ${JSON.stringify(q)}`).toString().trim();
const opts = { db: { schema: "domovina_ai" }, auth: { persistSession: false } };
const admin = createClient(URL, SERVICE, opts);
const anon = createClient(URL, ANON, opts);
const ok = (c, m) => { if (!c) { console.error("PAD —", m); process.exit(1); } console.log("OK —", m); };

// čišćenje
psql("alter table domovina_ai.maksimir_zk_log disable trigger user; delete from domovina_ai.maksimir_zk_log; alter table domovina_ai.maksimir_zk_log enable trigger user; delete from domovina_ai.maksimir_shares; delete from domovina_ai.maksimir_voters where oib_hash like 'e2e-zk-%'; delete from auth.users where email like 'e2e-zk-%';");

const users = [];
for (const n of ["a", "b", "c"]) {
  const email = `e2e-zk-${n}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: "lozinka-123", email_confirm: true });
  if (error) throw error;
  psql(`insert into public.identity_verifications (user_id, oib_ciphertext, oib_hash, first_name, last_name) values ('${data.user.id}', '\\x00', 'e2e-zk-${n}', 'TEST', 'KORISNIK${n.toUpperCase()}')`);
  const c = createClient(URL, ANON, opts);
  await c.auth.signInWithPassword({ email, password: "lozinka-123" });
  await c.rpc("maksimir_accept_terms");
  const { error: e2 } = await c.rpc("maksimir_cast_ballot", { p_items: { MJY2USY2W: 60, X8G5VVECK: 40 } });
  if (e2) throw e2;
  users.push({ c, id: new Identity() });
}

// upis commitmenta; A zatim mijenja ključ (remove + add)
for (const u of users) {
  const { error } = await u.c.rpc("maksimir_zk_register", { p_commitment: u.id.commitment.toString() });
  if (error) throw error;
}
const oldA = users[0].id;
users[0].id = new Identity();
await users[0].c.rpc("maksimir_zk_register", { p_commitment: users[0].id.commitment.toString() });

const { data: g } = await anon.rpc("maksimir_zk_group");
ok(g.log.length === 5 && g.head.members === 3, `zapisnik grupe: ${g.log.length} zapisa, ${g.head.members} člana`);
const membersAt = (log, upto) => { const o = []; for (const r of log) { if (r.seq > upto) break; if (r.op === "add") o.push(r.commitment); else o.splice(o.indexOf(r.commitment), 1); } return o; };
let prev = "0".repeat(64);
for (const r of g.log) { ok(r.prev_hash === prev && crypto.createHash("sha256").update(`${r.prev_hash}|${r.seq}|${r.op}|${r.commitment}`).digest("hex") === r.hash, `zk lanac #${r.seq} (${r.op})`); prev = r.hash; }

// B izrađuje dokaz nad trenutnom grupom i sprema ga anonimno
const members = membersAt(g.log, g.head.seq);
ok(!members.includes(oldA.commitment.toString()), "stari ključ A nije u grupi");
const group = new Group(members.map(BigInt));
const t = Date.now();
const proof = await generateProof(users[1].id, group, "glasao-sam", "maksimir-2026");
console.log(`   dokaz za ${Date.now() - t} ms, dubina ${proof.merkleTreeDepth}`);
const { data: sh, error: se } = await anon.rpc("maksimir_zk_share", { p_proof: proof, p_zk_seq: g.head.seq });
if (se) throw se;
const { data: sh2 } = await anon.rpc("maksimir_zk_share", { p_proof: proof, p_zk_seq: g.head.seq });
ok(sh.id === sh2.id, `isti nullifier → ista objava ${sh.id}`);

// posjetitelj: provjera kao u shareView/checkZkShare
const { data: s } = await anon.rpc("maksimir_share", { p_id: sh.id });
const root = new Group(membersAt(g.log, s.zk_seq).map(BigInt)).root.toString();
ok(await verifyProof(s.proof), "SNARK iz baze je valjan");
ok(root === s.proof.merkleTreeRoot, "korijen iz javnog zapisnika = korijen u dokazu");
ok(s.proof.message === "46779715467123036996841617194389431189336537137425384514209209627004761014272", "poruka glasao-sam");

// dokaz starim ključem A nad starom grupom (seq 3) i dalje odgovara povijesnom stanju
const oldGroup = new Group(membersAt(g.log, 3).map(BigInt));
const p2 = await generateProof(oldA, oldGroup, "glasao-sam", "maksimir-2026");
ok(await verifyProof(p2) && oldGroup.root.toString() !== root, "povijesni dokaz vrijedi za svoje stanje, ne za trenutno");

// lažni: dokaz nad grupom s izmišljenim članom → korijen se ne poklapa s javnim zapisnikom
const fake = new Identity();
const fakeGroup = new Group([...members.map(BigInt), fake.commitment]);
const p3 = await generateProof(fake, fakeGroup, "glasao-sam", "maksimir-2026");
const { data: sh3 } = await anon.rpc("maksimir_zk_share", { p_proof: p3, p_zk_seq: g.head.seq });
const { data: s3 } = await anon.rpc("maksimir_share", { p_id: sh3.id });
ok((await verifyProof(s3.proof)) && new Group(membersAt(g.log, s3.zk_seq).map(BigInt)).root.toString() !== s3.proof.merkleTreeRoot,
  "izmišljeni član: SNARK valjan, ali korijen NE odgovara javnoj grupi → stranica ga odbija");
// izmijenjen dokaz → SNARK pada
ok(!(await verifyProof({ ...s.proof, nullifier: (BigInt(s.proof.nullifier) + 1n).toString() })), "izmijenjen nullifier → SNARK pada");

// javna objava
const { data: pb } = await users[2].c.rpc("maksimir_set_public", { p_mode: "initial" });
const { data: ps } = await anon.rpc("maksimir_share", { p_id: pb.share_id });
ok(ps.card.name === "Test K." && ps.card.items[0].points === 60, `javna objava ${pb.share_id}: ${ps.card.name}`);
const { data: snap } = await anon.rpc("maksimir_snapshot");
ok(snap.schema === "maksimir-snapshot/2" && snap.zk.seq === 5 && snap.public_voters === 1, "snapshot v2");
console.log("SHARE_ZK", sh.id, "SHARE_PUBLIC", pb.share_id, "FAKE", sh3.id);
console.log("SVE PROVJERE PROŠLE");
process.exit(0);
